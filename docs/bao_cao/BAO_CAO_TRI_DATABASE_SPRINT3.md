# BÁO CÁO CÁ NHÂN SPRINT 3 – DATABASE

**Dự án:** Quản Lý Chi Tiêu (Sổ Chi Tiêu)  
**Thành viên:** Vũ Minh Trí  
**Vai trò:** Database – Microsoft SQL Server  
**Tài khoản GitHub:** `Mango-git-dev`  
**Thời điểm tổng hợp:** 29/10/2026  
**Repository:** https://github.com/VieJunZ/Quan_Ly_Chi_Tieu

> **Phạm vi xác nhận:** Báo cáo được đối chiếu với mã nguồn và trạng thái Issue/PR trên GitHub tại thời điểm tổng hợp. Việc Issue đóng hoặc mã nguồn được merge là bằng chứng quản lý và tích hợp; không tự động chứng minh tất cả ca kiểm thử runtime đã PASS. Thành viên kiểm tra và bổ sung bằng chứng cá nhân trước khi commit.

## 1. Mục tiêu công việc Sprint 3

- Xây dựng cấu trúc dữ liệu phục vụ **Tiệm Pet**: danh mục vật phẩm, xu, kho đồ cá nhân và lịch sử biến động xu.
- Đảm bảo liên kết dữ liệu với tài khoản người dùng; bổ sung ràng buộc và hỗ trợ API mua/trang bị vật phẩm.
- Phối hợp Backend để lấy và đồng bộ thông tin giao dịch, tổng chi hôm nay cho giao diện Widget/Mini-View.
- Duy trì tương thích với hệ quản trị **Microsoft SQL Server** và các phân hệ đã hoàn thành từ Sprint trước.

## 2. Nhiệm vụ được giao và trạng thái ghi nhận

