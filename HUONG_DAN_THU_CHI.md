# Hướng dẫn chạy và dùng Quản lý thu chi

Quản lý thu chi (tên ngắn trên màn hình chính: **Thu Chi**) là app ghi thu chi cho sinh viên. Giao diện mới nằm ở `frontend/app/`, chạy chung máy chủ Node.js trong `backend/`, dữ liệu lưu ở SQL Server (CSDL `so_chi_tri_db`).

## 1. Cài đặt lần đầu

| Cần cài | Ghi chú |
| --- | --- |
| Node.js bản LTS (18 trở lên) | https://nodejs.org |
| SQL Server Express LocalDB | Có sẵn khi cài Visual Studio, hoặc chọn "LocalDB" trong bộ cài SQL Server Express |
| sqlcmd | Công cụ dòng lệnh của SQL Server, gõ `sqlcmd -?` để kiểm tra |
| ODBC Driver 17 for SQL Server | Thư viện kết nối mà máy chủ Node dùng |

Không cần tự cài thư viện Node: lần chạy đầu file `chay_thu_chi.bat` tự gọi `npm install`.

## 2. Chạy app

Bấm đúp `chay_thu_chi.bat` ở thư mục gốc. File sẽ:

1. Kiểm tra Node.js và sqlcmd.
2. Bật LocalDB (bị kẹt thì tự khởi động lại), tạo CSDL `so_chi_tri_db` nếu chưa có (khoảng 30 giây). Nếu đã có thì dùng tiếp dữ liệu cũ và bổ sung bảng, chỉ mục mới nếu có.
3. Mở cửa sổ **"ThuChi - May chu"** chạy máy chủ ở cổng 8090.
4. Mở trình duyệt vào http://localhost:8090/app/ và in địa chỉ để mở bằng điện thoại.

Tắt máy chủ: đóng cửa sổ "ThuChi - May chu".

Các cách chạy khác (gõ trong cmd ở thư mục gốc):

```bat
chay_thu_chi.bat dienthoai
```
Mở khung xem như trên điện thoại (iPhone SE, iPhone 14, Android).

```bat
chay_thu_chi.bat taolai
```
Xóa và tạo lại CSDL từ đầu. **Mất hết dữ liệu đã ghi.**

```bat
chay_thu_chi.bat kiemthu
```
Chạy kiểm thử tự động (xem mục 6).

```bat
chay_thu_chi.bat chiutai
```
Chạy máy chủ trên mọi nhân CPU (tối đa 8 tiến trình) thay vì 1, dùng khi muốn thử nhiều người vào cùng lúc (xem mục 7).

## 3. Dùng thử không cần đăng ký

Ở màn hình chào, bấm **"Dùng thử ngay - không cần đăng ký"**. App tạo một tài khoản tạm có sẵn dữ liệu mẫu và dùng được khoảng 24 giờ. Băng tím trên cùng cho biết còn bao lâu. Bấm **"Lưu lại"** để đặt tên đăng nhập, mật khẩu và giữ toàn bộ dữ liệu đã ghi.

## 4. Các chức năng và chỗ tìm

### Ghi khoản chi, thu
Bấm nút **+** ở giữa thanh dưới để mở "Ghi khoản mới":

- **Nói để ghi**: bấm micro, nói kiểu "trà sữa 35k, gửi xe 5 nghìn". App tách thành từng khoản để xác nhận. Cần Chrome hoặc Edge và cho phép dùng micro.
- **Up ảnh chi tiêu**: chọn một lần tối đa 10 ảnh (bill, ảnh chụp màn hình chuyển khoản). App đọc lần lượt từng ảnh, sau đó bạn xác nhận từng khoản hoặc bấm xác nhận tất cả.
- **Dán SMS ngân hàng**: dán tin nhắn biến động số dư, app lấy ra số tiền và nội dung.
- **Ghi một chạm**: các khoản lặp lại hằng ngày (gửi xe, cơm trưa) chỉ cần một chạm. Trang "Hôm nay" cũng tự gợi ý khoản quen gần đúng giờ bạn hay ghi.
- **Nhập tay**: số tiền, danh mục, ghi chú, ngày giờ.

