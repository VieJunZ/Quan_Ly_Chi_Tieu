# BỘ KIỂM THỬ FINAL – TÁCH GIAO DIỆN (TESTER) VÀ BACKEND (DEV)

> **Dự án**: Sổ Chi Tiêu Sinh Viên (ThuChii)
> **Bản kiểm thử**: bản đang chạy trên nhánh `main`
> **Web**: [https://quan-ly-chi-tieu-k5kn.onrender.com](https://quan-ly-chi-tieu-k5kn.onrender.com)
> **APK Android**: [https://quan-ly-chi-tieu-k5kn.onrender.com/thuchii.apk](https://quan-ly-chi-tieu-k5kn.onrender.com/thuchii.apk)
> **Tài liệu liên quan**: [`HUONG_DAN_SU_DUNG_VA_CAI_DAT_APP.md`](./HUONG_DAN_SU_DUNG_VA_CAI_DAT_APP.md), [`BANG_KIEM_THU_CHI_TIET_CHO_TESTER.md`](./BANG_KIEM_THU_CHI_TIET_CHO_TESTER.md) (bản cũ)

---

## CÁCH ĐỌC FILE NÀY

Mỗi phân hệ có **2 bảng dùng chung một Mã TC**:

| Bảng | Ai dùng | Dữ liệu đầu vào | Kết quả mong đợi |
| :--- | :--- | :--- | :--- |
| **A. Giao diện** | Tester (không cần biết code, API) | Bấm nút gì, gõ gì vào ô nào | Màn hình hiện gì: có ô nào, chữ gì, màu gì, thông báo gì |
| **B. Backend** | Lập trình viên (Postman, F12 → Network, SSMS) | API được gọi và dữ liệu gửi lên | Mã HTTP, mã lỗi, dữ liệu lưu trong CSDL |

- Tester **chỉ làm bảng A** rồi ghi PASS/FAIL vào cột cuối. Không cần mở F12.
- Khi tester báo FAIL, dev mở bảng B cùng Mã TC để biết lỗi nằm ở giao diện hay ở server.
- Chữ trong ngoặc kép *"..."* là **chữ phải hiện đúng y như vậy** trên màn hình (có thể khác dấu câu nhỏ).

**Quy ước kết quả**
- **PASS**: đúng như cột "Kết quả mong đợi".
- **FAIL**: sai chữ, sai số, hiện `NaN`, `undefined`, trắng màn hình, văng app.
- **BLOCKER**: lỗi làm không làm tiếp được các TC sau.

**Thiết bị cần có**: 1 iPhone (Safari), 1 điện thoại Android (Chrome + cài APK), 1 máy tính (Chrome/Edge).

---

## MỤC LỤC

1. [Dùng thử (không cần đăng ký)](#phân-hệ-1-dùng-thử-không-cần-đăng-ký) – TC-01 → TC-08
2. [Đăng ký, đăng nhập, quên mật khẩu](#phân-hệ-2-đăng-ký-đăng-nhập-quên-mật-khẩu) – TC-09 → TC-26
3. [Ghi khoản bằng giọng nói](#phân-hệ-3-ghi-khoản-bằng-giọng-nói) – TC-27 → TC-32
4. [Ghi khoản bằng ảnh (hóa đơn, chuyển khoản)](#phân-hệ-4-ghi-khoản-bằng-ảnh) – TC-33 → TC-39
5. [Dán SMS và Tự nhập](#phân-hệ-5-dán-sms-và-tự-nhập) – TC-40 → TC-47
6. [Ngân sách tháng](#phân-hệ-6-ngân-sách-tháng) – TC-48 → TC-54
7. [Thú cưng và Tiệm đồ](#phân-hệ-7-thú-cưng-và-tiệm-đồ) – TC-55 → TC-61
8. [Sổ nợ, Nhắc khéo, Chia tiền, Bạn bè](#phân-hệ-8-sổ-nợ-nhắc-khéo-chia-tiền-bạn-bè) – TC-62 → TC-68
9. [Tiền bốc hơi và Lịch sử](#phân-hệ-9-tiền-bốc-hơi-và-lịch-sử) – TC-69 → TC-74
10. [Thiết bị, PWA, APK, Offline, Cài đặt](#phân-hệ-10-thiết-bị-pwa-apk-offline-cài-đặt) – TC-75 → TC-81

---

## PHÂN HỆ 1: DÙNG THỬ (KHÔNG CẦN ĐĂNG KÝ)

### A. Giao diện (Tester)

| Mã TC | Tên | Các bước trên app | Dữ liệu nhập | Kết quả mong đợi trên màn hình | Mức độ | Kết quả |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-01** | Vào chế độ dùng thử | 1. Mở web bằng tab ẩn danh.<br>2. Bấm **"Dùng thử ngay - không cần đăng ký"**. | Không | - Vào thẳng màn hình **Hôm nay**.<br>- Hiện thông báo xanh *"Đã kích hoạt chế độ dùng thử với dữ liệu mẫu (Không có ID)"*.<br>- Đã có sẵn vài khoản chi/thu mẫu. | Khẩn cấp | [ ] |
| **TC-02** | Số liệu trang chủ không lỗi | Nhìn thẻ ngân sách và thẻ "Đã chi hôm nay". | Không | - Vòng tròn hiện một số phần trăm, ví dụ `64%`, **không có `NaN%`**.<br>- Có dòng *"Đã chi hôm nay"*, *"Thu: +..."*, *"Còn được tiêu hôm nay"*, *"Hạn mức/ngày"*, tiền dạng `...đ`. | Khẩn cấp | [ ] |
| **TC-03** | Thêm khoản chi khi dùng thử | 1. Bấm nút **+** giữa thanh dưới → **Tự nhập**.<br>2. Để nút **Chi**, gõ số tiền, chọn danh mục **Ăn uống**, ghi chú → **Lưu khoản**. | Số tiền: `35k`<br>Ghi chú: `Trà sữa` | - Dưới ô số tiền hiện *"= 35.000đ"*.<br>- Sau khi lưu có thông báo *"Đã ghi 35.000đ cho ..."*.<br>- *"Đã chi hôm nay"* tăng 35.000đ, *"Còn được tiêu hôm nay"* giảm 35.000đ, vòng tròn đổi % đúng. | Khẩn cấp | [ ] |
| **TC-04** | Thêm khoản thu khi dùng thử | **+** → **Tự nhập** → bấm **Thu** → nhập → **Lưu khoản**. | `500k`, danh mục `Thu nhập khác`, ghi chú `Bố mẹ cho` | - Thông báo *"Đã ghi +500.000đ cho ..."*.<br>- Dòng *"Thu: +"* trên trang chủ tăng 500.000đ.<br>- *"Còn được tiêu hôm nay"* **không đổi** (thu không làm tăng hạn mức). | Cao | [ ] |
| **TC-05** | Mở "Tiền bốc hơi" khi dùng thử | **Tôi** → **Tiền bốc hơi** → gõ tiền mặt và tiền tài khoản. | Tiền mặt `250000`<br>Tài khoản `3000000` | - Màn hình mở được, có dòng *"Theo sổ, lẽ ra bạn đang có"*.<br>- Kết quả hiện ngay khi gõ (*"Khớp!"* / *"Đã bốc hơi"* / *"Dư ra"*), không có `NaN`. | Khẩn cấp | [ ] |
| **TC-06** | Đặt ngân sách khi dùng thử | **Tôi** → thẻ **Ngân sách tháng này** → gõ vào ô **"Số tiền cả tháng"**. | `4tr5` | - Dưới ô hiện *"= 4.500.000đ · khoảng 150.000đ/ngày"* (tháng 30 ngày) hoặc 145.161đ/ngày (tháng 31 ngày).<br>- Bấm nút lưu → thông báo *"Đã đặt 4.500.000đ. Hôm nay bạn được tiêu ..."*. | Cao | [ ] |
| **TC-07** | Tiệm đồ khi dùng thử | **Tôi** → **Tiệm đồ thú cưng** → chọn một món trong mục **Kính & Mặt** → **Mua ... xu** → **✨ Mặc đồ**. | `Kính cận tri thức` (40 xu) | - Số xu trên đầu trang giảm đúng 40.<br>- Thông báo *"Mua thành công "Kính cận tri thức"!"*, rồi *"Đã diện "Kính cận tri thức" lên người!"*.<br>- Về **Hôm nay**: thú cưng đeo kính. | Cao | [ ] |
| **TC-08** | Lưu tài khoản dùng thử thành tài khoản thật | 1. **Tôi** → bấm **"Tạo tài khoản, giữ dữ liệu"**.<br>2. Màn **"Lưu tài khoản"**: nhập tên, mật khẩu, nhập lại mật khẩu; để tick *"Giữ cả dữ liệu mẫu..."* → **Lưu tài khoản**. | Tên `sv_demo_luu01`<br>Mật khẩu `Hoctap2026x` | - Lưu thành công, hiện màn hình mã khôi phục.<br>- Vào **Tôi**: không còn chữ *"Dùng thử"*, có ID dạng `#123`.<br>- Các khoản đã ghi ở TC-03, TC-04 vẫn còn. | Cao | [ ] |

### B. Backend (Dev)

| Mã TC | API và dữ liệu gửi lên | Kết quả mong đợi ở Backend |
| :--- | :--- | :--- |
| TC-01 | `POST /api/auth/demo` | `201`, trả `token` và `user` có `is_demo = 1`. CSDL có user tên `khach_...` cùng giao dịch mẫu. Giới hạn **10 lần/giờ/IP**, lần thứ 11 trả `429`. |
| TC-02 | `GET /api/dashboard/mini` | Các trường `budget.daily_allowance`, `left_today`, `spent_month` là số, không `null` khi có ngân sách. |
| TC-03 | `POST /api/transactions` `{type:"expense", amount:35000, category_id:1, note:"Trà sữa", transaction_date, source:"manual"}` | `201`, có bản ghi mới trong `transactions` thuộc user demo. |
| TC-04 | `POST /api/transactions` `{type:"income", amount:500000, ...}` | `201`, `category.type = 'income'`. `left_today` không đổi. |
| TC-05 | `GET /api/wallet` | Trả `expected_balance` = tổng thu − tổng chi − tiền cho mượn + tiền đi mượn. |
| TC-06 | `PUT /api/budget` `{amount:4500000, month}` | `200`, bản ghi trong `budgets` của tháng hiện tại. |
| TC-07 | `POST /api/pet-shop/buy` `{item_id:"face_glasses"}` rồi `POST /api/pet-shop/equip` | `coins` giảm đúng `price_coins`; có dòng trong kho đồ; thiếu xu trả lỗi `400`. |
| TC-08 | `POST /api/auth/upgrade-demo` `{username, password, confirm_password, keep_sample}` | `200`, user cũ đổi `is_demo = 0`, giữ nguyên `id` và giao dịch. Tài khoản đã thật gọi lại trả `400 NOT_DEMO`. |

---

## PHÂN HỆ 2: ĐĂNG KÝ, ĐĂNG NHẬP, QUÊN MẬT KHẨU

### A. Giao diện (Tester)

| Mã TC | Tên | Các bước trên app | Dữ liệu nhập | Kết quả mong đợi trên màn hình | Mức độ | Kết quả |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-09** | Màn hình chào có đủ thành phần | Mở web bằng tab ẩn danh, chưa bấm gì. | Không | Có đủ:<br>- Tiêu đề *"Quản lý thu chi"*, câu *"Tiêu gì cũng nhớ hết ✦"*.<br>- Các nhãn *Nói để ghi*, *Up ảnh*, *Dán SMS*, *Chia tiền*, *Chuỗi ngày*.<br>- Nút **"Dùng thử ngay - không cần đăng ký"**, nút **"Tạo tài khoản"**.<br>- Dòng *"Đã có tài khoản? Đăng nhập"*. | Cao | [ ] |
| **TC-10** | Màn hình Đăng nhập có gì | Bấm **"Đăng nhập"** ở màn hình chào. | Không | Có đủ:<br>- Tiêu đề *"Chào mừng trở lại"*, dòng *"Đăng nhập để xem ví của bạn."*<br>- Ô **Tên đăng nhập**, ô **Mật khẩu**.<br>- Nút **"Đăng nhập"**, link **"Quên mật khẩu?"**, link **"Tạo tài khoản mới"**.<br>- Dòng chú thích *"Tài khoản dùng thử không đăng nhập lại được..."*.<br>- **Không** có ô "Nhập lại mật khẩu" (chỉ màn Đăng ký mới có). | Cao | [ ] |
| **TC-11** | Mật khẩu bị ẩn, có nút con mắt | 1. Gõ vào ô Mật khẩu.<br>2. Bấm biểu tượng con mắt bên phải ô.<br>3. Bấm lần nữa. | `abc12345` | - Khi gõ: chỉ thấy dấu chấm `••••••••`.<br>- Bấm con mắt lần 1: thấy rõ `abc12345`.<br>- Bấm lần 2: ẩn lại thành dấu chấm.<br>- Ô Mật khẩu ở màn Đăng ký và Quên mật khẩu cũng có con mắt giống vậy. | Cao | [ ] |
| **TC-12** | Màn hình Tạo tài khoản có gì | Bấm **"Tạo tài khoản"**. | Không | Có đủ:<br>- Tiêu đề *"Tạo tài khoản"*, dòng *"Chỉ cần tên đăng nhập và mật khẩu, không cần email hay số điện thoại."*<br>- Ô **Tên đăng nhập** có gợi ý *"3-30 ký tự: chữ không dấu, số, dấu chấm, gạch dưới"*.<br>- Ô **Mật khẩu** và ô **Nhập lại mật khẩu** (cả 2 đều ẩn, có con mắt).<br>- Thanh **Độ mạnh** 4 vạch và danh sách 4 điều kiện:<br>  *Ít nhất 8 ký tự* / *Có cả chữ và số* / *Không chứa tên đăng nhập* / *Không phải mật khẩu quá phổ biến*.<br>- Không hỏi email, số điện thoại. | Cao | [ ] |
| **TC-13** | Kiểm tra tên đăng nhập khi đang gõ | Gõ lần lượt từng tên vào ô Tên đăng nhập, rồi bấm ra ngoài. | a) `sv_kinhte01`<br>b) `ab`<br>c) `Trí Vũ`<br>d) `khach_123` | a) Hiện *"Tên hợp lệ"*.<br>b) Báo lỗi tên quá ngắn.<br>c) Báo *"Tên chưa hợp lệ. Gợi ý: ..."* (tên không dấu); bấm ra ngoài thì ô tự đổi thành tên gợi ý.<br>d) Báo lỗi không được bắt đầu bằng `khach_`. | Bình thường | [ ] |
| **TC-14** | Thanh độ mạnh và danh sách điều kiện | Gõ lần lượt vào ô Mật khẩu (tên đăng nhập đang là `sv_kinhte01`). | a) để trống<br>b) `abc`<br>c) `abcdefgh`<br>d) `Hoctap2026x` | a) *"Độ mạnh: Chưa nhập"*.<br>b) *"Yếu quá"*, dòng *Ít nhất 8 ký tự* chưa tick.<br>c) dòng *Có cả chữ và số* chưa tick.<br>d) cả 4 dòng đều tick, *"Khá mạnh"* hoặc *"Rất mạnh"*. | Bình thường | [ ] |
| **TC-15** | Nhập lại mật khẩu không khớp | Ô Mật khẩu `Hoctap2026x`, ô Nhập lại gõ khác → bấm **Tạo tài khoản**. | Nhập lại: `Hoctap2026` | - Khi gõ: dưới ô hiện *"Chưa khớp với mật khẩu ở trên"*.<br>- Bấm Tạo tài khoản: hiện *"Mật khẩu nhập lại không khớp"*, không tạo tài khoản.<br>- Sửa cho giống: hiện *"Khớp rồi nè"*. | Cao | [ ] |
| **TC-16** | Đăng ký hợp lệ | Điền đủ, đúng → **Tạo tài khoản**. | Tên `sv_kinhte01`<br>Mật khẩu `MatKhau@123` (2 lần) | - Màn hình *"Tạo tài khoản thành công!"* với thẻ *"Mã khôi phục của bạn"* dạng `XXXX-XXXX-XXXX`.<br>- Có nút **Sao chép**, **Lưu file .txt**.<br>- Nút **"Vào app thôi"** bị mờ, chỉ bấm được sau khi tick *"Mình đã lưu mã này ở nơi an toàn"*.<br>- Vào app thấy lời chào theo buổi (ví dụ *"Chào buổi sáng"*, *"Tối an lành"*). | Khẩn cấp | [ ] |
| **TC-17** | Đăng ký trùng tên | Đăng xuất → **Tạo tài khoản** → dùng lại tên ở TC-16. | Tên `sv_kinhte01`<br>Mật khẩu `Hoctap2026x` | - Dưới ô tên hiện chữ đỏ *"Tên đăng nhập này đã được sử dụng (kể cả chữ hoa hay chữ thường). Thử "sv_kinhte01NN" nhé?"* (NN là 2 số ngẫu nhiên).<br>- Con trỏ nhảy về ô tên, các ô khác giữ nguyên. | Khẩn cấp | [ ] |
| **TC-18** | Trùng tên khác chữ hoa/thường | Như TC-17 nhưng gõ chữ hoa. | `SV_KINHTE01` | Báo trùng giống TC-17, **không** tạo thêm tài khoản. | Cao | [ ] |
| **TC-19** | Mật khẩu quá ngắn | Tên hợp lệ, mật khẩu ngắn → **Tạo tài khoản**. | `123` | Không tạo được; dòng *Ít nhất 8 ký tự* chưa tick và có báo lỗi mật khẩu cần ít nhất 8 ký tự. | Bình thường | [ ] |
| **TC-20** | Mật khẩu quá phổ biến | Tên hợp lệ, mật khẩu phổ biến → **Tạo tài khoản**. | `password123` | Không tạo được; dòng *Không phải mật khẩu quá phổ biến* không tick; báo *"Mật khẩu này quá phổ biến, dễ bị đoán."* | Bình thường | [ ] |
| **TC-21** | Để trống khi đăng nhập | Màn Đăng nhập, để trống → **Đăng nhập**. | Không | Hiện *"Nhập đủ tên đăng nhập và mật khẩu nhé."* | Bình thường | [ ] |
| **TC-22** | Đăng nhập đúng | Nhập đúng → **Đăng nhập**. | `sv_kinhte01` / `MatKhau@123` | - Vào **Hôm nay**, thông báo *"Chào mừng trở lại, sv_kinhte01!"*.<br>- Thấy đúng dữ liệu của tài khoản này. | Khẩn cấp | [ ] |
| **TC-23** | Sai mật khẩu | Đúng tên, sai mật khẩu → **Đăng nhập**. | `sv_kinhte01` / `PassSai123` | - Báo *"Tên đăng nhập hoặc mật khẩu không chính xác."* kèm *"Còn N lần thử trước khi bị khóa 5 phút."*<br>- Ô tên **giữ nguyên**, ô mật khẩu bị xóa trống để gõ lại. | Cao | [ ] |
| **TC-24** | Sai 5 lần liên tiếp | Lặp TC-23 đủ 5 lần. | `PassSai123` x5 | - Báo *"Sai quá 5 lần nên tài khoản tạm khóa. Thử lại sau mm:ss"*, đồng hồ đếm ngược.<br>- Nút **Đăng nhập** bị mờ trong lúc khóa.<br>- Có link *"Quên mật khẩu? Dùng mã khôi phục"*. | Cao | [ ] |
| **TC-25** | Ghi nhớ đăng nhập | Đăng nhập xong → đóng hẳn trình duyệt → mở lại link web. | Không | Vào thẳng **Hôm nay**, không phải đăng nhập lại. | Cao | [ ] |
| **TC-26** | Quên mật khẩu bằng mã khôi phục | 1. Màn Đăng nhập → **"Quên mật khẩu?"**.<br>2. Nhập tên, mã khôi phục đã lưu ở TC-16, mật khẩu mới 2 lần → **"Đặt lại mật khẩu"**.<br>3. Thử nhập sai mã. | Mã đúng / mã sai `AAAA-BBBB-CCCC` | - Mã đúng: hiện *"Đổi mật khẩu xong! Đây là mã khôi phục mới"*; đăng nhập được bằng mật khẩu mới, mật khẩu cũ không dùng được nữa.<br>- Mã sai: báo *"Tên đăng nhập hoặc mã khôi phục không đúng."*<br>- Mã thiếu ký tự: báo *"Mã khôi phục gồm 12 ký tự"*. | Cao | [ ] |

