# Issue #51 – Ngân sách tháng và kế thừa

Thành viên: Trí | Database

Phạm vi bàn giao / rà soát:
- Rà soát dữ liệu ngân sách theo tháng.
- Đối chiếu quy tắc kế thừa tháng trước và đặt ngân sách mới.
- Kiểm tra trường hợp chuyển tháng.

Minh chứng:
- Bảng budgets: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/mo_rong/mo_rong_bang.sql
- Thủ tục sp_get_budget_status: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/mo_rong/mo_rong_thu_tuc.sql

Kết quả:
- budgets khóa chính (user_id, month_start), mỗi người mỗi tháng một dòng. month_start bắt buộc là ngày 01, số tiền phải > 0.
- Chạy kiểm thử ngày 25/11/2026, ca 32-36 và 41 PASS:
- Chưa đặt ngân sách thì không có mức tiêu mỗi ngày.
- Tháng mới chưa đặt thì dùng ngân sách tháng trước, chia đều số còn lại: 101.818/ngày, còn tiêu được hôm nay 61.818.
- Vượt ngân sách thì mức mỗi ngày về 0, hôm nay hiện số âm (-40.000).
- Từ chối số tiền 0 và tháng không bắt đầu từ ngày 01. Xóa user xóa kèm ngân sách.

Môi trường chạy: SQL Server 2025 Express LocalDB, Windows 11, CSDL thử so_chi_tri_minhchung tạo mới.

Issue: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/51
