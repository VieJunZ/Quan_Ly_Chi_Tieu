# Tài Liệu Thiết Kế Kỹ Thuật: Kết Nối Backend, Client (Frontend) & Cơ Sở Dữ Liệu

- **Dự án**: Quản Lý Chi Tiêu (Monorepo)
- **Ngày lập**: 2026-10-09
- **Tác giả / Phụ trách**: Backend Developer (Team BE)

---

## 1. Mục Tiêu & Phạm Vi (Goals & Scope)

### 1.1. Mục tiêu

- Xây dựng hệ thống Backend hoàn chỉnh sử dụng **Node.js + Express** tại thư mục `backend/`.
- Cung cấp toàn bộ các API Endpoints chuẩn RESTful để kết nối với Frontend (`frontend/js/api.js` và `frontend/js/app.js`).
- Thiết lập khung kết nối Client - Server mượt mà, cấu hình CORS, xử lý lỗi mạng và cấu hình gọi API thật (`window.APP_CONFIG.useMock = false`).
- Chuẩn bị sẵn tầng CSDL: File SQL khởi tạo (`database/init.sql`) đầy đủ bảng và dữ liệu mẫu, kèm module kết nối MySQL (`mysql2/promise`).
- Hỗ trợ cơ chế **Lưu trữ linh hoạt (Flexible Storage)**: Khi chưa bật MySQL, Backend tự động lưu trữ dữ liệu vào file JSON cục bộ (`backend/data/db.json`), cho phép chạy và kiểm thử ngay lập tức 100% tính năng mà không bị nghẽn do thiếu MySQL. Khi bật MySQL, chỉ cần đổi `USE_DATABASE=true` trong `backend/.env`.

### 1.2. Ngoài phạm vi (Out of Scope)

- Không can thiệp hoặc thay đổi giao diện thẩm mỹ HTML/CSS vốn có của Frontend.
- Không ép buộc cài đặt phần mềm bên thứ 3 phức tạp.

---

## 2. Kiến Trúc Tổng Thể Hệ Thống

```
+--------------------------------------------------------------------+
|                       Frontend (Client)                            |
|   index.html  <--  js/config.js  <--  js/api.js  <--  js/app.js    |
+--------------------------------------------------------------------+
                                |
               HTTP RESTful API | (Fetch JSON, Bearer Token)
                                v
+--------------------------------------------------------------------+
|                       Backend (Express Server)                     |
|                                                                    |
|  [ CORS & JSON Middleware ] -> [ Auth Middleware (JWT Verify) ]    |
|                                                                    |
|  Routes:                                                           |
|    - GET  /api/health                                              |
|    - POST /api/auth/register & /api/auth/login                     |
|    - GET  /api/categories                                          |
|    - GET  /api/dashboard                                           |
|    - POST /api/transactions                                        |
|                                                                    |
|  [ Storage Service Abstraction ]                                  |
+--------------------------------------------------------------------+
                |                                    |
 (USE_DATABASE=false)                       (USE_DATABASE=true)
                v                                    v
+-------------------------------+   +--------------------------------+
|  Local File Storage           |   |  MySQL Database 8.0            |
|  backend/data/db.json         |   |  quan_ly_chi_tieu_db (Port 3306|
|  (Tự tạo, chạy ngay lập tức)  |   |  Khởi tạo qua init.sql)        |
+-------------------------------+   +--------------------------------+
```

---

## 3. Thiết Kế Cơ Sở Dữ Liệu (`database/init.sql`)

### 3.1. Bảng `users`

Lưu trữ thông tin tài khoản người dùng:

```sql
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2. Bảng `categories`

Lưu trữ danh mục thu nhập và chi tiêu:

```sql
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    icon VARCHAR(50) DEFAULT 'circle-ellipsis',
    color VARCHAR(30) DEFAULT 'blue',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3. Bảng `transactions`

Lưu trữ chi tiết các khoản thu chi:

```sql
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
```

### 3.4. Dữ liệu Danh Mục Mặc Định (Seed Data)

