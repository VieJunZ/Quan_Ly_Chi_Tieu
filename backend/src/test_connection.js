/**
 * @file test_connection.js
 * @description Kiểm tra kết nối tới CSDL SQL Server (Local hoặc Cloud).
 * Chạy lệnh: node src/test_connection.js (từ thư mục backend)
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const db = require("./config/db");

async function test() {
  console.log("====================================================");
  console.log("  KIỂM TRA KẾT NỐI CSDL SQL SERVER");
  console.log("====================================================");
  console.log(`  Máy chủ (Server) : ${process.env.DB_SERVER || "(localdb)\\MSSQLLocalDB"}`);
  console.log(`  Cơ sở dữ liệu    : ${process.env.DB_NAME || "so_chi_tri_db"}`);
  console.log(`  Tài khoản (User) : ${process.env.DB_USER || "(Windows Auth / Trusted)"}`);
  console.log("  Đang kết nối...");

  try {
    const status = await db.waitForDb(15000);
    if (!status.connected) {
      console.error("\n❌ KẾT NỐI THẤT BẠI:");
      console.error("   " + status.error);
      process.exit(1);
    }

    console.log("\n✅ KẾT NỐI THÀNH CÔNG RỰC RỠ!");
    const tables = await db.query("SELECT COUNT(*) AS total FROM sys.tables");
    console.log(`   📊 Số bảng dữ liệu hiện có       : ${tables.recordset[0].total}`);

    const procs = await db.query("SELECT COUNT(*) AS total FROM sys.procedures");
    console.log(`   ⚙️  Số thủ tục lưu (Stored Procs) : ${procs.recordset[0].total}`);

    const users = await db.query("SELECT COUNT(*) AS total FROM dbo.users").catch(() => ({ recordset: [{ total: 0 }] }));
    console.log(`   👤 Số tài khoản người dùng       : ${users.recordset[0].total}`);
    console.log("====================================================");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ LỖI TRUY VẤN:", err.message);
    process.exit(1);
  }
}

test();

