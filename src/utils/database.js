import dotenv from 'dotenv';

dotenv.config();

const server = process.env.MSSQL_HOST || 'localhost';
const port = parseInt(process.env.MSSQL_PORT) || 1433;
const database = process.env.MSSQL_DATABASE || 'hls_api';

const sqlUser = process.env.MSSQL_USER;
const sqlPassword = process.env.MSSQL_PASSWORD;
const useSqlAuth = Boolean(sqlUser && sqlPassword);
const integratedAuthEnv = process.env.MSSQL_INTEGRATED_AUTH;
const useTrustedConnection =
  integratedAuthEnv == null ? !useSqlAuth : integratedAuthEnv === 'true';

let mssql;

async function ensureMssqlLoaded() {
  if (mssql) {
    return;
  }

  if (useTrustedConnection) {
    if (process.platform !== 'win32') {
      throw new Error(
        'MSSQL Trusted_Connection requer Windows. Defina MSSQL_USER e MSSQL_PASSWORD para executar em Linux (ex.: Cloud Run).'
      );
    }

    try {
      ({ default: mssql } = await import('mssql/msnodesqlv8.js'));
      return;
    } catch (error) {
      throw new Error(
        'Falha ao carregar driver mssql/msnodesqlv8. Instale dependencias nativas do Windows ou use MSSQL_USER/MSSQL_PASSWORD.'
      );
    }
  }

  ({ default: mssql } = await import('mssql'));
}

function buildConfig() {
  if (!useTrustedConnection) {
    return {
      server,
      port,
      database,
      user: sqlUser,
      password: sqlPassword,
      options: {
        encrypt: true,
        trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERT === 'true',
        rowCollectionOnRequestCompletion: false,
      },
    };
  }

  return {
    server,
    port,
    database,
    connectionString: `Driver={ODBC Driver 18 for SQL Server};Server=${server},${port};Database=${database};Trusted_Connection=Yes;Encrypt=yes;TrustServerCertificate=yes;`,
    options: {
      trustedConnection: true,
      encrypt: true,
      trustServerCertificate: true,
      rowCollectionOnRequestCompletion: false,
    },
  };
}

let connectionPool;

async function createConnectionPool() {
  await ensureMssqlLoaded();
  const config = buildConfig();
  const pool = new mssql.ConnectionPool(config);

  pool.on('error', () => {
    connectionPool = null;
  });

  await pool.connect();
  return pool;
}

function isPoolUsable(pool) {
  return Boolean(pool && pool.connected && !pool.connecting);
}

export async function getDatabase() {
  if (!isPoolUsable(connectionPool)) {
    if (connectionPool) {
      try {
        await connectionPool.close();
      } catch {
        // Ignora erro no fechamento de pool quebrado.
      }
    }
    connectionPool = await createConnectionPool();
  }
  return connectionPool;
}

export async function query(sql) {
  try {
    const pool = await getDatabase();
    return await pool.request().query(sql);
  } catch (error) {
    if (error?.name !== 'ConnectionError') {
      throw error;
    }

    connectionPool = null;
    const pool = await getDatabase();
    return pool.request().query(sql);
  }
}

export async function queryWithParams(sql, params = {}) {
  const runQuery = async () => {
    const pool = await getDatabase();
    const request = pool.request();
    const normalizedParams = params ?? {};

    Object.keys(normalizedParams).forEach(key => {
      const value = normalizedParams[key];
      if (typeof value === 'string') {
        request.input(key, mssql.NVarChar(mssql.MAX), value);
        return;
      }

      if (value instanceof Date) {
        request.input(key, mssql.DateTime2, value);
        return;
      }

      request.input(key, value);
    });

    return request.query(sql);
  };

  try {
    return await runQuery();
  } catch (error) {
    if (error?.name !== 'ConnectionError') {
      throw error;
    }

    connectionPool = null;
    return runQuery();
  }
}

export async function closeDatabase() {
  if (connectionPool) {
    await connectionPool.close();
    connectionPool = null;
  }
}
