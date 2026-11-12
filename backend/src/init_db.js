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
      await ensureMigrationPatches(pool);
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
    await ensureMigrationPatches(pool);
  } finally {
    await pool.close();
  }
}

async function ensureMigrationPatches(pool) {
  console.log("[INIT-DB] 🔍 Đang kiểm tra các bản vá schema mở rộng (user_friends, debts.linked_user_id, expense_groups)...");
  const patches = [
    `IF NOT EXISTS (
       SELECT 1 FROM sys.columns 
       WHERE object_id = OBJECT_ID(N'dbo.debts') AND name = N'linked_user_id'
     )
     BEGIN
       ALTER TABLE dbo.debts ADD linked_user_id INT NULL;
       PRINT N'Đã thêm cột linked_user_id vào bảng debts.';
     END`,

    `IF OBJECT_ID(N'dbo.user_friends', N'U') IS NULL
     BEGIN
       CREATE TABLE dbo.user_friends (
         id         INT IDENTITY(1, 1) NOT NULL,
         user_id    INT                NOT NULL,
         friend_id  INT                NOT NULL,
         status     VARCHAR(20)        NOT NULL CONSTRAINT df_friends_status DEFAULT 'pending',
         created_at DATETIME2(0)       NOT NULL CONSTRAINT df_friends_created_at DEFAULT SYSDATETIME(),
         updated_at DATETIME2(0)       NULL,

         CONSTRAINT pk_user_friends PRIMARY KEY (id),
         CONSTRAINT uq_friend_pair UNIQUE (user_id, friend_id),
         CONSTRAINT ck_not_self_friend CHECK (user_id <> friend_id),
         CONSTRAINT fk_friends_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
         CONSTRAINT fk_friends_friend FOREIGN KEY (friend_id) REFERENCES dbo.users(id)
       );
       CREATE INDEX ix_friends_user_id ON dbo.user_friends(user_id);
       CREATE INDEX ix_friends_friend_id ON dbo.user_friends(friend_id);
       PRINT N'Đã tạo bảng user_friends.';
     END`,

    `IF OBJECT_ID(N'dbo.user_friends', N'U') IS NOT NULL
     BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM sys.columns 
         WHERE object_id = OBJECT_ID(N'dbo.user_friends') AND name = N'status'
       )
       BEGIN
         ALTER TABLE dbo.user_friends ADD status VARCHAR(20) NOT NULL CONSTRAINT df_friends_status DEFAULT 'accepted';
         PRINT N'Đã thêm cột status vào user_friends.';
       END

       IF NOT EXISTS (
         SELECT 1 FROM sys.columns 
         WHERE object_id = OBJECT_ID(N'dbo.user_friends') AND name = N'updated_at'
       )
       BEGIN
         ALTER TABLE dbo.user_friends ADD updated_at DATETIME2(0) NULL;
         PRINT N'Đã thêm cột updated_at vào user_friends.';
       END
     END`,

    `IF OBJECT_ID(N'dbo.expense_groups', N'U') IS NULL
     BEGIN
       CREATE TABLE dbo.expense_groups (
         id          INT IDENTITY(1, 1) NOT NULL,
         name        NVARCHAR(100)      NOT NULL,
         invite_code VARCHAR(12)        NOT NULL,
         created_by  INT                NOT NULL,
         created_at  DATETIME2(0)       NOT NULL CONSTRAINT df_expense_groups_created_at DEFAULT SYSDATETIME(),

         CONSTRAINT pk_expense_groups PRIMARY KEY (id),
         CONSTRAINT uq_expense_groups_code UNIQUE (invite_code),
         CONSTRAINT fk_expense_groups_creator FOREIGN KEY (created_by) REFERENCES dbo.users(id)
       );
     END`,

    `IF OBJECT_ID(N'dbo.group_members', N'U') IS NULL
     BEGIN
       CREATE TABLE dbo.group_members (
         group_id   INT          NOT NULL,
         user_id    INT          NOT NULL,
         role       VARCHAR(20)  NOT NULL CONSTRAINT df_group_members_role DEFAULT 'member',
         joined_at  DATETIME2(0) NOT NULL CONSTRAINT df_group_members_joined_at DEFAULT SYSDATETIME(),

         CONSTRAINT pk_group_members PRIMARY KEY (group_id, user_id),
         CONSTRAINT fk_group_members_group FOREIGN KEY (group_id) REFERENCES dbo.expense_groups(id) ON DELETE CASCADE,
         CONSTRAINT fk_group_members_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
       );
     END`,

    `IF OBJECT_ID(N'dbo.group_expenses', N'U') IS NULL
     BEGIN
       CREATE TABLE dbo.group_expenses (
         id             INT IDENTITY(1, 1) NOT NULL,
         group_id       INT                NOT NULL,
         payer_id       INT                NOT NULL,
         amount         DECIMAL(15, 2)     NOT NULL,
         category_name  NVARCHAR(50)       NOT NULL CONSTRAINT df_group_expenses_cat DEFAULT N'Chi tiêu chung',
         note           NVARCHAR(250)      NULL,
         created_at     DATETIME2(0)       NOT NULL CONSTRAINT df_group_expenses_created_at DEFAULT SYSDATETIME(),

         CONSTRAINT pk_group_expenses PRIMARY KEY (id),
         CONSTRAINT fk_group_expenses_group FOREIGN KEY (group_id) REFERENCES dbo.expense_groups(id) ON DELETE CASCADE,
         CONSTRAINT fk_group_expenses_payer FOREIGN KEY (payer_id) REFERENCES dbo.users(id),
         CONSTRAINT ck_group_expenses_amount CHECK (amount > 0)
       );
     END`
  ];

  for (const patch of patches) {
    try {
      await pool.request().batch(patch);
    } catch (err) {
      if (!err.message.includes("already exists") && !err.message.includes("There is already")) {
        console.warn(`[INIT-DB] Thông báo patch: ${err.message}`);
      }
    }
  }
  console.log("[INIT-DB] ✅ Đã hoàn tất kiểm tra và đảm bảo các bảng mở rộng sẵn sàng.");
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