Nạp sẵn 12 danh mục đồng bộ với icon và màu sắc của giao diện:

- **Chi tiêu (expense)**:
  - Ăn uống (icon: `utensils`, color: `amber`)
  - Nhà cửa & Phòng trọ (icon: `home`, color: `blue`)
  - Di chuyển (icon: `car`, color: `cyan`)
  - Mua sắm (icon: `shopping-bag`, color: `rose`)
  - Hóa đơn sinh hoạt (icon: `receipt`, color: `orange`)
  - Học tập & Sách vở (icon: `book-open`, color: `indigo`)
  - Giải trí (icon: `gamepad-2`, color: `violet`)
  - Y tế & Sức khỏe (icon: `heart-pulse`, color: `red`)
  - Chi phí khác (icon: `circle-ellipsis`, color: `emerald`)
- **Thu nhập (income)**:
  - Lương (icon: `wallet`, color: `emerald`)
  - Thưởng (icon: `gift`, color: `green`)
  - Trợ cấp & Học bổng (icon: `hand-coins`, color: `teal`)
  - Thu nhập khác (icon: `plus-circle`, color: `lime`)

---

## 4. Chi Tiết API Endpoints (API Specification)

Toàn bộ response tuân thủ quy chuẩn định dạng JSON, status code chuẩn REST.

### 4.1. `GET /api/health`

- **Mục đích**: Kiểm tra tình trạng server, chế độ lưu trữ và CSDL.
- **Header**: Không yêu cầu.
- **Response**:

```json
{
  "status": "ok",
  "storage_mode": "local",
  "db_connected": false,
  "timestamp": "2026-10-09T10:15:00.000Z"
}
```

### 4.2. `POST /api/auth/register`

- **Mục đích**: Đăng ký tài khoản người dùng mới.
- **Body**:

```json
{
  "username": "sinhvien2026",
  "password": "Password123"
}
```

- **Xử lý**:
  - Kiểm tra `username` tối thiểu 3 ký tự, `password` tối thiểu 8 ký tự.
  - Kiểm tra xem `username` đã tồn tại chưa.
  - Băm mật khẩu bằng `bcryptjs` (salt rounds: 10).
  - Tạo tài khoản, sinh JWT token (hạn 7 ngày).
- **Response (201)**:

```json
{
  "token": "eyJhbGciOi...",
  "user_id": 1,
  "user": {
    "id": 1,
    "username": "sinhvien2026"
  }
}
```

### 4.3. `POST /api/auth/login`

- **Mục đích**: Đăng nhập tài khoản.
- **Body**:

```json
{
  "username": "sinhvien2026",
  "password": "Password123"
}
```

- **Xử lý**:
  - Tìm kiếm user theo `username`.
  - So khớp mật khẩu với hash `bcryptjs`.
  - Sinh JWT token (hạn 7 ngày).
- **Response (200)**:

```json
{
  "token": "eyJhbGciOi...",
  "user_id": 1,
  "user": {
    "id": 1,
    "username": "sinhvien2026"
  }
}
```

### 4.4. `GET /api/categories`

- **Mục đích**: Lấy danh sách các danh mục thu/chi.
- **Query param (tùy chọn)**: `?type=income` hoặc `?type=expense`.
- **Response (200)**:

```json
[
  {
    "id": 1,
    "name": "Ăn uống",
    "type": "expense",
    "icon": "utensils",
    "color": "amber"
  },
  {
    "id": 10,
    "name": "Lương",
    "type": "income",
    "icon": "wallet",
    "color": "emerald"
  }
]
```

### 4.5. `GET /api/dashboard`

- **Mục đích**: Trả về số liệu thống kê thu, chi, số dư trong tháng hiện tại và danh sách giao dịch gần nhất của người dùng đăng nhập.
- **Header**: `Authorization: Bearer <token>`
- **Response (200)**:

