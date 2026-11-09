# 📱 HƯỚNG DẪN CÀI ĐẶT & KÉO WIDGET RA MÀN HÌNH CHÍNH ANDROID

Module Widget Android của ứng dụng **Quản Lý Thu Chi** được xây dựng theo chuẩn **Android AppWidget**, hỗ trợ kéo thả trực tiếp lên màn hình chính (Home Launcher) của các dòng điện thoại: Samsung, Xiaomi, Oppo, Vivo, Realme, Google Pixel,...

---

## 🎨 2 LOẠI WIDGET CÓ SẴN:

### 1. Widget Nhỏ (Kích thước 2x2 - Ô vuông)
* **Hiển thị**: 
  * Icon Thú cưng Mochi biểu cảm theo mức chi tiêu.
  * Số tiền **Còn được tiêu hôm nay** (Ví dụ: `150.000 đ` màu xanh lá).
  * Nút tròn **(+) Ghi nhanh**: Chạm vào là mở ngay hộp thoại nhập tiền mà không cần tìm app.

### 2. Widget Vừa (Kích thước 4x2 - Chữ nhật ngang)
* **Hiển thị**:
  * Bên trái: Thú cưng Mochi to rõ + Huy hiệu chuỗi ngày Streak (`🔥 5 ngày`).
  * Bên phải: Số dư ngân sách ngày hôm nay.
  * **3 Phím tắt 1 chạm**:
    * 🎙️ **Nói**: Bấm vào là bật micro nhận diện giọng nói tiếng Việt ngay.
    * 📸 **Bill**: Bấm vào là bật camera/chọn ảnh chụp hóa đơn để quét OCR.
    * ✍️ **Ghi**: Mở form ghi chép nhanh.

---

## 👆 CÁCH KÉO WIDGET RA MÀN HÌNH CHÍNH ĐIỆN THOẠI:

1. **Ra màn hình chính** của điện thoại Android.
2. Dùng ngón tay **chạm và giữ (ấn đè) vào khoảng trống bất kỳ** trên màn hình khoảng 2 giây.
3. Ở menu dưới cùng hiện lên, bấm vào biểu tượng **Tiện ích (Widgets)**.
4. Cuộn xuống danh sách hoặc gõ tìm kiếm: **"Thu Chi"**.
5. Bạn sẽ thấy 2 kích thước:
   * **Thu Chi (Nhỏ 2x2)**
   * **Thu Chi (Vừa 4x2)**
6. Chạm và giữ vào widget bạn thích, rồi kéo thả vào vị trí mong muốn trên màn hình chính!
7. **Xong!** Bạn có thể chạm vào để ghi tiền bất cứ lúc nào ngay từ màn hình chính.

---

## 🛠️ CẤU TRÚC MÃ NGUỒN WIDGET ĐÃ TÍCH HỢP TRONG DỰ ÁN:

```text
android/
└── app/
    └── src/
        └── main/
            ├── AndroidManifest.xml                  (Đăng ký 2 bộ phát Widget)
            ├── java/com/onrender/quan_ly_chi_tieu_k5kn/twa/
            │   ├── ThuChiWidgetSmallProvider.java   (Xử lý logic Widget 2x2)
            │   └── ThuChiWidgetMediumProvider.java  (Xử lý logic Widget 4x2)
            └── res/
                ├── drawable/
                │   ├── widget_background.xml        (Nền bo góc 22dp gradient mờ)
                │   └── widget_button_bg.xml         (Nền nút tròn hồng cam)
                ├── layout/
                │   ├── widget_thu_chi_small.xml     (Giao diện XML widget 2x2)
                │   └── widget_thu_chi_medium.xml    (Giao diện XML widget 4x2)
                └── xml/
                    ├── widget_info_small.xml        (Cấu hình kích thước 2x2)
                    └── widget_info_medium.xml       (Cấu hình kích thước 4x2)
```
