# Issue #100 – Đối chiếu dữ liệu chia tiền và nợ

Thành viên: Trí | Database

Phạm vi bàn giao / rà soát:
- Đối chiếu dữ liệu hóa đơn, phần chia và khoản nợ.
- Kiểm tra tổng tiền và tính nhất quán khi cập nhật.
- Rà soát ràng buộc tránh ghi nợ trùng.

Minh chứng:
- Bảng split_bills, debts (có split_id, linked_user_id): https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/mo_rong/mo_rong_bang.sql, https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/mo_rong_nhom_va_no.sql
- Thủ tục chia tiền: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/mo_rong/mo_rong_thu_tuc.sql
- API nợ: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/backend/src/routes/debt.routes.js

Kết quả:
- Mỗi khoản nợ sinh ra từ chia tiền có split_id trỏ về lần chia, xóa lần chia thì nợ đi theo (ca 22 PASS), không còn nợ mồ côi.
- Tổng phần chia luôn bằng hóa đơn, phần lẻ dồn vào người ghi (ca 15-17 PASS: 600k/4, 100k/2, 100k/3).
- Tên trùng trong danh sách bị gộp nên không ghi 2 khoản nợ cho cùng một người (ca 16). Tất toán chỉ cập nhật khoản settled_at IS NULL nên bấm lại không tất toán 2 lần.
- Chạy ngày 25/11/2026 trên SQL Server 2025 Express LocalDB, Windows 11, CSDL thử so_chi_tri_minhchung tạo mới.

Môi trường chạy: SQL Server 2025 Express LocalDB, Windows 11, CSDL thử so_chi_tri_minhchung tạo mới.

Issue: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/100
