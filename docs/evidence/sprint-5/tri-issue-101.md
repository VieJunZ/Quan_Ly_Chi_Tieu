# Issue #101 – Đối chiếu dữ liệu quỹ và giao dịch

Thành viên: Trí | Database

Phạm vi bàn giao / rà soát:
- Đối chiếu cấu trúc dữ liệu quỹ, thành viên và giao dịch.
- Kiểm tra quan hệ dữ liệu và tổng số dư.
- Rà soát tính nhất quán khi có giao dịch đồng thời.

Minh chứng:
- Bảng expense_groups, group_members, group_expenses: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/mo_rong_nhom_va_no.sql
- API nhóm: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/backend/src/routes/group.routes.js

Kết quả:
- Thử trên CSDL thử ngày 25/11/2026: nhóm 'Phòng 302' 2 thành viên, A chi 300.000, B chi 100.000 -> tổng 400.000, mỗi người 200.000, B cần trả A 100.000.
- Thêm lại thành viên đã có: bị chặn bởi pk_group_members. Mã mời trùng: bị chặn bởi uq_expense_groups_code. Khoản chi âm: bị chặn bởi ck_group_expenses_amount.
- Xóa nhóm thì thành viên và khoản chi của nhóm bị xóa theo (ON DELETE CASCADE), còn 0 dòng.
- Giao dịch đồng thời: mỗi khoản chi là một dòng INSERT riêng, tổng luôn tính lại bằng SUM khi đọc nên không bị ghi đè số dư.

Môi trường chạy: SQL Server 2025 Express LocalDB, Windows 11, CSDL thử so_chi_tri_minhchung tạo mới.

Issue: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/101
