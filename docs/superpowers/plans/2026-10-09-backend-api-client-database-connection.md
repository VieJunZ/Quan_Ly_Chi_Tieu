# Kế Hoạch Triển Khai Backend, Kết Nối Client & Cơ Sở Dữ Liệu

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng hệ thống Backend Node.js/Express hoàn chỉnh, khung kết nối Server - Client với Frontend và kết nối sẵn Cơ sở dữ liệu (MySQL / Flexible Local Storage) cho dự án Quản Lý Chi Tiêu.

**Architecture:** Áp dụng kiến trúc phân lớp chuẩn (Modular Layered Architecture) với Express.js, JWT Authentication + bcryptjs, CORS linh hoạt, lớp trừu tượng lưu trữ dữ liệu (Storage Abstraction) hỗ trợ tự động cả Local DB (`backend/data/db.json`) và MySQL (`database/init.sql` + `mysql2/promise`).

**Tech Stack:** Node.js (v24), Express, cors, dotenv, bcryptjs, jsonwebtoken, mysql2, Vanilla JS (Frontend).

## Global Constraints

- Backend chạy tại port `8080` theo đúng cấu hình `backend/.env`.
- Frontend chạy tại port `3000` hoặc mở trực tiếp trên trình duyệt, gọi API vào `http://localhost:8080`.
- Hợp đồng API phải khớp 100% với `frontend/js/api.js` (`/api/health`, `/api/auth/register`, `/api/auth/login`, `/api/categories`, `/api/dashboard`, `/api/transactions`).
- Mật khẩu người dùng bắt buộc mã hóa bằng `bcryptjs`.
- Tuyệt đối không làm hỏng giao diện thẩm mỹ HTML/CSS của Frontend.

---

### Task 1: Thiết Lập Script Khởi Tạo Cơ Sở Dữ Liệu (`database/init.sql`)

**Files:**
- Modify: `database/init.sql`

**Interfaces:**
- Produces: 3 bảng `users`, `categories`, `transactions` và dữ liệu seed 12 danh mục mặc định cho MySQL 8.0.

- [ ] **Step 1: Viết script DDL và seed data cho MySQL trong database/init.sql**

```sql
-- database/init.sql
-- Khởi tạo cơ sở dữ liệu Quản Lý Chi Tiêu

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    icon VARCHAR(50) DEFAULT 'circle-ellipsis',
    color VARCHAR(30) DEFAULT 'blue',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    note TEXT NULL,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_trans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_trans_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    INDEX idx_user_date (user_id, transaction_date)
);

-- Seed danh mục mặc định
INSERT INTO categories (id, name, type, icon, color) VALUES
(1, 'Ăn uống', 'expense', 'utensils', 'amber'),
(2, 'Nhà cửa & Phòng trọ', 'expense', 'home', 'blue'),
(3, 'Di chuyển & Xăng xe', 'expense', 'car', 'cyan'),
(4, 'Mua sắm cá nhân', 'expense', 'shopping-bag', 'rose'),
(5, 'Hóa đơn & Tiện ích', 'expense', 'receipt', 'orange'),
(6, 'Học tập & Tri thức', 'expense', 'book-open', 'indigo'),
(7, 'Giải trí & Bạn bè', 'expense', 'gamepad-2', 'violet'),
(8, 'Y tế & Sức khỏe', 'expense', 'heart-pulse', 'red'),
(9, 'Khoản chi khác', 'expense', 'circle-ellipsis', 'emerald'),
(10, 'Tiền lương', 'income', 'wallet', 'emerald'),
(11, 'Tiền thưởng', 'income', 'gift', 'green'),
(12, 'Trợ cấp & Học bổng', 'income', 'hand-coins', 'teal'),
(13, 'Thu nhập khác', 'income', 'plus-circle', 'lime')
ON DUPLICATE KEY UPDATE name=VALUES(name);
```

- [ ] **Step 2: Xác minh cú pháp file SQL**

Chạy kiểm tra file `database/init.sql` đã có nội dung đầy đủ.

- [ ] **Step 3: Commit**

```bash
git add database/init.sql
git commit -m "feat(db): add init sql script with tables and seed categories"
```

---

### Task 2: Cấu Hình Backend & Cài Đặt Thư Viện (`backend/package.json`, `backend/.env`)

**Files:**
- Create: `backend/package.json`
- Modify: `backend/.env`

**Interfaces:**
- Produces: Môi trường Node.js dependencies (`express`, `cors`, `dotenv`, `bcryptjs`, `jsonwebtoken`, `mysql2`).

- [ ] **Step 1: Khởi tạo package.json tại backend/package.json**

