# Issue #22 – Mở rộng 11 bảng, chỉ mục, script thiết lập

Thành viên: Trí | Database

Phạm vi bàn giao / rà soát:
- Rà soát 11 bảng mở rộng, khóa và chỉ mục.
- Đối chiếu cập nhật users/transactions và script setup_mo_rong.bat.
- Kiểm tra dữ liệu cũ và khả năng chạy script.

Minh chứng:
- Commit mở rộng: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/commit/552b77d
- Bảng: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/mo_rong/mo_rong_bang.sql
- Thủ tục: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/mo_rong/mo_rong_thu_tuc.sql
- Kiểm thử: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/mo_rong/kiem_thu_mo_rong.sql
- Script chạy: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/mo_rong/setup_mo_rong.bat

Kết quả:
- Commit 552b77d thêm 11 bảng và 17 chỉ mục: sessions, receipt_scans, split_bills, debts, wallet_checks, day_marks, survey_responses, budgets, user_challenges, user_badges, user_category_prefs.
- users thêm cột tài khoản dùng thử, mã khôi phục; transactions thêm giờ và nguồn nhập (source). Script dùng IF OBJECT_ID / COL_LENGTH nên chạy lại nhiều lần không mất dữ liệu cũ.
- Chạy setup_mo_rong.bat ngày 25/11/2026 trên CSDL mới: phần gốc 32/32 PASS, phần mở rộng 64/64 PASS, không lỗi.

Môi trường chạy: SQL Server 2025 Express LocalDB, Windows 11, CSDL thử so_chi_tri_minhchung tạo mới.

Issue: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/22
