/**
 * @file init_db.js
 * @description Tự động kiểm tra và khởi tạo CSDL SQL Server khi Docker Container khởi động.
 * Đảm bảo CSDL so_chi_tri_db và toàn bộ bảng, thủ tục luôn sẵn sàng trước khi Web Server chạy.
 */

const fs = require("fs");
const path = require("path");
const sql = require("mssql");

const server = process.env.DB_SERVER || "localhost";
const port = Number(process.env.DB_PORT) || 1433;
const user = process.env.DB_USER || "sa";
const password = process.env.DB_PASS || "SoChiTieu@2026StrongPass";
const targetDb = process.env.DB_NAME || "so_chi_tri_db";

const encryptOption = process.env.DB_ENCRYPT === "false" ? false : (process.env.DB_SERVER && process.env.DB_SERVER !== "localhost" && process.env.DB_SERVER !== "127.0.0.1");

const masterConfig = {
  user,
  password,
  server,
  port,
  database: "master",
  options: {
    encrypt: encryptOption,
    trustServerCertificate: true
  },
  connectionTimeout: 15000,
  requestTimeout: 120000
};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  console.log(`[INIT-DB] Đang kết nối tới SQL Server tại ${server}:${port}...`);
  for (let attempt = 1; attempt <= 60; attempt++) {
    try {
      const pool = await new sql.ConnectionPool(masterConfig).connect();
      const res = await pool.request().query("SELECT @@VERSION AS ver");
      await pool.close();
      console.log(`[INIT-DB] ✅ SQL Server đã sẵn sàng! (Lần thử ${attempt}/60)`);
      return;
    } catch (err) {
      if (attempt % 5 === 0 || attempt === 1) {
        console.log(`[INIT-DB] Đang đợi SQL Server khởi động... (${attempt}/60)`);
      }
      await sleep(2000);
    }
  }
  throw new Error("[INIT-DB] ❌ Quá thời gian chờ SQL Server khởi động.");
}

async function ensureDatabase() {
  const pool = await new sql.ConnectionPool(masterConfig).connect();
  try {
    const check = await pool
      .request()
      .query(`SELECT DB_ID('${targetDb}') AS db_id`);
    if (!check.recordset[0].db_id) {
      console.log(`[INIT-DB] Đang tạo CSDL '${targetDb}'...`);
      await pool
        .request()
        .query(`CREATE DATABASE [${targetDb}] COLLATE Vietnamese_CI_AS;`);
      console.log(`[INIT-DB] ✅ Đã tạo CSDL '${targetDb}'.`);
    } else {
      console.log(`[INIT-DB] CSDL '${targetDb}' đã có sẵn.`);
    }
  } finally {
    await pool.close();
  }
}

async function deploySchema() {
  const dbConfig = { ...masterConfig, database: targetDb };
  console.log(`[INIT-DB] Đang kết nối tới CSDL '${targetDb}' tại ${server}:${port}...`);
  let pool = null;
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      pool = await new sql.ConnectionPool(dbConfig).connect();
      console.log(`[INIT-DB] ✅ Kết nối thành công tới '${targetDb}'!`);
      break;
    } catch (err) {
      console.warn(`[INIT-DB] Đang thử kết nối lại (${attempt}/10): ${err.message}`);
      if (attempt === 10) throw err;
      await sleep(2500);
    }
  }

  try {
    const tableCheck = await pool
      .request()
      .query("SELECT COUNT(*) AS total FROM sys.tables");
    const count = tableCheck.recordset[0].total;

    if (count >= 10) {
      console.log(`[INIT-DB] ✅ CSDL '${targetDb}' đã có sẵn ${count} bảng dữ liệu.`);
      return;
    }

    console.log("[INIT-DB] 🚀 Bắt đầu khởi tạo 15 bảng và 32 Stored Procedures...");
    let scriptPath = path.resolve(__dirname, "..", "..", "database", "cloud_deploy_all.sql");
    if (!fs.existsSync(scriptPath)) {
      scriptPath = path.resolve(__dirname, "cloud_deploy_all.sql");
    }
    if (!fs.existsSync(scriptPath)) {
      scriptPath = path.resolve(__dirname, "..", "database", "cloud_deploy_all.sql");
    }

    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Không tìm thấy file: ${scriptPath}`);
    }

    const fullSql = fs.readFileSync(scriptPath, "utf8");
    const batches = fullSql.split(/^\s*GO\s*$/gim);

    console.log(`[INIT-DB] Tìm thấy ${batches.length} khối lệnh SQL. Đang thực thi...`);
    let executed = 0;

    for (const batch of batches) {
      const trimmed = batch.trim();
      if (!trimmed) continue;
      try {
        await pool.request().batch(trimmed);
        executed++;
      } catch (err) {
        // Bỏ qua cảnh báo đã tồn tại
        if (!err.message.includes("already exists") && !err.message.includes("There is already")) {
          console.warn(`[INIT-DB] Cảnh báo tại khối lệnh: ${err.message}`);
        }
      }
    }

    const finalTables = await pool.request().query("SELECT COUNT(*) AS total FROM sys.tables");
    const finalProcs = await pool.request().query("SELECT COUNT(*) AS total FROM sys.procedures");

    console.log("====================================================");
    console.log(`[INIT-DB] 🎉 KHỞI TẠO CSDL CLOUD THÀNH CÔNG!`);
    console.log(`          - Bảng dữ liệu (Tables)  : ${finalTables.recordset[0].total}`);
    console.log(`          - Thủ tục (Stored Procs) : ${finalProcs.recordset[0].total}`);
    console.log("====================================================");
  } finally {
    await pool.close();
  }
}

async function main() {
  try {
    const isCloud = process.env.DB_SERVER && process.env.DB_SERVER !== "localhost" && process.env.DB_SERVER !== "127.0.0.1";
    if (!isCloud) {
      await waitForServer();
      await ensureDatabase();
    }
    await deploySchema();
    console.log("[INIT-DB] Khởi tạo hoàn tất. Sẵn sàng khởi động Web Server!");
    process.exit(0);
  } catch (err) {
    console.error("[INIT-DB] Lỗi:", err.message);
    process.exit(1);
  }
}

main();