### B. Backend (Dev)

| Mã TC | API và dữ liệu gửi lên | Kết quả mong đợi ở Backend |
| :--- | :--- | :--- |
| TC-09 → TC-15 | Không gọi API (kiểm tra ngay trên trình duyệt). | Không có request `POST /api/auth/register` nào cho tới khi bấm **Tạo tài khoản** với dữ liệu hợp lệ. |
| TC-16 | `POST /api/auth/register` `{username:"sv_kinhte01", password:"MatKhau@123", confirm_password:"MatKhau@123"}` | `201`, trả `token`, `user`, `recovery_code`. Bảng `users` lưu **mật khẩu đã băm** (không lưu bản gốc) và mã khôi phục đã băm. |
| TC-17, TC-18 | `POST /api/auth/register` cùng tên (hoặc viết hoa) | `409 USER_ALREADY_EXISTS` *"Tên đăng nhập đã có người dùng (hệ thống không phân biệt chữ hoa/thường)."* Không thêm dòng mới vào `users`. |
| TC-19 | `password:"123"` | `400 WEAK_PASSWORD` *"Mật khẩu cần ít nhất 8 ký tự."* |
| TC-20 | `password:"password123"` | `400 WEAK_PASSWORD` *"Mật khẩu này quá phổ biến, dễ bị đoán."* |
| (thêm) | Gửi `confirm_password` khác `password` | `400 PASSWORD_MISMATCH`. Mật khẩu > 128 ký tự: `400 PASSWORD_TOO_LONG`. |
| TC-21 | `POST /api/auth/login` thiếu trường | `400 MISSING_CREDENTIALS`. |
| TC-22 | `POST /api/auth/login` đúng | `200`, trả `token`; có phiên mới trong bảng phiên đăng nhập. |
| TC-23 | `POST /api/auth/login` sai mật khẩu | `401 INVALID_CREDENTIALS`, kèm số lần thử còn lại. |
| TC-24 | Sai lần thứ 5 | Tài khoản bị khóa 5 phút: `423 ACCOUNT_LOCKED` kèm `retry_after_seconds`. Riêng route `/api/auth/*` giới hạn **20 request/phút/IP**. |
| TC-25 | `GET /api/auth/me` với token cũ | `200`. Token đã đăng xuất hoặc bị thu hồi trả `401`. |
| TC-26 | `POST /api/auth/recover` `{username, recovery_code, password, confirm_password}` | Đúng: `200`, đổi mật khẩu, sinh mã khôi phục mới, mã cũ hết hiệu lực. Sai: `400 INVALID_RECOVERY_CODE`. |

