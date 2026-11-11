# 📋 BỘ KỊCH BẢN KIỂM THỬ TOÀN DIỆN (COMPREHENSIVE TEST SUITE - 65 TEST CASES)

> **Dự án**: Sổ Chi Tiêu Sinh Viên (ThuChii)  
> **Phiên bản nghiệm thu**: Release Cloud v33 (Full PWA, Mobile Safe-Area & Android Widget)  
> **Môi trường Web Cloud**: [https://quan-ly-chi-tieu-k5kn.onrender.com](https://quan-ly-chi-tieu-k5kn.onrender.com)  
> **Link tải trực tiếp APK Android**: [https://quan-ly-chi-tieu-k5kn.onrender.com/thuchii.apk](https://quan-ly-chi-tieu-k5kn.onrender.com/thuchii.apk)  
> **Tài liệu tham chiếu**: [`docs/HUONG_DAN_SU_DUNG_VA_CAI_DAT_APP.md`](./HUONG_DAN_SU_DUNG_VA_CAI_DAT_APP.md)  
> **Đối tượng sử dụng**: QA / Tester dự án kiểm thử độc lập từ đầu đến cuối.

---

## 🎯 HƯỚNG DẪN DÀNH CHO TESTER
1. **Chuẩn bị thiết bị**:
   - 1 điện thoại **iPhone** (chạy iOS Safari để test PWA, vuốt cử chỉ, tai thỏ/Home bar).
   - 1 điện thoại **Android** (cài đặt file `thuchii.apk` để test Widget 2x2, 4x2 và test PWA trên Chrome).
   - 1 **Máy tính (PC/Laptop)** (trình duyệt Chrome/Edge để test desktop và F12 Console).
2. **Quy ước đánh giá**:
   - **PASS**: Tính năng hoạt động chuẩn xác theo Kết quả mong đợi.
   - **FAIL**: Sai lệch kết quả, văng trang, trắng màn hình, hoặc hiện giá trị bất thường (`NaN`, `undefined`, số âm sai lệch...).
   - **BLOCKER**: Lỗi nghiêm trọng làm dừng quy trình test, không thể tiếp tục các bước sau.

---

## 📑 MỤC LỤC 10 PHÂN HỆ KIỂM THỬ (65 TEST CASES)
1. [Phân hệ 1: Chế độ Khách / Dùng thử (Mock Engine & Chống lỗi NaN) - 8 TCs](#phân-hệ-1-chế-độ-khách--dùng-thử-mock-engine--chống-lỗi-nan)
2. [Phân hệ 2: Đăng ký, Đăng nhập & Quản lý phiên (Authentication) - 7 TCs](#phân-hệ-2-đăng-ký-đăng-nhập--quản-lý-phiên-authentication)
3. [Phân hệ 3: Ghi nhận giao dịch - Giọng nói NLP tiếng Việt - 6 TCs](#phân-hệ-3-ghi-nhận-giao-dịch---giọng-nói-nlp-tiếng-việt)
4. [Phân hệ 4: Ghi nhận giao dịch - Quét ảnh hóa đơn & Bill chuyển khoản OCR - 6 TCs](#phân-hệ-4-ghi-nhận-giao-dịch---quét-ảnh-hóa-đơn--bill-chuyển-khoản-ocr)
5. [Phân hệ 5: Ghi nhận giao dịch - Dán SMS & Tự nhập thủ công - 6 TCs](#phân-hệ-5-ghi-nhận-giao-dịch---dán-sms--tự-nhập-thủ-công)
6. [Phân hệ 6: Quản lý Ngân sách thông minh & Tự cân bằng ngày - 7 TCs](#phân-hệ-6-quản-lý-ngân-sách-thông-minh--tự-cân-bằng-ngày)
7. [Phân hệ 7: Thú cưng Mochi, Gamification & Tiệm đồ (Pet Shop) - 7 TCs](#phân-hệ-7-thú-cưng-mochi-gamification--tiệm-đồ-pet-shop)
8. [Phân hệ 8: Sổ nợ, Nhắc nợ khéo & Chia tiền nhóm - 6 TCs](#phân-hệ-8-sổ-nợ-nhắc-nợ-khéo--chia-tiền-nhóm)
9. [Phân hệ 9: Đối soát ví thực tế ("Tiền bốc hơi") & Lịch sử - 5 TCs](#phân-hệ-9-đối-soát-ví-thực-tế-tiền-bốc-hơi--lịch-sử)
10. [Phân hệ 10: Tương thích thiết bị, Safe-Area, PWA, Widget & Offline - 7 TCs](#phân-hệ-10-tương-thích-thiết-bị-safe-area-pwa-widget--offline)

---

### PHÂN HỆ 1: CHẾ ĐỘ KHÁCH / DÙNG THỬ (MOCK ENGINE & CHỐNG LỖI NaN)
> *Mục tiêu: Đảm bảo chế độ "Dùng thử ngay – không cần đăng ký" hoạt động 100% độc lập, không sinh lỗi `NaN%` hay `NaNđ` như người dùng phản ánh.*

| Mã TC | Tên ca kiểm thử | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Mức độ | Kết quả |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-01** | Kích hoạt chế độ Khách lần đầu | 1. Mở web bằng tab ẩn danh (Incognito).<br>2. Bấm nút **"Dùng thử ngay – không cần đăng ký"**. | - | - Vào thẳng Trang chủ mượt mà.<br>- Có thông báo Toast xanh: *"Đã kích hoạt chế độ dùng thử với dữ liệu mẫu (Không có ID)"*.<br>- Avatar hiển thị biểu tượng ngôi sao lấp lánh `✦`. | Khẩn cấp | [ ] |
| **TC-02** | Vòng tròn tiến độ & Số liệu Trang chủ | 1. Quan sát vòng tròn phần trăm và các ô số tiền tại Trang chủ chế độ Khách. | Dữ liệu mẫu | - Vòng tròn hiển thị tỷ lệ chuẩn (VD: `75%` hoặc `100%`), **tuyệt đối không hiển thị `NaN%`**.<br>- Ô *"Đã chi hôm nay"*, *"Thu: +"*, *"Còn được tiêu hôm nay"* hiển thị số tiền có định dạng `...đ` chuẩn xác. | Khẩn cấp | [ ] |
| **TC-03** | Thêm khoản chi ở chế độ Khách | 1. Bấm nút **[ + ]** ➔ Chọn **Tự nhập**.<br>2. Nhập số tiền `35.000đ`, tên `Trà sữa`, chọn danh mục `Ăn uống` ➔ Bấm Lưu. | Tiền: `35000`<br>Tên: `Trà sữa` | - Lưu thành công ngay lập tức.<br>- Trang chủ: *"Đã chi hôm nay"* tăng thêm 35.000đ, *"Còn được tiêu"* giảm 35.000đ.<br>- Vòng tròn tiến độ cập nhật lại phần trăm chuẩn, không bị nhảy số `NaN`. | Khẩn cấp | [ ] |
| **TC-04** | Thêm khoản thu ở chế độ Khách | 1. Bấm nút **[ + ]** ➔ Chuyển sang tab **Khoản thu (+)**.<br>2. Nhập `500.000đ`, tên `Bố mẹ cho`, bấm Lưu. | Tiền: `500000`<br>Tên: `Bố mẹ cho` | - Lưu thành công.<br>- Dòng *"Thu: +"* trên Trang chủ tăng thêm `+500.000đ`.<br>- Tổng số dư tài khoản tăng lên 500.000đ. | Cao | [ ] |
| **TC-05** | Màn hình "Tiền bốc hơi" chế độ Khách | 1. Vào tab **Tôi** ➔ Chọn **Tiền bốc hơi**.<br>2. Nhập số tiền mặt và tiền ngân hàng. | Tiền mặt: `250.000`<br>Tài khoản: `3.000.000` | - Trang mở tức thì không báo lỗi.<br>- Ô chênh lệch tính toán số tiền chính xác, **không bao giờ hiện `NaN` hoặc `NaNđ`**. | Khẩn cấp | [ ] |
| **TC-06** | Màn hình Ngân sách ở chế độ Khách | 1. Vào tab **Tôi** ➔ Bấm thẻ **Ngân sách tháng này**.<br>2. Gõ thử số tiền mới vào ô ngân sách. | Nhập: `4.500.000` | - Ô gợi ý hiển thị: `= 4.500.000đ · khoảng 150.000đ/ngày` (không bị chia cho undefined).<br>- Bấm Lưu cập nhật ngân sách thành công. | Cao | [ ] |
| **TC-07** | Tiệm đồ thú cưng ở chế độ Khách | 1. Vào tab **Tôi** ➔ Chọn **Tiệm đồ thú cưng**.<br>2. Thử mua 1 vật phẩm (nón/kính) bằng xu mẫu ➔ Bấm **Trang bị**. | Mua Nón len (50 xu) | - Trừ đúng số xu mẫu.<br>- Trở về Trang chủ, thú cưng Mochi đội đúng chiếc nón vừa trang bị. | Cao | [ ] |
| **TC-08** | Chuyển đổi từ Khách sang Đăng ký thật | 1. Ở chế độ Khách, vào tab **Tôi** ➔ Bấm nút **"Đăng ký tài khoản để lưu trữ vĩnh viễn"**.<br>2. Điền thông tin tạo tài khoản. | User mới | - Chuyển sang tài khoản chính thức suôn sẻ, không bị kẹt token hay xung đột dữ liệu. | Cao | [ ] |

---

### PHÂN HỆ 2: ĐĂNG KÝ, ĐĂNG NHẬP & QUẢN LÝ PHIÊN (AUTHENTICATION)
> *Mục tiêu: Đảm bảo đăng ký trên nhiều máy khác nhau không bị báo lỗi giả "dữ liệu đã tồn tại", quản lý phiên bảo mật.*

| Mã TC | Tên ca kiểm thử | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Mức độ | Kết quả |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-09** | Đăng ký tài khoản hợp lệ | 1. Mở web trên thiết bị mới (hoặc tab ẩn danh).<br>2. Bấm **Tạo tài khoản**.<br>3. Nhập username (từ 3-20 ký tự) và mật khẩu (từ 6 ký tự) ➔ Bấm Tạo tài khoản. | User: `sv_kinhte01`<br>Pass: `MatKhau@123` | - Tài khoản tạo thành công ngay trong 1 giây.<br>- Tự động đăng nhập và chuyển vào màn hình chính.<br>- Lời chào hiển thị: *"Chào buổi sáng/trưa/tối, sv_kinhte01"*. | Khẩn cấp | [ ] |
| **TC-10** | Đăng ký trùng tên đăng nhập | 1. Bấm Đăng xuất.<br>2. Bấm **Tạo tài khoản** ➔ Nhập lại đúng username `sv_kinhte01` đã đăng ký ở TC-09. | User: `sv_kinhte01`<br>Pass: `12345678` | - Hệ thống hiển thị thông báo lỗi màu đỏ rõ ràng: *"Tên đăng nhập đã được sử dụng, vui lòng chọn tên khác"*.<br>- Không bị văng trang, con trỏ tự focus vào ô nhập tên. | Khẩn cấp | [ ] |
| **TC-11** | Kiểm tra phân biệt chữ hoa/thường username | 1. Thử tạo tài khoản với tên viết hoa: `SV_KINHTE01`. | User: `SV_KINHTE01` | - Hệ thống tự chuyển về chữ thường hoặc nhận diện đã trùng với `sv_kinhte01`, báo lỗi trùng tên hợp lý. | Cao | [ ] |
| **TC-12** | Đăng ký với mật khẩu yếu / quá ngắn | 1. Nhập username hợp lệ, nhưng mật khẩu chỉ có 3 ký tự (VD: `123`). | Pass: `123` | - Hệ thống chặn lại và báo lỗi: *"Mật khẩu phải từ 6 ký tự trở lên"*. Không gửi request lỗi lên server. | Bình thường | [ ] |
| **TC-13** | Đăng nhập đúng thông tin | 1. Tại màn hình Đăng nhập, nhập đúng tài khoản và mật khẩu đã tạo ở TC-09. | `sv_kinhte01` / `MatKhau@123` | - Đăng nhập thành công, tải toàn bộ dữ liệu cá nhân của tài khoản về máy. | Khẩn cấp | [ ] |
| **TC-14** | Đăng nhập sai mật khẩu | 1. Nhập đúng username nhưng gõ sai mật khẩu ➔ Bấm Đăng nhập. | `sv_kinhte01` / `PassSai123` | - Báo lỗi: *"Tên đăng nhập hoặc mật khẩu không đúng"*.<br>- Giữ nguyên tên đăng nhập để người dùng không phải gõ lại từ đầu. | Cao | [ ] |
| **TC-15** | Tự động duy trì phiên (Remember Session) | 1. Đang ở màn hình chính, đóng hẳn tab hoặc tắt hẳn trình duyệt.<br>2. Mở lại trình duyệt và truy cập link web. | - | - Tự động vào thẳng màn hình chính mà không bắt đăng nhập lại.<br>- Token được bảo lưu an toàn. | Cao | [ ] |

---

### PHÂN HỆ 3: GHI NHẬN GIAO DỊCH - GIỌNG NÓI NLP TIẾNG VIỆT
> *Mục tiêu: Đọc bằng giọng nói tự nhiên, AI tự bóc tách số tiền, danh mục, thời gian mà không cần gõ phím.*

| Mã TC | Tên ca kiểm thử | Câu đọc thử nghiệm | Kết quả bóc tách mong đợi | Mức độ | Kết quả |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-16** | Giọng nói số tiền tròn (k / nghìn) | Đọc: *"Trà sữa ba mươi lăm nghìn"* hoặc *"Trà sữa 35k"* | - Tiền: `35.000đ`<br>- Tên: `Trà sữa`<br>- Danh mục: `Ăn uống` | Khẩn cấp | [ ] |
| **TC-17** | Giọng nói số tiền có hàng triệu | Đọc: *"Tiền thuê phòng trọ một triệu tám trăm ngàn"* | - Tiền: `1.800.000đ`<br>- Tên: `Tiền thuê phòng trọ`<br>- Danh mục: `Nhà cửa` | Cao | [ ] |
| **TC-18** | Giọng nói kèm thời gian hôm qua | Đọc: *"Hôm qua đổ xăng năm mươi nghìn"* | - Tiền: `50.000đ`<br>- Tên: `Đổ xăng`<br>- Ngày: Tự lùi về ngày hôm qua<br>- Danh mục: `Di chuyển` | Cao | [ ] |
| **TC-19** | Giọng nói khoản thu nhập | Đọc: *"Lương làm thêm hai triệu năm trăm nghìn"* | - Tiền: `2.500.000đ`<br>- Loại: `Khoản thu (+)`<br>- Tên: `Lương làm thêm` | Cao | [ ] |
| **TC-20** | Giọng nói câu không có số tiền | Đọc: *"Hôm nay đi chơi với bạn"* | - Hệ thống nhận diện câu nói nhưng phát hiện thiếu tiền.<br>- Báo nhắc: *"Chưa nghe rõ số tiền, bạn đọc lại số tiền nhé"*. | Bình thường | [ ] |
| **TC-21** | Từ chối quyền Micro (Permission Denied) | Bấm Nói ➔ Trên popup trình duyệt bấm **"Chặn" (Block)**. | - App không bị sập.<br>- Hiển thị hướng dẫn: *"Bạn hãy bật quyền Micro trong cài đặt trình duyệt để nói"* kèm nút chuyển sang Tự nhập tay. | Cao | [ ] |

---

### PHÂN HỆ 4: GHI NHẬN GIAO DỊCH - QUÉT ẢNH HÓA ĐƠN & BILL CHUYỂN KHOẢN OCR
> *Mục tiêu: Đọc hóa đơn siêu thị, quán ăn, ảnh chụp màn hình ngân hàng offline không cần mạng ngoài.*

| Mã TC | Tên ca kiểm thử | Dữ liệu ảnh thử nghiệm | Kết quả bóc tách mong đợi | Mức độ | Kết quả |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-22** | Quét hóa đơn in siêu thị / cafe | Ảnh chụp hóa đơn giấy có dòng: `Tổng cộng: 125.000đ` | - Bóc tách ra đúng số tiền `125.000đ`.<br>- Tên giao dịch điền tên quán hoặc `Ăn uống / Mua sắm`. | Cao | [ ] |
| **TC-23** | Quét ảnh chuyển khoản thành công Vietcombank/MB | Ảnh chụp màn hình App ngân hàng có dòng: `Số tiền: 50,000 VND` | - Bóc tách số tiền `50.000đ`.<br>- Tự loại bỏ số dư tài khoản (không lấy nhầm số dư thành số tiền chi). | Cao | [ ] |
| **TC-24** | Quét ảnh nhận tiền (Khoản thu) | Ảnh chụp màn hình: `+200,000 VND từ NGUYEN VAN A` | - Bóc tách đúng `200.000đ`.<br>- Tự động chọn loại giao dịch là **Khoản thu (+)**. | Cao | [ ] |
| **TC-25** | Quét hóa đơn chụp mờ / nghiêng | Ảnh chụp hóa đơn ánh sáng yếu, chụp hơi nghiêng | - Hệ thống cố gắng nhận diện, nếu độ tin cậy thấp sẽ điền số tiền đoán được và bôi vàng để người dùng kiểm tra lại. | Bình thường | [ ] |
| **TC-26** | Tải lên file ảnh không phải hóa đơn | Tải lên ảnh phong cảnh, ảnh chân dung thú cưng | - Hệ thống xử lý êm ái, thông báo: *"Không tìm thấy thông tin số tiền trên ảnh, bạn vui lòng tự nhập nhé"*. | Bình thường | [ ] |
| **TC-27** | Chỉnh sửa số tiền sau khi quét OCR | Quét xong ảnh bill ➔ Bấm vào ô số tiền sửa lại trước khi lưu | - Cho phép người dùng sửa lại số tiền, tên khoản, danh mục.<br>- Bấm Lưu ghi nhận đúng số tiền người dùng vừa sửa. | Cao | [ ] |

---

### PHÂN HỆ 5: GHI NHẬN GIAO DỊCH - DÁN SMS & TỰ NHẬP THỦ CÔNG
> *Mục tiêu: Lọc tin nhắn ngân hàng tự động và nhập tay nhanh chóng.*

| Mã TC | Tên ca kiểm thử | Thao tác & Dữ liệu | Kết quả mong đợi | Mức độ | Kết quả |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-28** | Dán SMS trừ tiền ngân hàng | Dán: `TK 1234 -45,000VND vao 12:00 tai PHUC LONG TEA...` | - Bóc đúng số tiền `45.000đ`.<br>- Tên khoản chi: `PHUC LONG TEA`, danh mục `Ăn uống`. | Cao | [ ] |
| **TC-29** | Dán SMS cộng tiền (lương/chuyển khoản) | Dán: `TK 1234 +5,000,000VND vao 09:00 ND: Tra luong T10...` | - Bóc đúng `5.000.000đ`.<br>- Tự chuyển sang tab **Khoản thu (+)**. | Cao | [ ] |
| **TC-30** | Nhập số tiền dạng viết tắt | Vào Tự nhập ➔ Gõ: `45k`, `1tr2`, `2tr5` | - Ô phụ đề hiển thị tương ứng: `= 45.000đ`, `= 1.200.000đ`, `= 2.500.000đ`. | Cao | [ ] |
| **TC-31** | Nhập số tiền = 0 hoặc số âm | Nhập tiền: `0` hoặc `-50000` ➔ Bấm Lưu | - Nút Lưu bị mờ (disabled) hoặc báo lỗi yêu cầu nhập số tiền lớn hơn 0. | Bình thường | [ ] |
| **TC-32** | Nhập số tiền cực lớn (Boundary Test) | Nhập số tiền: `999.000.000đ` | - App lưu bình thường, định dạng hiển thị `999tr` không bị tràn vỡ giao diện. | Bình thường | [ ] |
| **TC-33** | Xóa giao dịch vừa tạo | Vào Lịch sử ➔ Bấm vào giao dịch vừa tạo ➔ Bấm **Xóa** | - Có popup xác nhận: *"Bạn có chắc muốn xóa khoản này?"*.<br>- Sau khi xóa, số dư và ngân sách hoàn trả lại đúng số tiền tương ứng. | Cao | [ ] |

---

### PHÂN HỆ 6: QUẢN LÝ NGÂN SÁCH THÔNG MINH & TỰ CÂN BẰNG NGÀY
> *Mục tiêu: Đặt ngân sách cả tháng, hệ thống tự động cân đối mức tiêu mỗi ngày mà không cần tính nhẩm.*

| Mã TC | Tên ca kiểm thử | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Mức độ | Kết quả |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-34** | Đặt ngân sách tháng đầu tiên | 1. Vào Tôi ➔ Ngân sách tháng này.<br>2. Nhập `3.000.000` ➔ Bấm Đặt ngân sách. | `3.000.000đ` | - Lưu thành công.<br>- Chia đều hạn mức mỗi ngày = `100.000đ/ngày` (nếu tháng 30 ngày).<br>- Thẻ ngân sách Trang chủ hiển thị: *"Hạn mức/ngày: 100.000đ"*. | Khẩn cấp | [ ] |
| **TC-35** | Chi tiêu an toàn trong hạn mức ngày | 1. Hôm nay chỉ chi `30.000đ` (hạn mức `100.000đ`). | Chi `30.000đ` | - Ô *"Còn được tiêu hôm nay"* hiển thị `70.000đ`.<br>- Vòng tròn tiến độ hiển thị `70%` màu tím/xanh an toàn. | Cao | [ ] |
| **TC-36** | Chi tiêu vượt trần hạn mức ngày | 1. Ghi thêm khoản chi `150.000đ` (tổng chi `180.000đ` > hạn mức `100.000đ`). | Chi thêm `150.000đ` | - Ô *"Còn được tiêu hôm nay"* chuyển màu đỏ âm tiền: `-80.000đ`.<br>- Vòng tròn tiến độ đổi sang màu hồng/cam cảnh báo vượt mức. | Cao | [ ] |
| **TC-37** | Cơ chế tự cân bằng ngày hôm sau | 1. Quan sát hạn mức ngày tiếp theo sau khi hôm nay đã tiêu lố. | - | - Số tiền lố hôm nay được tự động cấn trừ, giảm nhẹ hạn mức các ngày còn lại để cuối tháng không bị thiếu hụt. | Cao | [ ] |
| **TC-38** | Cảnh báo ngưỡng nguy hiểm (>= 85%) | 1. Tổng chi trong tháng vượt quá 85% tổng ngân sách tháng. | Tổng chi: 88% | - Xuất hiện thẻ cảnh báo màu vàng cam trong Trung tâm thông báo: *"Sắp chạm trần ngân sách tháng (Đã tiêu 88%)"*. | Cao | [ ] |
| **TC-39** | Cập nhật lại số tiền ngân sách | 1. Vào Ngân sách ➔ Sửa từ `3.000.000đ` lên `4.500.000đ` ➔ Bấm Cập nhật. | `4.500.000đ` | - Cập nhật thành công, hạn mức mỗi ngày tự động tính lại theo con số mới. | Bình thường | [ ] |
| **TC-40** | Xóa bỏ ngân sách tháng | 1. Bấm nút **Bỏ ngân sách tháng này** ➔ Xác nhận. | - | - Thẻ ngân sách chuyển về trạng thái ban đầu: *"Đặt ngân sách tháng để biết mỗi ngày còn được tiêu bao nhiêu"*. | Bình thường | [ ] |

---

### PHÂN HỆ 7: THÚ CƯNG MOCHI, GAMIFICATION & TIỆM ĐỒ (PET SHOP)
> *Mục tiêu: Nuôi thú cưng ví tiền, tương tác cảm xúc, chuỗi ngày và mua sắm phụ kiện.*

| Mã TC | Tên ca kiểm thử | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Mức độ | Kết quả |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-41** | Chạm tương tác với Mochi (Poke) | 1. Nhấn ngón tay vào thú cưng Mochi trên Trang chủ. | Bấm vào thú cưng | - Mochi nảy lên kèm hiệu ứng rung nhẹ (haptic).<br>- Khung bong bóng thoại đổi câu thoại ngẫu nhiên dễ thương. | Bình thường | [ ] |
| **TC-42** | Tâm trạng Mochi: Vui vẻ (Happy) | 1. Giữ chi tiêu dưới hạn mức ngân sách ngày. | Tiêu trong hạn mức | - Mochi có khuôn mặt cười tít mắt, nhảy múa vui vẻ. | Cao | [ ] |
| **TC-43** | Tâm trạng Mochi: Buồn/Khóc (Sad) | 1. Chi tiêu vượt quá ngân sách tháng. | Vượt ngân sách tháng | - Mochi rơi nước mắt, mặt mếu máo nhắc bạn ngừng chi tiêu phát sinh. | Cao | [ ] |
| **TC-44** | Tâm trạng Mochi: Buồn ngủ (Sleepy) | 1. Đổi giờ điện thoại sang sau 20:00 tối mà cả ngày chưa ghi khoản nào. | Sau 20:00 | - Mochi ngáp ngủ, xuất hiện lời nhắc tối: *"Hôm nay bạn có tiêu gì không?"*. | Bình thường | [ ] |
| **TC-45** | Đánh dấu "Hôm nay không tiêu tiền" | 1. Khi có lời nhắc tối, bấm nút **"Hôm nay không tiêu gì"**. | Bấm 1 chạm | - Giữ vững chuỗi ngày ghi chép (Streak).<br>- Mochi vui vẻ trở lại kèm thông báo: *"Ngày không tiêu! Chuỗi ngày vẫn giữ nhé ✦"*. | Cao | [ ] |
| **TC-46** | Mua đồ trong Tiệm thú cưng (Pet Shop) | 1. Vào Tôi ➔ Tiệm đồ thú cưng.<br>2. Chọn mua **Kính râm ngầu** (giá 80 xu) khi có đủ xu. | Đủ xu | - Trừ đúng 80 xu.<br>- Vật phẩm chuyển sang trạng thái *"Đã sở hữu"*, xuất hiện nút *"Trang bị"*. | Cao | [ ] |
| **TC-47** | Đổi phông nền sân khấu (Stage Theme) | 1. Trong Pet Shop, chọn mua hoặc đổi sang phông nền **Bãi biển mùa hè**. | Phông nền | - Thẻ thú cưng trên Trang chủ đổi toàn bộ màu sắc, ánh sáng và họa tiết theo chủ đề Bãi biển. | Bình thường | [ ] |

---

### PHÂN HỆ 8: SỔ NỢ, NHẮC NỢ KHÉO & CHIA TIỀN NHÓM
> *Mục tiêu: Quản lý công nợ, đòi nợ tinh tế và chia tiền hóa đơn nhóm.*

| Mã TC | Tên ca kiểm thử | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Mức độ | Kết quả |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-48** | Thêm khoản "Họ nợ mình" | 1. Vào tab Sổ nợ ➔ Bấm **Thêm nợ**.<br>2. Chọn *"Họ nợ mình"*, nhập tên: `Huy`, tiền `60.000đ`, lý do `Tiền trà sữa`. | Người: `Huy`<br>Tiền: `60000` | - Danh sách hiển thị mục màu xanh: *"Huy nợ mình 60.000đ"*. Tổng tiền người nợ mình tăng 60.000đ. | Cao | [ ] |
| **TC-49** | Thêm khoản "Mình nợ họ" | 1. Bấm Thêm nợ ➔ Chọn *"Mình nợ họ"*, người: `Tuấn`, tiền `30.000đ`. | Người: `Tuấn`<br>Tiền: `30000` | - Danh sách hiển thị mục màu cam: *"Mình nợ Tuấn 30.000đ"*. | Cao | [ ] |
| **TC-50** | Tính năng "Nhắc nợ khéo" | 1. Bấm vào khoản nợ của `Huy` ➔ Bấm nút **Nhắc nợ khéo**. | Bấm Nhắc nợ | - Hiện danh sách 3-5 mẫu tin nhắn hài hước, dễ thương có chèn sẵn số tiền `60.000đ`.<br>- Bấm nút **Sao chép** hiện thông báo đã chép vào Clipboard. | Cao | [ ] |
| **TC-51** | Đánh dấu trả nợ từng phần / toàn bộ | 1. Bấm vào khoản nợ của `Huy` ➔ Bấm **Đã nhận đủ**. | Hoàn tất | - Khoản nợ biến mất khỏi danh sách nợ đang chờ, chuyển vào tab Lịch sử nợ.<br>- Tổng nợ ròng giảm tương ứng. | Cao | [ ] |
| **TC-52** | Chia tiền nhóm (Bill Splitter) | 1. Vào tab Sổ nợ ➔ Chọn **Chia tiền nhóm**.<br>2. Nhập tổng bill `300.000đ`, chọn 3 người tham gia. | Bill: `300.000đ`<br>3 người | - Tự động tính đều mỗi người `100.000đ`.<br>- Tùy chọn tự động thêm các khoản nợ tương ứng vào sổ nợ cá nhân. | Cao | [ ] |
| **TC-53** | Kết bạn / Danh sách nhóm | 1. Nhập username bạn bè (VD: `test_friend`) để thêm vào nhóm. | Username | - Thêm bạn thành công, danh sách bạn bè lưu trữ ổn định. | Bình thường | [ ] |

---

### PHÂN HỆ 9: ĐỐI SOÁT VÍ THỰC TẾ ("TIỀN BỐC HƠI") & LỊCH SỬ
> *Mục tiêu: Đếm tiền thật, tìm ra tiền quên ghi và xem lại báo cáo.*

| Mã TC | Tên ca kiểm thử | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Mức độ | Kết quả |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-54** | Đếm tiền mặt bằng bộ đếm mệnh giá | 1. Vào Tôi ➔ Tiền bốc hơi.<br>2. Bấm nút [+] ở hàng 500k (2 tờ), 100k (3 tờ). | 2 tờ 500k<br>3 tờ 100k | - Ô tiền mặt tự động nhảy số `= 1.300.000đ` mà không cần tính nhẩm. | Cao | [ ] |
| **TC-55** | Đối soát: Tiền khớp 100% | 1. Nhập tổng tiền thật đúng bằng số dư trên sổ. | Tiền thật = Sổ | - Hiện icon pháo hoa 🎉 cùng chữ xanh *"Khớp! Bạn có ...đ, sổ ghi chuẩn từng đồng"*. | Cao | [ ] |
| **TC-56** | Đối soát: Tiền bị bốc hơi (Hụt tiền) | 1. Nhập tiền thật ít hơn sổ `70.000đ`.<br>2. Tích chọn *"Ghi luôn phần chênh lệch"* ➔ Bấm Lưu đối soát. | Hụt `70.000đ` | - Hiện icon con ma 👻 *"Đã bốc hơi 70.000đ"*. Nút lưu tạo khoản chi `70.000đ` vào mục *"Chi không nhớ"*, đưa sổ về trạng thái khớp hoàn toàn. | Cao | [ ] |
| **TC-57** | Xem Lịch nhiệt chi tiêu (Heatmap) | 1. Vào tab **Lịch sử** ➔ Quan sát bảng ô vuông các ngày trong tháng. | Lịch nhiệt | - Các ngày trong tháng tô màu từ mức 0 đến 4 theo số tiền chi (ngày chi nhiều màu đậm, ngày không chi có lá mầm). Bấm vào từng ngày lọc đúng giao dịch ngày đó. | Cao | [ ] |
| **TC-58** | Biểu đồ tròn cơ cấu danh mục | 1. Tại tab Lịch sử, quan sát mục *"Chi theo danh mục"*. | - | - Hiển thị đúng phần trăm các danh mục: Ăn uống, Nhà cửa, Di chuyển... với thanh bar màu tương ứng, **không bị NaN%**. | Cao | [ ] |

---

### PHÂN HỆ 10: TƯƠNG THÍCH THIẾT BỊ, SAFE-AREA, PWA, WIDGET & OFFLINE
> *Mục tiêu: Kiểm tra trải nghiệm thực tế trên iPhone, Android và khi mất mạng Internet.*

| Mã TC | Tên ca kiểm thử | Thiết bị thử nghiệm | Thao tác thực hiện | Kết quả mong đợi | Mức độ | Kết quả |
| :--- | :--- | :---: | :--- | :--- | :---: | :---: |
| **TC-59** | Chuyển tab trên Safari iPhone | **iPhone (iOS Safari)** | Mở web, bấm chuyển đổi liên tục qua lại giữa 5 tab: **Hôm nay ➔ Lịch sử ➔ [ + ] ➔ Sổ nợ ➔ Tôi**. | - Chuyển màn hình cực mượt.<br>- **Tuyệt đối không bị văng lỗi `WrongDocumentError` hay màn hình trắng "Không tải được màn hình"**. | Khẩn cấp | [ ] |
| **TC-60** | Kiểm tra viền màn hình iPhone (Safe Area) | **iPhone tai thỏ / Dynamic Island** | Mở app, quan sát thanh menu dưới đáy (Bottom Nav) và thanh tiêu đề trên cùng. | - Thanh điều hướng dưới đáy có đệm an toàn, không bị vạch gạt Home Bar che mất nút bấm.<br>- Tiêu đề không bị tai thỏ đè lên chữ. | Khẩn cấp | [ ] |
| **TC-61** | Cài đặt PWA "Thêm vào MH chính" | **iPhone & Android** | Bấm Chia sẻ ➔ "Thêm vào MH chính" (iOS) hoặc menu 3 chấm ➔ "Cài đặt ứng dụng" (Android). | - App cài ra màn hình có biểu tượng ThuChii tím.<br>- Mở lên toàn màn hình (Standalone), không có thanh URL trình duyệt. | Cao | [ ] |
| **TC-62** | Cài đặt file APK Android & Kéo Widget | **Điện thoại Android** | 1. Tải file `thuchii.apk` từ web.<br>2. Cài đặt file APK.<br>3. Nhấn giữ màn hình chính ➔ Chọn Widget Thu Chi. | - Cài đặt file APK thành công.<br>- Kéo được **Widget 2x2** và **Widget 4x2** ra màn hình chính điện thoại, hiển thị số tiền còn lại hôm nay. | Cao | [ ] |
| **TC-63** | Chế độ Ngoại tuyến (Offline-First) | **Tất cả thiết bị** | 1. Bật chế độ Máy bay (tắt toàn bộ Wi-Fi và 4G).<br>2. Mở app ThuChii. | - App vẫn mở tức thì trong **0.05 giây** (không bị hình khủng long mất mạng).<br>- Toàn bộ giao diện, hình ảnh thú cưng hiển thị bình thường từ Service Worker. | Cao | [ ] |
| **TC-64** | Nút "Làm mới bộ nhớ đệm" (Clear Cache) | **Tất cả thiết bị** | Vào Tôi ➔ Cài đặt ➔ Bấm nút **"Làm mới bộ nhớ đệm"**. | - App tự động xóa sạch dữ liệu cache cũ, tải lại phiên bản `v33` mới nhất trong 1 giây mà không cần người dùng vào cài đặt trình duyệt xóa lịch sử. | Cao | [ ] |
| **TC-65** | Chuyển đổi Giao diện Sáng/Tối & Ngôn ngữ | **Tất cả thiết bị** | Vào Cài đặt ➔ Đổi giữa chế độ **Nền Tối (Dark)** / **Nền Sáng (Light)** và đổi tiếng Việt ➔ English. | - Toàn bộ màu sắc và chữ nghĩa chuyển đổi tức thì, độ tương phản đọc rõ ràng không bị chói mắt. | Bình thường | [ ] |

---

## 📊 BẢNG TỔNG HỢP KẾT QUẢ KIỂM THỬ (TEST SUMMARY SCORECARD)

*Tester sau khi thực hiện xong vui lòng điền số liệu vào bảng sau và gửi lại:*

| Phân hệ kiểm thử | Số TC | Đạt (PASS) | Lỗi (FAIL) | Ghi chú / Mã lỗi phát hiện |
| :--- | :---: | :---: | :---: | :--- |
| **1. Chế độ Khách / Dùng thử (Chống NaN)** | 08 | | | |
| **2. Đăng ký, Đăng nhập & Quản lý phiên** | 07 | | | |
| **3. Ghi nhận giao dịch - Giọng nói NLP** | 06 | | | |
| **4. Ghi nhận giao dịch - Quét ảnh bill OCR** | 06 | | | |
| **5. Ghi nhận giao dịch - Dán SMS & Tự nhập** | 06 | | | |
| **6. Ngân sách thông minh & Cân bằng ngày** | 07 | | | |
| **7. Thú cưng Mochi, Gamification & Pet Shop** | 07 | | | |
| **8. Sổ nợ, Nhắc nợ khéo & Chia tiền nhóm** | 06 | | | |
| **9. Đối soát "Tiền bốc hơi" & Lịch sử** | 05 | | | |
| **10. Tương thích thiết bị, Safe-Area & PWA** | 07 | | | |
| **TỔNG CỘNG** | **65** | | | **Tỷ lệ Pass: ... %** |

---

### 🐞 BIỂU MẪU BÁO CÁO LỖI (DEFECT REPORT FORMAT)
*Nếu phát hiện bất kỳ lỗi nào trong quá trình kiểm thử, Tester gửi theo mẫu chuẩn:*

```text
- Mã Test Case lỗi: (VD: TC-02)
- Tên lỗi tóm tắt: (VD: Vòng tròn tiến độ hiển thị NaN% khi bấm nút Nói)
- Thiết bị thử nghiệm: (VD: iPhone 12 Pro Max - iOS 17.5 Safari)
- Các bước tái hiện:
  1. Vào chế độ dùng thử.
  2. Bấm nói câu: "trà sữa 30k".
  3. Quan sát vòng tròn trên trang chủ.
- Kết quả thực tế: Vòng tròn hiện chữ NaN%.
- Kết quả mong đợi: Vòng tròn phải hiện 85%.
- Ảnh chụp màn hình / Video đính kèm: [Ảnh]
```