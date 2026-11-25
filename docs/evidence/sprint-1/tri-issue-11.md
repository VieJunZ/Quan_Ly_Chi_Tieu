# Issue #11 – Thiết kế Users, Categories, Transactions, khóa và truy vấn tổng hợp

Thành viên: Trí | Database

Phạm vi bàn giao / rà soát:
- Rà soát bảng Users, Categories, Transactions, kiểu dữ liệu và khóa.
- Đối chiếu danh mục mặc định/cá nhân và ràng buộc số tiền.
- Kiểm tra truy vấn nhật ký, tổng thu, tổng chi, số dư theo tài khoản.

Minh chứng:
- Commit tạo CSDL: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/commit/6bdabd1
- Script tạo bảng: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/create_tables.sql
- Thủ tục truy vấn: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/procedures.sql
- Script kiểm thử: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/test_database.sql
- Sơ đồ dữ liệu và kết quả chi tiết: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/docs/database/README.md, https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/docs/database/KET_QUA_KIEM_TRA.md

Kết quả:
- Chạy lại database/setup_database.bat ngày 25/11/2026: 32/32 ca PASS.
- Mật khẩu chỉ nhận dạng băm bcrypt (ck_users_password_hash), tên đăng nhập trùng bị chặn (uq_users_username).
- Số tiền 0 hoặc âm bị chặn ở cả thủ tục (lỗi 50002) và bảng (ck_transactions_amount).
- Tổng của tài khoản A: thu 3.000.000, chi 1.280.000, dư 1.720.000. Tài khoản B không lẫn dữ liệu A (thu 500.000, chi 20.000, dư 480.000).
- Tài khoản chưa có giao dịch: nhật ký rỗng, tổng = 0, không lỗi.

Môi trường chạy: SQL Server 2025 Express LocalDB, Windows 11, CSDL thử so_chi_tri_minhchung tạo mới.

Issue: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/11
