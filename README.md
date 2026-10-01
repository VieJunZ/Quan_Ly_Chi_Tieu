# 💰 Dự Án Quản Lý Chi Tiêu

Chào mừng toàn bộ các thành viên (Frontend, Backend, DBA, QA) đến với kho mã nguồn tổng của dự án **Quản Lý Chi Tiêu**. Kho chứa này áp dụng kiến trúc **Monorepo** và sử dụng **Docker** để đồng bộ môi trường 100% cho tất cả mọi người.

---

## 📂 Cấu Trúc Dự Án (Nơi làm việc của bạn)

```text
Quan_Ly_Chi_Tieu/
├── frontend/       # 🎨 Giao diện (Làm việc bởi team FE)
├── backend/        # ⚙️ Logic xử lý & API (Làm việc bởi team BE)
├── database/       # 🗄️ Script SQL, Migration, Seeding, ERD (DBA)
├── tests/          # 🧪 Kịch bản Automation Test & Postman (QA/Tester)
├── docs/           # 📚 Tài liệu đặc tả, thiết kế hệ thống
├── docker-compose.yml # 🐳 Cấu hình chạy tự động toàn bộ hệ thống
└── README.md       # 📖 Sổ tay hướng dẫn chung (File bạn đang đọc)
```

---

## 🚀 Hướng Dẫn Setup & Khởi Chạy (Dành cho TẤT CẢ thành viên)

Dù bạn làm ở vị trí nào, chỉ cần làm đúng 4 bước sau để hệ thống chạy trên máy cá nhân của bạn:

### Bước 1: Chuẩn bị công cụ

Hãy chắc chắn máy bạn đã cài đặt các phần mềm nền tảng:

- **Git** (Để quản lý mã nguồn).
- **Docker Desktop** (Bắt buộc - Để chạy Server và Database chỉ với 1 click).

### Bước 2: Kéo Code & Chuyển Nhánh

Mở Terminal/PowerShell và gõ:

```bash
# 1. Kéo code về máy
git clone [https://github.com/VieTruong-2007/Quan_Ly_Chi_Tieu.git](https://github.com/VieTruong-2007/Quan_Ly_Chi_Tieu.git)

# 2. Đi vào thư mục
cd Quan_Ly_Chi_Tieu

# 3. Chuyển sang nhánh gốc của nhóm
git checkout develop
```

### Bước 3: Cấu hình biến môi trường (.env)

Hệ thống cần các file .env để chạy. Bạn hãy:

- Đi vào thư mục backend/, copy file .env.example và đổi tên thành .env.
- Đi vào thư mục frontend/, copy file .env.example và đổi tên thành .env.

(Mật khẩu DB cục bộ đã được cấu hình sẵn trong docker, bạn có thể để nguyên không cần sửa).

### Bước 4: Chạy toàn bộ hệ thống bằng 1 lệnh 🪄

Mở Terminal tại thư mục gốc Quan_Ly_Chi_Tieu và gõ:

```bash
docker-compose up -d
```

🎉 **BÙM! Hệ thống đã chạy thành công.** Truy cập ngay:

- 🌐 **Frontend (Giao diện):** http://localhost:3000
- ⚙️ **Backend (API):** http://localhost:8080
- 🗄️ **Database (MySQL):** Cổng 3306 (Tài khoản mặc định - User: root / Pass: root)

---

## 👨‍💻 Quy Trình Làm Việc - Git Flow (QUAN TRỌNG)

Kho này áp dụng luật Bảo vệ nhánh (Branch Protection). Tuyệt đối không ai được gõ lệnh đẩy thẳng mã nguồn (git push origin develop hay main).

Quy trình chuẩn khi bạn nhận 1 Task:

- Lấy code mới nhất từ nhóm: `git pull origin develop`
- Tạo nhánh riêng biệt theo cấu trúc `feature/<bộ-phận>-<tên-task>`.
- Ví dụ FE: `git checkout -b feature/fe-login-ui`
- Ví dụ BE: `git checkout -b feature/be-login-api`
- Code, Test và Lưu (Commit) trên nhánh này.
- Đẩy code lên nền tảng: `git push origin feature/tên-nhánh-của-bạn`
- Truy cập GitHub, tạo Pull Request (PR) xin được gộp vào nhánh develop.
- Code phải được ít nhất 1 người (Leader hoặc thành viên khác) xem và Approve (Duyệt) thì bạn mới được bấm nút Merge.

---

## 🛑 Xử Lý Sự Cố Thường Gặp

- **Lỗi Port đang được sử dụng:** Nếu chạy Docker báo lỗi, hãy kiểm tra xem máy bạn có đang bật XAMPP, Laragon, MySQL gốc (cổng 3306), hoặc cổng 8080/3000 đang bị ứng dụng khác chiếm dụng không. Tắt chúng đi và chạy lại lệnh.
- **Cách dừng hệ thống Docker:** Để tắt và giải phóng RAM khi không làm việc, gõ: `docker-compose down`.
- **Nếu gặp khó khăn trong quá trình setup ban đầu:** Hãy liên hệ Quản trị viên dự án để được hỗ trợ trực tiếp.
