// backend/src/server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const storage = require("./services/storage");
const healthRoutes = require("./routes/health.routes");
const { errorHandler, notFoundHandler } = require("./middlewares/error.middleware");

const app = express();
const PORT = process.env.PORT || 8080;

// Cấu hình CORS mở rộng cho phép Frontend kết nối
app.use(
  cors({
    origin: true, // Cho phép mọi origin phát triển cục bộ (localhost:3000, Live Server 5500, file://, v.v.)
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log request đơn giản
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== "test") {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Gắn route kiểm tra sức khỏe
app.use("/api", healthRoutes);

// Khởi tạo các route tiếp theo (sẽ được bổ sung trong Task 5 & Task 6)
try {
  const authRoutes = require("./routes/auth.routes");
  app.use("/api/auth", authRoutes);
} catch (e) {
  // Sẽ được kích hoạt khi hoàn thành Task 5
}

try {
  const categoryRoutes = require("./routes/category.routes");
  app.use("/api/categories", categoryRoutes);
} catch (e) {}

try {
  const transactionRoutes = require("./routes/transaction.routes");
  app.use("/api/transactions", transactionRoutes);
} catch (e) {}

try {
  const dashboardRoutes = require("./routes/dashboard.routes");
  app.use("/api/dashboard", dashboardRoutes);
} catch (e) {}

// Xử lý 404 và Error Middleware
app.use(notFoundHandler);
app.use(errorHandler);

let serverInstance = null;

async function startServer() {
  await storage.init();
  return new Promise((resolve) => {
    serverInstance = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`  Sổ Chi Backend Server đang chạy tại port ${PORT}`);
      console.log(`  Health API: http://localhost:${PORT}/api/health`);
      console.log(`====================================================`);
      resolve(serverInstance);
    });
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error("Không thể khởi động server:", err);
    process.exit(1);
  });
}

module.exports = { app, startServer, storage };