| Issue | Nhiệm vụ | Trạng thái GitHub ngày 29/10 | Minh chứng |
| --- | --- | --- | --- |
| [#71](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/71) – S3-03 | Thiết kế dữ liệu vật phẩm, xu và kho đồ người dùng | **Closed** | Các bảng và ràng buộc trong script SQL mở rộng |
| [#76](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/76) – S3-08 | Đồng bộ dữ liệu giao dịch giữa Widget và tài khoản | **Closed** | API Dashboard sử dụng dữ liệu có `user_id`; query tổng hợp từng ngày |

**Ghi chú:** Issue #76 đóng không có nghĩa đã có **Widget native trên màn hình chính Android**. [Issue #75](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/75) về Widget Android vẫn đang mở tại thời điểm tổng hợp.

## 3. Kết quả kỹ thuật trong repository

### 3.1. Thiết kế CSDL Tiệm Pet

Trong [`database/mo_rong/mo_rong_bang.sql`](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/mo_rong/mo_rong_bang.sql), dự án đã có những thành phần sau:

- `users.coins`: số xu người dùng; ràng buộc `ck_users_coins` kiểm tra số xu không âm.
- `pet_shop_items`: lưu danh sách vật phẩm, giá xu, loại trang bị và thông tin vật phẩm.
- `user_inventory`: lưu vật phẩm thuộc về tài khoản, số lượng và trạng thái trang bị; khóa duy nhất `(user_id, item_id)` hạn chế sở hữu trùng bản ghi.
- `pet_coin_history`: lưu lịch sử thay đổi xu phục vụ tra soát.
- Dữ liệu khởi tạo cho một số vật phẩm và phụ kiện của linh thú.

Những thiết kế này hỗ trợ các chức năng mua, lưu kho đồ và trang bị phụ kiện. Việc kiểm soát mua trùng, giao dịch đồng thời và trừ xu cần được xác nhận thêm qua kiểm thử thao tác thực tế và thủ tục SQL tương ứng.

### 3.2. Kết nối SQL Server với Backend

Trong [`backend/src/config/db.js`](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/backend/src/config/db.js), ứng dụng có cấu hình kết nối SQL Server sử dụng `mssql` / `msnodesqlv8`, connection pool và truyền tham số truy vấn.

Trong [`backend/src/routes/petShop.routes.js`](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/backend/src/routes/petShop.routes.js), các API của Tiệm Pet sử dụng truy vấn/thủ tục cơ sở dữ liệu, bao gồm lấy vật phẩm, mua, trang bị, sử dụng vật phẩm, hồ sơ thú cưng và lịch sử xu.

### 3.3. Dữ liệu tổng quan cho Widget / Mini-View

[`backend/src/routes/dashboard.routes.js`](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/backend/src/routes/dashboard.routes.js) có các luồng như:

- `GET /api/dashboard/day`: lấy tổng hợp giao dịch theo ngày.
- `GET /api/dashboard/mini`: lấy dữ liệu chi trong ngày, ngân sách, chuỗi ngày, thú cưng và trang bị.
- Các truy vấn lọc dữ liệu theo `req.user.id` để gắn dữ liệu với tài khoản đăng nhập.

**Giới hạn minh chứng:** Mã nguồn cho thấy cơ chế lọc theo tài khoản; chưa thể kết luận các tình huống sai lệch múi giờ, đổi ngày hoặc sử dụng trên Widget Android đều PASS nếu chưa có log kiểm thử tương ứng.

## 4. Kiểm thử và chất lượng dữ liệu

Các tệp kiểm thử hiện có:

1. [`database/mo_rong/kiem_thu_mo_rong.sql`](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/database/mo_rong/kiem_thu_mo_rong.sql): script kiểm tra các phân hệ SQL mở rộng.
2. [`docs/database/KET_QUA_KIEM_TRA.md`](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/docs/database/KET_QUA_KIEM_TRA.md): tài liệu ghi nhận **32/32 PASS cho kiểm thử CSDL nền tảng Sprint 1 ngày 15/10/2026**, không đồng nhất với kết quả kiểm thử Sprint 3.
3. [`backend/tests/api/kiem_thu_api.mjs`](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/backend/tests/api/kiem_thu_api.mjs): mã kiểm thử API để nhóm chạy đối chiếu.

### Bảng xác nhận kết quả Sprint 3 (Trí bổ sung khi commit)

| Hạng mục | Minh chứng từ code | Kết quả runtime thực tế |
| --- | --- | --- |
| Không cho số dư xu âm | Có ràng buộc SQL | **Cần đính kèm kết quả chạy** |
| Không trộn kho đồ giữa các tài khoản | Có liên kết `user_id` | **Cần đính kèm kết quả chạy** |
| Mua vật phẩm và trừ xu đúng | Có API và thủ tục hỗ trợ | **Cần đính kèm kết quả chạy** |
| Không mua trùng / trừ xu hai lần | Có cấu trúc dữ liệu hạn chế trùng | **Cần đính kèm kết quả chạy** |
| Tổng chi hôm nay theo đúng tài khoản | Có truy vấn lọc `user_id` | **Cần đính kèm kết quả chạy** |
| Tổng chi cập nhật khi thêm giao dịch | Có API tổng hợp ngày | **Cần đính kèm kết quả chạy** |

> Không đổi các ô “Cần đính kèm kết quả chạy” thành PASS trừ khi Trí đã trực tiếp xác nhận và có log, ảnh hoặc kết quả SQL thực tế.

## 5. Tích hợp và minh chứng Pull Request

**[PR #79 – Feature/notification widget](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/pull/79)** đã được merge vào nhánh `main` ngày **28/10/2026**. PR bao gồm cả các tệp Database mở rộng, Backend và Frontend. Đây là minh chứng việc mã nguồn liên quan đã được tích hợp, **không mặc nhiên xác nhận Trí là tác giả của toàn bộ các thay đổi trong PR**.

Các tệp thay đổi liên quan:

- `database/mo_rong/mo_rong_bang.sql`
- `database/mo_rong/mo_rong_thu_tuc.sql`
- `database/mo_rong/kiem_thu_mo_rong.sql`
- `backend/src/routes/dashboard.routes.js`
- `backend/src/routes/petShop.routes.js`

## 6. Những việc cần tiếp tục

- Đính kèm ảnh chụp hoặc log kiểm thử SQL/API Sprint 3, nhất là giao dịch xu và phân tách dữ liệu giữa các tài khoản.
- Đối chiếu các dữ liệu tổng hợp với luồng Widget thực tế trên thiết bị sau khi có phiên bản Android.
- Phối hợp Việt và Quỳnh khi nhóm tiến hành build/kiểm thử APK ở Sprint 4.

## 7. Tự đánh giá và xác nhận cá nhân

- **Phần việc cá nhân Trí trực tiếp thực hiện:** _[Trí điền ngắn gọn và nêu tệp/commit/PR tương ứng]_  
- **Lệnh và môi trường kiểm thử đã chạy:** _[Trí điền]_  
- **Số ca PASS/FAIL của Sprint 3:** _[Trí điền theo log thực tế]_  
- **Ảnh/log minh chứng:** _[Dán link ảnh, log hoặc PR]_  
- **Vấn đề còn tồn đọng:** _[Trí điền hoặc ghi “Không” nếu đã xác minh]_  

**Kết luận:** Hai Issue Database được giao cho Trí trong Sprint 3 hiện đều đã đóng trên GitHub. Nhánh `main` có các thành phần SQL Server phục vụ Tiệm Pet và dữ liệu tổng quan cho Widget/Mini-View. Kết quả kiểm thử runtime chuyên biệt cho Sprint 3 và phạm vi đóng góp cá nhân cần được Trí kiểm tra, bổ sung trước khi xác nhận báo cáo chính thức.
