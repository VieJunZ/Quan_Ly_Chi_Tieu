# Issue #17 – Thống nhất tên cột, kiểu dữ liệu và quan hệ

Thành viên: Trí | Database

Phạm vi bàn giao / rà soát:
- Đề xuất bảng Users, Categories, Transactions.
- Thống nhất tên cột, kiểu dữ liệu và quan hệ.
- Đối chiếu danh mục mặc định và cá nhân.

Minh chứng:
- Tài liệu thống nhất dữ liệu, ERD và bảng cột: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/docs/database/README.md
- Script tạo bảng: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/create_tables.sql
- Danh mục mặc định: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/seed_categories.sql

Kết quả:
- Tên bảng/cột dùng chữ thường, gạch dưới (users, categories, transactions, user_id, category_id, transaction_date...). Số tiền DECIMAL(15,2), ngày trả về dạng chuỗi YYYY-MM-DD cho frontend.
- Quan hệ: transactions -> users và categories bằng khóa ngoại, xóa user thì xóa kèm giao dịch và danh mục cá nhân (ca 32 PASS).
- Có 13 danh mục mặc định (4 thu, 9 chi). Danh mục cá nhân chỉ người tạo thấy, không được trùng tên danh mục mặc định (ca 1, 2, 14-19 PASS).
- Backend hiện đang đọc ghi trực tiếp trên các bảng/cột này (backend/src/routes).

Môi trường chạy: SQL Server 2025 Express LocalDB, Windows 11, CSDL thử so_chi_tri_minhchung tạo mới.

Issue: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/17
