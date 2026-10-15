/**
 * @file db.js
 * @description Cấu hình kết nối Cơ sở dữ liệu MySQL thông qua Connection Pool (mysql2/promise).
 * Giúp tái sử dụng kết nối, tăng tốc độ xử lý và tự động quản lý vòng đời truy vấn CSDL.
 */

const mysql = require("mysql2/promise");
require("dotenv").config();

// Biến lưu trữ Pool kết nối đơn nhất (Singleton Pattern)
let pool = null;

/**
 * Khởi tạo hoặc lấy Pool kết nối MySQL hiện tại.
 * @returns {mysql.Pool} MySQL connection pool instance
 */
function getDbPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASS || "root",
      database: process.env.DB_NAME || "quan_ly_chi_tieu_db",
      waitForConnections: true, // Chờ khi tất cả kết nối trong pool đang bận
      connectionLimit: 10,      // Số lượng kết nối tối đa chạy đồng thời
      queueLimit: 0,            // Không giới hạn hàng đợi chờ kết nối
      charset: "utf8mb4"        // Hỗ trợ tiếng Việt có dấu và biểu tượng cảm xúc (emoji)
    });
  }
  return pool;
}

/**
 * Kiểm tra thử trạng thái kết nối tới CSDL MySQL (Health-check DB).
 * Thực hiện truy vấn "SELECT 1" để xác minh thông tin đăng nhập và mạng.
 * 
 * @async
 * @returns {Promise<{connected: boolean, details?: any, error?: string}>}
 */
async function testDbConnection() {
  try {
    const db = getDbPool();
    const [rows] = await db.query("SELECT 1 AS connected");
    return { connected: true, details: rows };
  } catch (error) {
    // Trả về kết quả ngắt kết nối an toàn, không làm crash server
    return { connected: false, error: error.message };
  }
}

module.exports = {
  getDbPool,
  testDbConnection
};