---

## PHÂN HỆ 3: GHI KHOẢN BẰNG GIỌNG NÓI

> Mở bằng: nút **+** → **Nói** (hoặc nút **Nói** trên trang chủ). Màn hình **"Nói để ghi"** có nút micro **"Bấm để nói"** và ô **"Câu bạn nói (sửa được)"**. Máy nào không có micro thì gõ câu vào ô rồi bấm **"Đọc khoản"**, kết quả như nhau.

### A. Giao diện (Tester)

| Mã TC | Tên | Câu nói (hoặc gõ) | Kết quả mong đợi trên màn hình | Mức độ | Kết quả |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-27** | Số tiền có "k" | *"Trà sữa 35k"* | - Khi nói: nút đổi thành **"Bấm để dừng"**, dòng *"Đang nghe... nói xong mình tự đọc luôn."*<br>- Hiện *"Mình hiểu thế này, sửa lại nếu sai nhé:"* với thẻ: **Chi**, `35.000đ`, danh mục **Ăn uống**, ghi chú *Trà sữa*, ngày **Hôm nay**.<br>- Bấm **Xác nhận** → thông báo *"Đã ghi 35.000đ cho ..."*. | Khẩn cấp | [ ] |
| **TC-28** | Số tiền hàng triệu | *"Tiền phòng trọ 1 triệu 8"* | `1.800.000đ`, danh mục **Nhà cửa & Phòng trọ**. | Cao | [ ] |
| **TC-29** | Có chữ "hôm qua" | *"Hôm qua đổ xăng 50 nghìn"* | `50.000đ`, danh mục **Di chuyển & Xăng xe**, ngày là **Hôm qua**. | Cao | [ ] |
| **TC-30** | Khoản thu | *"Lương làm thêm 2tr5"* | Nút **Thu** được chọn, `+2.500.000đ`, danh mục **Tiền lương**. | Cao | [ ] |
| **TC-31** | Câu không có số tiền | *"Hôm nay đi chơi với bạn"* | Hiện *"Mình chưa thấy số tiền nào trong "Hôm nay đi chơi với bạn". Thử nói kiểu "ăn sáng 25k" nhé."* Không ghi khoản nào. | Bình thường | [ ] |
| **TC-32** | Chặn quyền micro | Bấm **Bấm để nói** → trên hộp hỏi quyền của trình duyệt bấm **Chặn**. | - App không treo, không trắng.<br>- Hiện *"Bạn chưa cho phép dùng micro. Bật quyền micro cho trang này hoặc gõ câu vào ô dưới nhé."*<br>- Vẫn gõ được câu vào ô và bấm **Đọc khoản**. | Cao | [ ] |

