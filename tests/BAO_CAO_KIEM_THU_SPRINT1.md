# Báo cáo kiểm thử Sprint 1 – Sổ Chi

**Issue:** #16 [S1-QA-01] Viết và thực hiện kiểm thử Sprint 1
**Ngày kiểm thử:** 15/10/2026
**Người thực hiện:** Quỳnh (Tester), hỗ trợ: Trí (Database)

---

## 1. Phạm vi và môi trường

**Chức năng Sprint 1 được kiểm thử** (theo issue #10, #12, #14, #15):

- Đăng ký, đăng nhập
- Danh mục mặc định và danh mục cá nhân
- Thêm khoản thu, khoản chi
- Nhật ký thu chi và bảng tổng quan (tổng thu, tổng chi, số dư)
- Kiểm tra dữ liệu không hợp lệ
- Truy cập trái phép và tách biệt dữ liệu giữa các tài khoản
- Giao diện máy tính và điện thoại

**Môi trường:**

| Thành phần | Chi tiết |
|---|---|
| Mã nguồn | Nhánh `feature/backend`, commit `c484137` (đã gộp frontend từ PR #9) |
| Backend | Node.js 24, `npm start`, cổng 8080. Chế độ lưu trữ: `local` (file `data/db.json`) vì backend chưa kết nối SQL Server |
| Frontend | Chạy qua máy chủ tĩnh tại `http://localhost:5500` |
| Trình duyệt | Chromium, khung máy tính 1280×800 và khung điện thoại 375×812 |
| Hệ điều hành | Windows 11 |

**Cách kiểm thử:**

- **API:** chạy tự động bằng script `tester/scripts/sprint1_api_test.js`, gồm 55 ca.
- **Giao diện:** thao tác bằng tay trên trình duyệt, gồm 12 ca, có ảnh chụp làm bằng chứng.
- **Bằng chứng lỗi API:** script `tester/scripts/tai_hien_loi.js` ghi lại request/response của từng lỗi.

## 2. Tổng hợp kết quả

| Nhóm | Số ca | Đạt | Không đạt |
|---|---:|---:|---:|
| Đăng ký | 9 | 9 | 0 |
| Đăng nhập | 5 | 5 | 0 |
| Danh mục | 4 | 3 | 1 |
| Thêm thu/chi | 16 | 12 | 4 |
| Tổng quan & nhật ký | 10 | 9 | 1 |
| Bảo mật & truy cập trái phép | 10 | 8 | 2 |
| Tích hợp CSDL | 1 | 0 | 1 |
| Giao diện | 12 | 10 | 2 |
| **Tổng** | **67** | **56** | **11** |

Tỉ lệ đạt: **83,6%**. Tìm thấy **11 lỗi**: 4 mức Cao, 4 mức Trung bình, 3 mức Thấp. Chi tiết ở mục 4.

**Phần chạy tốt:**

- Đăng ký và đăng nhập kiểm tra dữ liệu đầy đủ. Không trả mật khẩu hay mã băm về giao diện. Báo lỗi giống nhau khi sai tên hoặc sai mật khẩu.
- Tổng thu, tổng chi, số dư tính đúng theo tháng hiện tại, và số dư bằng thu trừ chi.
- Hai tài khoản không thấy dữ liệu của nhau.
- Chặn số tiền 0, số tiền âm và danh mục không tồn tại.
- Giao diện có trạng thái rỗng, báo lỗi nhập liệu và chạy được trên điện thoại.
- Ghi chú chứa thẻ HTML được hiển thị dưới dạng chữ, không chạy mã (không có lỗi XSS).

## 3. Bảng ca kiểm thử

Ký hiệu: **Đạt** / **Không đạt**. Cột "Lỗi" ghi mã lỗi ở mục 4.

### 3.1. Đăng ký

| Mã | Trường hợp | Dữ liệu vào | Kết quả mong đợi | Kết quả thực tế | Đánh giá | Lỗi |
|---|---|---|---|---|---|---|
| TC-REG-01 | Đăng ký hợp lệ | `qa_a_xxx` / `MatKhauA_123` | 201, có token, không trả mật khẩu | 201, có token, không có trường mật khẩu | Đạt | |
| TC-REG-02 | Trùng tên đăng nhập | Tên đã tồn tại | 409 | 409 USER_ALREADY_EXISTS | Đạt | |
| TC-REG-03 | Trùng tên nhưng khác hoa/thường | `QA_A_XXX` | 409 | 409 USER_ALREADY_EXISTS | Đạt | |
| TC-REG-04 | Tên dưới 3 ký tự | `ab` | 400 | 400 VALIDATION_ERROR | Đạt | |
| TC-REG-05 | Mật khẩu dưới 8 ký tự | `1234567` | 400 | 400 VALIDATION_ERROR | Đạt | |
| TC-REG-06 | Mật khẩu trên 128 ký tự | 129 ký tự | 400 | 400 PASSWORD_TOO_LONG | Đạt | |
| TC-REG-07 | Tên chứa ký tự đặc biệt | `<script>x</script>` | 400 | 400 INVALID_USERNAME_FORMAT | Đạt | |
| TC-REG-08 | Tên dạng SQL injection | `' OR 1=1 --` | 400 | 400 INVALID_USERNAME_FORMAT | Đạt | |
| TC-REG-09 | Thiếu dữ liệu | Body rỗng `{}` | 400 | 400 VALIDATION_ERROR | Đạt | |

### 3.2. Đăng nhập

| Mã | Trường hợp | Dữ liệu vào | Kết quả mong đợi | Kết quả thực tế | Đánh giá | Lỗi |
|---|---|---|---|---|---|---|
| TC-LOG-01 | Đăng nhập đúng | Tài khoản vừa tạo | 200, có token, không trả mật khẩu | 200, có token | Đạt | |
| TC-LOG-02 | Sai mật khẩu | `SaiMatKhau_1` | 401 | 401 INVALID_CREDENTIALS | Đạt | |
| TC-LOG-03 | Tài khoản không tồn tại | Tên chưa đăng ký | 401, thông báo giống khi sai mật khẩu | 401, thông báo giống nhau | Đạt | |
| TC-LOG-04 | Bỏ trống mật khẩu | Chỉ có tên | 400 | 400 MISSING_CREDENTIALS | Đạt | |
| TC-LOG-05 | Tên khác hoa/thường | `QA_A_XXX` | 200 | 200 | Đạt | |

### 3.3. Danh mục

| Mã | Trường hợp | Dữ liệu vào | Kết quả mong đợi | Kết quả thực tế | Đánh giá | Lỗi |
|---|---|---|---|---|---|---|
| TC-CAT-01 | Lấy danh mục mặc định | `GET /api/categories` | 13 danh mục (4 thu, 9 chi), đủ id/name/type/icon/color | 13 danh mục (4 thu, 9 chi), đủ trường | Đạt | |
| TC-CAT-02 | Lọc danh mục thu | `?type=income` | 4 danh mục thu | 4 danh mục | Đạt | |
| TC-CAT-03 | Lọc danh mục chi | `?type=expense` | 9 danh mục chi | 9 danh mục | Đạt | |
| TC-CAT-04 | Tạo danh mục cá nhân | `POST /api/categories` "Trà sữa" | 201, chỉ người tạo thấy | 404 NOT_FOUND, chưa có API | **Không đạt** | BUG-03 |

### 3.4. Thêm khoản thu/chi

| Mã | Trường hợp | Dữ liệu vào | Kết quả mong đợi | Kết quả thực tế | Đánh giá | Lỗi |
|---|---|---|---|---|---|---|
| TC-TRX-01 | Thêm khoản chi hợp lệ | 50.000, Ăn uống, hôm nay | 201, có transaction_id | 201, có transaction_id | Đạt | |
| TC-TRX-02 | Thêm khoản thu hợp lệ | 3.000.000, Tiền lương | 201 | 201 | Đạt | |
| TC-TRX-03 | Số tiền = 0 | `amount: 0` | 400 | 400 INVALID_AMOUNT | Đạt | |
| TC-TRX-04 | Số tiền âm | `amount: -50000` | 400 | 400 INVALID_AMOUNT | Đạt | |
| TC-TRX-05 | Số tiền không phải số | `amount: "abc"` | 400 | 400 INVALID_AMOUNT | Đạt | |
| TC-TRX-06 | Thiếu số tiền | Không có `amount` | 400 | 400 INVALID_AMOUNT | Đạt | |
| TC-TRX-07 | Thiếu danh mục | Không có `category_id` | 400 | 400 INVALID_CATEGORY | Đạt | |
| TC-TRX-08 | Danh mục không tồn tại | `category_id: 9999` | 404 | 404 CATEGORY_NOT_FOUND | Đạt | |
| TC-TRX-09 | Thiếu ngày | Không có `transaction_date` | 400 | 400 INVALID_DATE | Đạt | |
| TC-TRX-10 | Ngày sai định dạng | `15/10/2026` | 400 | 400 INVALID_DATE | Đạt | |
| TC-TRX-11 | Ngày không có thật | `2026-13-45` | 400 | **201, đã lưu** | **Không đạt** | BUG-05 |
| TC-TRX-12 | Ngày không có thật | `2026-02-30` | 400 | **201, đã lưu** | **Không đạt** | BUG-05 |
| TC-TRX-13 | Ghi chú quá dài | 5.000 ký tự | 400 (CSDL tối đa 500) | **201, đã lưu** | **Không đạt** | BUG-06 |
| TC-TRX-14 | Số tiền quá lớn | `1e16` | 400 (vượt DECIMAL(15,2)) | **201, đã lưu** | **Không đạt** | BUG-07 |
| TC-TRX-15 | Chưa đăng nhập | Không gửi token | 401 | 401 UNAUTHORIZED | Đạt | |
| TC-TRX-16 | Gửi `user_id` của người khác | `user_id` = id của B | Giao dịch vẫn thuộc người đang đăng nhập | Thuộc A, không xuất hiện ở B | Đạt | |

### 3.5. Bảng tổng quan và nhật ký

| Mã | Trường hợp | Dữ liệu vào | Kết quả mong đợi | Kết quả thực tế | Đánh giá | Lỗi |
|---|---|---|---|---|---|---|
| TC-DSH-01 | Tài khoản chưa có giao dịch | Tài khoản mới | Thu = chi = dư = 0, danh sách rỗng | 0 / 0 / 0, 0 giao dịch | Đạt | |
| TC-DSH-02 | Tổng tháng này | B: chi 20.000, thu 500.000; 1.200.000 chi tháng trước | Thu 500.000, chi 20.000, dư 480.000 | 500.000 / 20.000 / 480.000 | Đạt | |
| TC-DSH-03 | Số dư = thu − chi | Như trên | 500.000 − 20.000 = 480.000 | Đúng | Đạt | |
| TC-DSH-04 | Nhật ký đủ giao dịch | B có 3 giao dịch | 3 giao dịch, kể cả tháng trước | 3 giao dịch | Đạt | |
| TC-DSH-05 | Sắp xếp nhật ký | | Ngày mới nhất trước | 2026-10-15, 2026-10-15, 2026-09-20 | Đạt | |
| TC-DSH-06 | Đủ thông tin mỗi dòng | | Ngày YYYY-MM-DD, số tiền, loại, danh mục, ghi chú | Đủ trường | Đạt | |
| TC-DSH-07 | Cập nhật sau khi thêm | Thêm chi 15.000 | Tổng chi tăng 15.000 | 20.000 → 35.000 | Đạt | |
| TC-DSH-08 | Tách biệt dữ liệu | A xem tổng quan | Không thấy giao dịch của B | 0 giao dịch của người khác | Đạt | |
| TC-DSH-09 | Nhật ký trên 30 giao dịch | Tài khoản có 31 giao dịch | Xem đủ 31 giao dịch (hoặc có phân trang) | Chỉ trả 30. `GET /api/transactions` báo 404 | **Không đạt** | BUG-08 |
| TC-DSH-10 | Chưa đăng nhập | Không token | 401 | 401 UNAUTHORIZED | Đạt | |

### 3.6. Bảo mật và truy cập trái phép

| Mã | Trường hợp | Dữ liệu vào | Kết quả mong đợi | Kết quả thực tế | Đánh giá | Lỗi |
|---|---|---|---|---|---|---|
| TC-SEC-01 | Token sai chữ ký | Ký bằng khóa khác | Bị từ chối | 403 FORBIDDEN | Đạt | |
| TC-SEC-02 | Token hết hạn | `exp` đã qua | Bị từ chối | 403 FORBIDDEN | Đạt | |
| TC-SEC-03 | Token không ký | `alg: none` | Bị từ chối | 403 FORBIDDEN | Đạt | |
| TC-SEC-04 | Giả mạo token bằng khóa mặc định trong mã nguồn | Ký `{id: B}` bằng `supersecretjwtkey_sprint1` | Bị từ chối | **200, đọc được toàn bộ giao dịch của B** | **Không đạt** | BUG-01 |
| TC-SEC-05 | Header sai dạng | `Authorization: abc` | 401 | 401 UNAUTHORIZED | Đạt | |
| TC-SEC-06 | Body JSON hỏng | `{amount: 1000,` | 400, mã lỗi rõ ràng | 400 nhưng mã `INTERNAL_SERVER_ERROR`, lộ thông báo của bộ phân tích JSON | **Không đạt** | BUG-09 |
| TC-SEC-07 | Payload quá lớn | Ghi chú 120KB | 413 | 413 (mã `INTERNAL_SERVER_ERROR`, xem BUG-09) | Đạt | |
| TC-SEC-08 | Ẩn header công nghệ | | Không có `X-Powered-By` | Không có | Đạt | |
| TC-SEC-09 | Endpoint không tồn tại | `GET /api/khong-ton-tai` | 404 JSON | 404 NOT_FOUND | Đạt | |
| TC-SEC-10 | Đăng nhập sai liên tục | 40 lần trong 1 phút | Bị chặn 429 | 429 ở lần thứ 13 (tính cả các lần gọi trước trong phút đó) | Đạt | |

### 3.7. Tích hợp cơ sở dữ liệu

| Mã | Trường hợp | Dữ liệu vào | Kết quả mong đợi | Kết quả thực tế | Đánh giá | Lỗi |
|---|---|---|---|---|---|---|
| TC-INT-01 | Backend lưu vào SQL Server | `GET /api/health` | `db_connected: true`, lưu trong CSDL | `storage_mode: local`, `db_connected: false` | **Không đạt** | BUG-02 |

### 3.8. Giao diện

| Mã | Trường hợp | Các bước | Kết quả mong đợi | Kết quả thực tế | Đánh giá | Lỗi | Bằng chứng |
|---|---|---|---|---|---|---|---|
| UI-01 | Mở trang khi chưa đăng nhập | Xóa phiên, mở trang | Không hiện dữ liệu, yêu cầu đăng nhập | Thông báo "Vui lòng đăng nhập…", không có dữ liệu | Đạt | | UI-01 |
| UI-02 | Đăng ký tên không hợp lệ | Tên `ab` | Báo lỗi, không gửi lên server | Báo lỗi định dạng tên ngay dưới form | Đạt | | UI-02 |
| UI-03 | Đăng ký thành công | Tên `qa_ui_tester` | Vào tổng quan, số liệu bằng 0 | Vào tổng quan, 0 ₫ / 0 ₫ / 0 ₫ | Đạt | | UI-03 |
| UI-04 | Nhật ký rỗng | Tài khoản mới | Có trạng thái rỗng | "Chưa tìm thấy giao dịch", 0 giao dịch | Đạt | | UI-04 |
| UI-05 | Nhập sai khi thêm giao dịch | Số tiền 0, chưa chọn danh mục | Báo lỗi từng ô, không lưu | "Số tiền phải lớn hơn 0." và "Hãy chọn một danh mục." | Đạt | | UI-05 |
| UI-06 | Thêm khoản chi, ghi chú chứa HTML | 45.000, Ăn uống, `<img src=x onerror=alert(1)>` | Lưu được, tổng cập nhật, ghi chú hiện dạng chữ | Tổng chi 45.000, ghi chú hiện nguyên văn, không chạy mã | Đạt | | UI-06 |
| UI-07 | Thêm khoản thu | Chọn "Khoản thu", 2.000.000, Tiền lương | Chỉ hiện danh mục thu, số dư đúng | Chỉ 4 danh mục thu, số dư 1.955.000 | Đạt | | UI-07 |
| UI-08 | Máy chủ lỗi khi lưu | Giả lập API trả 500 | Không báo thành công, không đổi số liệu | Form giữ nguyên, tổng chi vẫn 45.000. Thông báo lỗi bị lớp nền mờ che | Đạt | BUG-11 | UI-08 |
| UI-09 | Phiên đăng nhập không hợp lệ | Sửa token trong trình duyệt rồi tải lại | Xóa phiên, đưa về màn đăng nhập | Vẫn hiện tên người dùng cũ, màn hình trống, không mở đăng nhập | **Không đạt** | BUG-10 | UI-09 |
| UI-10 | Đăng nhập sai trên điện thoại | Sai mật khẩu, khung 375px | Báo lỗi | "Tên đăng nhập hoặc mật khẩu không chính xác." | Đạt | | UI-10 |
| UI-11 | Tổng quan trên điện thoại | Khung 375×812 | Không tràn ngang, đủ số liệu | Không tràn ngang, có thanh điều hướng dưới, số liệu đúng | Đạt | | UI-11 |
| UI-12 | Tạo danh mục cá nhân trên giao diện | Mở form thêm giao dịch | Có chỗ tạo danh mục riêng | Chỉ có danh mục mặc định, không có chức năng tạo | **Không đạt** | BUG-04 | UI-05 |

Ảnh bằng chứng nằm trong `tester/bang_chung/giao_dien/`, tên file bắt đầu bằng mã ca (ví dụ `UI-09_token_khong_hop_le.jpg`).

## 4. Danh sách lỗi

| Mã | Tên lỗi | Mức độ | Người phụ trách | Ca phát hiện | Trạng thái |
|---|---|---|---|---|---|
| BUG-01 | Giả mạo được token bằng khóa JWT mặc định trong mã nguồn để xem dữ liệu người khác | Cao | Việt (Backend) | TC-SEC-04 | Mở |
| BUG-02 | Backend chưa kết nối SQL Server, đang lưu vào file JSON | Cao | Việt (Backend), phối hợp Trí (DB) | TC-INT-01 | Mở |
| BUG-03 | Chưa có API tạo/lấy danh mục cá nhân | Cao | Việt (Backend) | TC-CAT-04 | Mở |
| BUG-04 | Giao diện chưa có chức năng tạo danh mục cá nhân | Cao | Toàn (Frontend) | UI-12 | Mở (phụ thuộc BUG-03) |
| BUG-05 | Chấp nhận ngày giao dịch không có thật (2026-13-45, 2026-02-30) | Trung bình | Việt (Backend) | TC-TRX-11, 12 | Mở |
| BUG-06 | Server không giới hạn độ dài ghi chú (CSDL chỉ cho 500 ký tự) | Trung bình | Việt (Backend) | TC-TRX-13 | Mở |
| BUG-07 | Server không giới hạn số tiền tối đa (vượt DECIMAL(15,2)) | Trung bình | Việt (Backend) | TC-TRX-14 | Mở |
| BUG-08 | Nhật ký chỉ trả 30 giao dịch gần nhất, không xem được toàn bộ | Trung bình | Việt (Backend), Toàn cập nhật giao diện | TC-DSH-09 | Mở |
| BUG-09 | Lỗi do client gửi sai (JSON hỏng, payload lớn) trả mã `INTERNAL_SERVER_ERROR` và lộ thông báo nội bộ | Thấp | Việt (Backend) | TC-SEC-06 | Mở |
| BUG-10 | Phiên hết hạn/không hợp lệ: giao diện không xóa phiên và không đưa về màn đăng nhập | Thấp | Toàn (Frontend) | UI-09 | Mở |
| BUG-11 | Thông báo lỗi khi lưu giao dịch thất bại bị lớp nền của hộp thoại che | Thấp | Toàn (Frontend) | UI-08 | Mở |

**Cách xếp mức độ:**

- **Cao:** lộ dữ liệu, hoặc thiếu chức năng bắt buộc của Sprint 1.
- **Trung bình:** dữ liệu sai vẫn được lưu, hoặc sẽ gây lỗi khi chuyển sang SQL Server.
- **Thấp:** ảnh hưởng trải nghiệm hoặc thông báo lỗi, không làm sai dữ liệu.

Nội dung từng lỗi đã viết sẵn để tạo issue trên GitHub, nằm trong thư mục `github_issues/` (để riêng, không đưa lên repo). Mỗi file gồm: mô tả, các bước tái hiện, kết quả mong đợi, kết quả thực tế, bằng chứng, vị trí trong mã và gợi ý sửa.

### Ghi chú thêm (góp ý, không tính là lỗi)

| Mã | Nội dung | Gửi |
|---|---|---|
| GY-01 | Chưa có nút đăng xuất. Menu tài khoản chỉ có "Đổi tài khoản" và "Tạo tài khoản". | Toàn |
| GY-02 | Giới hạn ghi chú chưa thống nhất: ô nhập cho 140 ký tự, `app.js` cắt ở 255, CSDL cho 500. Nên thống nhất một con số. | Toàn, Việt, Trí |
| GY-03 | Token sai hoặc hết hạn trả 403. Theo quy ước nên trả 401 để giao diện biết cần đăng nhập lại. | Việt |
| GY-04 | API đăng nhập chưa giới hạn mật khẩu tối đa 128 ký tự như API đăng ký. | Việt |
| GY-05 | Khi chưa đăng nhập, trang không tự mở form đăng nhập. Người dùng phải tự bấm vào biểu tượng tài khoản. | Toàn |

## 5. Kiểm thử lại (retest)

Đến ngày 15/10/2026 chưa có lỗi nào được sửa, nên chưa retest. Khi các bạn báo đã sửa:

1. Kéo code mới, chạy lại Backend.
2. Chạy `node tester/scripts/tai_hien_loi.js`. Lỗi đã sửa sẽ hiện **ĐÃ SỬA**, kết quả lưu vào `tester/bang_chung/api/`.
3. Chạy lại toàn bộ `node tester/scripts/sprint1_api_test.js` để chắc chắn không phát sinh lỗi mới.
4. Kiểm tra lại bằng tay các lỗi giao diện BUG-04, BUG-10, BUG-11.
5. Cập nhật bảng dưới và đóng issue tương ứng.

| Mã lỗi | Ngày retest | Commit đã kiểm tra | Kết quả | Người retest |
|---|---|---|---|---|
| BUG-01 | | | | |
| BUG-02 | | | | |
| BUG-03 | | | | |
| BUG-04 | | | | |
| BUG-05 | | | | |
| BUG-06 | | | | |
| BUG-07 | | | | |
| BUG-08 | | | | |
| BUG-09 | | | | |
| BUG-10 | | | | |
| BUG-11 | | | | |

## 6. Kết luận

- Các luồng chính của Sprint 1 đã chạy được:
  - Đăng ký và đăng nhập.
  - Thêm khoản thu/chi.
  - Tính tổng và số dư.
  - Nhật ký, trạng thái rỗng.
  - Tách biệt dữ liệu giữa tài khoản.
  - Giao diện máy tính và điện thoại.
- Sprint 1 **chưa đủ điều kiện nghiệm thu**. Còn 4 lỗi mức Cao:
  - **BUG-01:** lộ dữ liệu người khác khi chạy backend mà không cấu hình `JWT_SECRET`.
  - **BUG-02:** chưa lưu vào SQL Server như yêu cầu của Sprint.
  - **BUG-03, BUG-04:** chưa có danh mục cá nhân.
- Đề xuất ưu tiên sửa:
  1. BUG-01, BUG-02, BUG-03 trước.
  2. Tiếp theo là BUG-04 và nhóm kiểm tra dữ liệu BUG-05 → BUG-08. Nhóm này sẽ gây lỗi 500 khi chuyển sang SQL Server nếu không chặn trước.
  3. Cuối cùng là các lỗi mức Thấp.

**Danh sách lỗi còn lại cuối Sprint 1:** BUG-01 → BUG-11 (11 lỗi, tất cả đang mở).

## 7. Tài liệu đi kèm

Các đường dẫn dưới đây tính từ thư mục `tester/`.

| Đường dẫn | Nội dung |
|---|---|
| `scripts/sprint1_api_test.js` | Script kiểm thử API tự động (55 ca) |
| `scripts/tai_hien_loi.js` | Script tái hiện lỗi, dùng để retest |
| `ket_qua/ket_qua_api.md`, `.json` | Kết quả chạy API ngày 15/10/2026 |
| `bang_chung/api/tai_hien_loi_*.txt` | Request/response của từng lỗi API |
| `bang_chung/giao_dien/*.jpg` | Ảnh chụp các ca giao diện |
