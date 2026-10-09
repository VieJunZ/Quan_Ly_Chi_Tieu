/**
 * @file server.js
 * @description File khởi động chính của ứng dụng Backend (Server Entry Point).
 * Tích hợp các chuẩn bảo mật:
 *   - Ẩn header X-Powered-By (Information Disclosure Prevention).
 *   - Giới hạn kích thước payload (DoS Prevention).
 *   - CORS kiểm soát linh hoạt trong môi trường dev.
 *   - Định tuyến API, Middleware xử lý lỗi tập trung.
 */

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const storage = require("./services/storage");
const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const categoryRoutes = require("./routes/category.routes");
const transactionRoutes = require("./routes/transaction.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const { errorHandler, notFoundHandler } = require("./middlewares/error.middleware");

const app = express();
const PORT = process.env.PORT || 8080;

// 1. Bảo mật: Ẩn thông tin framework Express khỏi HTTP Header để chống quét lỗ hổng
app.disable("x-powered-by");

// 2. Cấu hình CORS (Cross-Origin Resource Sharing)
// Cho phép Client từ các cổng khác (port 3000, Live Server 5500, file cục bộ) gọi API không bị chặn
app.use(
  cors({
    origin: true, // Chấp nhận mọi nguồn gốc gửi đến trong môi trường phát triển
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// 3. Middleware phân tích cú pháp dữ liệu kèm giới hạn kích thước (Chống tấn công tràn bộ nhớ DoS)
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// 4. Middleware ghi log các HTTP request vào console để theo dõi luồng
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== "test") {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  }
  next();
});

// 5. Gắn kết các tuyến API (Routes Mounting)
app.use("/api", healthRoutes);               // GET /api/health
app.use("/api/auth", authRoutes);           // POST /api/auth/register, POST /api/auth/login
app.use("/api/categories", categoryRoutes); // GET /api/categories
app.use("/api/transactions", transactionRoutes); // POST /api/transactions
app.use("/api/dashboard", dashboardRoutes); // GET /api/dashboard

// 6. Middleware xử lý lỗi (Bắt buộc đặt sau các routes)
app.use(notFoundHandler); // Bắt lỗi 404 Not Found
app.use(errorHandler);    // Bắt lỗi 500 hoặc các lỗi nghiệp vụ nội bộ

let serverInstance = null;

/**
 * Hàm khởi chạy Express Server và kết nối bộ lưu trữ CSDL.
 * @async
 * @returns {Promise<import('http').Server>} Trả về instance của HTTP server
 */
async function startServer() {
  // Khởi động kết nối CSDL hoặc bộ lưu trữ cục bộ
  await storage.init();
  
  return new Promise((resolve) => {
    serverInstance = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`  Sổ Chi Backend Server đang chạy tại port ${PORT}`);
      console.log(`  Health API:     http://localhost:${PORT}/api/health`);
      console.log(`  Categories API: http://localhost:${PORT}/api/categories`);
      console.log(`====================================================`);
      resolve(serverInstance);
    });
  });
}

// Nếu file được gọi trực tiếp bằng lệnh "node server.js", tự động khởi động server
if (require.main === module) {
  startServer().catch((err) => {
    console.error("Không thể khởi động server:", err);
    process.exit(1);
  });
}

module.exports = { app, startServer, storage };