### Trang "Hôm nay"
- Số đã chi hôm nay, mức được tiêu mỗi ngày còn lại theo ngân sách.
- **Thú cưng ví tiền**: vui hay buồn tùy bạn có ghi đều và tiêu trong mức hay không.
- **Chuỗi ngày** ghi chép liên tiếp. Ngày không tiêu gì cũng được tính nếu bạn đánh dấu.
- **Lời nhắc buổi tối**: từ 20h, nếu hôm đó chưa ghi gì, app hỏi "Hôm nay bạn có tiêu gì không?". Chọn "Không tiêu gì" để giữ chuỗi.
- **Mini-View**: bấm biểu tượng khung nhỏ cạnh ảnh đại diện (nút "Ghim Mini-View nổi"). Một ô nổi luôn hiện số "Đã chi hôm nay" kèm ô ghi nhanh, ví dụ gõ "grab food 52k" rồi Enter. Trên Chrome hoặc Edge máy tính, ô này bật thành cửa sổ riêng nằm trên các app khác. Ở trình duyệt khác thì nó là bong bóng kéo thả được.
- **Thử thách**: các thử thách đang chạy kèm đồng hồ đếm ngược và thanh tiến độ. Chưa có thử thách nào thì app mời một thử thách hợp với thói quen của bạn.
- **Việc nên làm tháng này**: 2 việc cụ thể đáng làm nhất, ví dụ "Pha cà phê ở nhà 3 buổi mỗi tuần", kèm số tiền giữ lại được mỗi tháng. Bấm "Biến thành thử thách" để nhận luôn.

### Lịch sử
Thanh dưới, mục **"Lịch sử"**: lịch nhiệt theo tháng (ngày tiêu càng nhiều màu càng đậm), xem từng ngày, tìm theo ghi chú hoặc danh mục, sửa và xóa khoản.

Ở tháng hiện tại, đầu trang có thêm:

- **Tuần của bạn**: nói điều làm tốt trước (ghi đều, có ngày không tiêu, tiêu ít hơn tuần trước), sau đó mới tới một dòng "Để ý nhẹ". Tổng tiền tuần được giấu sau nút "Xem tổng tiền tuần này" để bạn không ngại mở app.
- **Việc nên làm tháng này** đầy đủ: mỗi việc có cách làm cụ thể và số tiền giữ lại được.

### Thử thách & huy hiệu
Mở từ thẻ "Thử thách" ở trang Hôm nay, hoặc mục **Tôi > Thử thách & huy hiệu**.

- **Gợi ý cho bạn**: app đọc 30 ngày gần nhất (nhận ra cà phê, trà sữa, Grab/Be, ShopeeFood, mua sắm online, bia, game, Circle K, ăn vặt, thuốc lá/vape theo ghi chú) rồi đề xuất thử thách hợp thói quen, ví dụ tháng trước cà phê 500k thì thử thách "Cà phê không quá 300k trong 30 ngày". Ngoài ra có hạn mức mỗi ngày (không tính tiền trọ, hóa đơn, học phí), cuối tuần nhẹ ví, trần theo danh mục, ngày không tiêu, ghi chép đều tay.
- Chạm một gợi ý, chọn **mức độ** Nhẹ (-20%) / Vừa (-40%) / Gắt (-60%) và **thời gian** 7 / 14 / 30 ngày, xem trước mức trần và số tiền giữ lại, rồi bấm **Bắt đầu thử thách**.
- Chạy tối đa **5 thử thách cùng lúc**. Mỗi thử thách có đồng hồ đếm ngược đến 23:59 ngày cuối. Muốn dừng thì bấm "Bỏ cuộc" (không tính thua).
- Thử thách tự chốt **Thắng** khi hết hạn mà vẫn trong mức, **Chưa thành** ngay khi vượt mức. Tiến độ tính từ chính các khoản bạn ghi.
- **25 huy hiệu** chia 3 hạng đồng, bạc, vàng: theo từng thói quen, chuỗi 7/14/30 ngày, chế độ Gắt, 3 lần thắng, "Đứng dậy" (thắng sau một lần thua), giữ lại 500k, 1 triệu... Huy hiệu chưa mở hiện mờ kèm ổ khóa, chạm để xem cách mở.
- "Đã giữ lại" được tính dè dặt: chỉ cộng phần chênh giữa thói quen cũ và mức bạn thực sự tiêu (hoặc mức trần, lấy số lớn hơn).

### Sổ nợ và chia tiền
Thanh dưới, mục **"Sổ nợ"**:

