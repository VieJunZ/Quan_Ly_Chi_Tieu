# Issue #21 – Rà soát chuyển MySQL sang SQL Server

Thành viên: Trí | Database

Phạm vi bàn giao / rà soát:
- Rà soát chuyển kết nối từ MySQL sang SQL Server qua db.js.
- Đối chiếu loại bỏ storage.js và xung đột với #11.
- Kiểm tra dữ liệu lưu đúng trên SQL Server.

Minh chứng:
- Commit chuyển API sang SQL Server: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/commit/5e6e14b
- File kết nối: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/backend/src/config/db.js

Kết quả:
- db.js dùng thư viện mssql (msnodesqlv8 khi chạy LocalDB trên Windows), cấu hình qua biến môi trường DB_SERVER, DB_NAME, DB_USER, DB_PASS. Mọi truy vấn đều truyền tham số, không ghép chuỗi.
- storage.js (lưu MySQL/file cũ) đã bị xóa trong commit 5e6e14b, không còn chỗ nào gọi tới. Xung đột ở #11 (CSDL viết cho SQL Server nhưng backend còn MySQL) đã hết.
- Đã chạy backend với CSDL thử trên LocalDB, đăng ký, thêm và đọc giao dịch qua API được, dữ liệu nằm đúng trong dbo.users và dbo.transactions.

Môi trường chạy: SQL Server 2025 Express LocalDB, Windows 11, CSDL thử so_chi_tri_minhchung tạo mới.

Issue: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/21
