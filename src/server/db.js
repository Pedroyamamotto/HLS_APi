import sql from "mssql/msnodesqlv8.js";
import dotenv from "dotenv";

dotenv.config();

const config = {
  server: process.env.MSSQL_HOST || "localhost",
  database: process.env.MSSQL_DATABASE || "hls_api",
  driver: "msnodesqlv8",
  options: {
    trustedConnection: true,
    trustServerCertificate: true
  },
  connectionString:
    `Driver={ODBC Driver 17 for SQL Server};` +
    `Server=${process.env.MSSQL_HOST || "localhost"};` +
    `Database=${process.env.MSSQL_DATABASE || "hls_api"};` +
    `Trusted_Connection=Yes;` +
    `TrustServerCertificate=Yes;`
};

let pool;

export async function getPool() {
  try {
    if (pool && pool.connected) return pool;

    pool = await sql.connect(config);
    return pool;
  } catch (error) {
    console.error("ERRO CONEXAO SQL:", JSON.stringify(error, null, 2));
    throw error;
  }
}

export default sql;