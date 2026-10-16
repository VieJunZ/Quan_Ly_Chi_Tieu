# Kết quả chạy kiểm thử API

- Thời gian: 02:46:17 15/10/2026
- Backend: http://localhost:8080 (storage_mode: local)
- Tổng: **55 ca – Đạt 46 – Không đạt 9**

| Mã | Nhóm | Trường hợp | Kết quả mong đợi | Kết quả thực tế | Đánh giá |
|---|---|---|---|---|---|
| TC-REG-01 | Đăng ký | Đăng ký tài khoản hợp lệ | 201, có token và user.id, không trả mật khẩu | HTTP 201, token: có, có trường mật khẩu: không | Đạt |
| TC-REG-02 | Đăng ký | Đăng ký trùng tên đăng nhập | 409 USER_ALREADY_EXISTS | HTTP 409 USER_ALREADY_EXISTS | Đạt |
| TC-REG-03 | Đăng ký | Đăng ký trùng tên nhưng khác hoa/thường | 409 (không tạo tài khoản trùng) | HTTP 409 USER_ALREADY_EXISTS | Đạt |
| TC-REG-04 | Đăng ký | Tên đăng nhập dưới 3 ký tự | 400 | HTTP 400 VALIDATION_ERROR | Đạt |
| TC-REG-05 | Đăng ký | Mật khẩu dưới 8 ký tự | 400 | HTTP 400 VALIDATION_ERROR | Đạt |
| TC-REG-06 | Đăng ký | Mật khẩu trên 128 ký tự | 400 PASSWORD_TOO_LONG | HTTP 400 PASSWORD_TOO_LONG | Đạt |
| TC-REG-07 | Đăng ký | Tên đăng nhập chứa ký tự đặc biệt / mã độc | 400 INVALID_USERNAME_FORMAT | HTTP 400 INVALID_USERNAME_FORMAT | Đạt |
| TC-REG-08 | Đăng ký | Tên đăng nhập dạng SQL injection | 400 | HTTP 400 INVALID_USERNAME_FORMAT | Đạt |
| TC-REG-09 | Đăng ký | Gửi thiếu dữ liệu (body rỗng) | 400 | HTTP 400 VALIDATION_ERROR | Đạt |
| TC-LOG-01 | Đăng nhập | Đăng nhập đúng thông tin | 200, có token, không trả mật khẩu | HTTP 200, token: có | Đạt |
| TC-LOG-02 | Đăng nhập | Đăng nhập sai mật khẩu | 401 INVALID_CREDENTIALS | HTTP 401 INVALID_CREDENTIALS | Đạt |
| TC-LOG-03 | Đăng nhập | Đăng nhập tài khoản không tồn tại | 401, thông báo giống sai mật khẩu | HTTP 401 INVALID_CREDENTIALS, thông báo giống nhau: có | Đạt |
| TC-LOG-04 | Đăng nhập | Đăng nhập bỏ trống mật khẩu | 400 MISSING_CREDENTIALS | HTTP 400 MISSING_CREDENTIALS | Đạt |
| TC-LOG-05 | Đăng nhập | Đăng nhập không phân biệt hoa/thường tên đăng nhập | 200 | HTTP 200 | Đạt |
| TC-CAT-01 | Danh mục | Lấy danh mục mặc định | 200, 13 danh mục (4 thu, 9 chi), đủ id/name/type/icon/color | HTTP 200, 13 danh mục (4 thu, 9 chi), đủ trường: có | Đạt |
| TC-CAT-02 | Danh mục | Lọc danh mục loại thu (?type=income) | Chỉ trả 4 danh mục thu | 4 danh mục | Đạt |
| TC-CAT-03 | Danh mục | Lọc danh mục loại chi (?type=expense) | Chỉ trả 9 danh mục chi | 9 danh mục | Đạt |
| TC-CAT-04 | Danh mục | Tạo danh mục cá nhân | 201, danh mục mới chỉ người tạo thấy | HTTP 404 NOT_FOUND – Không tìm thấy endpoint: POST /api/categories | **Không đạt** |
| TC-TRX-01 | Thêm thu/chi | Thêm khoản chi hợp lệ | 201, có transaction_id | HTTP 201, transaction_id: 1 | Đạt |
| TC-TRX-02 | Thêm thu/chi | Thêm khoản thu hợp lệ | 201 | HTTP 201 | Đạt |
| TC-TRX-03 | Thêm thu/chi | Số tiền = 0 | 400, không lưu giao dịch | HTTP 400 INVALID_AMOUNT | Đạt |
| TC-TRX-04 | Thêm thu/chi | Số tiền âm | 400, không lưu giao dịch | HTTP 400 INVALID_AMOUNT | Đạt |
| TC-TRX-05 | Thêm thu/chi | Số tiền không phải số ("abc") | 400, không lưu giao dịch | HTTP 400 INVALID_AMOUNT | Đạt |
| TC-TRX-06 | Thêm thu/chi | Thiếu số tiền | 400, không lưu giao dịch | HTTP 400 INVALID_AMOUNT | Đạt |
| TC-TRX-07 | Thêm thu/chi | Thiếu danh mục | 400, không lưu giao dịch | HTTP 400 INVALID_CATEGORY | Đạt |
| TC-TRX-08 | Thêm thu/chi | Danh mục không tồn tại (9999) | 404, không lưu giao dịch | HTTP 404 CATEGORY_NOT_FOUND | Đạt |
| TC-TRX-09 | Thêm thu/chi | Thiếu ngày giao dịch | 400, không lưu giao dịch | HTTP 400 INVALID_DATE | Đạt |
| TC-TRX-10 | Thêm thu/chi | Ngày sai định dạng (15/10/2026) | 400, không lưu giao dịch | HTTP 400 INVALID_DATE | Đạt |
| TC-TRX-11 | Thêm thu/chi | Ngày không có thật (2026-13-45) | 400, không lưu giao dịch | HTTP 201 | **Không đạt** |
| TC-TRX-12 | Thêm thu/chi | Ngày không có thật (2026-02-30) | 400, không lưu giao dịch | HTTP 201 | **Không đạt** |
| TC-TRX-13 | Thêm thu/chi | Ghi chú quá dài (5.000 ký tự) | 400, không lưu giao dịch | HTTP 201 | **Không đạt** |
| TC-TRX-14 | Thêm thu/chi | Số tiền vượt giới hạn lưu trữ (10^16) | 400, không lưu giao dịch | HTTP 201 | **Không đạt** |
| TC-TRX-15 | Thêm thu/chi | Thêm giao dịch khi chưa đăng nhập | 401 UNAUTHORIZED | HTTP 401 UNAUTHORIZED | Đạt |
| TC-TRX-16 | Thêm thu/chi | Gửi kèm user_id của người khác trong body | Giao dịch vẫn thuộc người đang đăng nhập | HTTP 201, xuất hiện ở tài khoản B: không | Đạt |
| TC-DSH-01 | Tổng quan & nhật ký | Tài khoản chưa có giao dịch | Tổng thu = tổng chi = số dư = 0, danh sách rỗng | HTTP 200, thu=0, chi=0, dư=0, 0 giao dịch | Đạt |
| TC-DSH-02 | Tổng quan & nhật ký | Tổng thu/chi/số dư tháng này của B | thu=500000, chi=20000, dư=480000 (khoản tháng trước không tính) | thu=500000, chi=20000, dư=480000 | Đạt |
| TC-DSH-03 | Tổng quan & nhật ký | Số dư = tổng thu − tổng chi | balance = total_income − total_expense | 500000 − 20000 = 480000 | Đạt |
| TC-DSH-04 | Tổng quan & nhật ký | Nhật ký B có đủ 3 giao dịch (kể cả tháng trước) | 3 giao dịch | 3 giao dịch | Đạt |
| TC-DSH-05 | Tổng quan & nhật ký | Nhật ký sắp xếp ngày mới nhất trước | Ngày giảm dần | 2026-10-15, 2026-10-15, 2026-09-20 | Đạt |
| TC-DSH-06 | Tổng quan & nhật ký | Mỗi dòng nhật ký có đủ ngày, số tiền, loại, danh mục, ghi chú | Đủ trường, ngày dạng YYYY-MM-DD | Đủ trường | Đạt |
| TC-DSH-07 | Tổng quan & nhật ký | Dữ liệu cập nhật ngay sau khi thêm giao dịch | Tổng chi tăng đúng số tiền vừa thêm | chi: 20000 → 35000 | Đạt |
| TC-DSH-08 | Tổng quan & nhật ký | Tách biệt dữ liệu: A không thấy giao dịch của B | Không có giao dịch nào của B | 3 giao dịch, của người khác: 0 | Đạt |
| TC-DSH-09 | Tổng quan & nhật ký | Nhật ký hiển thị đủ khi có hơn 30 giao dịch | Thấy đủ 31/31 giao dịch (hoặc có phân trang) | Bảng tổng quan trả 30/31 giao dịch; GET /api/transactions: HTTP 404 NOT_FOUND | **Không đạt** |
| TC-DSH-10 | Tổng quan & nhật ký | Xem tổng quan khi chưa đăng nhập | 401 UNAUTHORIZED | HTTP 401 UNAUTHORIZED | Đạt |
| TC-SEC-01 | Bảo mật & truy cập trái phép | Token sai chữ ký | Bị từ chối (401/403) | HTTP 403 FORBIDDEN | Đạt |
| TC-SEC-02 | Bảo mật & truy cập trái phép | Token đã hết hạn | Bị từ chối (401/403) | HTTP 403 FORBIDDEN | Đạt |
| TC-SEC-03 | Bảo mật & truy cập trái phép | Token không ký (alg = none) | Bị từ chối (401/403) | HTTP 403 FORBIDDEN | Đạt |
| TC-SEC-04 | Bảo mật & truy cập trái phép | Tự tạo token bằng khóa bí mật mặc định có sẵn trong mã nguồn để xem dữ liệu của B | Bị từ chối, không lộ dữ liệu B | HTTP 200, đọc được 4 giao dịch của B | **Không đạt** |
| TC-SEC-05 | Bảo mật & truy cập trái phép | Header Authorization sai dạng (không có Bearer) | 401 | HTTP 401 UNAUTHORIZED | Đạt |
| TC-SEC-06 | Bảo mật & truy cập trái phép | Body JSON hỏng | 400 kèm mã lỗi rõ ràng | HTTP 400 INTERNAL_SERVER_ERROR – Expected property name or '}' in JSON at position 1 (line 1 column 2) | **Không đạt** |
| TC-SEC-07 | Bảo mật & truy cập trái phép | Payload quá lớn (> 100KB) | 413 | HTTP 413 INTERNAL_SERVER_ERROR | Đạt |
| TC-SEC-08 | Bảo mật & truy cập trái phép | Không lộ header X-Powered-By | Không có header | Không có | Đạt |
| TC-SEC-09 | Bảo mật & truy cập trái phép | Gọi endpoint không tồn tại | 404 JSON NOT_FOUND | HTTP 404 NOT_FOUND | Đạt |
| TC-INT-01 | Tích hợp CSDL | Backend lưu dữ liệu vào SQL Server | storage_mode là CSDL, db_connected = true | storage_mode=local, db_connected=false | **Không đạt** |
| TC-SEC-10 | Bảo mật & truy cập trái phép | Đăng nhập sai liên tục > 30 lần/phút | Bị chặn 429 RATE_LIMIT_EXCEEDED | 429 ở lần thử thứ 13 | Đạt |
