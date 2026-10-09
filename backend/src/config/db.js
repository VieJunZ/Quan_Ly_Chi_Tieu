// backend/src/config/db.js
const mysql = require("mysql2/promise");
require("dotenv").config();

let pool = null;

function getDbPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASS || "root",
      database: process.env.DB_NAME || "quan_ly_chi_tieu_db",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: "utf8mb4"
    });
  }
  return pool;
}

async function testDbConnection() {
  try {
    const db = getDbPool();
    const [rows] = await db.query("SELECT 1 AS connected");
    return { connected: true, details: rows };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

module.exports = {
  getDbPool,
  testDbConnection
};
