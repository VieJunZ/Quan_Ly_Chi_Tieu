# 📱 HƯỚNG DẪN CÀI ĐẶT & KÉO WIDGET RA MÀN HÌNH CHÍNH ANDROID

> **⚠️ LÝ DO VÌ SAO TRƯỚC ĐÓ CHƯA KÉO ĐƯỢC WIDGET:**
> * Nếu bạn dùng app bằng nút **"Thêm vào Màn hình chính" từ Google Chrome (PWA)**: Trình duyệt web **không thể** can thiệp vào hệ điều hành Android để tạo Widget launcher.
> * Widget màn hình chính (AppWidget) là tính năng **Native độc quyền của Android**. Bạn **bắt buộc phải cài đặt file APK** (bản đã tích hợp Widget) lên điện thoại thì hệ điều hành Android mới nhận diện và hiển thị Widget trong menu Tiện ích.
> * Việc chỉ có mã nguồn `.java` và `.xml` trên máy tính chưa thể tác động tới điện thoại của bạn — Bạn cần tải file APK mới nhất được build tự động về máy để cài đặt.

---

## 🚀 BƯỚC 1: TẢI FILE APK ĐÃ TÍCH HỢP WIDGET (TẢI TRỰC TIẾP TỪ WEB)

Bạn có thể tải trực tiếp file cài đặt APK về máy mà không cần tài khoản hay thao tác phức tạp:

1. Mở trình duyệt trên điện thoại Android, truy cập đường link tải trực tiếp:
   ```text
   https://quan-ly-chi-tieu-k5kn.onrender.com/thuchii.apk
   ```
2. Hoặc mở web app `https://quan-ly-chi-tieu-k5kn.onrender.com`, vào tab **Tôi** ➔ chọn **Cài đặt** ➔ bấm nút **"Tải ứng dụng Android (APK)"**.
3. File cài đặt **`thuchii.apk`** sẽ tự động được tải về mục *Tải về (Downloads)* trên điện thoại của bạn.

---

## 📲 BƯỚC 2: CÀI ĐẶT FILE THUCHII.APK LÊN ĐIỆN THOẠI ANDROID

1. Mở file **`thuchii.apk`** trên điện thoại Android của bạn.
2. Nếu máy hiện thông báo *"Cài đặt ứng dụng từ nguồn không xác định"*, bấm **Cài đặt** (hoặc **Vẫn cài đặt / Install anyway**).
3. Đợi khoảng 5 giây để cài đặt hoàn tất.
4. Mở app lần đầu để hệ thống đồng bộ dữ liệu với máy chủ Render Cloud.

---

## 🎨 BƯỚC 3: KÉO WIDGET RA MÀN HÌNH CHÍNH (HOME LAUNCHER)

Áp dụng cho mọi dòng máy Android (Samsung, Xiaomi, Oppo, Vivo, Realme, Google Pixel...):

1. **Ra màn hình chính** của điện thoại.
2. Dùng ngón tay **ấn giữ (chạm đè) vào khoảng trống bất kỳ** trên màn hình khoảng 2 giây.
3. Menu phía dưới hiện lên, chọn mục **Tiện ích** (hoặc **Widgets**).
4. Tìm kiếm từ khóa: **"Thu Chi"**.
5. Bạn sẽ thấy ngay **2 loại Widget**:
   * **Thu Chi (Nhỏ 2x2)**: Hiển thị Thú cưng Mochi + Số tiền còn được tiêu hôm nay + Nút (+) Ghi nhanh 1 chạm.
   * **Thu Chi (Vừa 4x2)**: Hiển thị Mochi + Chuỗi ngày Streak (`🔥 5 ngày`) + Số dư + 3 nút thao tác (🎙️ Nói, 📸 Quét Bill, ✍️ Ghi chép).
6. **Chạm và giữ vào Widget** bạn muốn dùng, rồi kéo thả vào vị trí yêu thích trên màn hình chính!
7. **Xong!** Bây giờ mỗi khi cần ghi chép hay kiểm tra số tiền hôm nay, bạn chỉ cần nhìn ngay trên màn hình chính mà không cần mở app.

---

## 🛠️ VỀ LỖI GẠCH ĐỎ CỦA CÁC FILE `.java` TRONG VS CODE:

### Nguyên nhân:
VS Code trên máy tính của bạn dùng tiện ích mở rộng Java tiêu chuẩn (Eclipse JDT Language Server), nhưng máy bạn **chưa cài bộ Android SDK** (nặng 15GB). Do đó VS Code không tìm thấy các gói `android.app.*`, `android.widget.*` nên báo gạch đỏ.

### Đã được xử lý triệt để như sau:
1. **Tạo bộ Stub thư viện Android (`android/stubs`)**: Định nghĩa đầy đủ các lớp chuẩn (`Context`, `Activity`, `PendingIntent`, `RemoteViews`, `AppWidgetProvider`...) giúp VS Code nhận diện 100% cú pháp, không còn thiếu import.
2. **Cập nhật cấu hình `.vscode/settings.json`**:
   - `"java.project.sourcePaths"` trỏ đến cả `src/main/java` và `stubs`.
   - `"java.errors.incompleteClasspath.severity": "ignore"` triệt tiêu toàn bộ cảnh báo thiếu Classpath.
3. **Cấu hình `android/app/build.gradle`**:
   - Tự động loại trừ file `R.java` giả lập khi build thật để tránh lỗi trùng lặp `duplicate class`.
   - Biên dịch mượt mà trên GitHub Actions tạo ra file APK chuẩn cho điện thoại.
