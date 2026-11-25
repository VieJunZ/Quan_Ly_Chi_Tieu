# Issue #76 – Đồng bộ giao dịch Widget và tài khoản

Thành viên: Trí | Database

Phạm vi bàn giao / rà soát:
- Rà soát truy vấn tổng chi hôm nay theo tài khoản và múi giờ.
- Đối chiếu số liệu sau thêm/sửa/xóa giao dịch.
- Kiểm tra không lẫn dữ liệu khi đổi tài khoản hoặc đăng xuất.

Minh chứng:
- API widget: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/backend/src/routes/dashboard.routes.js (GET /api/dashboard/mini?today=&now=)
- Thủ tục sp_get_day_summary: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/mo_rong/mo_rong_thu_tuc.sql

Kết quả:
- Ngày 'hôm nay' do app gửi lên (tham số today theo giờ máy người dùng), nên không bị lệch ngày khi server chạy múi giờ khác.
- Ca 28 PASS: đã chi hôm nay 318.334, thu 1.000.000, khớp tổng các khoản trong ngày. Số liệu đọc thẳng từ bảng transactions mỗi lần gọi nên thêm/sửa/xóa xong là widget đổi theo, không có bảng cache riêng.
- Truy vấn luôn lọc theo user_id lấy từ token. Ca 21, 24, 30 (phần gốc) PASS: dữ liệu tài khoản B không lẫn sang A.
- Đăng xuất: auth.service.js đặt revoked_at cho phiên trong bảng sessions, khi kiểm token chỉ nhận phiên revoked_at IS NULL nên token cũ không đọc được widget nữa (đọc code, chưa chụp màn hình).

Môi trường chạy: SQL Server 2025 Express LocalDB, Windows 11, CSDL thử so_chi_tri_minhchung tạo mới.

Issue: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/76