```json
{
  "name": "quan-ly-chi-tieu-backend",
  "version": "1.0.0",
  "description": "Backend API Server cho dự án Quản Lý Chi Tiêu",
  "main": "src/server.js",
  "type": "commonjs",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "jsonwebtoken": "^9.0.2",
    "mysql2": "^3.12.0"
  }
}
```

- [ ] **Step 2: Cập nhật biến môi trường backend/.env**

Bổ sung biến `USE_DATABASE=false` (mặc định cho phép chạy test ngay cả khi chưa bật MySQL), và giữ nguyên cấu hình MySQL để khi bật DB chỉ cần đổi thành `true`:

```env
# === CẤU HÌNH SERVER ===
PORT=8080

# === CƠ CHẾ DATABASE ===
# Đặt true nếu đã khởi động MySQL, false để sử dụng bộ lưu trữ cục bộ tự động
USE_DATABASE=false

# === CẤU HÌNH DATABASE (MySQL) ===
DB_HOST=localhost
DB_PORT=3306
DB_NAME=quan_ly_chi_tieu_db
DB_USER=root
DB_PASS=root

# === BẢO MẬT & JWT ===
JWT_SECRET=supersecretjwtkey_sprint1
JWT_EXPIRES_IN=7d
```

- [ ] **Step 3: Cài đặt npm dependencies trong thư mục backend**

Run: `cd backend && npm install`
Expected: `added ... packages` thành công.

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/.env backend/package-lock.json
git commit -m "feat(backend): configure dependencies and env settings"
```

---

### Task 3: Tầng Dữ Liệu & Kết Nối CSDL (`backend/src/config/db.js`, `backend/src/services/storage.js`)

**Files:**
- Create: `backend/src/config/db.js`
- Create: `backend/src/services/storage.js`

**Interfaces:**
- `db.js`: Hàm `getDbPool()`, `testDbConnection()`
- `storage.js`: Export các hàm chuẩn:
  - `storage.init()`
  - `storage.findUserByUsername(username)`
  - `storage.createUser(user)`
  - `storage.findUserById(id)`
  - `storage.getCategories(type)`
  - `storage.getDashboard(userId)`
  - `storage.createTransaction(transaction)`
  - `storage.getHealthStatus()`

- [ ] **Step 1: Viết module kết nối MySQL backend/src/config/db.js**

```javascript
// backend/src/config/db.js
const mysql = require("mysql2/promise");

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
      queueLimit: 0
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

module.exports = { getDbPool, testDbConnection };
```

- [ ] **Step 2: Viết lớp lưu trữ dữ liệu đa năng backend/src/services/storage.js**

Cung cấp lưu trữ tự động trong `backend/data/db.json` với dữ liệu seed sẵn nếu MySQL chưa bật, và tự động gọi MySQL queries nếu `USE_DATABASE=true`.

- [ ] **Step 3: Chạy script test khởi tạo storage**

Run: `node -e "require('./backend/src/services/storage.js').init().then(s => console.log('Storage initialized:', s.mode))"`
Expected: In ra `Storage initialized: local` hoặc `mysql`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/config/db.js backend/src/services/storage.js
git commit -m "feat(backend): add db pool config and unified storage service"
```

---

### Task 4: Middlewares & Khung Server Express (`backend/src/middlewares/`, `backend/src/server.js`)

**Files:**
- Create: `backend/src/middlewares/auth.middleware.js`
- Create: `backend/src/middlewares/error.middleware.js`
- Create: `backend/src/routes/health.routes.js`
- Create: `backend/src/server.js`

**Interfaces:**
- `auth.middleware.js`: Middleware `authenticateToken(req, res, next)` giải mã JWT Bearer Token, gán `req.user = { id, username }`.
- `error.middleware.js`: Middleware `errorHandler(err, req, res, next)` trả về `{ message, error_code }`.
- `health.routes.js`: Router cho `GET /api/health`.
- `server.js`: Khởi chạy Express server lắng nghe tại port 8080.

- [ ] **Step 1: Viết auth middleware backend/src/middlewares/auth.middleware.js**
- [ ] **Step 2: Viết error middleware backend/src/middlewares/error.middleware.js**
- [ ] **Step 3: Viết route kiểm tra sức khỏe backend/src/routes/health.routes.js**
- [ ] **Step 4: Viết server chính backend/src/server.js**
- [ ] **Step 5: Kiểm tra server khởi động và endpoint /api/health**

