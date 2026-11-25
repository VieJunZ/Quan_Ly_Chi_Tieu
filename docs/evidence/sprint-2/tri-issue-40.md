# Issue #40 – Chia hóa đơn và ghi nợ

Thành viên: Trí | Database

Phạm vi bàn giao / rà soát:
- Rà soát dữ liệu chia hóa đơn theo thành viên.
- Đối chiếu tổng phần chia với tổng hóa đơn.
- Kiểm tra tránh ghi nhận nợ lặp.

Minh chứng:
- Bảng split_bills, debts: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/mo_rong/mo_rong_bang.sql
- Thủ tục sp_create_split_bill, sp_delete_split_bill: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/mo_rong/mo_rong_thu_tuc.sql

Kết quả:
- Chạy kiem_thu_mo_rong.sql ngày 25/11/2026, ca 15-22 PASS:
- Chia 600.000 cho 4 người: mỗi người 150.000, sinh 3 khoản nợ.
- Chia 100.000 cho 3 người: 33.333 / 33.333 / 33.334, phần lẻ mình chịu nên tổng phần chia đúng bằng hóa đơn.
- Tên trùng hoặc rỗng bị bỏ, không sinh nợ lặp. Người trả không có trong danh sách hoặc chọn danh mục thu nhập thì báo lỗi.
- Xóa lần chia nhập nhầm thì mất cả khoản nợ lẫn khoản chi đi kèm.
- Bảng có ck_split_bills_people (2-50 người), ck_split_bills_share (phần của mình không vượt tổng).

Môi trường chạy: SQL Server 2025 Express LocalDB, Windows 11, CSDL thử so_chi_tri_minhchung tạo mới.

Issue: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/40