- **Ghi nợ**: ai nợ mình, mình nợ ai. Bấm "Đã trả" khi xong.
- **Chia tiền nhóm**: nhập tổng hóa đơn, thêm tên từng người, chọn ai trả. App chia đều, ghi phần của mình vào khoản chi và ghi nợ cho từng người.
- **Nhắc khéo**: soạn sẵn tin nhắn đòi nợ theo 3 giọng: Nhẹ nhàng, Hài hước, Rõ ràng, để sao chép gửi bạn bè.

### Tôi
Thanh dưới, mục **"Tôi"**:

- **Ngân sách tháng này**: đặt hạn mức tháng. Tháng sau chưa đặt thì app dùng lại mức tháng trước.
- **Tiền bốc hơi**: đếm tiền mặt và tiền trong tài khoản thực tế, app so với số lẽ ra phải còn (đã tính cả nợ). Có nút "Đếm từng tờ" để cộng nhanh tiền mặt. Nếu lệch, để nguyên ô tick "Ghi luôn phần chênh lệch" rồi bấm "Lưu lần đối soát", phần thiếu được ghi vào "Chi không nhớ" để sổ khớp lại.
- **Công cụ**: lối tắt tới Thử thách & huy hiệu, Tiền bốc hơi, Sổ nợ và chia tiền, Lịch sử.

### Cài đặt
Bấm **nút bánh răng ở góc phải trên cùng** (có ở trang "Hôm nay", "Lịch sử", "Sổ nợ", "Tôi"). Mọi thứ chỉnh một lần ở đây, các trang khác chỉ giữ phần dùng hằng ngày.

- **Tên hiển thị**: bấm "Đổi tên" để đặt tên hiện trong lời chào (bỏ trống thì dùng lại tên đăng nhập). Tên đăng nhập không đổi.
- **Giao diện**: sáng / tối / theo máy, màu chủ đạo (Kẹo ngọt, Biển xanh, Bạc hà, Hoàng hôn), cỡ chữ (Nhỏ, Vừa, Lớn), bật/tắt thú cưng ở trang chủ, bật/tắt rung khi chạm. Các lựa chọn này lưu trên máy đang dùng.
- **Ngôn ngữ**: Tiếng Việt hoặc English. Đổi xong app tự tải lại; cả chữ trên màn hình, thông báo và lỗi từ máy chủ, tên danh mục mặc định, thử thách, huy hiệu đều đổi theo. Ghi chú, tên người, tên danh mục tự tạo giữ nguyên như bạn đã gõ. Câu nói và tin nhắn ngân hàng vẫn đọc tiếng Việt.
- **Danh mục**: chia hai tab Chi / Thu.
  - Thêm danh mục riêng (tên, biểu tượng, màu), sửa danh mục riêng.
  - Ẩn danh mục không dùng: không còn hiện khi ghi khoản mới, các khoản cũ vẫn giữ nguyên. Bấm lại để hiện.
  - Mũi tên lên / xuống để sắp thứ tự, danh mục dùng nhiều nhất đặt lên đầu.
  - Danh mục mặc định chỉ ẩn và sắp xếp được, không sửa tên. Không có nút xóa, để khoản cũ không bị mất danh mục.
- **Bảo mật**: đổi mật khẩu, tạo mã khôi phục mới, xem và đăng xuất các thiết bị khác.
- **Góp ý cho app**, **Đăng xuất**.

### Khảo sát sau 1 ngày
Muốn góp ý bất cứ lúc nào: **Cài đặt > Góp ý cho app**, chọn "Khảo sát 1 phút" (gửi lại thì sửa câu trả lời cũ) hoặc "Mọi người nghĩ gì" để xem chức năng nào được thích nhất.

Sau khi đăng ký được 1 ngày, lần mở app tiếp theo sẽ hiện bảng "Sau 1 ngày, bạn thấy sao?". Mỗi chức năng chỉ cần tick **Thích**, **Chưa thích** hoặc **Chưa dùng**. Chỉ khi bật "Mình muốn thêm chức năng mới" mới phải viết đề xuất. Bấm "Để sau" thì app hỏi lại vào ngày sau. Tài khoản dùng thử không bị hỏi.

Tên đăng nhập nằm trong biến `SURVEY_ADMINS` (cách nhau bằng dấu phẩy, đặt trong `backend/.env`) được xem cả các đề xuất viết tay. Người khác chỉ xem số đếm.

### Cài lên màn hình chính, dùng khi mất mạng
Trên điện thoại (Chrome, Safari) chọn "Thêm vào màn hình chính", trên máy tính bấm biểu tượng cài đặt ở thanh địa chỉ. Nhấn giữ biểu tượng app để có lối tắt **Ghi khoản mới**, **Chia tiền** và **Tiền bốc hơi**. Khi mất mạng, app vẫn mở được giao diện. Việc ghi khoản mới cần có mạng.

