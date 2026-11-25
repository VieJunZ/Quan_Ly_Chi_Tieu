# Issue #52 – Đối soát ví tiền mặt

Thành viên: Trí | Database

Phạm vi bàn giao / rà soát:
- Rà soát dữ liệu đối soát ví tiền mặt.
- Đối chiếu số dư ghi nhận với tiền thực tế và chênh lệch.
- Kiểm tra lịch sử đối soát.

Minh chứng:
- Bảng wallet_checks: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/mo_rong/mo_rong_bang.sql
- Thủ tục sp_wallet_check: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/mo_rong/mo_rong_thu_tuc.sql

Kết quả:
- wallet_checks lưu mỗi lần đối soát (số trên sổ, số thực tế, chênh lệch, giao dịch bù nếu có), actual_balance không được âm. Chỉ mục theo (user_id, created_at DESC) để xem lịch sử.
- Ca 23 PASS: sổ 706.666, tính cả nợ thì lẽ ra 170.000, thực tế 150.000 -> lệch 20.000, tự ghi một khoản chi 20.000 nguồn reconcile.
- Ca 24 PASS: đối soát lại ngay sau đó thì khớp, lệch 0, không ghi thêm khoản nào.

Môi trường chạy: SQL Server 2025 Express LocalDB, Windows 11, CSDL thử so_chi_tri_minhchung tạo mới.

Issue: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/52