Run: Chạy `node backend/src/server.js` trong background và gọi `curl http://localhost:8080/api/health`.
Expected: HTTP 200 OK trả về `{ "status": "ok", ... }`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/middlewares/ backend/src/routes/health.routes.js backend/src/server.js
git commit -m "feat(backend): implement server shell, auth and error middlewares"
```

---

### Task 5: Triển Khai Tuyến Xác Thực Auth Routes (`backend/src/routes/auth.routes.js`)

**Files:**
- Create: `backend/src/routes/auth.routes.js`
- Modify: `backend/src/server.js` (gắn route `/api/auth`)

**Interfaces:**
- `POST /api/auth/register` (body: `{ username, password }`) -> `{ token, user_id, user }`
- `POST /api/auth/login` (body: `{ username, password }`) -> `{ token, user_id, user }`

- [ ] **Step 1: Viết route đăng ký và đăng nhập backend/src/routes/auth.routes.js**
  - Validate username (>= 3 ký tự), password (>= 8 ký tự).
  - Băm password bằng `bcryptjs.hash(password, 10)`.
  - Sinh token bằng `jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' })`.
  - So khớp password bằng `bcryptjs.compare(password, user.password)`.
- [ ] **Step 2: Gắn auth router vào server.js**
- [ ] **Step 3: Kiểm thử route đăng ký và đăng nhập qua curl/node**
- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/auth.routes.js backend/src/server.js
git commit -m "feat(backend): implement register and login api routes with jwt"
```

---

### Task 6: Triển Khai API Categories, Transactions & Dashboard

**Files:**
- Create: `backend/src/routes/category.routes.js`
- Create: `backend/src/routes/transaction.routes.js`
- Create: `backend/src/routes/dashboard.routes.js`
- Modify: `backend/src/server.js` (gắn các routes)

**Interfaces:**
- `GET /api/categories`: Trả về danh sách danh mục (hỗ trợ `?type=income|expense`).
- `POST /api/transactions`: Xác thực token, kiểm tra amount > 0, tạo giao dịch.
- `GET /api/dashboard`: Xác thực token, tính tổng thu, tổng chi tháng hiện tại, số dư, và danh sách giao dịch gần nhất.

- [ ] **Step 1: Viết category.routes.js**
- [ ] **Step 2: Viết transaction.routes.js**
- [ ] **Step 3: Viết dashboard.routes.js**
- [ ] **Step 4: Đăng ký router trong server.js**
- [ ] **Step 5: Kiểm thử luồng nghiệp vụ tạo giao dịch và dashboard**
- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/ backend/src/server.js
git commit -m "feat(backend): implement categories, transactions and dashboard api routes"
```

---

### Task 7: Thiết Lập Khung Kết Nối Phía Frontend Client (`frontend/`)

**Files:**
- Create: `frontend/js/config.js`
- Modify: `frontend/index.html`

**Interfaces:**
- `frontend/js/config.js`: Khởi tạo `window.APP_CONFIG = { apiBaseUrl: "http://localhost:8080", useMock: false }`.
- `frontend/index.html`: Nhúng thẻ `<script src="js/config.js"></script>` ngay trước `js/api.js`.

- [ ] **Step 1: Tạo file cấu hình frontend/js/config.js**

```javascript
// frontend/js/config.js
window.APP_CONFIG = {
  apiBaseUrl: "http://localhost:8080",
  useMock: false // Chuyển sang kết nối trực tiếp Backend
};
```

- [ ] **Step 2: Nạp js/config.js trong frontend/index.html**

Thêm `<script src="js/config.js" defer></script>` trước `<script src="js/api.js" defer></script>`.

- [ ] **Step 3: Kiểm tra cấu hình và kết nối client**
- [ ] **Step 4: Commit**

```bash
git add frontend/js/config.js frontend/index.html
git commit -m "feat(frontend): add live api config and attach to index.html"
```

---

### Task 8: Tự Động Hóa Kiểm Thử Tích Hợp Toàn Diện (End-to-End Verification)

**Files:**
- Create: `tests/api_test.js`

**Interfaces:**
- Script tự động chạy kịch bản kiểm thử toàn bộ API từ A -> Z:
  1. Kiểm tra Ping Health Server (`GET /api/health`).
  2. Đăng ký tài khoản mới (`POST /api/auth/register`).
  3. Đăng nhập lấy token (`POST /api/auth/login`).
  4. Lấy danh sách Categories (`GET /api/categories`).
  5. Tạo 2 giao dịch (1 Thu nhập, 1 Chi tiêu) (`POST /api/transactions`).
  6. Lấy Dashboard kiểm tra số dư và danh sách giao dịch (`GET /api/dashboard`).

- [ ] **Step 1: Viết script kiểm thử tích hợp tests/api_test.js**
- [ ] **Step 2: Khởi chạy Backend và chạy kịch bản tests/api_test.js**

Run: `node tests/api_test.js`
Expected: Tất cả 6 bước đều PASS với mã màu xanh (100% Passed).

- [ ] **Step 3: Commit**

```bash
git add tests/api_test.js
git commit -m "test: add comprehensive end-to-end api verification suite"
```
