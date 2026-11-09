/**
 * @file server.js
 * @description Khởi động máy chủ: API ở /api, giao diện web (thư mục frontend) ở cùng cổng,
 * nên điện thoại trong cùng mạng Wi-Fi mở http://<ip-máy-tính>:8080 là dùng được.
 */

// Polyfill Promise.withResolvers cho Node.js v20 trở xuống
if (!Promise.withResolvers) {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");

const ENV_FILE = path.join(__dirname, "..", ".env");
require("dotenv").config({ path: ENV_FILE });

/**
 * JWT_SECRET bắt buộc phải có. Lần chạy đầu chưa có thì tự sinh chuỗi ngẫu nhiên
 * và ghi vào backend/.env (file này không đưa lên git).
 */
function ensureJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) return;
  const secret = crypto.randomBytes(48).toString("hex");
  const prefix = fs.existsSync(ENV_FILE) && !fs.readFileSync(ENV_FILE, "utf8").endsWith("\n") ? "\n" : "";
  fs.appendFileSync(ENV_FILE, `${prefix}JWT_SECRET=${secret}\n`);
  process.env.JWT_SECRET = secret;
  console.log("Đã tạo JWT_SECRET mới trong backend/.env");
}
ensureJwtSecret();

const db = require("./config/db");
const demo = require("./services/demo.service");
const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const categoryRoutes = require("./routes/category.routes");
const transactionRoutes = require("./routes/transaction.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const scanRoutes = require("./routes/scan.routes");
const debtRoutes = require("./routes/debt.routes");
const walletRoutes = require("./routes/wallet.routes");
const surveyRoutes = require("./routes/survey.routes");
const budgetRoutes = require("./routes/budget.routes");
const challengeRoutes = require("./routes/challenge.routes");
const petShopRoutes = require("./routes/petShop.routes");
const groupRoutes = require("./routes/group.routes");
const friendRoutes = require("./routes/friend.routes");
const ocr = require("./services/ocr.service");
const hasher = require("./services/hash.service");
const { errorHandler, notFoundHandler } = require("./middlewares/error.middleware");
const { langMiddleware } = require("./lib/i18n");
const { createStaticServer, seoRoutes } = require("./middlewares/static.middleware");

const app = express();
const PORT = Number(process.env.PORT) || 8080;
const FRONTEND_DIR = path.resolve(__dirname, "..", "..", "frontend");

app.disable("x-powered-by");
app.set("trust proxy", "loopback");

app.use(cors({
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Lang"]
}));
// Đặt trước express.json để cả lỗi đọc JSON cũng được dịch khi app chọn tiếng Anh
app.use("/api", langMiddleware);
app.use(express.json({ limit: "200kb" }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
  next();
});

if (process.env.NODE_ENV !== "test") {
  app.use("/api", (req, res, next) => {
    const started = Date.now();
    res.on("finish", () => {
      console.log(`[${new Date().toLocaleTimeString("vi-VN")}] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`);
    });
    next();
  });
}

app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/scan", scanRoutes);
app.use("/api/debts", debtRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/survey", surveyRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/challenges", challengeRoutes);
app.use("/api/pet-shop", petShopRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api", notFoundHandler);

// Xác thực Digital Asset Links cho Android TWA APK (loại bỏ hoàn toàn thanh địa chỉ web)
const ANDROID_ASSET_LINKS = [{
  relation: ["delegate_permission/common.handle_all_urls"],
  target: {
    namespace: "android_app",
    package_name: "com.onrender.quan_ly_chi_tieu_k5kn.twa",
    sha256_cert_fingerprints: ["24:3D:61:58:16:4A:FA:DB:60:39:AF:B5:04:3E:5D:41:A8:F9:97:21:57:ED:08:C6:C5:C6:82:48:C6:2D:4A:5B"]
  }
}];

app.get("/.well-known/assetlinks.json", (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.json(ANDROID_ASSET_LINKS);
});

// Giao diện web & mobile app
if (fs.existsSync(FRONTEND_DIR)) {
  seoRoutes(app);
  const staticServer = createStaticServer(FRONTEND_DIR);
  // Phục vụ ứng dụng tại cả / và /app/ để tương thích hoàn toàn
  app.use("/app", staticServer);
  app.use("/", staticServer);
}

app.use(notFoundHandler);
app.use(errorHandler);

let serverInstance = null;
let cleanupTimer = null;

async function cleanupDemoUsers() {
  try {
    const deleted = await demo.cleanupExpired();
    if (deleted > 0) console.log(`Đã xóa ${deleted} tài khoản dùng thử hết hạn.`);
    // Lần quét bill/tin nhắn không được xác nhận sau 1 ngày thì xóa (chứa nội dung tin nhắn ngân hàng)
    await db.query(`DELETE FROM dbo.receipt_scans
                     WHERE transaction_id IS NULL AND created_at < DATEADD(DAY, -1, SYSDATETIME())`);
  } catch (error) {
    console.error("Không dọn được dữ liệu tạm:", error.message);
  }
}

async function startServer() {
  const status = await db.waitForDb(Number(process.env.DB_WAIT_MS) || 60000);
  if (!status.connected) {
    throw new Error(`Không kết nối được SQL Server: ${status.error}\n`
      + "Hãy chạy database\\mo_rong\\setup_mo_rong.bat trước, hoặc kiểm tra DB_SERVER/DB_NAME trong backend/.env");
  }

  // Chạy nhiều tiến trình (cluster.js) thì chỉ tiến trình số 1 dọn dữ liệu tạm
  if (!process.env.WORKER_ID || process.env.WORKER_ID === "1") {
    await cleanupDemoUsers();
    cleanupTimer = setInterval(cleanupDemoUsers, 60 * 60 * 1000);
    cleanupTimer.unref();
  }

  // Nạp sẵn bộ đọc ảnh để lần quét bill đầu tiên không phải đợi (lần đầu sẽ tải dữ liệu tiếng Việt ~7 MB)
  if (process.env.NODE_ENV !== "test") {
    ocr.getWorker().catch((error) => console.error("Chưa nạp được bộ đọc ảnh (OCR):", error.message));
  }

  return new Promise((resolve) => {
    serverInstance = app.listen(PORT, () => {
      // Giữ kết nối lâu hơn bộ cân bằng tải/proxy phía trước (thường 60 giây) để không bị cắt ngang
      serverInstance.keepAliveTimeout = 65 * 1000;
      serverInstance.headersTimeout = 66 * 1000;
      if (process.env.WORKER_ID && process.env.WORKER_ID !== "1") return resolve(serverInstance);
      console.log("====================================================");
      console.log(`  Quản lý thu chi đang chạy: http://localhost:${PORT}/app/`);
      console.log(`  Xem dạng điện thoại:       http://localhost:${PORT}/app/mobile.html`);
      console.log(`  CSDL: ${status.database_name}`);
      console.log("====================================================");
      resolve(serverInstance);
    });
  });
}

async function stopServer() {
  if (cleanupTimer) clearInterval(cleanupTimer);
  if (serverInstance) await new Promise((resolve) => serverInstance.close(resolve));
  await ocr.shutdown();
  await hasher.shutdown();
  await db.closePool();
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => stopServer().finally(() => process.exit(0)));
  }
}

module.exports = { app, startServer, stopServer };
