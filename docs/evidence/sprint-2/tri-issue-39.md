# Issue #39 – Sổ nợ hai chiều và tất toán

Thành viên: Trí | Database

Phạm vi bàn giao / rà soát:
- Rà soát dữ liệu nợ hai chiều và trạng thái tất toán.
- Đối chiếu số dư nợ trước/sau tất toán.
- Kiểm tra tính nhất quán giữa các bản ghi.

Minh chứng:
- Bảng debts: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/mo_rong/mo_rong_bang.sql
- API tất toán: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/backend/src/routes/debt.routes.js

Kết quả:
- Bảng debts có direction chỉ nhận owed_to_me / i_owe, settled_at NULL là còn nợ, có giá trị là đã tất toán. Chỉ mục ix_debts_user_open lọc khoản còn mở.
- Thử: Nam nợ mình 50.000 + 30.000, mình nợ Nam 20.000 -> số dư nợ ròng 60.000. Tất toán theo người: cập nhật 3 dòng, sau đó còn 0 khoản mở.
- Chặn direction sai (ck_debts_direction), số tiền 0 (ck_debts_amount), tên người toàn khoảng trắng (ck_debts_person).
- Xóa user thì xóa kèm các khoản nợ (đã kiểm tra còn 0 dòng).

Môi trường chạy: SQL Server 2025 Express LocalDB, Windows 11, CSDL thử so_chi_tri_minhchung tạo mới.

Issue: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/39
