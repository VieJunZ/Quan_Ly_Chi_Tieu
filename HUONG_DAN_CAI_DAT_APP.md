# 📱 HƯỚNG DẪN CÀI ĐẶT & SỬ DỤNG APP QUẢN LÝ THU CHI

> Ứng dụng **Quản Lý Thu Chi** hỗ trợ chạy đa nền tảng: **Android (File APK & PWA)**, **iPhone / iPad (iOS PWA)** và **Máy tính (Windows Desktop / Web App)**. 
> Dữ liệu được đồng bộ hóa tức thì qua máy chủ đám mây (Cloud Server) 24/7.

---

## 📌 MỤC LỤC
1. [Cách 1: Cài đặt file APK trên điện thoại Android (Khuyên dùng)](#cách-1-cài-đặt-file-apk-trên-điện-thoại-android-khuyên-dùng)
2. [Cách 2: Cài đặt nhanh PWA trên iPhone & Android (Không cần tải file)](#cách-2-cài-đặt-nhanh-pwa-trên-iphone--android-không-cần-tải-file)
3. [Cách 3: Chạy và cài đặt trên máy tính (PC / Laptop)](#cách-3-chạy-và-cài-đặt-trên-máy-tính-pc--laptop)
4. [Tính năng Tự Động Cập Nhật (Không cần cài lại app)](#tính-năng-tự-động-cập-nhật-auto-update)
5. [Câu hỏi thường gặp & Xử lý sự cố (FAQ)](#câu-hỏi-thường-gặp--xử-lý-sự-cố)

---

## 🤖 CÁCH 1: CÀI ĐẶT FILE APK TRÊN ĐIỆN THOẠI ANDROID (ĐẦY ĐỦ TÍNH NĂNG & WIDGET)

Ứng dụng Android được đóng gói chuẩn **Native Android Wrapper & TWA**, mang lại trải nghiệm toàn màn hình và hỗ trợ **2 Widget kéo thả trực tiếp lên màn hình chính (2x2 và 4x2)**.

### Các bước cài đặt:
1. **Tải file APK về điện thoại (Miễn phí qua GitHub Actions)**:
   * Truy cập GitHub dự án: `https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/actions`
   * Bấm vào build mới nhất -> Tải file `ThuChi-Mochi-Android-Widget-v2.0.0.zip` và giải nén lấy file `app-debug.apk` vào điện thoại.
2. **Cài đặt file APK**:
   * Mở file `app-debug.apk` trên điện thoại.
   * Nếu có cảnh báo *"Ứng dụng ngoài Google Play"* hoặc *"Tệp có thể gây hại"*, chọn **Vẫn cài đặt (Install anyway)**.
3. **Mở ứng dụng & Kéo Widget ra màn hình**:
   * Biểu tượng **Thu Chi** sẽ xuất hiện trên màn hình và danh sách ứng dụng.
   * Để đưa Widget ra màn hình chính: **Ấn giữ khoảng trống màn hình điện thoại 2 giây** -> Chọn **Tiện ích (Widgets)** -> Tìm **Thu Chi** -> Kéo Widget 2x2 hoặc 4x2 ra vị trí bạn thích!

---

## 🍏 CÁCH 2: CÀI ĐẶT NHANH PWA TRÊN IPHONE & ANDROID (KHÔNG CẦN TẢI FILE)

Nếu bạn không muốn cài file APK hoặc đang sử dụng **iPhone / iPad (iOS)**, công nghệ **Progressive Web App (PWA)** cho phép cài đặt app trực tiếp chỉ trong 5 giây:

### 👉 Dành cho iPhone / iPad (Trình duyệt Safari):
1. Mở trình duyệt **Safari** trên iPhone và truy cập địa chỉ:
   ```text
   https://quan-ly-chi-tieu-k5kn.onrender.com
   ```
2. Bấm vào biểu tượng **Chia sẻ** (hình ô vuông có mũi tên chỉ lên ở thanh công cụ dưới cùng).
3. Cuộn xuống và chọn **"Thêm vào MH chính"** (Add to Home Screen).
4. Bấm **Thêm** ở góc trên bên phải.
5. Biểu tượng App sẽ xuất hiện trên màn hình iPhone, mở lên toàn màn hình không có thanh điều hướng Safari!

### 👉 Dành cho Android (Trình duyệt Chrome / Cốc Cốc / Edge):
1. Mở **Chrome** trên điện thoại và truy cập địa chỉ:
   ```text
   https://quan-ly-chi-tieu-k5kn.onrender.com
   ```
2. Bấm vào nút menu **3 chấm (⋮)** ở góc trên bên phải màn hình.
3. Chọn mục **"Cài đặt ứng dụng"** (Install app) hoặc **"Thêm vào Màn hình chính"**.
4. Bấm **Cài đặt** để xác nhận. Ứng dụng sẽ được thêm vào danh sách ứng dụng trên máy.

---

## 💻 CÁCH 3: CHẠY VÀ CÀI ĐẶT TRÊN MÁY TÍNH (PC / LAPTOP)

### Cách 3.1: Chạy máy chủ cục bộ (Offline / Local) - 1 Click chuột
Nếu bạn muốn chạy thử nghiệm trên máy tính trước khi đưa dữ liệu lên đám mây:
1. Vào thư mục gốc dự án: `d:\Quan_Ly_Chi_Tieu`.
2. Nhấp đúp chuột vào file:
   ```cmd
   chay_thu_chi_local.bat
   ```
3. Cửa sổ máy chủ sẽ tự khởi động tại cổng `8080` và tự động mở trình duyệt web tại `http://localhost:8080`.

### Cách 3.2: Cài đặt thành Desktop App trên Windows
1. Mở Google Chrome hoặc Microsoft Edge trên máy tính, truy cập:
   ```text
   https://quan-ly-chi-tieu-k5kn.onrender.com
   ```
2. Nhìn lên thanh địa chỉ ở góc trên bên phải, bạn sẽ thấy biểu tượng **Cài đặt ứng dụng** (hình chiếc máy tính có mũi tên tải xuống).
3. Bấm vào biểu tượng đó và chọn **Cài đặt**.
4. Ứng dụng sẽ mở trong một cửa sổ riêng biệt không có thanh trình duyệt, có icon riêng trên Taskbar và Desktop của Windows.

---

## 🔄 TÍNH NĂNG TỰ ĐỘNG CẬP NHẬT (AUTO-UPDATE)

> 💡 **Bạn không cần phải tải lại hoặc cài lại file APK mỗi khi có tính năng mới!**

* Hệ thống được cấu hình cơ chế nạp nhanh **Fast Shell Service Worker**:
  * Mỗi khi nhà phát triển sửa code hoặc thêm tính năng mới trên Cloud, app trên điện thoại của bạn sẽ **tự động tải bản mới nhất** ở chế độ nền.
  * Chỉ cần mở lại app hoặc vuốt làm mới, ứng dụng sẽ ngay lập tức chuyển sang phiên bản mới nhất.
  * Giúp người dùng luôn được trải nghiệm bản cập nhật mới nhất mà không mất công tải lại file APK hay thao tác phức tạp.

---

## ❓ CÂU HỎI THƯỜNG GẶP & XỬ LÝ SỰ CỐ (FAQ)

### 1. Mất mạng Internet thì app có mở được không?
* **Có!** Ứng dụng được thiết kế theo kiến trúc **Offline-First**. Toàn bộ giao diện, hình ảnh, âm thanh thú cưng đều được lưu đệm sẵn trong điện thoại qua Service Worker (`sw.js`).
* Ngay cả khi tắt Wi-Fi và 4G, app vẫn khởi động chỉ trong **0.05 giây** và bạn vẫn có thể sử dụng các tính năng cơ bản bình thường.

### 2. Chế độ "Dùng thử ngay" có lưu tài khoản lên máy chủ không?
* **Không.** Chế độ Dùng thử chạy 100% ngoại tuyến trên bộ nhớ điện thoại của bạn (LocalStorage) và không có mã ID. Máy chủ đám mây chỉ lưu các tài khoản người dùng đăng ký chính thức để bảo mật và giữ cho cơ sở dữ liệu luôn sạch sẽ.

### 3. Làm thế nào để kết nối và chia tiền với bạn bè?
* Bạn chỉ cần vào mục **Tôi** hoặc **Cài đặt** để xem mã **ID người dùng** của mình (Ví dụ: `ID: #1`).
* Bạn bè của bạn chỉ cần vào mục **Sổ Nợ**, gõ số ID này vào ô tìm kiếm là có thể liên kết tài khoản và tự động đồng bộ số dư nợ 2 chiều!

---
*Chúc bạn có trải nghiệm quản lý chi tiêu thông minh và tiện lợi!* 🎉