### B. Backend (Dev)

| Mã TC | API và dữ liệu gửi lên | Kết quả mong đợi ở Backend |
| :--- | :--- | :--- |
| TC-27 → TC-30 | `POST /api/scan/voice` `{text:"...", today, now}` | `200`, mảng `items` mỗi khoản có `type`, `amount`, `category_id`, `transaction_date`, `note`. Chưa lưu vào `transactions` cho tới khi người dùng xác nhận. |
| (xác nhận) | `POST /api/transactions` hoặc `POST /api/transactions/batch` có `source:"voice"`, `scan_id` | `201`, bản ghi có `source = 'voice'`. Batch tối đa 20 khoản; rỗng trả `400 EMPTY_BATCH`. |
| TC-29 | (như trên) | `transaction_date` = ngày `today` − 1. |
| TC-31 | `POST /api/scan/voice` `{text:"Hôm nay đi chơi với bạn"}` | `200` với `items` rỗng, **không** trả lỗi 500. Chuỗi rỗng hoặc dài quá 500 ký tự: `400 INVALID_TEXT`. |
| TC-32 | Không gọi API. | Không áp dụng. |

---

## PHÂN HỆ 4: GHI KHOẢN BẰNG ẢNH

> Mở bằng: nút **+** → **Up ảnh**. Màn hình **"Chọn ảnh chi tiêu"** (kéo thả hoặc Ctrl+V được), mỗi lượt tối đa **10 ảnh**. Mỗi ảnh có thẻ riêng: *"Đang chờ đọc"* → *"Đang đọc ảnh..."* → khoản đọc được, có ô tick **"Chọn để ghi"**. Cuối màn có nút **"Xác nhận tất cả (n)"**.

### A. Giao diện (Tester)

| Mã TC | Tên | Ảnh dùng để test | Kết quả mong đợi trên màn hình | Mức độ | Kết quả |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-33** | Hóa đơn quán/siêu thị | Ảnh hóa đơn giấy có dòng `Tổng cộng: 125.000đ` | Thẻ ảnh có nhãn **Hóa đơn**, số tiền `125.000đ`, loại **Chi**. | Cao | [ ] |
| **TC-34** | Ảnh chuyển khoản đi | Ảnh màn hình app ngân hàng: `Số tiền: 50,000 VND`, có cả dòng số dư | - Nhãn **Ảnh chuyển khoản**, số tiền `50.000đ`, loại **Chi**.<br>- Có dòng *"Đã bỏ qua số dư tài khoản: ..."* (không lấy số dư làm số tiền). | Cao | [ ] |
| **TC-35** | Ảnh nhận tiền | Ảnh thông báo `+200,000 VND từ NGUYEN VAN A` | `+200.000đ`, nút **Thu** được chọn. | Cao | [ ] |
| **TC-36** | Ảnh mờ, chụp nghiêng | Hóa đơn chụp tối, nghiêng | Vẫn ra một số tiền đoán được và hiện *"Mình chưa chắc số tiền lắm, kiểm tra lại giúp nha."*, hoặc *"Không đọc được số tiền, bạn nhập giúp mình nhé."* App không treo. | Bình thường | [ ] |
| **TC-37** | Ảnh không phải hóa đơn | Ảnh phong cảnh, ảnh selfie | Hiện *"Không đọc được số tiền, bạn nhập giúp mình nhé."* với ô số tiền trống để tự gõ. | Bình thường | [ ] |
| **TC-38** | Sửa trước khi ghi | Đọc xong ảnh TC-33 → sửa số tiền thành `120k`, đổi danh mục → **Xác nhận tất cả** | Khoản được ghi là `120.000đ` với danh mục vừa chọn (không phải 125.000đ). | Cao | [ ] |
| **TC-39** | Up lại ảnh cũ / up file không phải ảnh | a) Up lại đúng ảnh TC-33.<br>b) Chọn file `.pdf` hoặc `.docx`. | a) Thẻ ảnh có cảnh báo *"Ảnh này đã up rồi"* hoặc *"Có thể bị trùng"*.<br>b) *"Chỉ nhận file ảnh thôi nha."* | Bình thường | [ ] |

### B. Backend (Dev)

| Mã TC | API và dữ liệu gửi lên | Kết quả mong đợi ở Backend |
| :--- | :--- | :--- |
| TC-33 → TC-37 | `POST /api/scan/image` (multipart, 1 ảnh/lần) | `200`, trả `items`, `kind` (bill / transfer / bank_notice), `balances` đã bỏ qua, độ tin cậy. Ảnh không đọc được trả `items` rỗng, không lỗi 500. Đọc quá lâu: `503 OCR_TIMEOUT`. Giới hạn **20 ảnh/phút**, vượt trả `429`. |
| TC-38 | `POST /api/transactions/batch` với `source:"bill"`, `scan_id`, số tiền đã sửa | Bản ghi lưu đúng `amount = 120000`. |
| TC-39a | `POST /api/scan/image` cùng ảnh | Trả danh sách `duplicates` (các lần đã up trùng, kèm ngày đã ghi). |
| TC-39b | Gửi file không phải ảnh | `400 INVALID_IMAGE` hoặc `415 UNSUPPORTED_IMAGE` *"Chỉ nhận ảnh JPG, PNG, BMP, GIF hoặc TIFF."* |

---

## PHÂN HỆ 5: DÁN SMS VÀ TỰ NHẬP

