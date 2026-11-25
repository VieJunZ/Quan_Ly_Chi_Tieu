# Issue #71 – Dữ liệu vật phẩm, xu và kho đồ

Thành viên: Trí | Database

Phạm vi bàn giao / rà soát:
- Rà soát cấu trúc dữ liệu vật phẩm, xu và kho đồ.
- Đối chiếu ràng buộc số dư không âm và quyền sở hữu.
- Kiểm tra tính nhất quán khi mua vật phẩm hoặc gửi yêu cầu lặp.

Minh chứng:
- Bảng pet_shop_items, user_inventory, pet_coin_history: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/mo_rong/mo_rong_bang.sql
- Thủ tục sp_buy_pet_item, sp_equip_pet_item, sp_use_pet_consumable, sp_add_pet_coins: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/mo_rong/mo_rong_thu_tuc.sql

Kết quả:
- Chạy kiểm thử ngày 25/11/2026, ca 57-64 PASS:
- User mới có 100 xu, độ no 80.
- Mua vật phẩm trừ đúng xu và tự trang bị. Không đủ xu thì báo lỗi, không trừ.
- Mua lại vật phẩm thời trang đã có thì bị chặn (không sinh 2 dòng trong kho).
- Mặc phụ kiện mới thì tự tháo phụ kiện cũ cùng ô. Dùng thức ăn thì tăng độ no.
- Mọi lần cộng/trừ xu đều có dòng trong pet_coin_history. Xóa user xóa kèm kho đồ và lịch sử xu.

Môi trường chạy: SQL Server 2025 Express LocalDB, Windows 11, CSDL thử so_chi_tri_minhchung tạo mới.

Issue: https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/71
