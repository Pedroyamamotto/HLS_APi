import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDotEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return {};
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const env = {};
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...parts] = trimmed.split('=');
      env[key.trim()] = parts.join('=').trim();
    }
  });
  return env;
}

function buildUriFromEnv(env) {
  if (env.MSSQL_HOST) {
    return {
      type: 'mssql',
      host: env.MSSQL_HOST || 'localhost',
      port: env.MSSQL_PORT || '1433',
      database: env.MSSQL_DATABASE || 'hls_api',
      user: env.MSSQL_USER,
      password: env.MSSQL_PASSWORD
    };
  }
  return {
    type: 'postgres',
    host: env.PGHOST || 'localhost',
    port: env.PGPORT || '5432',
    database: env.PGDATABASE || 'hls_api',
    user: env.PGUSER,
    password: env.PGPASSWORD
  };
}

function runSqlcmd(config, sqlContent, dry = false) {
  if (dry) {
    console.log('[DRY-RUN] sqlcmd would execute:\n', sqlContent);
    return true;
  }
  // Escrever SQL em arquivo temporário para evitar problemas de escapeamento
  const tmpFile = path.join(__dirname, `tmp_${Date.now()}.sql`);
  fs.writeFileSync(tmpFile, sqlContent, 'utf8');
  
  const args = [
    '-S', `${config.host},${config.port}`,
    '-C',
    '-d', config.database || 'hls_api'
  ];

  if (config.user && config.password) {
    args.push('-U', config.user, '-P', config.password);
  } else {
    args.push('-E');
  }

  args.push('-i', tmpFile);
  console.log(`[sqlcmd] Connecting to ${config.host}:${config.port}...`);
  const result = spawnSync('sqlcmd', args, { stdio: 'inherit', shell: false });
  
  // Limpar arquivo temporário
  try { fs.unlinkSync(tmpFile); } catch (e) {}
  
  return result.status === 0;
}

function runPsql(config, sqlContent, dry = false) {
  if (dry) {
    console.log('[DRY-RUN] psql would execute:\n', sqlContent);
    return true;
  }
  const pgUri = `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
  const args = [pgUri, '-c', sqlContent];
  console.log(`[psql] Connecting to ${config.host}:${config.port}/${config.database}...`);
  const result = spawnSync('psql', args, { stdio: 'inherit', shell: true });
  return result.status === 0;
}

function resetMssqlDatabase(config, dry = false) {
  const dropFksQuery = `
    DECLARE @sql NVARCHAR(MAX) = '';
    SELECT @sql += 'ALTER TABLE [' + OBJECT_NAME(parent_object_id) + '] DROP CONSTRAINT [' + name + '];'
    FROM sys.foreign_keys;
    EXEC sp_executesql @sql;
  `;
  runSqlcmd(config, dropFksQuery, dry);

  const dropTablesQuery = `
    DECLARE @sql NVARCHAR(MAX) = '';
    SELECT @sql += 'DROP TABLE [' + TABLE_NAME + '];'
    FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE';
    EXEC sp_executesql @sql;
  `;
  runSqlcmd(config, dropTablesQuery, dry);
}

function resetPsqlDatabase(config, dry = false) {
  if (dry) {
    console.log('[DRY-RUN] psql would drop and recreate schema');
    return;
  }
  runPsql(config, 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;', false);
}

function ensureMssqlDatabase(config, dry = false) {
  const dbName = config.database || 'hls_api';
  const escapedDbName = dbName.replace(/'/g, "''").replace(/]/g, ']]');
  const createQuery = `SET NOCOUNT ON; IF DB_ID(N'${escapedDbName}') IS NULL EXEC(N'CREATE DATABASE [${escapedDbName}]');`;
  runSqlcmd(config, createQuery, dry);
}

async function applyMigrations(config, direction = 'up', filePath = null, dry = false) {
  const migrationsDir = path.join(__dirname, '..', 'src', 'Migrations');
  const ext = config.type === 'mssql' ? 'mssql' : 'pgsql';
  let files = [];

  if (filePath) {
    if (fs.existsSync(filePath)) {
      files = [filePath];
    } else {
      console.error(`File not found: ${filePath}`);
      return false;
    }
  } else {
    const allFiles = fs.readdirSync(migrationsDir).filter(f => {
      if (config.type === 'mssql') {
        // MSSQL deve aplicar tanto arquivos dialeto-específicos quanto genéricos (*.sql).
        return f.includes('.mssql.') || (!f.includes('.pgsql.') && !f.includes('.mssql.') && f.endsWith('.sql'));
      }
      return f.includes('.pgsql.');
    });

    const upFiles = allFiles.filter(f => (f.endsWith('.up.sql') || /^\d+_.*\.sql$/i.test(f)) && !f.endsWith('.down.sql'));
    const downFiles = allFiles.filter(f => f.endsWith('.down.sql'));
    files = direction === 'up' ? upFiles.sort() : downFiles.sort().reverse();
  }

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    console.log(`\n[Migration] Applying ${file}...`);
    const success = config.type === 'mssql'
      ? runSqlcmd(config, sqlContent, dry)
      : runPsql(config, sqlContent, dry);
    if (!success && !dry) {
      console.error(`[Error] Migration failed: ${file}`);
      return false;
    }
  }
  return true;
}

async function main() {
  const env = { ...loadDotEnv(), ...process.env };
  const config = buildUriFromEnv(env);

  const args = process.argv.slice(2);
  const isUpdate = args.includes('--update');
  const isDown = args.includes('--down');
  const isDry = args.includes('--dry-run');
  const fileIdx = args.findIndex(a => a.startsWith('--file='));
  const filePath = fileIdx >= 0 ? args[fileIdx].split('=')[1] : null;

  console.log(`[Config] Database Type: ${config.type}`);
  console.log(`[Config] Host: ${config.host}:${config.port}`);

  try {
    if (config.type === 'mssql') {
      console.log('[Step 1] Ensuring database exists...');
      ensureMssqlDatabase(config, isDry);
    }

    if (isDown) {
      console.log('[Step 2] Rolling back migrations (DOWN)...');
      await applyMigrations(config, 'down', filePath, isDry);
    } else if (isUpdate) {
      console.log('[Step 2] Applying migrations (UP)...');
      await applyMigrations(config, 'up', filePath, isDry);
    } else {
      console.log('[Info] Use --update to apply UP migrations, --down to rollback.');
    }
    console.log('[Done] Migration completed!');
  } catch (err) {
    console.error('[Error]', err.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Erro ao executar migrations:', err);
  process.exit(1);
});
