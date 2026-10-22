/**
 * @file kiem_thu_api.mjs
 * @description Bộ kiểm thử tích hợp API End-to-End toàn diện cho hệ thống Quản lý thu chi.
 * Chạy trên máy chủ thực tế (cổng mặc định 8099) và kiểm thử đầy đủ các phân hệ:
 *   1. Xác thực & Phân quyền (Auth): Đăng ký, Đăng nhập, Khóa tài khoản 5 lần sai, Khôi phục bằng mã, Đổi mật khẩu, Phiên đăng nhập.
 *   2. Danh mục & Ngân sách (Category & Budget): Mặc định, Tự tạo, Ẩn/Hiện, Sắp xếp thứ tự, Thiết lập trần chi tiêu.
 *   3. Giao dịch & Nhập liệu thông minh (Transactions): CRUD, Nhận diện giọng nói, Bóc tách SMS ngân hàng, OCR ảnh hóa đơn/chuyển khoản.
 *   4. Bảng điều khiển (Dashboard): Tổng quan tháng, Chi tiết ngày, Gợi ý ngữ cảnh, Lời nhắc buổi tối, Mini-View, Nhiệt lịch, Chuỗi ngày.
 *   5. Sổ nợ & Chia tiền nhóm (Debts & Bill Splitting): Ghi nợ 2 chiều, Chia hóa đơn nhiều người, Thanh toán nợ, Xóa đợt chia.
 *   6. Đối soát ví ("Tiền bốc hơi"): Kiểm kê số dư thực tế, Tự động ghi chênh lệch vào sổ để khớp dữ liệu.
 *   7. Đánh dấu ngày không tiêu (No-spend Day): Giữ chuỗi thói quen tài chính tích cực.
 *   8. Khảo sát người dùng (Survey): Khảo sát sau 1 ngày trải nghiệm, Đề xuất tính năng, Thống kê tổng hợp.
 *   9. Thử thách tài chính & Hệ thống 25 Huy hiệu (Gamification): Bắt đầu, Kiểm soát hạn mức, Bỏ cuộc, Việc nên làm tháng này.
 *  10. Bảo mật & Cô lập dữ liệu (Multi-tenant Security): Chống truy cập chéo dữ liệu người dùng khác, Chặn token giả mạo.
 *  11. Đa ngôn ngữ (i18n): Hỗ trợ header X-Lang (vi/en), dịch tự động thông báo hệ thống và danh mục chuẩn.
 *
 * Cách chạy:
 *   node tests/api/kiem_thu_api.mjs http://localhost:8099
 * Lưu ý: Các tài khoản kiểm thử mang tiền tố "kt_api_", được script kiem_thu_thu_chi.bat tự động dọn dẹp sau khi hoàn tất.
 */

import fs from "node:fs";
import { fileURLToPath } from "node:url";

// Cấu hình URL gốc của máy chủ API và thư mục chứa ảnh mẫu phục vụ kiểm thử OCR
const BASE = `${(process.argv[2] || process.env.API_URL || "http://localhost:8099").replace(/\/$/, "")}/api`;
const FIX = fileURLToPath(new URL("../fixtures", import.meta.url));

let pass = 0, fail = 0, stt = 0;

/** Hàm ghi nhận kết quả từng ca kiểm thử */
const ok = (cond, name, extra = "") => {
  stt++;
  if (cond) pass++;
  else fail++;
  console.log(`${stt} ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : ` -> ${extra}`}`);
};

/**
 * Gửi HTTP request đến API backend và tự động parse JSON
 * @param {string} path - Đường dẫn API tương đối (bắt đầu bằng /)
 * @param {object} options - Cấu hình request (method, body, token, form, lang)
 */