```json
{
  "total_income": 8500000,
  "total_expense": 3200000,
  "balance": 5300000,
  "recent_transactions": [
    {
      "id": 1,
      "user_id": 1,
      "category_id": 1,
      "amount": 45000,
      "note": "Cơm trưa canteen",
      "transaction_date": "2026-10-09",
      "type": "expense"
    }
  ]
}
```

### 4.6. `POST /api/transactions`

- **Mục đích**: Thêm mới một khoản thu hoặc chi.
- **Header**: `Authorization: Bearer <token>`
- **Body**:

```json
{
  "category_id": 1,
  "amount": 45000,
  "note": "Cơm trưa canteen",
  "transaction_date": "2026-10-09"
}
```

- **Xử lý**:
  - Kiểm tra `amount > 0`.
  - Kiểm tra `category_id` tồn tại trong bảng danh mục.
  - Kiểm tra `transaction_date` đúng định dạng `YYYY-MM-DD`.
  - Ghi bản ghi liên kết với `user_id` từ token.
- **Response (201)**:

```json
{
  "transaction_id": 1,
  "amount": 45000,
  "message": "Tạo giao dịch thành công"
}
```

---

## 5. Cấu Trúc Mã Nguồn Backend (`backend/`)

```
backend/
├── package.json
├── .env
├── data/
│   └── db.json                    # CSDL cục bộ tự tạo khi USE_DATABASE=false
└── src/
    ├── server.js                  # Entry point chính
    ├── config/
    │   └── db.js                  # Module kết nối MySQL Pool và kiểm tra ping
    ├── services/
    │   └── storage.js             # Lớp trung gian đọc/ghi dữ liệu (MySQL hoặc Local JSON)
    ├── middlewares/
    │   ├── auth.middleware.js     # Middleware trích xuất và kiểm tra JWT token
    │   └── error.middleware.js    # Bắt lỗi toàn cục
    └── routes/
        ├── health.routes.js
        ├── auth.routes.js
        ├── category.routes.js
        ├── transaction.routes.js
        └── dashboard.routes.js
```

---

## 6. Khung Tích Hợp Frontend & Client (`frontend/`)

1. **`frontend/js/config.js`**:
   Khai báo biến toàn cục:

   ```javascript
   window.APP_CONFIG = {
     apiBaseUrl: "http://localhost:8080",
     useMock: false // Chuyển sang kết nối Backend thật
   };
   ```

2. **`frontend/index.html`**:
   Thêm thẻ nạp script `js/config.js` trước `js/api.js`.
3. **CORS & Fallback**:
   - Backend hỗ trợ CORS origin rộng rãi (`origin: true`, credentials: true).
   - `frontend/js/api.js` được hoàn thiện để bắt lỗi HTTP rõ ràng, hiển thị Toast cảnh báo nếu Backend chưa chạy.

---

## 7. Kế Hoạch Kiểm Thử & Xác Minh (Verification Plan)

1. **Khởi động Backend**: Chạy `npm start` trong thư mục `backend/`, đảm bảo server lắng nghe tại port 8080 mà không phát sinh lỗi.
2. **Kiểm tra Health Endpoint**: Gửi request `GET http://localhost:8080/api/health`, xác nhận trả về JSON trạng thái `ok`.
3. **Kiểm tra Đăng ký & Đăng nhập**:
   - Gửi `POST /api/auth/register` với tài khoản kiểm thử.
   - Gửi `POST /api/auth/login`, xác nhận token được sinh hợp lệ.
4. **Kiểm tra Danh mục**: Gửi `GET /api/categories`, xác nhận trả về đủ 12 danh mục mẫu.
5. **Kiểm tra Giao dịch & Dashboard**:
   - Tạo giao dịch mới qua `POST /api/transactions`.
   - Lấy `GET /api/dashboard`, xác minh `total_income`, `total_expense`, `balance` tính toán chính xác.
6. **Kiểm thử liên thông Frontend**:
   - Mở giao diện trên trình duyệt.
   - Đăng nhập/Đăng ký tài khoản thật từ form trên giao diện.
   - Thêm giao dịch thu/chi mới, kiểm tra số dư và danh sách giao dịch cập nhật tức thì từ Backend.
