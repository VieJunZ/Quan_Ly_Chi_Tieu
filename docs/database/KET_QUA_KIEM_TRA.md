# Kết quả kiểm thử Cơ sở dữ liệu – Sprint 1 (S1-DB-01)

- **Ngày chạy:** 15/10/2026
- **Người chạy:** Trí (Database)
- **Môi trường:** Microsoft SQL Server 2025 (RTM-CU3) 17.0.4025.3 – Express LocalDB, Windows 11
- **Cách chạy:** `database\setup_database.bat`, chạy trên CSDL tạo mới hoàn toàn (đã `DROP DATABASE` trước đó)
- **Script kiểm thử:** [`database/test_database.sql`](../../database/test_database.sql)
- **Kết quả:** **32/32 ca PASS**, 0 FAIL

Script tạo 3 tài khoản thử:

- **A:** có giao dịch thu, chi và một danh mục cá nhân.
- **B:** có giao dịch riêng.
- **C:** chưa có giao dịch nào.

Sau khi kiểm thử xong, script tự xóa cả 3 tài khoản cùng toàn bộ dữ liệu của họ.

## Dữ liệu thử

| Tài khoản | Ngày | Danh mục | Loại | Số tiền |
| --- | --- | --- | --- | --- |
| A | 2026-09-28 | Nhà cửa & Phòng trọ | chi | 1.200.000 |
| A | 2026-10-01 | Tiền lương | thu | 3.000.000 |
| A | 2026-10-05 | Ăn uống | chi | 50.000 |
| A | 2026-10-10 | Trà sữa (danh mục cá nhân của A) | chi | 30.000 |
| B | 2026-10-02 | Trợ cấp & Học bổng | thu | 500.000 |
| B | 2026-10-05 | Ăn uống | chi | 20.000 |
| C | – | – | – | – |

## Bảng kết quả

| STT | Ca kiểm thử | Kết quả | Kết quả thực tế |
| --- | --- | --- | --- |
| 1 | Có đủ 13 danh mục mặc định | PASS | 13 danh mục |
| 2 | Danh mục mặc định có 4 mục thu, 9 mục chi | PASS | 4 thu, 9 chi |
| 3 | Từ chối mật khẩu dạng văn bản thường | PASS | Bị chặn bởi CHECK `ck_users_password_hash` |
| 4 | Từ chối tên đăng nhập trùng (không phân biệt hoa thường) | PASS | Bị chặn bởi UNIQUE `uq_users_username` |
| 5 | Thêm khoản thu/chi hợp lệ | PASS | Thêm được 5/5 giao dịch |
| 6 | Giao dịch liên kết đúng người dùng và loại theo danh mục | PASS | |
| 7 | Lưu và đọc đúng tiếng Việt có dấu | PASS | |
| 8 | Thủ tục từ chối số tiền = 0 | PASS | Lỗi 50002 "Số tiền phải lớn hơn 0." |
| 9 | Thủ tục từ chối số tiền âm | PASS | Lỗi 50002 |
| 10 | Bảng từ chối số tiền = 0 khi INSERT trực tiếp | PASS | Bị chặn bởi CHECK `ck_transactions_amount` |
| 11 | Bảng từ chối số tiền âm khi INSERT trực tiếp | PASS | Bị chặn bởi CHECK `ck_transactions_amount` |
| 12 | Từ chối danh mục không tồn tại | PASS | Lỗi 50003 |
| 13 | Từ chối giao dịch của người dùng không tồn tại | PASS | Bị chặn bởi FK `fk_transactions_user` |
| 14 | Tạo và dùng danh mục cá nhân | PASS | Danh mục mới có id 14 |
| 15 | Từ chối danh mục cá nhân trùng tên danh mục mặc định | PASS | Lỗi 50007 |
| 16 | Thủ tục: B không dùng được danh mục cá nhân của A | PASS | Lỗi 50003 |
| 17 | Trigger: B không dùng được danh mục cá nhân của A (INSERT trực tiếp) | PASS | Lỗi 50010 |
| 18 | A thấy 13 danh mục mặc định + 1 danh mục cá nhân | PASS | 14 danh mục |
| 19 | B không thấy danh mục cá nhân của A | PASS | 13 danh mục |
| 20 | Nhật ký A có đủ 4 giao dịch của A | PASS | 4 dòng |
| 21 | Nhật ký A không lẫn dữ liệu của B | PASS | |
| 22 | Nhật ký sắp xếp ngày mới nhất trước | PASS | Dòng đầu: 2026-10-10 |
| 23 | Ngày giao dịch trả về dạng chuỗi `YYYY-MM-DD` (frontend so sánh chuỗi) | PASS | Ví dụ: 2026-10-10 |
| 24 | Nhật ký B chỉ có 2 giao dịch của B | PASS | 2 dòng |
| 25 | Lọc nhật ký A theo tháng 10/2026 | PASS | 3 dòng |
| 26 | Lọc nhật ký A chỉ khoản thu | PASS | 1 dòng |
| 27 | Tài khoản chưa có giao dịch: nhật ký rỗng, không lỗi | PASS | 0 dòng |
| 28 | Tổng thu/chi/số dư toàn bộ của A | PASS | thu 3.000.000 – chi 1.280.000 – dư 1.720.000 |
| 29 | Tổng thu/chi/số dư tháng 10/2026 của A | PASS | thu 3.000.000 – chi 80.000 – dư 2.920.000 |
| 30 | Tổng thu/chi/số dư của B không lẫn với A | PASS | thu 500.000 – chi 20.000 – dư 480.000 |
| 31 | Tài khoản chưa có giao dịch: tổng = 0, số dư = 0 | PASS | thu 0 – chi 0 – dư 0 |
| 32 | Xóa người dùng xóa kèm giao dịch và danh mục cá nhân | PASS | |

## Đối chiếu tiêu chí nghiệm thu (issue #11)

| Tiêu chí | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Mã SQL chạy thành công trên SQL Server | Đạt | Chạy `setup_database.bat` trên CSDL mới, không lỗi |
| Các bảng và quan hệ đúng yêu cầu | Đạt | ERD trong [README.md](README.md), ca 1–2, 13, 32 |
| Không lưu mật khẩu dạng văn bản thông thường | Đạt | Ca 3 |
| Khoản thu/chi liên kết đúng người dùng và danh mục | Đạt | Ca 5–6, 12–13, 16–17 |
| Không cho phép số tiền bằng 0 hoặc âm | Đạt | Ca 8–11 |
| Các truy vấn hoạt động chính xác trên SQL Server | Đạt | Ca 20–31 |
| Chỉ lấy được dữ liệu thuộc người dùng tương ứng | Đạt | Ca 19, 21, 24, 30 |
| Tổng thu, tổng chi và số dư được tính đúng | Đạt | Ca 28–31 |
| Backend kết nối, thêm và đọc dữ liệu thành công | **Chờ Việt** | Backend hiện dùng MySQL. Hướng dẫn chuyển đổi ở mục 6 của [README.md](README.md) |
| Việt xác nhận phần Database đáp ứng yêu cầu tích hợp | **Chờ Việt** | |
| PO kiểm tra và chấp nhận kết quả | **Chờ PO** | |

## Cách tự chạy lại

```bat
cd database
setup_database.bat
```