## 5. Mở trên điện thoại thật

1. Điện thoại và máy tính phải dùng chung một wifi.
2. Chạy `chay_thu_chi.bat` rồi nhìn dòng **"Điện thoại: http://192.168.x.x:8090/app/"**.
3. Mở địa chỉ đó bằng trình duyệt trên điện thoại.

Nếu không vào được, cho phép Node.js qua Windows Firewall (mạng Private) rồi thử lại.

Lưu ý: micro và cài app (PWA) thường chỉ chạy ở `localhost` hoặc `https`. Mở qua địa chỉ IP thì các phần khác vẫn dùng bình thường.

## 6. Kiểm thử

Bấm đúp `kiem_thu_thu_chi.bat` (hoặc chạy `chay_thu_chi.bat kiemthu`, kết quả như nhau). File tự bật LocalDB và chờ nó sẵn sàng, rồi chạy ba phần:

1. `npm test` trong `backend/`: kiểm thử phần hiểu câu nói ("trà sữa 30 nghìn", nhiều khoản một câu, hôm qua, giờ), đoán danh mục, đọc SMS ngân hàng, đọc hóa đơn và tâm trạng thú cưng.
2. `database/mo_rong/kiem_thu_mo_rong.sql`: kiểm thử ràng buộc và thủ tục trong CSDL (chia tiền, đối soát, ngân sách, chuỗi ngày, khảo sát...). Script tự dọn dữ liệu thử.
3. `backend/tests/api/kiem_thu_api.mjs`: bật máy chủ tạm ở cổng 8099 rồi gọi API từ đầu đến cuối: đăng ký, khóa sau 5 lần sai, khôi phục, ghi khoản, giọng nói, SMS, up ảnh, sổ nợ, chia tiền, đối soát ví, khảo sát, thử thách (bắt đầu, chặn trùng, chạy nhiều cái, bỏ cuộc, việc nên làm), cài đặt (tên hiển thị, ẩn / sửa / sắp xếp danh mục), trả lời tiếng Anh khi gửi `X-Lang: en`, đổi mật khẩu, chặn xem dữ liệu người khác. Xong thì tắt máy chủ tạm và xóa các tài khoản thử `kt_api_...`.

Cuối cùng file in bảng kết quả từng phần, tất cả đạt thì có dòng **"TẤT CẢ ĐỀU ĐẠT."**

## 7. Tốc độ, chịu tải và tìm kiếm Google

### Giao diện chạy mượt trên máy yếu
- Hình nền chỉ dùng hiệu ứng mà card đồ họa tự lo (không làm mờ, không tính lại bố cục mỗi khung hình). Thú cưng chỉ cử động vài nhịp rồi nghỉ, chạm hoặc rê chuột vào thì cử động tiếp. Thú cưng nằm ngoài màn hình thì dừng hẳn.
- Máy có từ 4 nhân CPU trở xuống, RAM từ 4 GB trở xuống hoặc bật "Tiết kiệm dữ liệu" thì app tự chuyển sang **chế độ nhẹ**: tắt các chuyển động trang trí, chức năng giữ nguyên.
- Biểu tượng chỉ lấy đúng 118 hình app dùng (khoảng 6 KB sau khi nén) thay vì cả bộ 358 KB.
- Đo trên điện thoại giả lập chậm gấp 4 lần: lần vẽ đầu từ 1,5 giây còn 0,7 giây, dữ liệu tải từ 672 KB còn 254 KB, cuộn trang từ 20 lên 70 khung hình/giây.

### Máy chủ
- File giao diện được đọc một lần, nén sẵn (brotli, gzip) và giữ trong RAM. Trình duyệt hỏi lại file chưa đổi chỉ nhận về mã 304, không tải lại.
- Băm mật khẩu chạy trên luồng phụ nên người đang đăng nhập không làm chậm người đang xem trang chủ.
- Trang chủ lấy 5 loại số liệu trong một lần gọi CSDL.
- Các bảng có thêm chỉ mục cho truy vấn hay dùng (mục 10 trong `database/mo_rong/mo_rong_bang.sql`).

