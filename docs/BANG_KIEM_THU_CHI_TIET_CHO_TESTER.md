# 📋 BẢNG KỊCH BẢN KIỂM THỬ CHI TIẾT (TEST CHECKLIST DÀNH CHO TESTER)

> **Dự án**: Sổ Chi Tiêu Sinh Viên (ThuChii)  
> **Phiên bản kiểm thử**: Release Cloud v33  
> **Môi trường Web Cloud**: [https://quan-ly-chi-tieu-k5kn.onrender.com](https://quan-ly-chi-tieu-k5kn.onrender.com)  
> **Link tải file APK Android**: [https://quan-ly-chi-tieu-k5kn.onrender.com/thuchii.apk](https://quan-ly-chi-tieu-k5kn.onrender.com/thuchii.apk)  
> **Mục tiêu**: Nghiệm thu toàn diện tính năng, kiểm tra các lỗi vừa khắc phục (NaN ở chế độ khách, lỗi đăng ký trên máy khác, giao diện Safari iPhone).

---

## 📌 QUY ƯỚC MỨC ĐỘ LỖI (SEVERITY)
* **[Khẩn cấp - Blocker]**: Làm sập app, đứng màn hình, hiện lỗi `NaN`, không thể tạo tài khoản/giao dịch.
* **[Cao - Major]**: Tính năng không hoạt động đúng logic nghiệp vụ, tính sai tiền, không lưu dữ liệu.
* **[Bình thường - Normal]**: Lỗi hiển thị giao diện, lệch chữ, biểu tượng chưa chuẩn.

---

## 📑 DANH SÁCH TEST CASE CHI TIẾT THEO PHÂN HỆ

### PHÂN HỆ 1: CHẾ ĐỘ DÙNG THỬ (KHÁCH / DEMO) - *Ưu tiên số 1*
*(Kiểm tra triệt để lỗi NaN% và kẹt màn hình mà người dùng vừa phản ánh)*

| Mã TC | Tên ca kiểm thử | Các bước thực hiện | Dữ liệu thử nghiệm | Kết quả mong đợi | Mức độ | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-01** | Bật chế độ Khách & Kiểm tra Trang chủ | 1. Mở web bằng tab ẩn danh.<br>2. Bấm nút *"Dùng thử ngay – không cần đăng ký"*. | Bấm 1 chạm | - Vào thẳng màn hình chính không bị báo lỗi.<br>- Vòng tròn ngân sách hiển thị phần trăm chuẩn (VD: `75%` hoặc `100%`), **tuyệt đối KHÔNG hiện chữ `NaN%`**.<br>- Các ô *"Đã chi hôm nay"*, *"Còn được tiêu"* hiển thị số tiền có đuôi `đ`. | Khẩn cấp | [ ] |
| **TC-02** | Ghi khoản chi ở chế độ Khách | 1. Ở chế độ Khách, bấm nút **[ + ]**.<br>2. Chọn **Tự nhập**.<br>3. Nhập số tiền và tên khoản, bấm Lưu. | Số tiền: `40.000đ`<br>Tên: `Cà phê sáng` | - Toast thông báo lưu thành công.<br>- Quay lại Trang chủ, số tiền *"Đã chi hôm nay"* tăng thêm 40.000đ.<br>- Số tiền *"Còn được tiêu"* và vòng tròn tiến độ trừ đi tương ứng. | Khẩn cấp | [ ] |
| **TC-03** | Màn hình "Tiền bốc hơi" ở chế độ Khách | 1. Vào tab **Tôi** ➔ Chọn **Tiền bốc hơi**.<br>2. Nhập số tiền mặt và tiền tài khoản. | Tiền mặt: `300.000`<br>Tài khoản: `1.500.000` | - Không bị crash hoặc văng trang.<br>- Ô kết quả tính ra số tiền chênh lệch rõ ràng (dư hoặc thiếu), **không bị hiện `NaN` hoặc `NaNđ`**. | Cao | [ ] |
| **TC-04** | Xem và cập nhật ngân sách ở chế độ Khách | 1. Vào tab **Tôi** ➔ Bấm vào thẻ **Ngân sách tháng này**.<br>2. Nhập một con số mới vào ô ngân sách. | Nhập: `4.000.000` | - Gợi ý mức chia: `= 4.000.000đ · khoảng 133.333đ/ngày` hiển thị mượt mà.<br>- Bấm Cập nhật ngân sách lưu thành công. | Cao | [ ] |

---

### PHÂN HỆ 2: ĐĂNG KÝ, ĐĂNG NHẬP & XÁC THỰC
*(Kiểm tra lỗi máy khác báo dữ liệu đã tồn tại hoặc lỗi token rác)*

| Mã TC | Tên ca kiểm thử | Các bước thực hiện | Dữ liệu thử nghiệm | Kết quả mong đợi | Mức độ | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-05** | Đăng ký tài khoản mới thành công | 1. Mở web trên thiết bị mới / tab ẩn danh.<br>2. Bấm **Tạo tài khoản**.<br>3. Điền tên tài khoản và mật khẩu ➔ Bấm Tạo tài khoản. | Tên: `tester_vip01`<br>MK: `123456` | - Tạo tài khoản thành công ngay lập tức.<br>- Tự động chuyển vào màn hình chính, chào đúng tên tài khoản.<br>- Không bị bất kỳ thông báo lỗi đỏ nào. | Khẩn cấp | [ ] |
| **TC-06** | Đăng ký trùng tên tài khoản đã có | 1. Đăng xuất tài khoản.<br>2. Bấm **Tạo tài khoản**.<br>3. Nhập lại chính xác tên tài khoản vừa tạo ở TC-05. | Tên: `tester_vip01`<br>MK: `654321` | - Hiển thị thông báo màu đỏ rõ ràng: *"Tên đăng nhập đã được sử dụng, vui lòng chọn tên khác"*.<br>- Không bị treo hay trắng màn hình. | Cao | [ ] |
| **TC-07** | Đăng nhập sai mật khẩu | 1. Tại màn hình Đăng nhập, nhập tên đúng nhưng sai mật khẩu. | Tên: `tester_vip01`<br>MK: `sai_mat_khau` | - Báo lỗi: *"Tên đăng nhập hoặc mật khẩu không đúng"*.<br>- Giữ nguyên tên để người dùng nhập lại. | Bình thường | [ ] |
| **TC-08** | Duy trì phiên & Đăng xuất | 1. Đăng nhập thành công.<br>2. Tắt hẳn trình duyệt/tab rồi mở lại đường link web.<br>3. Thử bấm Đăng xuất ở tab Cài đặt. | - | - Bước 2: Tự động vào thẳng app mà không bắt đăng nhập lại.<br>- Bước 3: Đăng xuất thành công, quay về màn hình chào mừng. | Cao | [ ] |

---

### PHÂN HỆ 3: 4 CÁCH GHI CHÉP GIAO DỊCH (CORE FEATURES)

| Mã TC | Tên ca kiểm thử | Các bước thực hiện | Dữ liệu thử nghiệm | Kết quả mong đợi | Mức độ | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-09** | Ghi bằng Giọng nói (Voice NLP) | 1. Bấm nút **[ + ]** ➔ Chọn **Nói**.<br>2. Cấp quyền Micro nếu trình duyệt hỏi.<br>3. Đọc to, rõ ràng câu mẫu. | Đọc: *"Trà sữa trân châu ba mươi lăm nghìn"* | - Nhận diện ra chữ đúng.<br>- Tự bóc tách: Số tiền = `35.000đ`, Tên = `Trà sữa trân châu`, Danh mục = `Ăn uống`.<br>- Bấm Lưu hoàn tất. | Khẩn cấp | [ ] |
| **TC-10** | Ghi bằng Quét ảnh Bill / Hóa đơn (OCR) | 1. Bấm nút **[ + ]** ➔ Chọn **Up ảnh**.<br>2. Tải lên 1 ảnh hóa đơn siêu thị / cafe hoặc bill chuyển khoản ngân hàng. | Ảnh chụp có số tiền rõ ràng | - Hệ thống quét OCR trong 1-2 giây.<br>- Tự nhận diện đúng tổng số tiền thanh toán.<br>- Cho phép sửa lại trước khi bấm Lưu. | Cao | [ ] |
| **TC-11** | Ghi bằng Dán tin nhắn SMS Ngân hàng | 1. Bấm nút **[ + ]** ➔ Chọn **Dán SMS**.<br>2. Dán đoạn SMS biến động số dư. | Mẫu SMS: `TK 0123... -65,000VND vao 11:30 tai HIGHLANDS COFFEE...` | - App tự động lọc ra đúng số tiền `65.000đ`.<br>- Tên giao dịch gợi ý: `HIGHLANDS COFFEE` hoặc `Ăn uống`. | Cao | [ ] |
| **TC-12** | Ghi nhanh Một chạm theo thói quen | 1. Ở trang chủ, cuộn tới hàng chip *"Một chạm theo thói quen"*.<br>2. Bấm vào nút chip bất kỳ. | Bấm chip: `Gửi xe 5k` | - Mở modal xác nhận với toàn bộ thông tin điền sẵn.<br>- Bấm Lưu khoản này hoàn tất chỉ trong 1 chạm. | Cao | [ ] |
| **TC-13** | Ghi nhận Khoản Thu (Thu nhập) | 1. Bấm nút **[ + ]** ➔ Chọn **Tự nhập**.<br>2. Chuyển switch sang tab **Khoản thu (+)**. | Tiền: `2.000.000đ`<br>Tên: `Lương part-time` | - Số tiền hiển thị màu xanh lá cây có dấu cộng `+2.000.000đ`.<br>- Tổng số dư tài khoản tăng lên 2.000.000đ. | Cao | [ ] |

---

### PHÂN HỆ 4: QUẢN LÝ NGÂN SÁCH THÔNG MINH

| Mã TC | Tên ca kiểm thử | Các bước thực hiện | Dữ liệu thử nghiệm | Kết quả mong đợi | Mức độ | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-14** | Thiết lập ngân sách tháng mới | 1. Vào tab **Tôi** ➔ Chọn **Ngân sách tháng này**.<br>2. Gõ `3tr5` hoặc `3.500.000`.<br>3. Bấm **Đặt ngân sách**. | `3.500.000đ` | - Lưu thành công.<br>- Hiển thị hạn mức chi mỗi ngày (VD: `~116.000đ/ngày`).<br>- Thẻ ngân sách trên Trang chủ đồng bộ ngay lập tức. | Cao | [ ] |
| **TC-15** | Kiểm tra cơ chế tự cân bằng ngày | 1. Ghi chi tiêu vượt hạn mức ngày hôm nay (VD: ghi `200.000đ` trong khi hạn mức chỉ `116.000đ`). | Chi vượt hạn mức | - Vòng tròn tiến độ đổi màu cam/hồng cảnh báo.<br>- Hạn mức các ngày còn lại trong tháng tự động giảm nhẹ để bù trừ. | Cao | [ ] |

---

### PHÂN HỆ 5: SỔ NỢ, CHIA TIỀN NHÓM & TIỀN BỐC HƠI

| Mã TC | Tên ca kiểm thử | Các bước thực hiện | Dữ liệu thử nghiệm | Kết quả mong đợi | Mức độ | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-16** | Thêm khoản nợ & Nhắc nợ khéo léo | 1. Vào tab **Sổ nợ** ➔ Bấm **Thêm nợ**.<br>2. Nhập người nợ: `Huy`, số tiền `50.000đ` (Họ nợ mình).<br>3. Sau khi lưu, bấm vào khoản nợ ➔ Chọn **Nhắc nợ khéo**. | Người: `Huy`<br>Tiền: `50.000đ` | - Danh sách hiển thị mục màu xanh: *"Huy nợ mình 50.000đ"*.<br>- Bấm Nhắc nợ khéo hiện bảng mẫu tin nhắn dễ thương kèm nút Sao chép để gửi Zalo/Messenger. | Cao | [ ] |
| **TC-17** | Đánh dấu đã trả nợ | 1. Tại khoản nợ của `Huy`, bấm nút **Đã nhận đủ**. | Bấm hoàn tất | - Khoản nợ chuyển sang tab Lịch sử nợ.<br>- Tổng tiền người khác nợ mình trừ đi `50.000đ`. | Bình thường | [ ] |
| **TC-18** | Đối soát số dư "Tiền bốc hơi" | 1. Vào tab **Tôi** ➔ **Tiền bốc hơi**.<br>2. Nhập số tiền thật ít hơn số trên sổ 50.000đ.<br>3. Tích chọn *"Ghi luôn phần chênh lệch để sổ khớp lại"* ➔ Bấm Lưu. | Chênh lệch thiếu `50.000đ` | - Kết quả hiện icon con ma *"Đã bốc hơi 50.000đ"*.<br>- Sau khi lưu, hệ thống tự tạo khoản chi `50.000đ` (Chi không nhớ) và số dư khớp 100%. | Cao | [ ] |

---

### PHÂN HỆ 6: TRẢI NGHIỆM TRÊN CÁC THIẾT BỊ (DEVICE COMPATIBILITY)

| Mã TC | Tên ca kiểm thử | Thiết bị thử nghiệm | Các bước thực hiện | Kết quả mong đợi | Mức độ | Trạng thái |
| :--- | :--- | :---: | :--- | :--- | :---: | :---: |
| **TC-19** | Kiểm tra Safari iPhone (Lỗi chuyển tab) | **iPhone (iOS Safari)** | Mở web, bấm chuyển liên tục qua lại giữa 5 tab dưới cùng: Hôm nay ➔ Lịch sử ➔ [ + ] ➔ Sổ nợ ➔ Tôi. | - Chuyển màn hình mượt mà.<br>- **Tuyệt đối không bị văng lỗi `WrongDocumentError` hay màn hình trắng "Không tải được màn hình"**. | Khẩn cấp | [ ] |
| **TC-20** | Kiểm tra viền màn hình iPhone (Safe Area) | **iPhone có tai thỏ / Dynamic Island** | Mở app, quan sát thanh menu dưới đáy (Bottom Bar) và tiêu đề trên cùng. | - Thanh điều hướng dưới đáy không bị vạch gạt Home Bar che mất nút bấm.<br>- Tiêu đề không bị tai thỏ đè lên chữ. | Cao | [ ] |
| **TC-21** | Kiểm tra tính năng PWA "Thêm vào MH chính" | **iPhone & Android** | Bấm Chia sẻ ➔ Thêm vào MH chính (iOS) hoặc Cài đặt ứng dụng (Android). | - App cài ra màn hình chính có icon ThuChii tím.<br>- Mở lên tràn viền toàn màn hình, không có thanh địa chỉ web. | Cao | [ ] |
| **TC-22** | Kiểm tra cài đặt file APK & Widget Android | **Điện thoại Android** | 1. Tải file `thuchii.apk` từ web cài đặt.<br>2. Nhấn giữ màn hình chính ➔ Chọn Widget Thu Chi ➔ Kéo ra màn hình. | - File APK cài đặt thành công.<br>- Kéo được 2 Widget (2x2 và 4x2) hiển thị số tiền còn lại và nút tắt ghi nhanh. | Cao | [ ] |
| **TC-23** | Nút "Làm mới bộ nhớ đệm" (Clear Cache) | **Tất cả thiết bị** | Vào tab **Tôi** ➔ **Cài đặt** ➔ Bấm **Làm mới bộ nhớ đệm**. | - App tự động xóa sạch cache cũ và tải lại phiên bản `v33` mới nhất trong 1 giây. | Cao | [ ] |

---

## 📝 MẪU PHẢN HỒI KẾT QUẢ TEST (TEST REPORT TEMPLATE)

Khi Tester kiểm thử xong, có thể điền kết quả vào bảng tóm tắt ngắn gọn dưới đây để gửi lại:

```text
BÁO CÁO KẾT QUẢ KIỂM THỬ:
- Ngày test: .../.../2026
- Thiết bị đã test: (VD: iPhone 13 Pro iOS 17, Samsung Galaxy S23 Android 14, PC Win 11)
- Tổng số Test Case: 23 TC
- Kết quả: PASS: .../23 | FAIL: .../23
- Danh sách lỗi phát hiện (nếu có):
  1. [Mã TC] - Mô tả lỗi cụ thể + Ảnh chụp màn hình.
```