> **Dán SMS**: nút **+** → **Dán SMS** → màn **"Dán SMS ngân hàng"** có ô **"Tin nhắn / thông báo ngân hàng"**, nút **"Dán từ bộ nhớ"** và **"Đọc tin nhắn"**.
> **Tự nhập**: nút **+** → **Tự nhập** → có nút **Chi / Thu**, ô **Số tiền** (gợi ý *"Gõ 35k, 1tr2 hay 150.000 đều được"*), **Danh mục**, **Ghi chú (không bắt buộc)**, **Ngày**, **Giờ**, nút **"Lưu khoản"**.

### A. Giao diện (Tester)

| Mã TC | Tên | Thao tác và dữ liệu | Kết quả mong đợi trên màn hình | Mức độ | Kết quả |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-40** | SMS trừ tiền | Dán `TK 1234 -45,000VND luc 12:00 tai PHUC LONG TEA. SD: 1,250,000VND` → **Đọc tin nhắn** | Thẻ khoản: **Chi** `45.000đ`, ghi chú có *PHUC LONG*; số dư 1.250.000 **không** bị lấy làm khoản. | Cao | [ ] |
| **TC-41** | SMS cộng tiền | Dán `TK 1234 +5,000,000VND luc 09:00 ND: Tra luong T10` → **Đọc tin nhắn** | **Thu** `+5.000.000đ`. | Cao | [ ] |
| **TC-42** | SMS trống / không có số tiền | a) Bấm **Đọc tin nhắn** khi ô trống.<br>b) Dán `Chuc mung sinh nhat` | a) *"Dán tin nhắn vào đây trước đã nhé."*<br>b) *"Chưa thấy số tiền trong tin nhắn này."* | Bình thường | [ ] |
| **TC-43** | Gõ số tiền viết tắt | Tự nhập → gõ lần lượt vào ô Số tiền | `45k` → *"= 45.000đ"*<br>`1tr2` → *"= 1.200.000đ"*<br>`2tr5` → *"= 2.500.000đ"*<br>`150.000` → *"= 150.000đ"* | Cao | [ ] |
| **TC-44** | Số tiền 0, số âm, chữ | Tự nhập → gõ `0`, rồi `-50000`, rồi `abc` → **Lưu khoản** | - Dòng dưới ô chuyển đỏ *"Số tiền chưa đúng"* (với `-50000`, `abc`).<br>- Bấm Lưu: báo *"Số tiền chưa đúng."*, **không** ghi khoản nào. | Bình thường | [ ] |
| **TC-45** | Số tiền rất lớn | Tự nhập → `999tr` → **Lưu khoản** | - Dưới ô: *"= 999.000.000đ"*.<br>- Lưu được; số tiền trên trang chủ và Lịch sử không tràn ra ngoài thẻ, không vỡ khung. | Bình thường | [ ] |
| **TC-46** | Quên chọn danh mục | Tự nhập → gõ `20k`, không chọn danh mục → **Lưu khoản** | *"Chọn danh mục nhé."* | Bình thường | [ ] |
| **TC-47** | Xóa khoản và hoàn tác | **Lịch sử** → chạm vào một khoản → màn **"Sửa khoản"** → **"Xóa khoản này"** → **Xóa** → bấm **Hoàn tác** trên thông báo | - Hiện hộp hỏi *"Xóa khoản này?"* kèm số tiền · danh mục · ngày, nút **Xóa** màu đỏ.<br>- Xóa xong: *"Đã xóa khoản."* có nút **Hoàn tác**; số liệu trang chủ trả lại đúng.<br>- Bấm Hoàn tác: *"Đã khôi phục."*, khoản quay lại. | Cao | [ ] |

### B. Backend (Dev)

| Mã TC | API và dữ liệu gửi lên | Kết quả mong đợi ở Backend |
| :--- | :--- | :--- |
| TC-40 → TC-42 | `POST /api/scan/text` `{text}` | `200`, `items` có `type`/`amount` đúng, `balances` chứa số dư đã bỏ qua. Không có số tiền: `items` rỗng. |
| TC-43 | Không gọi API (đổi số ngay trên trình duyệt). | Không áp dụng. |
| TC-44 | `POST /api/transactions` `{amount:0}` hoặc `{amount:-50000}` | `400 INVALID_AMOUNT` *"Số tiền phải lớn hơn 0."* |
| TC-45 | `POST /api/transactions` `{amount:999000000}` | `201`. Trên `999.999.999.999` trả `400 INVALID_AMOUNT` *"Số tiền quá lớn."* |
| TC-46 | Thiếu `category_id` | `400`, không lưu. |
| TC-47 | `DELETE /api/transactions/:id`, hoàn tác = `POST /api/transactions` lại | Xóa: `200`, bản ghi mất khỏi `transactions`. Id không tồn tại hoặc của người khác: `404 TRANSACTION_NOT_FOUND`. |
| (thêm) | Thêm rồi xóa liên tục cùng một khoản | **Không** được cộng thêm xu thú cưng mỗi lần thêm lại (chống "cày xu"). |

---

## PHÂN HỆ 6: NGÂN SÁCH THÁNG

> **Cách app tính hạn mức ngày**: *Hạn mức/ngày = (Ngân sách tháng − Đã chi từ đầu tháng tới hết hôm qua) ÷ Số ngày còn lại (tính cả hôm nay)*.
> Ví dụ đặt 3.000.000đ vào ngày 1 của tháng 30 ngày → 100.000đ/ngày. Đặt vào ngày 12/11, chưa chi gì → 3.000.000 ÷ 19 = 157.894đ/ngày.
> Dòng gợi ý trong ô nhập (*"khoảng .../ngày"*) chỉ chia đều cho cả tháng, nên có thể khác số trên trang chủ nếu đặt giữa tháng.

### A. Giao diện (Tester)

| Mã TC | Tên | Các bước trên app | Dữ liệu nhập | Kết quả mong đợi trên màn hình | Mức độ | Kết quả |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-48** | Trang chủ khi chưa có ngân sách | Tài khoản mới, vào **Hôm nay**. | Không | Thẻ ngân sách có nút **"Đặt ngân sách"** và dòng *"Đặt ngân sách tháng để biết mỗi ngày còn được tiêu bao nhiêu (tiêu ít hôm nay thì mai được thêm)."* | Cao | [ ] |
| **TC-49** | Đặt ngân sách lần đầu | **Tôi** → **Ngân sách tháng này** → ô **"Số tiền cả tháng"** → **Đặt ngân sách**. | `3tr` | - Dưới ô: *"= 3.000.000đ · khoảng 100.000đ/ngày"* (tháng 30 ngày).<br>- Thông báo *"Đã đặt 3.000.000đ. Hôm nay bạn được tiêu ..."*.<br>- Trang chủ hiện *"Hạn mức/ngày"* đúng công thức trên, *"Tháng: 0 / 3tr"*, *"còn N ngày"*. | Khẩn cấp | [ ] |
| **TC-50** | Chi trong hạn mức | Ghi một khoản chi bằng 30% hạn mức ngày. | Ví dụ hạn mức 100.000đ, chi `30k` | - *"Còn được tiêu hôm nay"* = `70.000đ`.<br>- Vòng tròn `70%`, màu tím. | Cao | [ ] |
| **TC-51** | Chi lố hạn mức ngày | Ghi thêm khoản chi cho tổng vượt hạn mức. | Chi thêm `150k` | - *"Còn được tiêu hôm nay"* hiện số âm màu đỏ, ví dụ `-80.000đ`.<br>- Vòng tròn `0%` màu hồng.<br>- Bấm chuông thông báo: có thẻ *"Đã vượt hạn mức hôm nay"*. | Cao | [ ] |
| **TC-52** | Hôm sau tự cân lại | Sang ngày hôm sau (sau TC-51), mở trang chủ. | Không | *"Hạn mức/ngày"* mới **thấp hơn** hôm qua, vì phần lố đã được chia bớt cho các ngày còn lại. | Cao | [ ] |
| **TC-53** | Cảnh báo sắp hết ngân sách tháng | Ghi chi cho tổng tháng ≥ 85% ngân sách → bấm chuông. | Tổng chi ≈ 88% | Có thẻ màu cam *"Sắp chạm trần ngân sách tháng"* với dòng *"Đã tiêu 88% ngân sách tháng (... / ...)."* | Cao | [ ] |
| **TC-54** | Sửa và bỏ ngân sách | a) **Tôi** → Ngân sách → đổi số → **Cập nhật ngân sách**.<br>b) Bấm **"Bỏ ngân sách tháng này"** → **Bỏ**. | a) `4tr5` | a) Thông báo *"Đã đặt 4.500.000đ..."*, hạn mức ngày tính lại.<br>b) Hộp hỏi *"Bỏ ngân sách tháng này?"* – *"Trang chủ sẽ không còn hạn mức mỗi ngày."*; bấm Bỏ → *"Đã bỏ ngân sách."*; trang chủ quay về như TC-48. | Bình thường | [ ] |