Các biến tùy chỉnh (đặt trong `backend/.env`):

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `WEB_CONCURRENCY` | số nhân CPU, tối đa 8 | Số tiến trình khi chạy `npm run start:cluster` (hoặc `chay_thu_chi.bat chiutai`). |
| `HASH_THREADS` | 1 khi chạy cluster, 4 khi chạy thường | Số luồng phụ băm mật khẩu. |
| `DB_POOL_MAX`, `DB_POOL_MIN` | 20, 2 | Số kết nối CSDL tối đa, tối thiểu của mỗi tiến trình. |
| `DB_WAIT_MS` | 60000 | Thời gian chờ SQL Server sẵn sàng lúc khởi động. |
| `SITE_URL` | địa chỉ đang truy cập | Tên miền thật, ví dụ `https://thuchi.vn`, dùng cho thẻ chia sẻ Facebook/Zalo và sitemap. |

### Đo chịu tải
Chạy máy chủ ở chế độ kiểm thử rồi chạy bài đo (100 người ảo, mỗi bài 8 giây):

```bat
cd backend
set PORT=8091&& set NODE_ENV=test&& node src\server.js
```
Mở một cửa sổ cmd khác:
```bat
cd backend
node tests\tai\kiem_thu_tai.mjs http://localhost:8091 100 8
```

Kết quả trên máy 16 nhân, LocalDB (yêu cầu/giây):

| Bài | 1 tiến trình | 4 tiến trình |
| --- | --- | --- |
| Trang `/app/` | ~2.400 | ~4.300 |
| `app.css` đã nén | ~3.300 | ~4.100 |
| API trang chủ | ~270 | ~350 |
| Đăng nhập | ~34 | ~20-35 |

Ước lượng: một người dùng thật mở app khoảng 1 lần mỗi vài phút, nên ~300 lượt API trang chủ mỗi giây tương đương vài chục nghìn người dùng trong một giờ cao điểm. Muốn 100.000 người dùng cùng lúc thì cần: SQL Server bản đầy đủ trên máy chủ riêng (LocalDB chỉ dùng tối đa 4 nhân), CDN cho file giao diện, và đặt máy chủ sau Nginx hoặc bộ cân bằng tải.

### Tìm kiếm Google và chia sẻ
- Trang có tiêu đề, mô tả, thẻ chia sẻ (ảnh `og.png` 1200x630), dữ liệu có cấu trúc `WebApplication`, nội dung giới thiệu đọc được cả khi chưa chạy JavaScript.
- `/robots.txt` và `/sitemap.xml` do máy chủ tạo theo `SITE_URL`.

## 8. Gặp lỗi thì làm gì

| Hiện tượng | Cách xử lý |
| --- | --- |
| "chưa cài Node.js" | Cài Node.js LTS, mở lại cmd. |
| "chưa có SQL Server" | Cài LocalDB và sqlcmd (mục 1). |
| "tạo CSDL thất bại" | Chạy `sqllocaldb info` xem có `MSSQLLocalDB` chưa. Nếu có thì chạy `chay_thu_chi.bat taolai`. |
| "Login timeout expired" hoặc "Server is not found" | LocalDB tự tắt khi lâu không dùng và cần 10-30 giây để bật lại. Hai file `.bat` đã tự chờ. Sau 3 lần không được, file tự dừng hẳn LocalDB (kể cả tiến trình `sqlservr.exe` bị kẹt của tài khoản Windows đang dùng) rồi bật lại. Nếu vẫn lỗi, khởi động lại máy tính. |
| "máy chủ không phản hồi sau 40 giây" | Xem lỗi trong cửa sổ "ThuChi - May chu". Thường do thiếu ODBC Driver 17. |
| Cổng 8090 đã bị app khác dùng | Tắt app đó, hoặc sửa dòng `set "PORT=8090"` trong `chay_thu_chi.bat`. |
| Nhập sai mật khẩu 5 lần | Tài khoản tạm khóa **5 phút**. Trong lúc khóa, đăng nhập bằng mã khôi phục cũng phải chờ (để không ai dò mã được). Chờ hết 5 phút rồi thử lại. |
| Quên mật khẩu | Màn hình đăng nhập, chọn "Quên mật khẩu?", nhập mã khôi phục được cấp lúc đăng ký. Mã cũ hết hiệu lực ngay, app cấp mã mới, nhớ lưu lại. |
| Giao diện không cập nhật sau khi sửa code | Tải lại trang bằng Ctrl + Shift + R. Mở bằng `localhost` thì app luôn lấy bản mới nhất; mở bằng tên miền thì app dùng bản đã lưu trước rồi cập nhật ngầm, lần mở sau mới thấy. |
