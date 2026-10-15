# 📋 Yêu Cầu & Hướng Dẫn Kết Nối API Dành Cho Team Frontend

- **Người gửi**: Backend Developer
- **Người nhận**: Frontend Developer
- **Dự án**: Quản Lý Chi Tiêu
- **Địa chỉ Backend API**: `http://localhost:8080`

---

## 1. Tổng Quan

Hệ thống Backend (Server Express & API) đã hoàn thành 100% các nghiệp vụ xác thực, danh mục, giao dịch và dashboard. Backend đã cấu hình sẵn **CORS mở rộng**, chấp nhận mọi cổng phía Frontend (cổng 3000, Live Server 5500, hoặc mở file HTML trực tiếp).

Để giao diện kết nối mượt mà vào dữ liệu thật của Backend, Team Frontend vui lòng lưu ý và điều chỉnh **3 điểm chính** dưới đây:

---

## 2. Các Điểm Frontend Cần Điều Chỉnh

### 📌 Điểm 1: Chuyển đổi chế độ Mock sang gọi API thật (`useMock: false`)
Hiện tại trong file `frontend/js/api.js`:
```javascript
const useMock = window.APP_CONFIG?.useMock !== false;
```
Biến `useMock` đang mặc định là `true` (dùng dữ liệu giả lập lưu trong `localStorage`).

👉 **Yêu cầu FE**: Cấu hình `window.APP_CONFIG` với `useMock = false` trước khi nạp `api.js`.  
**Cách làm đề xuất**:
Trong file `frontend/index.html`, bạn có thể thêm đoạn script nhỏ ngay trước thẻ `<script src="js/api.js">`:
```html
<!-- Cấu hình kết nối Backend thật -->
<script>
  window.APP_CONFIG = {
    apiBaseUrl: "http://localhost:8080",
    useMock: false // Bật gọi API thật tới Backend
  };
</script>
<script src="js/api.js" defer></script>
```

---

### 📌 Điểm 2: Bắt lỗi mất kết nối mạng khi Server chưa khởi động
Trong hàm `request()` của `frontend/js/api.js`, nếu Backend chưa bật (`npm start`), lệnh `fetch()` của trình duyệt sẽ ném lỗi mạng `Failed to fetch`.

👉 **Yêu cầu FE**: Bọc khối `try...catch` quanh `fetch()` để thông báo toast thân thiện cho người dùng:
```javascript
async function request(path, options = {}) {
  const token = localStorage.getItem(storageKeys.token);
  let response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
  } catch (networkError) {
    const error = new Error(`Không thể kết nối máy chủ tại ${apiBaseUrl}. Vui lòng kiểm tra xem Backend đã khởi động chưa.`);
    error.status = 0;
    throw error;
  }
  // Xử lý payload tiếp theo...
}
```

---

### 📌 Điểm 3: Quy định ràng buộc dữ liệu đầu vào (Validation Rules)

Khi gửi dữ liệu lên Backend, FE vui lòng chú ý các quy tắc kiểm tra sau để tránh bị trả về mã lỗi `400 Bad Request`:

1. **Đăng ký tài khoản (`POST /api/auth/register`)**:
   - `username`: từ 3 đến 30 ký tự, chỉ gồm chữ cái, số, gạch dưới, gạch ngang hoặc dấu chấm (`a-z`, `A-Z`, `0-9`, `_`, `-`, `.`).
   - `password`: độ dài từ 8 đến 128 ký tự.
   - Nếu username đã tồn tại -> Backend trả về mã lỗi `409 Conflict`.

2. **Đăng nhập (`POST /api/auth/login`)**:
   - Nếu sai tên đăng nhập hoặc mật khẩu -> Backend trả về mã lỗi `401 Unauthorized` với thông báo chung: `"Tên đăng nhập hoặc mật khẩu không chính xác"`.
   - **Lưu ý bảo mật**: Backend đã bật tính năng Rate Limiting (giới hạn tối đa 30 lần thử/phút từ 1 IP) để chống tấn công brute-force. Nếu gửi liên tục quá số lần trên sẽ nhận mã `429 Too Many Requests`.

3. **Thêm giao dịch mới (`POST /api/transactions`)**:
   - `category_id`: Phải là số nguyên ID hợp lệ có trong danh sách lấy từ `GET /api/categories`.
   - `amount`: Phải là số lớn hơn 0 (`> 0`). Không chấp nhận số âm hoặc chuỗi rỗng.
   - `transaction_date`: Phải đúng định dạng chuẩn ngày `YYYY-MM-DD` (ví dụ: `2026-10-09`).
   - Header bắt buộc: `Authorization: Bearer <token>`.

---

## 3. Danh Sách API Endpoints Backend Đang Hoạt Động

| Phương Thức | Đường Dẫn (Endpoint) | Xác Thực (Auth) | Mô Tả |
|:---:|---|:---:|---|
| **GET** | `/api/health` | Không | Kiểm tra trạng thái máy chủ (`status: "ok"`) |
| **GET** | `/api/categories` | Không | Lấy danh mục (hỗ trợ `?type=income` hoặc `?type=expense`) |
| **POST** | `/api/auth/register` | Không | Đăng ký tài khoản mới (trả về `{ token, user_id, user }`) |
| **POST** | `/api/auth/login` | Không | Đăng nhập tài khoản (trả về `{ token, user_id, user }`) |
| **POST** | `/api/transactions` | **Bearer Token** | Tạo giao dịch mới (`amount`, `category_id`, `note`, `transaction_date`) |
| **GET** | `/api/dashboard` | **Bearer Token** | Lấy tổng thu, chi, số dư và danh sách giao dịch gần nhất |

---

## 4. Định Dạng Phản Hồi Khi Gặp Lỗi (Error Response Format)

Mọi phản hồi lỗi từ Backend luôn tuân thủ chuẩn JSON đồng nhất:
```json
{
  "success": false,
  "message": "Nội dung thông báo lỗi chi tiết hiển thị cho người dùng",
  "error_code": "MÃ_LỖI_HỆ_THỐNG"
}
```

Phía Frontend chỉ cần lấy trường `error.message` để hiển thị Toast thông báo là người dùng sẽ hiểu ngay lý do.

---

*(Nếu có bất kỳ thắc mắc hoặc cần điều chỉnh thêm endpoint nào, team FE có thể trao đổi trực tiếp với team BE để thống nhất).*