### B. Backend (Dev)

| Mã TC | API và dữ liệu gửi lên | Kết quả mong đợi ở Backend |
| :--- | :--- | :--- |
| TC-48 | `GET /api/budget` | `budget = null`. |
| TC-49, TC-54a | `PUT /api/budget` `{amount:3000000, month:"YYYY-MM"}` | `200`, upsert bảng `budgets` theo tháng. Thủ tục `sp_get_budget_status` trả `daily_allowance = FLOOR((budget − chi trước hôm nay) / days_left)`. Tháng sai định dạng: `400 INVALID_MONTH`. |
| TC-50, TC-51 | `GET /api/dashboard/mini` | `left_today = daily_allowance − spent_today` (có thể âm). |
| TC-52 | `GET /api/budget` ngày hôm sau | `daily_allowance` giảm tương ứng phần đã lố. |
| TC-53 | `GET /api/dashboard/mini` | `spent_month / amount ≥ 0.85` → giao diện tự sinh thông báo (server không lưu thông báo). |
| TC-54b | `DELETE /api/budget?month=YYYY-MM` | `200`. Tháng chưa có ngân sách: `404 BUDGET_NOT_FOUND`. |

---

## PHÂN HỆ 7: THÚ CƯNG VÀ TIỆM ĐỒ

> Thú cưng nằm ở đầu trang **Hôm nay**, bên cạnh có bong bóng lời thoại, cấp độ (*"Cấp N"*), chuỗi ngày, số xu, số huy hiệu và thanh độ no.

### A. Giao diện (Tester)

| Mã TC | Tên | Các bước / điều kiện | Kết quả mong đợi trên màn hình | Mức độ | Kết quả |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-55** | Chọc thú cưng | Chạm vào thú cưng vài lần. | Thú cưng nảy lên, bong bóng đổi câu thoại khác nhau mỗi lần. Điện thoại Android rung nhẹ (nếu bật **Rung khi chạm** trong Cài đặt). | Bình thường | [ ] |
| **TC-56** | Tâm trạng theo tình hình chi tiêu | Tạo lần lượt các tình huống rồi về **Hôm nay** xem bong bóng thoại. | - Có ngân sách, chi trong mức: *"Hôm nay còn được tiêu ..., ổn áp!"*<br>- Còn dưới 20% hạn mức ngày: *"Chỉ còn ... cho hôm nay thôi đó!"*<br>- Lố hạn mức ngày: *"Hôm nay lố 80.000đ, mai mình tiết kiệm bù nhé."*<br>- Lố cả ngân sách tháng: *"Huhu, tháng này lố ngân sách ... rồi."*, thú cưng khóc.<br>- Chuỗi ≥ 7 ngày: *"N ngày liền ghi chép, quẩy lên!"*<br>- Chưa đặt ngân sách: *"Đặt ngân sách tháng để mình canh ví giúp bạn nhé."* | Cao | [ ] |
| **TC-57** | Buồn ngủ buổi tối | Sau 20:00, cả ngày chưa ghi khoản nào → mở **Hôm nay**. | - Thú cưng ngủ, bong bóng *"Buồn ngủ quá... hôm nay bạn chưa ghi gì cả."*<br>- Có thẻ hỏi *"Hôm nay bạn có tiêu gì không?"* với 2 nút **"Không tiêu gì"** và **"Nói nhanh"**. | Bình thường | [ ] |
| **TC-58** | Đánh dấu ngày không tiêu | Ở thẻ của TC-57 bấm **"Không tiêu gì"**. | - Thông báo *"Ngày không tiêu! Chuỗi ngày vẫn giữ nhé ✦"*.<br>- Thẻ hỏi biến mất, số *"N ngày liền"* không bị về 0. | Cao | [ ] |
| **TC-59** | Mua đồ trong tiệm | **Tôi** → **Tiệm đồ thú cưng** (tiêu đề *"Tiệm Linh Thú ✨"*) → mục **Kính & Mặt** → **Kính râm Deal with it** → **"Mua 80 xu"**. | - Đủ xu: số xu giảm đúng 80, thông báo *"Mua thành công "Kính râm Deal with it"!"*; nút đổi thành **"✨ Mặc đồ"**.<br>- Thiếu xu: *"Bạn còn thiếu N xu. Hãy tiếp tục ghi chép chi tiêu để nhận thêm nhé!"*, xu không bị trừ. | Cao | [ ] |
| **TC-60** | Mặc / tháo đồ | Bấm **"✨ Mặc đồ"** món vừa mua, về trang chủ; quay lại tiệm bấm **"✓ Đang mặc"**. | - *"Đã diện "Kính râm Deal with it" lên người!"*, thú cưng trên trang chủ đeo kính.<br>- Bấm lại: *"Đã tháo "Kính râm Deal with it"."*, kính biến mất. | Cao | [ ] |
| **TC-61** | Đổi phông nền | Mục **Phông nền** → **Bãi biển nghỉ dưỡng** (120 xu) → mua → mặc. | Khung thú cưng trên trang chủ đổi sang nền bãi biển. | Bình thường | [ ] |

### B. Backend (Dev)

| Mã TC | API và dữ liệu gửi lên | Kết quả mong đợi ở Backend |
| :--- | :--- | :--- |
| TC-56, TC-57 | `GET /api/dashboard/mini` (trường `pet`) | `mood` lần lượt: `happy`, `worried` (còn < 20%), `sad` (lố ngày), `crying` (lố tháng), `party` (chuỗi ≥ 7), `chill` (không có ngân sách), `sleeping` (sau giờ `NUDGE_HOUR`, mặc định 20h, chưa ghi). |
| TC-57 | `GET /api/dashboard/nudge?today&now` | Trả lời nhắc khi đã qua 20h, hôm nay chưa ghi, chưa đánh dấu. |
| TC-58 | `PUT /api/dashboard/no-spend` `{date}` | `200`, lưu ngày không tiêu, chuỗi không đứt. Gửi ngày **tương lai** phải trả `400 INVALID_DATE` *"Không đánh dấu trước cho ngày chưa tới."* |
| TC-59 | `POST /api/pet-shop/buy` `{item_id:"face_pixel"}` | `200`, `coins` giảm 80, có lịch sử giao dịch xu. Mã món sai: `400 INVALID_ITEM_ID`. Bấm mua 2 lần thật nhanh **chỉ được trừ xu 1 lần**. |
| TC-60 | `POST /api/pet-shop/equip` | Cập nhật đồ đang mặc; `GET /api/pet-shop/pet` trả `equipped` có món vừa mặc. |
| TC-61 | `POST /api/pet-shop/buy` `{item_id:"bg_beach"}` rồi `equip` | `equipped.bg = "bg_beach"`. |

---

## PHÂN HỆ 8: SỔ NỢ, NHẮC KHÉO, CHIA TIỀN, BẠN BÈ

> Mở bằng tab **Sổ nợ** ở thanh dưới. Đầu trang có 3 mục **Sổ Nợ / Quỹ Nhóm / Bạn Bè**. Trong Sổ nợ có 2 ô tổng *"Người ta nợ bạn"*, *"Bạn đang nợ"* và 2 nút **"Chia tiền nhóm"**, **"Ghi nợ"**.

