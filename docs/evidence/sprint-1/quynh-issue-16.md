# Issue #16 – Kiểm thử Sprint 1

**Thành viên:** Quỳnh | Tester/QA  
**Vai trò:** Tài liệu ghi nhận phạm vi và trạng thái kiểm thử.

## Phạm vi kiểm thử

- Đăng ký và đăng nhập.
- Danh mục và thao tác thêm thu/chi.
- Nhật ký giao dịch và bảng tổng quan.
- Dữ liệu không hợp lệ và quyền truy cập.
- Ghi nhận kết quả thực tế, báo lỗi và kiểm thử lại khi có bản sửa.

## Bảng theo dõi kiểm thử

> Trạng thái ban đầu là NOT RUN vì tài liệu bàn giao chưa cung cấp kết quả chạy kiểm thử. Chỉ cập nhật PASS/FAIL/BLOCKED sau khi thực hiện và có minh chứng thực tế.

| Mã | Nội dung kiểm thử | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Minh chứng |
|---|---|---|---|---|---|
| TC01 | Đăng ký với dữ liệu hợp lệ | Tạo tài khoản thành công | Chưa thực hiện | NOT RUN | Chưa có |
| TC02 | Đăng ký với dữ liệu thiếu/sai định dạng | Hiển thị thông báo phù hợp | Chưa thực hiện | NOT RUN | Chưa có |
| TC03 | Đăng nhập với thông tin hợp lệ | Đăng nhập thành công | Chưa thực hiện | NOT RUN | Chưa có |
| TC04 | Đăng nhập với thông tin không hợp lệ | Từ chối đăng nhập và thông báo phù hợp | Chưa thực hiện | NOT RUN | Chưa có |
| TC05 | Thêm/sửa danh mục | Dữ liệu được xử lý đúng theo chức năng | Chưa thực hiện | NOT RUN | Chưa có |
| TC06 | Thêm khoản thu/chi hợp lệ | Giao dịch được lưu và hiển thị chính xác | Chưa thực hiện | NOT RUN | Chưa có |
| TC07 | Nhập số tiền hoặc dữ liệu giao dịch không hợp lệ | Hệ thống từ chối dữ liệu không hợp lệ | Chưa thực hiện | NOT RUN | Chưa có |
| TC08 | Kiểm tra nhật ký và bảng tổng quan | Thông tin hiển thị khớp với dữ liệu giao dịch | Chưa thực hiện | NOT RUN | Chưa có |
| TC09 | Truy cập dữ liệu khi chưa được cấp quyền | Không truy cập được dữ liệu trái phép | Chưa thực hiện | NOT RUN | Chưa có |

## Theo dõi lỗi và kiểm thử lại

- Lỗi phát hiện: Chưa có dữ liệu ghi nhận.
- Issue lỗi liên quan: Chưa ghi nhận.
- Kết quả kiểm thử lại: Chưa thực hiện.

## Kết luận

Đây là bảng theo dõi ban đầu cho phạm vi kiểm thử Sprint 1. Chưa có đủ kết quả chạy thực tế để kết luận chức năng đạt hay không đạt. Cần thực hiện từng ca kiểm thử, bổ sung actual result và ảnh/log minh chứng trước khi nghiệm thu Issue.

**Issue liên quan:** https://github.com/VieJunZ/Quan_Ly_Chi_Tieu/issues/16
