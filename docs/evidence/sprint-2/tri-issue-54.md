# Issue #54 – 25 huy hiệu và phần thưởng

Thành viên: Trí | Database

Phạm vi bàn giao / rà soát:
- Rà soát dữ liệu hệ thống 25 huy hiệu và phần thưởng.
- Đối chiếu điều kiện cấp và lưu trạng thái.
- Kiểm tra tránh cấp trùng.

Minh chứng:
- Bảng user_badges, user_challenges: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/mo_rong/mo_rong_bang.sql
- Danh sách huy hiệu và điều kiện: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/backend/src/services/challenge.service.js

Kết quả:
- Danh sách BADGES trong challenge.service.js có đúng 25 huy hiệu, mỗi cái có key và điều kiện đạt. API /api/challenges trả badges_total = 25 kèm earned, earned_at.
- user_badges khóa chính (user_id, badge_key) nên một huy hiệu chỉ lưu một lần. Thử chèn trùng 'first_win' cho cùng user: bị chặn bởi pk_user_badges, bảng vẫn chỉ 1 dòng.
- Xu thưởng ghi vào pet_coin_history (ca 63 PASS).

Môi trường chạy: SQL Server 2025 Express LocalDB, Windows 11, CSDL thử so_chi_tri_minhchung tạo mới.

Issue: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/54