### A. Giao diện (Tester)

| Mã TC | Tên | Các bước trên app | Dữ liệu nhập | Kết quả mong đợi trên màn hình | Mức độ | Kết quả |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-62** | Ghi khoản cho mượn | **Ghi nợ** → chọn **"Mình cho mượn"** → **"Không dùng app (ghi tự do)"** → điền → **"Ghi vào sổ"**. | Tên `Huy`<br>Số tiền `60k`<br>Lý do `Tiền trà sữa` | - Thông báo *"Đã ghi: Huy nợ bạn 60.000đ."*<br>- Ô *"Người ta nợ bạn"* tăng 60.000đ.<br>- Mục **Theo từng người** có *Huy* – *"Nợ bạn · 1 khoản"*, màu xanh. | Cao | [ ] |
| **TC-63** | Ghi khoản đi mượn | **Ghi nợ** → **"Mình đi mượn"** → điền → **Ghi vào sổ**. | Tên `Tuấn`, `30k` | *"Đã ghi: bạn nợ Tuấn 30.000đ."*; ô *"Bạn đang nợ"* tăng 30.000đ; Tuấn hiện *"Bạn nợ · 1 khoản"*, màu hồng. | Cao | [ ] |
| **TC-64** | Thiếu tên hoặc số tiền | **Ghi nợ** → để trống tên hoặc số tiền → **Ghi vào sổ**. | Trống | Báo *"Nhập tên người nhé"* hoặc *"Nhập số tiền"*, không ghi. | Bình thường | [ ] |
| **TC-65** | Nhắc khéo | Mở *Huy* → **"Nhắc khéo"** → chọn giọng → **Sao chép**. | Không | - Màn *"Nhắc khéo Huy"* có 3 giọng **Nhẹ nhàng / Hài hước / Rõ ràng**, câu nhắc đã điền sẵn `60.000đ`, sửa được.<br>- Bấm Sao chép: *"Đã chép, dán vào Messenger/Zalo là xong."*<br>- Có nút **"Gửi qua ứng dụng khác"**. | Cao | [ ] |
| **TC-66** | Đánh dấu đã trả hết | Mở *Huy* → **"Đánh dấu xong hết"**. | Không | - Thông báo *"Sạch nợ với Huy!"*<br>- Huy không còn trong danh sách đang nợ; khoản nằm ở mục **"Đã trả gần đây"**.<br>- Ô *"Người ta nợ bạn"* giảm 60.000đ. | Cao | [ ] |
| **TC-67** | Chia tiền nhóm | **"Chia tiền nhóm"** → ô *"Đi gì thế?"* → **Tổng hóa đơn** → thêm 2 người → **"Chia và ghi sổ"**. | `Lẩu`, `300k`, thêm `Nam`, `Lan`, mình là người trả | - Trước khi bấm: *"Chia đều 3 người"*, *"100.000đ/người"*, *"2 người sẽ nợ bạn tổng 200.000đ. Phần của bạn 100.000đ được ghi vào chi tiêu"*.<br>- Sau khi bấm: *"Đã chia 300.000đ cho 3 người, phần bạn 100.000đ."*; Nam, Lan mỗi người nợ 100.000đ; Lịch sử có khoản chi 100.000đ. | Cao | [ ] |
| **TC-68** | Kết bạn | Mục **Bạn Bè** → **"Kết bạn mới"** → nhập → **"Kết bạn ngay"**. | a) username của một tài khoản khác<br>b) `khong_ton_tai_999`<br>c) username của chính mình | a) Pháo giấy + *"Đã kết bạn thành công với @...!"*, người đó hiện trong *"Bạn bè của tôi (N)"*.<br>b) Chữ đỏ *"Không tìm thấy người dùng này trên hệ thống."*<br>c) *"Bạn không thể tự kết bạn với chính mình."* | Bình thường | [ ] |

### B. Backend (Dev)

| Mã TC | API và dữ liệu gửi lên | Kết quả mong đợi ở Backend |
| :--- | :--- | :--- |
| TC-62, TC-63 | `POST /api/debts` `{person_name:"Huy", amount:60000, direction:"owed_to_me", note}` (TC-63 dùng `direction:"i_owe"`) | `201`, bản ghi trong bảng nợ với `settled = 0`. |
| TC-64 | Thiếu `person_name` hoặc `amount` | `400 INVALID_PERSON` / `400 INVALID_AMOUNT`. Sai `direction`: `400 INVALID_DIRECTION`. |
| TC-65 | Không gọi API (soạn và chép ngay trên máy). | Không áp dụng. |
| TC-66 | `POST /api/debts/settle-person` `{person_name:"Huy"}` | `200`, các khoản của Huy đổi `settled = 1`. Không còn khoản nào: `404 DEBT_NOT_FOUND`. |
| TC-67 | `POST /api/debts/splits` `{title:"Lẩu", total_amount:300000, people:["Nam","Lan"], i_paid:true, category_id, transaction_date}` | `201`, `my_share = 100000`; tạo 2 khoản nợ + 1 giao dịch chi 100.000đ. Không có người: `400 INVALID_PEOPLE`; quá 50 người: `400 INVALID_PEOPLE`. |
| TC-68 | `POST /api/friends` `{target}` | a) `201`. b) `404 USER_NOT_FOUND`. c) `400 CANNOT_FRIEND_SELF`. |

---

## PHÂN HỆ 9: TIỀN BỐC HƠI VÀ LỊCH SỬ

> **Tiền bốc hơi**: **Tôi** → **Tiền bốc hơi**. Có dòng *"Theo sổ, lẽ ra bạn đang có"*, 2 ô **Tiền mặt** và **Tài khoản, ví điện tử**, nút **"Đếm từng tờ"**.
> **Lịch sử**: tab **Lịch sử** ở thanh dưới.

### A. Giao diện (Tester)

| Mã TC | Tên | Các bước trên app | Dữ liệu nhập | Kết quả mong đợi trên màn hình | Mức độ | Kết quả |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-69** | Đếm tiền theo tờ | Bấm **"Đếm từng tờ"** → bấm **+** ở hàng 500.000đ 2 lần, hàng 100.000đ 3 lần. | 2 tờ 500k, 3 tờ 100k | Ô tiền mặt tự thành `1.300.000đ`. Nút **−** bớt được từng tờ. | Cao | [ ] |
| **TC-70** | Tiền khớp sổ | Nhập tổng tiền mặt + tài khoản đúng bằng số *"lẽ ra bạn đang có"*. | Bằng số sổ | Hiện *"Khớp!"* và *"Bạn có ..., sổ ghi chuẩn từng đồng. Quá đỉnh!"*. Bấm **"Lưu lần đối soát"** → *"Sổ khớp ví. Giữ phong độ nhé!"* | Cao | [ ] |
| **TC-71** | Tiền bị hụt | Nhập ít hơn sổ 70.000đ → tick ô ghi chênh lệch → **Lưu lần đối soát**. | Thiếu `70k` | - Hiện *"Đã bốc hơi"* `70.000đ` và *"Có khoản chi bạn quên ghi..."*.<br>- Ô tick ghi *"Ghi 70.000đ vào "Chi không nhớ" để sổ khớp"*.<br>- Lưu: *"Đã lưu và ghi phần chênh lệch. Sổ giờ khớp ví."*; Lịch sử có khoản chi 70.000đ. | Cao | [ ] |
| **TC-72** | Tiền dư ra | Nhập nhiều hơn sổ 20.000đ. | Dư `20k` | Hiện *"Dư ra"* và *"Có khoản thu chưa ghi (lì xì, hoàn tiền...)?"*, ô tick *"Ghi 20.000đ vào "Tiền dư chưa ghi" để sổ khớp"*. | Bình thường | [ ] |
| **TC-73** | Lịch chi tiêu (ô màu theo ngày) | Tab **Lịch sử** → xem thẻ *"Lịch chi tiêu Tháng m/yyyy"* → chạm một ngày. | Không | - Mỗi ngày là một ô, chi càng nhiều màu càng đậm; chú thích **Ít → Nhiều**, **Không tiêu**.<br>- Chạm ngày nào thì danh sách bên dưới chỉ còn khoản của ngày đó; ngày trống hiện *"Ngày này chưa có khoản nào."*<br>- Đổi tháng bằng **Tháng trước / Tháng sau**. | Cao | [ ] |
| **TC-74** | Chi theo danh mục và tìm kiếm | a) Xem thẻ *"Chi theo danh mục"*.<br>b) Gõ vào ô *"Tìm theo ghi chú, danh mục..."*. | b) `trà sữa`, rồi `xyz123` | a) Mỗi danh mục có thanh màu và dòng *"..% · N khoản"*, cộng lại khoảng 100%, **không có `NaN%`**.<br>b) Tìm thấy các khoản có chữ trà sữa ở mọi tháng; `xyz123` hiện *"Không có khoản nào khớp "xyz123"."* | Cao | [ ] |

