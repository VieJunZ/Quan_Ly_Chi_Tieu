# BÁO CÁO CÁ NHÂN – SPRINT 3

**Dự án:** Quản Lý Chi Tiêu (Thu Chi)  
**Thành viên:** Nguyễn Ngọc Ánh  
**Vai trò:** Product Owner (PO)  
**Tài khoản GitHub:** `ngang02012007-crypto`  
**Thời điểm tổng hợp:** 29/10/2026

> **Mục đích:** Tài liệu tổng hợp công việc PO và kế hoạch nghiệm thu. Thành viên rà soát, bổ sung phần việc đã thực hiện thực tế trước khi commit. Tài liệu không dùng để xác nhận đã hoàn thành các phép thử khi chưa có bằng chứng.

## 1. Mục tiêu Sprint 3

Sprint 3 tập trung vào ba hạng mục: Tiệm Pet, Widget và đóng gói APK Android. Sau khi điều chỉnh phạm vi, nhóm ưu tiên Tiệm Pet cùng chức năng thông báo/tiện ích; **build APK được chuyển sang Sprint 4**.

## 2. Công việc thuộc trách nhiệm PO

- Chuẩn hóa yêu cầu Tiệm Pet: quy tắc xu, vật phẩm, mua, trang bị và điều kiện nghiệm thu.
- Theo dõi phân công nhiệm vụ của năm thành viên theo Issue Sprint 3.
- Tổng hợp trạng thái tích hợp và PR; đối chiếu điều đã merge lên `main`.
- Phân biệt rõ giữa *có mã nguồn*, *đã merge* và *đã kiểm thử/nghiệm thu thực tế*.
- Điều chỉnh phạm vi Sprint: phần build APK và kiểm thử APK chuyển sang Sprint 4.

**Minh chứng công việc được phân công:**
- [S3-01 / Issue #69 – Chốt yêu cầu Tiệm Pet](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/69)
- [S3-10 / Issue #78 – Nghiệm thu, demo và báo cáo Sprint 3](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/78)
- [PR #79 – Notification Widget, đã merge](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/pull/79)

## 3. Kết quả ghi nhận

| Nhóm chức năng | Dữ liệu đối chiếu | Quyết định PO / ghi chú |
|---|---|---|
| Tiệm Pet | Có giao diện `frontend/app/js/screens/shop.js`, API `backend/src/routes/petShop.routes.js` trên `main` | Nhóm xác nhận hoàn thành; cần lưu ảnh demo và kết quả kiểm thử khi nghiệm thu chính thức |
| Trung tâm thông báo | Có `frontend/app/js/flows/notifications.js` trên `main`, PR #79 đã merge | Đã tích hợp mã nguồn thông báo trong ứng dụng web |
| Widget Android màn hình chính | [S3-07 / #75](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/75) | Chưa đủ bằng chứng xác nhận widget Android native; cần phân biệt với chuông thông báo trong web |
| APK Android | [S3-06 / #74](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/74) | Chuyển Sprint 4, không ghi là đã hoàn thành |
| Kiểm thử APK/Widget | [S3-09 / #77](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/77) | Tách phần kiểm thử APK sang Sprint 4; cần báo cáo QA riêng cho Widget |

## 4. Acceptance Criteria cần PO xác nhận

- [ ] Tiệm Pet hoạt động từ giao diện tới cơ sở dữ liệu trên bản demo.
- [ ] Mua vật phẩm, trừ xu, trang bị và lưu trạng thái đúng sau đăng nhập lại.
- [ ] Trung tâm thông báo hiển thị thông tin phù hợp với dữ liệu tài khoản.
- [ ] Chốt rõ yêu cầu Widget Android native so với thông báo trong ứng dụng web.
- [ ] QA đính kèm kết quả thực tế và PO xác nhận phạm vi đạt/chưa đạt.
- [ ] Issue build APK được chuyển sang Milestone Sprint 4.

## 5. Rủi ro và hướng xử lý

- **Sai lệch giữa tài liệu và tình trạng Issue:** cập nhật Issue theo kết quả review thực tế, không đóng chỉ vì có code.
- **Nhầm Widget Android với notification widget:** phải xác nhận sản phẩm bàn giao cụ thể.
- **APK chưa có:** lên kế hoạch riêng cho Sprint 4, kiểm thử trên thiết bị Android thật.
- **Phát triển trên nhánh tích hợp cũ:** tiếp tục dùng nhánh feature và PR riêng để giảm xung đột.

## 6. Tự xác nhận và minh chứng cá nhân

**Phần việc PO bản thân đã thực hiện (điền và chỉ giữ mục đúng sự thật):**
- ...

**Đường dẫn quyết định/Issue/comment do bản thân thực hiện:**
- ...

**Ảnh minh chứng hoặc biên bản nghiệm thu đã thực hiện:**
- ...

**Kết quả nghiệm thu cuối cùng:** Chưa xác nhận trong tài liệu này; cập nhật sau khi kiểm tra demo và QA.

---

*Nguồn tham chiếu: [Repository](https://github.com/VieJunZ/Quan_Ly_Chi_Tieu), Issues #69, #74, #75, #77, #78 và PR #79. Tài liệu này là báo cáo công việc PO; việc commit tài liệu không chứng minh người commit đã viết toàn bộ mã nguồn được dẫn.*