async function call(path, { method = "GET", body, token, form, lang } = {}) {
  const headers = {};
  if (lang) headers["X-Lang"] = lang;
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

const len = (d) => (Array.isArray(d) ? d.length : (d?.items || d?.transactions || []).length);
const pad = (n) => String(n).padStart(2, "0");
const d0 = new Date();
const today = `${d0.getFullYear()}-${pad(d0.getMonth() + 1)}-${pad(d0.getDate())}`;
const now = "12:30";
const month = today.slice(0, 7);

// Sinh tài khoản thử nghiệm ngẫu nhiên theo timestamp để tránh trùng lặp
const U = "kt_api_" + Date.now().toString(36);
const P = "Kh0ngDoan@2026";
const P2 = "M0iHon@2026x";

/* ===========================================================================
   PHẦN 1: XÁC THỰC, ĐĂNG KÝ, ĐĂNG NHẬP, KHÓA TÀI KHOẢN VÀ KHÔI PHỤC
   =========================================================================== */

// 1.1 Kiểm tra ràng buộc mật khẩu xác nhận khi đăng ký
let r = await call("/auth/register", { method: "POST", body: { username: U, password: P, confirm_password: "khac" } });
ok(r.status === 400, "Đăng ký: mật khẩu nhập lại sai bị từ chối", r.status);

// 1.2 Đăng ký tài khoản hợp lệ, nhận JWT token và mã khôi phục dự phòng
r = await call("/auth/register", { method: "POST", body: { username: U, password: P, confirm_password: P } });
ok(r.status === 201 && r.data.token && r.data.recovery_code, "Đăng ký thành công, nhận mã khôi phục", JSON.stringify(r.data).slice(0, 200));
let token = r.data.token;
const code = r.data.recovery_code;

// 1.3 Kiểm tra chống đăng ký trùng tên người dùng
r = await call("/auth/register", { method: "POST", body: { username: U, password: P, confirm_password: P } });
ok(r.status === 409, "Đăng ký trùng tên bị chặn", r.status);

// 1.4 Kiểm tra cơ chế tự động khóa tài khoản sau 5 lần nhập sai liên tiếp (chống Brute-force)
const L = U + "_k";
await call("/auth/register", { method: "POST", body: { username: L, password: P, confirm_password: P } });
for (let i = 1; i <= 5; i++) {
  r = await call("/auth/login", { method: "POST", body: { username: L, password: "sai" + i } });
}
ok(r.data.error_code === "ACCOUNT_LOCKED" || r.status === 423, "Khóa tài khoản tạm thời sau 5 lần nhập sai", r.status + " " + r.data.error_code);

// 1.5 Trong thời gian bị khóa, dù nhập đúng mật khẩu vẫn phải bị từ chối
r = await call("/auth/login", { method: "POST", body: { username: L, password: P } });
ok(r.status === 423, "Đang trong thời gian khóa thì mật khẩu đúng cũng bị chặn", r.status);

// 1.6 Kiểm tra cảnh báo số lượt thử còn lại khi đăng nhập sai từ lần thứ 2
r = await call("/auth/login", { method: "POST", body: { username: U, password: "sai" } });
ok(r.status === 401 && r.data.attempts_left === undefined, "Sai lần 1: cảnh báo thông thường, chưa hiện số lượt", JSON.stringify(r.data));

r = await call("/auth/login", { method: "POST", body: { username: U, password: "sai" } });
ok(r.status === 401 && r.data.attempts_left === 3, "Sai lần 2: cảnh báo rõ còn 3 lượt thử", JSON.stringify(r.data));

// 1.7 Khôi phục tài khoản bằng mã khôi phục dự phòng và đổi sang mật khẩu mới
r = await call("/auth/recover", { method: "POST", body: { username: U, recovery_code: code, new_password: P2, confirm_password: P2 } });
ok(r.status === 200, "Khôi phục tài khoản thành công bằng mã dự phòng", r.status + " " + JSON.stringify(r.data).slice(0, 150));
// 1.8 Kiểm tra bảo mật: mã khôi phục chỉ được dùng 1 lần duy nhất
r = await call("/auth/recover", { method: "POST", body: { username: U, recovery_code: code, new_password: P, confirm_password: P } });
ok(r.status >= 400, "Mã khôi phục đã dùng không thể tái sử dụng", r.status);

// 1.9 Đăng nhập thành công với mật khẩu mới sau khi khôi phục
r = await call("/auth/login", { method: "POST", body: { username: U, password: P2 } });
ok(r.status === 200 && r.data.token, "Đăng nhập thành công bằng mật khẩu mới (tài khoản đã mở khóa)", r.status + " " + r.data.error_code);
token = r.data.token || token;

// 1.10 Xem thông tin tài khoản hiện tại và danh sách các phiên thiết bị đang đăng nhập
r = await call("/auth/me", { token });
ok(r.status === 200 && (r.data.username || r.data.user?.username) === U, "Xem thông tin tài khoản chính chủ", JSON.stringify(r.data).slice(0, 100));

r = await call("/auth/sessions", { token });
ok(r.status === 200, "Lấy danh sách các thiết bị/phiên đang đăng nhập", JSON.stringify(r.data).slice(0, 120));

/* ===========================================================================
   PHẦN 2: DANH MỤC THU CHI VÀ THIẾT LẬP NGÂN SÁCH THÁNG
   =========================================================================== */

// 2.1 Kiểm tra danh mục mặc định ban đầu do hệ thống cung cấp
const cats = (await call("/categories", { token })).data;
ok(Array.isArray(cats) && cats.length > 3, "Có sẵn bộ danh mục thu/chi mặc định");
const food = cats.find((c) => c.name === "Ăn uống");
const salary = cats.find((c) => c.type === "income");

// 2.2 Thiết lập ngân sách chi tiêu tháng này và đọc lại dữ liệu đối chiếu
r = await call("/budget", { method: "PUT", token, body: { amount: 3000000, month } });
ok(r.status === 200, "Thiết lập hạn mức ngân sách tháng thành công", r.status + JSON.stringify(r.data).slice(0, 100));

r = await call(`/budget?today=${today}`, { token });
ok(r.status === 200 && JSON.stringify(r.data).includes("3000000"), "Đọc thông tin ngân sách và hạn mức chi tiêu hàng ngày", JSON.stringify(r.data).slice(0, 200));

/* ===========================================================================
   PHẦN 3: CÀI ĐẶT NGƯỜI DÙNG & TÙY BIẾN DANH MỤC CÁ NHÂN
   =========================================================================== */

// 3.1 Cập nhật tên hiển thị người dùng (giữ nguyên username gốc)
r = await call("/auth/profile", { method: "PUT", token, body: { display_name: "  Trí Nguyễn  " } });
ok(r.status === 200 && r.data.user?.display_name === "Trí Nguyễn" && r.data.user?.username === U, "Đổi tên hiển thị (tên đăng nhập giữ nguyên)", JSON.stringify(r.data).slice(0, 150));

r = await call("/auth/profile", { method: "PUT", token, body: { display_name: "1234 !!" } });
ok(r.status === 400, "Tên hiển thị không hợp lệ (không chứa chữ cái) bị chặn", r.status);

r = await call("/auth/profile", { method: "PUT", token, body: { display_name: "" } });
ok(r.status === 200 && r.data.user?.display_name === null, "Bỏ tên hiển thị để dùng lại username", JSON.stringify(r.data).slice(0, 120));

await call("/auth/profile", { method: "PUT", token, body: { display_name: "Trí" } });
r = await call("/auth/me", { token });
ok((r.data.display_name || r.data.user?.display_name) === "Trí", "Thông tin tài khoản phản ánh tên hiển thị mới", JSON.stringify(r.data).slice(0, 120));

// 3.2 Ẩn danh mục không dùng: không hiện ở dropdown nhập liệu nhưng vẫn hiện ở màn Cài đặt
const hideCat = cats.find((c) => c.type === "expense" && c.is_default && c.id !== food.id);
r = await call(`/categories/${hideCat.id}/hidden`, { method: "PUT", token, body: { hidden: true } });
ok(r.status === 200, "Ẩn danh mục mặc định", r.status + JSON.stringify(r.data).slice(0, 100));

r = await call("/categories?type=expense", { token });
const visibleAfterHide = r.data;
r = await call("/categories?type=expense&include_hidden=1", { token });
ok(!visibleAfterHide.some((c) => c.id === hideCat.id) && r.data.find((c) => c.id === hideCat.id)?.is_hidden === true,
  "Danh mục ẩn không hiện khi ghi khoản mới, màn Cài đặt vẫn thấy để bật lại");

r = await call(`/categories/${hideCat.id}/hidden`, { method: "PUT", token, body: { hidden: "có" } });
ok(r.status === 400, "Ẩn/hiện danh mục: giá trị boolean sai bị chặn", r.status);

// 3.3 Chống sửa tên danh mục mặc định của hệ thống
r = await call(`/categories/${food.id}`, { method: "PUT", token, body: { name: "Đồ ăn" } });
ok(r.status === 400 && r.data.error_code === "DEFAULT_CATEGORY_LOCKED", "Không cho phép sửa tên danh mục mặc định", r.status + " " + r.data.error_code);

// 3.4 Tạo và tùy chỉnh danh mục riêng
r = await call("/categories", { method: "POST", token, body: { name: "Trà sữa", type: "expense", icon: "coffee", color: "rose" } });
const myCat = r.data;
r = await call(`/categories/${myCat.id}`, { method: "PUT", token, body: { name: "Trà sữa & cà phê", icon: "cup-soda", color: "amber" } });
ok(r.status === 200 && r.data.name === "Trà sữa & cà phê" && r.data.icon === "cup-soda", "Sửa tên, biểu tượng danh mục riêng thành công", JSON.stringify(r.data).slice(0, 120));

// 3.5 Tùy chỉnh sắp xếp thứ tự ưu tiên hiển thị của danh mục
r = await call("/categories/order", { method: "PUT", token, body: { type: "expense", ids: [myCat.id, food.id] } });
ok(r.status === 200, "Lưu thứ tự danh mục tùy biến", r.status + JSON.stringify(r.data).slice(0, 100));

r = await call("/categories?type=expense", { token });
ok(r.data[0]?.id === myCat.id && r.data[1]?.id === food.id, "Danh mục trả về chuẩn theo thứ tự đã sắp xếp", r.data.slice(0, 3).map((c) => c.id).join(","));

r = await call("/categories/order", { method: "PUT", token, body: { type: "expense", ids: [salary.id] } });
ok(r.status === 400 && r.data.error_code === "INVALID_CATEGORY_ORDER", "Chặn sắp xếp lẫn danh mục thu vào danh sách chi", r.status + " " + r.data.error_code);

await call(`/categories/${hideCat.id}/hidden`, { method: "PUT", token, body: { hidden: false } });

/* ===========================================================================
   PHẦN 4: GIAO DỊCH THU CHI VÀ NHẬP LIỆU THÔNG MINH (VOICE, SMS, OCR)
   =========================================================================== */

// 4.1 Thêm khoản thu nhập và khoản chi tiêu thủ công
r = await call("/transactions", { method: "POST", token, body: { category_id: salary.id, amount: 2000000, note: "Lương làm thêm", transaction_date: today, transaction_time: "08:00", source: "manual" } });
ok(r.status === 201, "Thêm khoản thu nhập", r.status + JSON.stringify(r.data).slice(0, 120));

r = await call("/transactions", { method: "POST", token, body: { category_id: food.id, amount: 45000, note: "Cơm trưa", transaction_date: today, transaction_time: now, source: "manual" } });
ok(r.status === 201, "Thêm khoản chi tiêu");
const txId = r.data.id || r.data.transaction?.id;

// 4.2 Sửa và validate giao dịch
r = await call(`/transactions/${txId}`, { method: "PUT", token, body: { category_id: food.id, amount: 50000, note: "Cơm trưa + trà đá", transaction_date: today, transaction_time: now } });
ok(r.status === 200, "Cập nhật thông tin giao dịch", r.status + JSON.stringify(r.data).slice(0, 150));

r = await call("/transactions", { method: "POST", token, body: { category_id: food.id, amount: -5, transaction_date: today } });
ok(r.status === 400, "Chặn giao dịch có số tiền âm", r.status);

// 4.3 Nhập bằng giọng nói (Voice Speech-to-Text Parsing)
r = await call("/scan/voice", { method: "POST", token, body: { text: "sáng ăn phở 40k, chiều trà sữa 35 nghìn, đổ xăng 50k", today, now } });
ok(r.status === 200 && r.data.items?.length === 3, "Voice: Nhận diện chính xác 3 khoản chi từ 1 câu nói", JSON.stringify(r.data.items?.map((i) => i.amount)));

const voiceItems = (r.data.items || []).map((i) => ({ ...i, category_id: i.category_id || food.id, source: "voice" }));
r = await call("/transactions/batch", { method: "POST", token, body: { items: voiceItems } });
ok(r.status === 201 || r.status === 200, "Batch: Lưu đồng thời nhiều khoản từ giọng nói", r.status + JSON.stringify(r.data).slice(0, 150));

// 4.4 Bóc tách tin nhắn biến động số dư ngân hàng (SMS Parsing)
const dmy = today.split("-").reverse().join("/");
r = await call("/scan/text", { method: "POST", token, body: { text: `TK 1234xxx5678 -120,000VND luc ${dmy} 10:15. SD: 1,880,000VND. ND: thanh toan grab food`, today, now } });
ok(r.status < 300 && JSON.stringify(r.data).includes("120000"), "SMS: Tách đúng 120k tiền trừ, bỏ qua số dư khả dụng", JSON.stringify(r.data).slice(0, 220));

// 4.5 Nhận diện hình ảnh hóa đơn và ảnh chụp chuyển khoản (OCR Image Parsing)
for (const f of ["hoa_don.png", "chuyen_khoan.png"]) {
  const form = new FormData();
  form.append("image", new Blob([fs.readFileSync(`${FIX}/${f}`)], { type: "image/png" }), f);
  form.append("today", today);
  form.append("now", now);
  r = await call("/scan/image", { method: "POST", token, form });
  ok(r.status < 300 && /"amount":[1-9]/.test(JSON.stringify(r.data)), `OCR: Đọc thành công số tiền từ ảnh ${f}`, r.status + JSON.stringify(r.data).slice(0, 200));
}

// 4.6 Tìm kiếm và lọc danh sách giao dịch
r = await call(`/transactions?month=${month}`, { token });
ok(r.status === 200 && len(r.data) >= 5, "Lấy danh sách giao dịch theo tháng", len(r.data));

r = await call(`/transactions?month=${month}&q=${encodeURIComponent("phở")}`, { token });
ok(r.status === 200 && len(r.data) === 1, "Tìm kiếm giao dịch theo từ khóa 'phở'", len(r.data));

/* ===========================================================================
   PHẦN 5: BẢNG ĐIỀU KHIỂN & CHUỖI THÓI QUEN (DASHBOARD & STREAK)
   =========================================================================== */

for (const p of [
  `/dashboard?month=${month}&today=${today}`,
  `/dashboard/day?date=${today}`,
  `/dashboard/suggestions?today=${today}&now=${now}`,
  `/dashboard/nudge?today=${today}&now=21:30`,
  `/dashboard/mini?today=${today}&now=${now}`,
  `/dashboard/calendar?month=${month}`,
  `/dashboard/streak?today=${today}`
]) {
  r = await call(p, { token });
  ok(r.status === 200, "Dashboard: GET " + p.split("?")[0], r.status + JSON.stringify(r.data).slice(0, 120));
}

// Kiểm tra số tiền chi hôm nay ở widget Mini-View
r = await call(`/dashboard/mini?today=${today}&now=${now}`, { token });
ok(r.data.spent_today === 50000 + 40000 + 35000 + 50000, "Mini-View: Tổng chi hôm nay khớp đúng 175k", r.data.spent_today);

/* ===========================================================================
   PHẦN 6: SỔ NỢ & CHIA TIỀN NHÓM (DEBTS & BILL SPLITTING)
   =========================================================================== */

// 6.1 Ghi nợ cá nhân
r = await call("/debts", { method: "POST", token, body: { person_name: "Lan", direction: "owed_to_me", amount: 70000, note: "Mượn mua sách" } });
ok(r.status === 201, "Ghi nợ cá nhân (ai nợ mình / mình nợ ai)", r.status + JSON.stringify(r.data).slice(0, 120));

// 6.2 Chia hóa đơn nhóm (Group Bill Split)
r = await call("/debts/splits", { method: "POST", token, body: { title: "Lẩu cuối tuần", total_amount: 250000, people: ["Nam", "Lan", "Hùng"], category_id: food.id, transaction_date: today, transaction_time: "19:00", i_paid: true } });
ok(r.status === 201, "Chia tiền nhóm: Tự động chia đều và tạo nợ cho từng người", r.status + JSON.stringify(r.data).slice(0, 200));
const splitId = r.data.id || r.data.split_id || r.data.split?.id;

// 6.3 Kiểm tra tổng nợ gộp theo từng người
r = await call("/debts", { token });
const lan = (r.data.people || []).find((p) => p.person_name === "Lan");
ok(lan && JSON.stringify(lan).includes("132500"), "Tổng nợ của Lan khớp 70k (cũ) + 62.5k (chia lẩu) = 132.5k", JSON.stringify(lan));

// 6.4 Đánh dấu thanh toán hết nợ cho một người
r = await call("/debts/settle-person", { method: "POST", token, body: { person_name: "Lan" } });
ok(r.status === 200, "Đánh dấu người nợ đã trả hết", r.status);

r = await call("/debts/people", { token });
ok(r.status === 200, "Lấy danh sách gợi ý tên những người hay giao dịch nợ");

// 6.5 Hủy/xóa đợt chia tiền
r = await call(`/debts/splits/${splitId}`, { method: "DELETE", token });
ok(r.status === 200 || r.status === 204, "Xóa đợt chia tiền và thu hồi các khoản nợ tương ứng", r.status + " id=" + splitId);

/* ===========================================================================
   PHẦN 7: ĐỐI SOÁT VÍ TIỀN THỰC TẾ ("TIỀN BỐC HƠI")
   =========================================================================== */

r = await call("/wallet", { token });
ok(r.status === 200 && typeof r.data.expected_balance === "number", "Ví: Lấy số dư lý thuyết theo sổ sách", JSON.stringify(r.data).slice(0, 160));
const expected = r.data.expected_balance;

// Kiểm kê phát hiện thiếu 30.000đ so với thực tế và ghi chênh lệch
r = await call("/wallet/check", { method: "POST", token, body: { actual_balance: expected - 30000, record: true, transaction_date: today, transaction_time: "20:00" } });
ok(r.status === 201 || r.status === 200, "Đối soát ví: Phát hiện tiền bốc hơi 30k và ghi tự động", r.status + JSON.stringify(r.data).slice(0, 160));

r = await call("/wallet", { token });
ok(Math.round(r.data.expected_balance) === Math.round(expected - 30000), "Sổ sách tự động khớp chuẩn sau khi ghi chênh lệch", r.data.expected_balance);

/* ===========================================================================
   PHẦN 8: ĐÁNH DẤU NGÀY KHÔNG TIÊU TIỀN (NO-SPEND DAYS)
   =========================================================================== */

const y = new Date(Date.now() - 86400000 * 3);
const ys = `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`;
r = await call("/dashboard/no-spend", { method: "PUT", token, body: { date: ys } });
ok(r.status === 200 || r.status === 204, "Đánh dấu ngày không tiêu tiền để duy trì chuỗi thói quen", r.status + JSON.stringify(r.data).slice(0, 100));

/* ===========================================================================
   PHẦN 9: KHẢO SÁT TRẢI NGHIỆM NGƯỜI DÙNG (SURVEY SYSTEM)
   =========================================================================== */

r = await call("/survey", { method: "POST", token, body: { answers: {}, wants_new_feature: false } });
ok(r.status === 400, "Chặn gửi khảo sát rỗng", r.status);

r = await call("/survey", { method: "POST", token, body: { answers: { voice: "like" }, wants_new_feature: true, suggestion: "" } });
ok(r.status === 400, "Bật 'Muốn thêm chức năng' nhưng bỏ trống nội dung bị chặn", r.status);

r = await call("/survey", { method: "POST", token, body: { answers: { voice: "like", wallet_check: "like", sms_paste: "unused" } } });
ok(r.status === 201 || r.status === 200, "Gửi khảo sát ý kiến người dùng thành công", r.status);

r = await call("/survey", { method: "POST", token, body: { answers: { voice: "dislike" }, wants_new_feature: true, suggestion: "Nhắc đóng tiền trọ" } });
ok(r.status === 200 && r.data.updated === true, "Gửi lại khảo sát sẽ cập nhật câu trả lời cũ", r.status);

r = await call("/survey/status", { token });
ok(r.data.answered === true && r.data.mine && r.data.mine.answers.voice === "dislike" && r.data.mine.suggestion === "Nhắc đóng tiền trọ" && r.data.due === false,
  "Trạng thái khảo sát trả về đúng dữ liệu đã gửi", JSON.stringify(r.data.mine));

r = await call("/survey/summary", { token });
ok(r.status === 200 && r.data.responses >= 1 && !("suggestions" in r.data), "Xem tổng kết khảo sát cộng đồng (bảo mật: không lộ đề xuất cá nhân)", r.status);

/* ===========================================================================
   PHẦN 10: THỬ THÁCH TÀI CHÍNH & HỆ THỐNG HUY HIỆU (GAMIFICATION)
   =========================================================================== */

r = await call(`/challenges?today=${today}`, { token });
ok(r.status === 200 && r.data.max_active === 5 && r.data.badges.length === r.data.stats.badges_total && r.data.suggestions.some((s) => s.key === "log_streak"),
  "Màn thử thách trả về đủ danh sách gợi ý và bộ 25 huy hiệu", r.status + JSON.stringify(r.data).slice(0, 150));

r = await call("/challenges", { method: "POST", token, body: { key: "log_streak", days: 7, today } });
ok(r.status === 201 && r.data.challenge.end_date > today, "Bắt đầu thử thách ghi chép 7 ngày liên tiếp", r.status + JSON.stringify(r.data).slice(0, 150));
const chId = r.data.challenge && r.data.challenge.id;

r = await call("/challenges", { method: "POST", token, body: { key: "log_streak", days: 7, today } });
ok(r.status === 409 && r.data.error_code === "CHALLENGE_RUNNING", "Chặn nhận trùng thử thách đang diễn ra", r.status);

r = await call("/challenges", { method: "POST", token, body: { key: "cap_keyword:khong_co", days: 7, today } });
ok(r.status === 400, "Chặn nhận thử thách không có trong danh mục gợi ý", r.status);

r = await call("/challenges", { method: "POST", token, body: { key: "no_spend_days", level: "light", days: 9, today } });
ok(r.status === 400, "Thời lượng thử thách chỉ chấp nhận 7 / 14 / 30 ngày", r.status);

r = await call("/challenges", { method: "POST", token, body: { key: "no_spend_days", level: "light", days: 14, today } });
ok(r.status === 201, "Cho phép chạy đồng thời nhiều thử thách", r.status);

r = await call(`/challenges?today=${today}`, { token });
ok(r.data.active.length === 2 && r.data.active.every((c) => c.progress && c.progress.status === "active"), "Các thử thách đang chạy đều tính toán tiến độ realtime", JSON.stringify(r.data.active).slice(0, 150));

r = await call(`/challenges/${chId}/abandon`, { method: "POST", token });
ok(r.status === 200, "Cho phép người dùng chủ động bỏ cuộc thử thách", r.status);

r = await call(`/challenges/${chId}/abandon`, { method: "POST", token });
ok(r.status === 404, "Bỏ cuộc lần 2 trả mã 404", r.status);

r = await call(`/challenges/insights?today=${today}`, { token });
ok(r.status === 200 && Array.isArray(r.data.actions) && r.data.week && Array.isArray(r.data.week.positives), "Tổng kết tuần và gợi ý việc nên làm tháng này", r.status);

/* ===========================================================================
   PHẦN 11: BẢO MẬT, CÔ LẬP DỮ LIỆU & QUẢN LÝ PHIÊN (MULTI-TENANT & SESSIONS)
   =========================================================================== */

// 11.1 Xóa giao dịch và kiểm tra trạng thái
r = await call(`/transactions/${txId}`, { method: "DELETE", token });
ok(r.status === 200 || r.status === 204, "Xóa giao dịch thành công");

r = await call(`/transactions/${txId}`, { token });
ok(r.status === 404, "Truy vấn giao dịch đã xóa trả về 404 Not Found", r.status);

// 11.2 Đổi mật khẩu và tự động thu hồi phiên đăng nhập trên các thiết bị khác
const second = (await call("/auth/login", { method: "POST", body: { username: U, password: P2 } })).data.token;
r = await call("/auth/change-password", { method: "POST", token, body: { current_password: P2, new_password: P, confirm_password: P } });
ok(r.status === 200, "Đổi mật khẩu tài khoản thành công", r.status + JSON.stringify(r.data).slice(0, 120));

r = await call("/auth/me", { token: second });
ok(r.status === 401, "Thiết bị cũ bị thu hồi token ngay sau khi đổi mật khẩu", r.status);

// 11.3 Cấp lại mã khôi phục mới
r = await call("/auth/recovery-code", { method: "POST", token, body: { password: P } });
ok(r.status === 200 && r.data.recovery_code, "Tạo mã khôi phục mới thành công khi nhập đúng mật khẩu", r.status);

// 11.4 Kiểm tra cô lập dữ liệu tuyệt đối giữa các người dùng (Multi-tenant Data Isolation)
const other = (await call("/auth/demo", { method: "POST", body: { today, now } })).data.token;

r = await call(`/transactions?month=${month}&q=${encodeURIComponent("phở")}`, { token: other });
ok(r.status === 200 && len(r.data) <= 1 && !JSON.stringify(r.data).includes("Cơm trưa + trà đá"), "Tài khoản khác không nhìn thấy dữ liệu của nhau");

r = await call(`/transactions/${txId - 1}`, { token: other });
ok(r.status === 404, "Không thể đọc trộm giao dịch của người khác theo ID", r.status);

r = await call(`/challenges?today=${today}`, { token });
const runningId = r.data.active[0] && r.data.active[0].id;
r = await call(`/challenges/${runningId}/abandon`, { method: "POST", token: other });
ok(r.status === 404, "Không thể can thiệp/bỏ cuộc thử thách của người khác", r.status);

r = await call(`/categories/${myCat.id}`, { method: "PUT", token: other, body: { name: "Của tôi" } });
ok(r.status === 400 && r.data.error_code === "INVALID_CATEGORY", "Không thể sửa danh mục riêng của người khác", r.status + " " + r.data.error_code);

r = await call("/survey/status", { token: other });
ok(r.data.due === false, "Tài khoản dùng thử (Demo) không bị làm phiền bởi khảo sát");

/* ===========================================================================
   PHẦN 12: ĐA NGÔN NGỮ (I18N HEADER X-LANG: EN/VI) VÀ ĐĂNG XUẤT
   =========================================================================== */

// 12.1 Danh mục chuẩn được dịch sang tiếng Anh khi gửi X-Lang: en, danh mục tự tạo giữ nguyên
r = await call("/categories?type=expense", { token, lang: "en" });
ok(r.data.some((c) => c.id === food.id && c.name === "Food & Drinks") && r.data.some((c) => c.id === myCat.id && c.name === "Trà sữa & cà phê"),
  "Tiếng Anh: Dịch danh mục mặc định (Food & Drinks), giữ nguyên danh mục tự tạo", JSON.stringify(r.data).slice(0, 160));

// 12.2 Thông báo lỗi hệ thống được bản địa hóa
r = await call(`/categories/${food.id}`, { method: "PUT", token, lang: "en", body: { name: "Đồ ăn" } });
ok(r.status === 400 && r.data.message === "Default categories can't be edited, but you can hide them.", "Tiếng Anh: Thông báo lỗi nghiệp vụ được dịch chuẩn xác", r.data.message);

r = await call("/khong-co", { lang: "en" });
ok(r.status === 404 && r.data.message.startsWith("Endpoint not found"), "Tiếng Anh: Lỗi 404 Not Found được dịch sang tiếng Anh", r.data.message);

// 12.3 Dữ liệu do người dùng tự gõ không bị ảnh hưởng bởi cài đặt ngôn ngữ
r = await call(`/transactions?month=${month}&q=${encodeURIComponent("phở")}`, { token, lang: "en" });
ok(JSON.stringify(r.data).includes("phở"), "Tiếng Anh: Nội dung ghi chú tiếng Việt của người dùng giữ nguyên", JSON.stringify(r.data).slice(0, 160));

// 12.4 Chống giả mạo JWT token
r = await call("/transactions", { token: "abc.def.ghi" });
ok(r.status === 401, "Token giả mạo hoặc hết hạn bị từ chối 401 Unauthorized", r.status);

// 12.5 Đăng xuất và vô hiệu hóa phiên
r = await call("/auth/logout", { method: "POST", token });
r = await call("/auth/me", { token });
ok(r.status === 401, "Sau khi đăng xuất, token cũ hoàn toàn hết hiệu lực", r.status);

console.log(`\n======================================================`);
console.log(` API VERIFICATION: TỔNG ${stt} CA KIỂM THỬ`);
console.log(`  - THÀNH CÔNG (PASS): ${pass}`);
console.log(`  - THẤT BẠI  (FAIL): ${fail}`);
console.log(`======================================================\n`);

process.exitCode = fail ? 1 : 0;