### B. Backend (Dev)

| Mã TC | API và dữ liệu gửi lên | Kết quả mong đợi ở Backend |
| :--- | :--- | :--- |
| TC-69 | Không gọi API (cộng ngay trên máy). | Không áp dụng. |
| TC-70 → TC-72 | `GET /api/wallet`, rồi `POST /api/wallet/check` `{actual_balance, record:true/false}` | `200`, lưu lần đối soát. Có `record:true` thì tạo thêm giao dịch chi "Chi không nhớ" (hoặc thu "Tiền dư chưa ghi") đúng phần chênh lệch. Số âm: `400 INVALID_BALANCE`. |
| TC-73 | `GET /api/dashboard/calendar?month=YYYY-MM`, `GET /api/transactions?month=...` | Trả tổng chi theo từng ngày và `planned_daily`. |
| TC-74 | `GET /api/transactions?q=trà sữa` | Tìm theo ghi chú và tên danh mục ở tất cả các tháng. |

---

## PHÂN HỆ 10: THIẾT BỊ, PWA, APK, OFFLINE, CÀI ĐẶT

### A. Giao diện (Tester)

| Mã TC | Tên | Thiết bị | Thao tác | Kết quả mong đợi trên màn hình | Mức độ | Kết quả |
| :--- | :--- | :---: | :--- | :--- | :---: | :---: |
| **TC-75** | Chuyển tab liên tục | iPhone (Safari) | Bấm qua lại 20 lần giữa **Hôm nay → Lịch sử → + → Sổ nợ → Tôi**. | Không lần nào trắng màn hình hay hiện *"Không tải được màn hình, thử tải lại trang nhé."* | Khẩn cấp | [ ] |
| **TC-76** | Tai thỏ và thanh Home | iPhone có tai thỏ / Dynamic Island | Nhìn thanh tiêu đề trên cùng và thanh điều hướng dưới đáy. | Chữ trên cùng không bị tai thỏ che; nút dưới đáy không bị vạch Home che, bấm được hết. | Khẩn cấp | [ ] |
| **TC-77** | Cài ra màn hình chính (PWA) | iPhone và Android | iPhone: Chia sẻ → **Thêm vào MH chính**. Android: menu 3 chấm → **Cài đặt ứng dụng**. | Có biểu tượng app trên màn hình chính; mở lên toàn màn hình, không có thanh địa chỉ. | Cao | [ ] |
| **TC-78** | Cài APK và widget | Android | **Tôi** → **"Tải APK"** → cài → giữ màn hình chính → **Tiện ích** → kéo widget Thu Chi ra. | Cài được; kéo ra được widget 2x2 và 4x2, có hiện số tiền còn được tiêu hôm nay. | Cao | [ ] |
| **TC-79** | Mất mạng | Tất cả | Mở app 1 lần khi có mạng → bật Chế độ máy bay → mở lại app. | Giao diện vẫn mở được (không hiện màn hình "Không có kết nối" của trình duyệt). Thao tác cần máy chủ (ghi khoản, đọc ảnh) báo lỗi bằng chữ dễ hiểu, không treo. | Cao | [ ] |
| **TC-80** | Làm mới bộ nhớ đệm | Tất cả | **Tôi** → **Cài đặt** → bấm **"Làm mới bộ nhớ đệm & Cập nhật mới nhất"**. | App tự tải lại và chạy bản mới nhất; vẫn còn đăng nhập. | Cao | [ ] |
| **TC-81** | Sáng/Tối, màu, cỡ chữ, ngôn ngữ | Tất cả | **Cài đặt** → **Giao diện**: mục **Sáng / tối** chọn **Theo máy / Sáng / Tối**; đổi **Màu chủ đạo**, **Cỡ chữ** (Nhỏ/Vừa/Lớn); **Ngôn ngữ** đổi sang English. | - Màu, cỡ chữ đổi ngay, chữ đọc rõ ở cả nền sáng và tối.<br>- Đổi ngôn ngữ thì app tải lại, **không còn sót chữ tiếng Việt** (ví dụ *"xu"*, *"huy hiệu"*) và không có lỗi số ít/số nhiều kiểu *"1 days"*. | Bình thường | [ ] |

### B. Backend (Dev)

| Mã TC | Kiểm tra ở đâu | Kết quả mong đợi |
| :--- | :--- | :--- |
| TC-75 | F12 → Console | Không có lỗi đỏ khi chuyển tab. |
| TC-77 | `GET /manifest.json` | `display: "standalone"`, có đủ icon. |
| TC-78 | `GET /thuchii.apk` | `200`, tải được file APK. |
| TC-79, TC-80 | `frontend/sw.js` (Service Worker) | Lưu sẵn các file giao diện; khi bấm làm mới thì xóa cache cũ và tải bản mới. |
| TC-81 | `frontend/js/lang/en.js`, `backend/src/lang/en.js` | Có bản dịch cho mọi chuỗi hiển thị, kể cả câu thoại thú cưng và thông báo lỗi từ server. |

---

## BẢNG TỔNG HỢP KẾT QUẢ

| Phân hệ | Số TC | PASS | FAIL | Ghi chú / Mã lỗi |
| :--- | :---: | :---: | :---: | :--- |
| 1. Dùng thử | 8 | | | |
| 2. Đăng ký, đăng nhập, quên mật khẩu | 18 | | | |
| 3. Giọng nói | 6 | | | |
| 4. Ảnh hóa đơn, chuyển khoản | 7 | | | |
| 5. Dán SMS và Tự nhập | 8 | | | |
| 6. Ngân sách tháng | 7 | | | |
| 7. Thú cưng và Tiệm đồ | 7 | | | |
| 8. Sổ nợ, Chia tiền, Bạn bè | 7 | | | |
| 9. Tiền bốc hơi và Lịch sử | 6 | | | |
| 10. Thiết bị, PWA, APK, Cài đặt | 7 | | | |
| **TỔNG** | **81** | | | **Tỷ lệ PASS: ...%** |

---

## MẪU BÁO LỖI

Tester chỉ cần mô tả những gì **thấy trên màn hình**. Phần "Nghi ngờ phía" để dev điền sau khi xem bảng B.

```text
- Mã TC: TC-51
- Tóm tắt lỗi: Chi lố nhưng vòng tròn vẫn màu tím, không chuyển hồng
- Thiết bị: iPhone 12, iOS 17.5, Safari
- Các bước:
  1. Đặt ngân sách 3tr.
  2. Tự nhập khoản chi 150k.
  3. Quay về trang Hôm nay.
- Thấy gì: "Còn được tiêu hôm nay" là -50.000đ nhưng vòng tròn vẫn màu tím
- Đáng lẽ phải: vòng tròn 0% màu hồng
- Ảnh/Video: [đính kèm]
- (Dev điền) Nghi ngờ phía: Giao diện / Backend
```
