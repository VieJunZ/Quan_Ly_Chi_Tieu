# BÁO CÁO CÁ NHÂN – SPRINT 3

**Dự án:** Quản Lý Chi Tiêu (Thu Chi)  
**Thành viên:** Nguyễn Thị Diễm Quỳnh  
**Vai trò:** Tester / QA  
**Tài khoản GitHub:** `quynhnguyenthidiem54-stack`  
**Thời điểm tổng hợp:** 29/10/2026

> **Cập nhật từ xác nhận của nhóm:** Quỳnh đã kiểm thử và báo cáo **PASS toàn bộ các trường hợp thuộc phạm vi chức năng Sprint 3 đã bàn giao**. Đây là kết quả do nhóm xác nhận; cần bổ sung log/ảnh/biên bản kiểm thử để chứng minh độc lập. Build và kiểm thử APK Android đã chuyển sang Sprint 4, không tính vào các ca PASS của Sprint 3.

## 1. Nhiệm vụ Sprint 3 được giao

- [S3-05 / Issue #73 – Kiểm thử Tiệm Pet](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/73).
- [S3-09 / Issue #77 – Kiểm thử APK và Widget](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/77).

Theo điều chỉnh phạm vi: **APK Android chưa được build trong Sprint 3**, nên kiểm thử cài đặt APK sẽ chuyển sang Sprint 4. Phần Widget cần phân biệt widget Android native với chuông thông báo trong ứng dụng web.

## 2. Phạm vi cần kiểm tra

### Tiệm Pet
- Danh sách vật phẩm theo danh mục, trạng thái sở hữu.
- Mua vật phẩm bằng xu; chặn trường hợp thiếu xu.
- Trường hợp mua lặp, nhập sai mã vật phẩm hoặc truy cập không hợp lệ.
- Trang bị và tháo phụ kiện, thay đổi giao diện pet.
- Lưu trạng thái sau tải lại và đăng nhập lại.
- Tài khoản A không nhìn thấy dữ liệu riêng của tài khoản B.

### Trung tâm thông báo / Widget
- Thông báo tài chính liên quan ngân sách và nợ.
- Trạng thái đã đọc, đọc tất cả, bỏ qua thông báo.
- Thông báo thể hiện đúng theo tài khoản, không lẫn dữ liệu.
- Kiểm tra giao diện responsive, thông báo lỗi mạng.
- Widget Android native (nếu được bàn giao): cài trên home screen, cập nhật số liệu, nhấn ghi thu chi.

### APK (chuyển Sprint 4)
- Cài đặt APK, đăng nhập, truy cập API, cấp quyền thiết bị.
- Kiểm tra trên ít nhất một thiết bị Android thật và lưu phiên bản Android.

## 3. Bảng test case – kết quả nhóm xác nhận

| ID | Kịch bản | Kết quả mong đợi | Kết quả ghi nhận | Trạng thái |
|---|---|---|---|---|
| PET-01 | Vào cửa hàng khi đăng nhập | Hiện danh sách vật phẩm | Theo xác nhận QA: đạt | PASS |
| PET-02 | Mua vật phẩm khi đủ xu | Trừ xu đúng và thêm vào kho | Theo xác nhận QA: đạt | PASS |
| PET-03 | Mua khi thiếu xu | Từ chối, giữ nguyên số dư | Theo xác nhận QA: đạt | PASS |
| PET-04 | Gửi yêu cầu mua lặp | Không trừ xu/ghi nhận sai | Theo xác nhận QA: đạt | PASS |
| PET-05 | Trang bị/tháo phụ kiện | UI và dữ liệu thống nhất | Theo xác nhận QA: đạt | PASS |
| PET-06 | Đăng xuất rồi đăng nhập | Giữ trạng thái vật phẩm đúng | Theo xác nhận QA: đạt | PASS |
| PET-07 | Truy cập dữ liệu người khác | Bị từ chối | Theo xác nhận QA: đạt | PASS |
| NOTIF-01 | Xem thông báo trên header | Hiện nội dung đúng | Theo xác nhận QA: đạt | PASS |
| NOTIF-02 | Đánh dấu đã đọc | Trạng thái đã đọc được lưu | Theo xác nhận QA: đạt | PASS |
| NOTIF-03 | Có lỗi mạng | Không treo UI, thông báo lỗi phù hợp | Theo xác nhận QA: đạt | PASS |
| WIDGET-01 | Widget Android home screen | Hiện và thao tác theo yêu cầu | Chưa có minh chứng Android native | CHỜ MINH CHỨNG |
| APK-01 | Cài APK Android | Cài và chạy được | Chưa build APK | DEFERRED S4 |

**Quy ước:** PASS – nhóm xác nhận đạt, chưa đối chiếu log độc lập; CHỜ MINH CHỨNG – cần ảnh/clip để xác nhận phạm vi native; DEFERRED S4 – chuyển Sprint 4. Các ca PASS chỉ thuộc những phần app đã bàn giao và nhóm xác nhận kiểm thử.

## 4. Kịch bản và mã nguồn tham chiếu

- [API Tiệm Pet](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/backend/src/routes/petShop.routes.js)
- [Giao diện Tiệm Pet](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/frontend/app/js/screens/shop.js)
- [Trung tâm thông báo](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/frontend/app/js/flows/notifications.js)
- [Bài kiểm thử API hiện có](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/blob/main/backend/tests/api/kiem_thu_api.mjs)
- [PR #79 đã merge](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/pull/79)

## 5. Báo cáo lỗi và regression

**Mẫu ghi nhận lỗi:**
- Mã lỗi: ...
- Môi trường / thiết bị: ...
- Bước tái hiện: ...
- Kết quả mong đợi: ...
- Kết quả thực tế: ...
- Ảnh/log minh chứng: ...
- Issue liên kết: ...
- Trạng thái retest: ...

**Regression Sprint 2 cần kiểm tra sau PR #79:** đăng nhập, giao dịch, lịch sử, ngân sách, sổ nợ, OCR và thông báo.

## 6. Tổng kết QA theo xác nhận của nhóm

**Kết quả:** Quỳnh xác nhận các bài kiểm thử trong phạm vi Sprint 3 **đã bàn giao trên ứng dụng đều PASS**; không còn ca FAIL được nhóm báo cáo trong phạm vi này.

- Ca Tiệm Pet PET-01 đến PET-07: **7/7 PASS** theo xác nhận của QA.
- Ca trung tâm thông báo NOTIF-01 đến NOTIF-03: **3/3 PASS** theo xác nhận của QA.
- **Tổng cộng: 10/10 ca liệt kê thuộc phạm vi app đã bàn giao được báo cáo PASS**; đây không phải số liệu lấy trực tiếp từ log chạy máy.
- WIDGET-01: cần ảnh hoặc video widget Android native nếu nhóm coi đây là hạng mục đã bàn giao; không tự động tính PASS.
- APK-01: **chuyển Sprint 4**, chưa có APK để kiểm thử trong Sprint 3.

**Biên bản/log kiểm thử, ngày chạy, môi trường và ảnh màn hình:** _Quỳnh bổ sung trước khi commit để làm minh chứng._

**Xác nhận của Quỳnh:** _Kiểm tra lại nội dung và bổ sung tên/đường dẫn bằng chứng theo kết quả đã chạy thực tế._

---

*Báo cáo kết quả QA đã được cập nhật theo xác nhận của nhóm. Việc lưu log/ảnh biên bản kiểm thử vẫn cần thiết để có thể đối chiếu độc lập.*
