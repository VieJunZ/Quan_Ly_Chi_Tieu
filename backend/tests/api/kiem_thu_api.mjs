/**
 * @file kiem_thu_api.mjs
 * @description Kiểm thử API từ đầu đến cuối trên máy chủ đang chạy: đăng ký, khóa tài khoản, khôi phục,
 * giao dịch, giọng nói, SMS, up ảnh, trang chủ, sổ nợ, chia tiền, đối soát ví, khảo sát, thử thách, cài đặt (tên hiển thị, danh mục), đổi mật khẩu, phân quyền.
 *
 * Cách chạy (máy chủ bật NODE_ENV=test để không bị giới hạn số lần gọi):
 *   node tests/api/kiem_thu_api.mjs http://localhost:8099
 * Tài khoản thử có tên bắt đầu bằng "kt_api_", file kiem_thu_thu_chi.bat tự xóa sau khi chạy.
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = `${(process.argv[2] || process.env.API_URL || "http://localhost:8099").replace(/\/$/, "")}/api`;
const FIX = fileURLToPath(new URL("../fixtures", import.meta.url));
let pass = 0, fail = 0, stt = 0;
const ok = (cond, name, extra = "") => {
  stt++;
  if (cond) pass++;
  else fail++;
  console.log(`${stt} ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : ` -> ${extra}`}`);
};
async function call(path, { method = "GET", body, token, form, lang } = {}) {
  const headers = {};
  if (lang) headers["X-Lang"] = lang;
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}
const len = (d) => (Array.isArray(d) ? d.length : (d?.items || d?.transactions || []).length);
const pad = (n) => String(n).padStart(2, "0");
const d0 = new Date();
const today = `${d0.getFullYear()}-${pad(d0.getMonth() + 1)}-${pad(d0.getDate())}`, now = "12:30", month = today.slice(0, 7);
const U = "kt_api_" + Date.now().toString(36), P = "Kh0ngDoan@2026", P2 = "M0iHon@2026x";

// --- Đăng ký / đăng nhập ---
let r = await call("/auth/register", { method: "POST", body: { username: U, password: P, confirm_password: "khac" } });
ok(r.status === 400, "Đăng ký: mật khẩu nhập lại sai bị từ chối", r.status);
r = await call("/auth/register", { method: "POST", body: { username: U, password: P, confirm_password: P } });
ok(r.status === 201 && r.data.token && r.data.recovery_code, "Đăng ký thành công, nhận mã khôi phục", JSON.stringify(r.data).slice(0, 200));
let token = r.data.token; const code = r.data.recovery_code;
r = await call("/auth/register", { method: "POST", body: { username: U, password: P, confirm_password: P } });
ok(r.status === 409, "Đăng ký trùng tên bị chặn", r.status);
const L = U + "_k";
await call("/auth/register", { method: "POST", body: { username: L, password: P, confirm_password: P } });
for (let i = 1; i <= 5; i++) r = await call("/auth/login", { method: "POST", body: { username: L, password: "sai" + i } });
ok(r.data.error_code === "ACCOUNT_LOCKED" || r.status === 423, "khóa sau 5 lần sai", r.status + " " + r.data.error_code);
r = await call("/auth/login", { method: "POST", body: { username: L, password: P } });
ok(r.status === 423, "đang khóa thì mật khẩu đúng cũng chặn", r.status);
r = await call("/auth/login", { method: "POST", body: { username: U, password: "sai" } });
ok(r.status === 401 && r.data.attempts_left === undefined, "sai 1 lần: chưa báo số lần còn lại", JSON.stringify(r.data));
r = await call("/auth/login", { method: "POST", body: { username: U, password: "sai" } });
ok(r.status === 401 && r.data.attempts_left === 3, "sai 2 lần: báo còn 3 lần thử", JSON.stringify(r.data));
r = await call("/auth/recover", { method: "POST", body: { username: U, recovery_code: code, new_password: P2, confirm_password: P2 } });
ok(r.status === 200, "khôi phục bằng mã", r.status + " " + JSON.stringify(r.data).slice(0, 150));
r = await call("/auth/recover", { method: "POST", body: { username: U, recovery_code: code, new_password: P, confirm_password: P } });
ok(r.status >= 400, "mã khôi phục chỉ dùng 1 lần", r.status);
r = await call("/auth/login", { method: "POST", body: { username: U, password: P2 } });
ok(r.status === 200 && r.data.token, "đăng nhập bằng mật khẩu mới (mở khóa)", r.status + " " + r.data.error_code);
token = r.data.token || token;
r = await call("/auth/me", { token });
ok(r.status === 200 && (r.data.username || r.data.user?.username) === U, "Xem thông tin tài khoản", JSON.stringify(r.data).slice(0, 100));
r = await call("/auth/sessions", { token });
ok(r.status === 200, "Danh sách thiết bị đăng nhập", JSON.stringify(r.data).slice(0, 120));

// --- Danh mục, ngân sách ---
const cats = (await call("/categories", { token })).data;
ok(Array.isArray(cats) && cats.length > 3, "Có danh mục mặc định");
const food = cats.find((c) => c.name === "Ăn uống");
const salary = cats.find((c) => c.type === "income");
r = await call("/budget", { method: "PUT", token, body: { amount: 3000000, month } });
ok(r.status === 200, "đặt ngân sách", r.status + JSON.stringify(r.data).slice(0, 100));
r = await call(`/budget?today=${today}`, { token });
ok(r.status === 200 && JSON.stringify(r.data).includes("3000000"), "đọc ngân sách", JSON.stringify(r.data).slice(0, 200));

// --- Cài đặt: tên hiển thị, ẩn / sửa / sắp xếp danh mục ---
r = await call("/auth/profile", { method: "PUT", token, body: { display_name: "  Trí Nguyễn  " } });
ok(r.status === 200 && r.data.user?.display_name === "Trí Nguyễn" && r.data.user?.username === U, "đổi tên hiển thị (tên đăng nhập giữ nguyên)", JSON.stringify(r.data).slice(0, 150));
r = await call("/auth/profile", { method: "PUT", token, body: { display_name: "1234 !!" } });
ok(r.status === 400, "tên hiển thị không có chữ cái bị chặn", r.status);
r = await call("/auth/profile", { method: "PUT", token, body: { display_name: "" } });
ok(r.status === 200 && r.data.user?.display_name === null, "bỏ tên hiển thị", JSON.stringify(r.data).slice(0, 120));
await call("/auth/profile", { method: "PUT", token, body: { display_name: "Trí" } });
r = await call("/auth/me", { token });
ok((r.data.display_name || r.data.user?.display_name) === "Trí", "thông tin tài khoản có tên hiển thị", JSON.stringify(r.data).slice(0, 120));

const hideCat = cats.find((c) => c.type === "expense" && c.is_default && c.id !== food.id);
r = await call(`/categories/${hideCat.id}/hidden`, { method: "PUT", token, body: { hidden: true } });
ok(r.status === 200, "ẩn danh mục mặc định", r.status + JSON.stringify(r.data).slice(0, 100));
r = await call("/categories?type=expense", { token });
const visibleAfterHide = r.data;
r = await call("/categories?type=expense&include_hidden=1", { token });
ok(!visibleAfterHide.some((c) => c.id === hideCat.id) && r.data.find((c) => c.id === hideCat.id)?.is_hidden === true,
  "danh mục ẩn không hiện khi ghi khoản, màn Cài đặt vẫn thấy");
r = await call(`/categories/${hideCat.id}/hidden`, { method: "PUT", token, body: { hidden: "có" } });
ok(r.status === 400, "ẩn/hiện: giá trị sai bị chặn", r.status);
r = await call(`/categories/${food.id}`, { method: "PUT", token, body: { name: "Đồ ăn" } });
ok(r.status === 400 && r.data.error_code === "DEFAULT_CATEGORY_LOCKED", "không sửa được danh mục mặc định", r.status + " " + r.data.error_code);
r = await call("/categories", { method: "POST", token, body: { name: "Trà sữa", type: "expense", icon: "coffee", color: "rose" } });
const myCat = r.data;
r = await call(`/categories/${myCat.id}`, { method: "PUT", token, body: { name: "Trà sữa & cà phê", icon: "cup-soda", color: "amber" } });
ok(r.status === 200 && r.data.name === "Trà sữa & cà phê" && r.data.icon === "cup-soda", "sửa tên, icon danh mục riêng", JSON.stringify(r.data).slice(0, 120));
r = await call("/categories/order", { method: "PUT", token, body: { type: "expense", ids: [myCat.id, food.id] } });
ok(r.status === 200, "lưu thứ tự danh mục", r.status + JSON.stringify(r.data).slice(0, 100));
r = await call("/categories?type=expense", { token });
ok(r.data[0]?.id === myCat.id && r.data[1]?.id === food.id, "danh mục trả về đúng thứ tự đã sắp", r.data.slice(0, 3).map((c) => c.id).join(","));
r = await call("/categories/order", { method: "PUT", token, body: { type: "expense", ids: [salary.id] } });
ok(r.status === 400 && r.data.error_code === "INVALID_CATEGORY_ORDER", "sắp xếp lẫn danh mục thu vào chi bị chặn", r.status + " " + r.data.error_code);
await call(`/categories/${hideCat.id}/hidden`, { method: "PUT", token, body: { hidden: false } });

// --- Giao dịch ---
r = await call("/transactions", { method: "POST", token, body: { category_id: salary.id, amount: 2000000, note: "Lương làm thêm", transaction_date: today, transaction_time: "08:00", source: "manual" } });
ok(r.status === 201, "thêm khoản thu", r.status + JSON.stringify(r.data).slice(0, 120));
r = await call("/transactions", { method: "POST", token, body: { category_id: food.id, amount: 45000, note: "Cơm trưa", transaction_date: today, transaction_time: now, source: "manual" } });
ok(r.status === 201, "thêm khoản chi");
const txId = r.data.id || r.data.transaction?.id;
r = await call(`/transactions/${txId}`, { method: "PUT", token, body: { category_id: food.id, amount: 50000, note: "Cơm trưa + trà đá", transaction_date: today, transaction_time: now } });
ok(r.status === 200, "sửa giao dịch", r.status + JSON.stringify(r.data).slice(0, 150));
r = await call("/transactions", { method: "POST", token, body: { category_id: food.id, amount: -5, transaction_date: today } });
ok(r.status === 400, "số tiền âm bị chặn", r.status);
r = await call("/scan/voice", { method: "POST", token, body: { text: "sáng ăn phở 40k, chiều trà sữa 35 nghìn, đổ xăng 50k", today, now } });
ok(r.status === 200 && r.data.items?.length === 3, "voice: 3 khoản", JSON.stringify(r.data.items?.map((i) => i.amount)));
const voiceItems = (r.data.items || []).map((i) => ({ ...i, category_id: i.category_id || food.id, source: "voice" }));
r = await call("/transactions/batch", { method: "POST", token, body: { items: voiceItems } });
ok(r.status === 201 || r.status === 200, "batch lưu khoản từ giọng nói", r.status + JSON.stringify(r.data).slice(0, 150));
const dmy = today.split("-").reverse().join("/");
r = await call("/scan/text", { method: "POST", token, body: { text: `TK 1234xxx5678 -120,000VND luc ${dmy} 10:15. SD: 1,880,000VND. ND: thanh toan grab food`, today, now } });
ok(r.status < 300 && JSON.stringify(r.data).includes("120000"), "SMS đọc đúng 120k", JSON.stringify(r.data).slice(0, 220));
for (const f of ["hoa_don.png", "chuyen_khoan.png"]) {
  const form = new FormData();
  form.append("image", new Blob([fs.readFileSync(`${FIX}/${f}`)], { type: "image/png" }), f);
  form.append("today", today); form.append("now", now);
  r = await call("/scan/image", { method: "POST", token, form });
  ok(r.status < 300 && /"amount":[1-9]/.test(JSON.stringify(r.data)), `ảnh ${f}`, r.status + JSON.stringify(r.data).slice(0, 200));
}
r = await call(`/transactions?month=${month}`, { token });
ok(r.status === 200 && len(r.data) >= 5, "danh sách giao dịch tháng", len(r.data));
r = await call(`/transactions?month=${month}&q=${encodeURIComponent("phở")}`, { token });
ok(r.status === 200 && len(r.data) === 1, "tìm kiếm 'phở'", len(r.data));

// --- Dashboard ---
for (const p of [`/dashboard?month=${month}&today=${today}`, `/dashboard/day?date=${today}`, `/dashboard/suggestions?today=${today}&now=${now}`,
  `/dashboard/nudge?today=${today}&now=21:30`, `/dashboard/mini?today=${today}&now=${now}`, `/dashboard/calendar?month=${month}`, `/dashboard/streak?today=${today}`]) {
  r = await call(p, { token });
  ok(r.status === 200, "GET " + p.split("?")[0], r.status + JSON.stringify(r.data).slice(0, 120));
}
r = await call(`/dashboard/mini?today=${today}&now=${now}`, { token });
ok(r.data.spent_today === 50000 + 40000 + 35000 + 50000, "mini: đã chi hôm nay = 175k", r.data.spent_today);

// --- Sổ nợ, chia tiền ---
r = await call("/debts", { method: "POST", token, body: { person_name: "Lan", direction: "owed_to_me", amount: 70000, note: "Mượn mua sách" } });
ok(r.status === 201, "ghi nợ", r.status + JSON.stringify(r.data).slice(0, 120));
r = await call("/debts/splits", { method: "POST", token, body: { title: "Lẩu cuối tuần", total_amount: 250000, people: ["Nam", "Lan", "Hùng"], category_id: food.id, transaction_date: today, transaction_time: "19:00", i_paid: true } });
ok(r.status === 201, "chia tiền nhóm", r.status + JSON.stringify(r.data).slice(0, 200));
const splitId = r.data.id || r.data.split_id || r.data.split?.id;
r = await call("/debts", { token });
const lan = (r.data.people || []).find((p) => p.person_name === "Lan");
ok(lan && JSON.stringify(lan).includes("132500"), "Lan nợ 70k + 62.5k", JSON.stringify(lan));
r = await call("/debts/settle-person", { method: "POST", token, body: { person_name: "Lan" } });
ok(r.status === 200, "Lan trả hết", r.status);
r = await call("/debts/people", { token });
ok(r.status === 200, "Gợi ý tên người hay ghi nợ");
r = await call(`/debts/splits/${splitId}`, { method: "DELETE", token });
ok(r.status === 200 || r.status === 204, "xóa lần chia", r.status + " id=" + splitId);

// --- Ví ---
r = await call("/wallet", { token });
ok(r.status === 200 && typeof r.data.expected_balance === "number", "ví: lẽ ra đang có", JSON.stringify(r.data).slice(0, 160));
const expected = r.data.expected_balance;
r = await call("/wallet/check", { method: "POST", token, body: { actual_balance: expected - 30000, record: true, transaction_date: today, transaction_time: "20:00" } });
ok(r.status === 201 || r.status === 200, "đối soát: bốc hơi 30k", r.status + JSON.stringify(r.data).slice(0, 160));
r = await call("/wallet", { token });
ok(Math.round(r.data.expected_balance) === Math.round(expected - 30000), "sổ khớp lại sau khi ghi chênh lệch", r.data.expected_balance);

// --- Không tiêu gì ---
const y = new Date(Date.now() - 86400000 * 3); const ys = `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`;
r = await call("/dashboard/no-spend", { method: "PUT", token, body: { date: ys } });
ok(r.status === 200 || r.status === 204, "đánh dấu ngày không tiêu", r.status + JSON.stringify(r.data).slice(0, 100));

// --- Khảo sát ---
r = await call("/survey", { method: "POST", token, body: { answers: {}, wants_new_feature: false } });
ok(r.status === 400, "khảo sát rỗng bị chặn", r.status);
r = await call("/survey", { method: "POST", token, body: { answers: { voice: "like" }, wants_new_feature: true, suggestion: "" } });
ok(r.status === 400, "muốn thêm chức năng thì phải viết", r.status);
r = await call("/survey", { method: "POST", token, body: { answers: { voice: "like", wallet_check: "like", sms_paste: "unused" } } });
ok(r.status === 201 || r.status === 200, "gửi khảo sát", r.status);
r = await call("/survey", { method: "POST", token, body: { answers: { voice: "dislike" }, wants_new_feature: true, suggestion: "Nhắc đóng tiền trọ" } });
ok(r.status === 200 && r.data.updated === true, "gửi lại khảo sát thì cập nhật", r.status);
r = await call("/survey/status", { token });
ok(r.data.answered === true && r.data.mine && r.data.mine.answers.voice === "dislike" && r.data.mine.suggestion === "Nhắc đóng tiền trọ" && r.data.due === false,
  "trạng thái khảo sát trả lại câu trả lời cũ", JSON.stringify(r.data.mine));
r = await call("/survey/summary", { token });
ok(r.status === 200 && r.data.responses >= 1 && !("suggestions" in r.data), "xem kết quả khảo sát, không lộ đề xuất của người khác", r.status);

// --- Thử thách & huy hiệu ---
r = await call(`/challenges?today=${today}`, { token });
ok(r.status === 200 && r.data.max_active === 5 && r.data.badges.length === r.data.stats.badges_total && r.data.suggestions.some((s) => s.key === "log_streak"),
  "trang thử thách có gợi ý và bộ huy hiệu", r.status + JSON.stringify(r.data).slice(0, 150));
r = await call("/challenges", { method: "POST", token, body: { key: "log_streak", days: 7, today } });
ok(r.status === 201 && r.data.challenge.end_date > today, "bắt đầu thử thách ghi chép 7 ngày", r.status + JSON.stringify(r.data).slice(0, 150));
const chId = r.data.challenge && r.data.challenge.id;
r = await call("/challenges", { method: "POST", token, body: { key: "log_streak", days: 7, today } });
ok(r.status === 409 && r.data.error_code === "CHALLENGE_RUNNING", "không nhận trùng thử thách đang chạy", r.status);
r = await call("/challenges", { method: "POST", token, body: { key: "cap_keyword:khong_co", days: 7, today } });
ok(r.status === 400, "thử thách không có trong gợi ý bị chặn", r.status);
r = await call("/challenges", { method: "POST", token, body: { key: "no_spend_days", level: "light", days: 9, today } });
ok(r.status === 400, "thời gian thử thách chỉ 7 / 14 / 30 ngày", r.status);
r = await call("/challenges", { method: "POST", token, body: { key: "no_spend_days", level: "light", days: 14, today } });
ok(r.status === 201, "chạy nhiều thử thách cùng lúc", r.status);
r = await call(`/challenges?today=${today}`, { token });
ok(r.data.active.length === 2 && r.data.active.every((c) => c.progress && c.progress.status === "active"), "thử thách đang chạy có tiến độ", JSON.stringify(r.data.active).slice(0, 150));
r = await call(`/challenges/${chId}/abandon`, { method: "POST", token });
ok(r.status === 200, "bỏ cuộc thử thách", r.status);
r = await call(`/challenges/${chId}/abandon`, { method: "POST", token });
ok(r.status === 404, "bỏ cuộc lần 2 trả 404", r.status);
r = await call(`/challenges/insights?today=${today}`, { token });
ok(r.status === 200 && Array.isArray(r.data.actions) && r.data.week && Array.isArray(r.data.week.positives), "việc nên làm và tổng kết tuần", r.status);

// --- Xóa / đổi mật khẩu / phiên ---
r = await call(`/transactions/${txId}`, { method: "DELETE", token });
ok(r.status === 200 || r.status === 204, "xóa giao dịch");
r = await call(`/transactions/${txId}`, { token });
ok(r.status === 404, "giao dịch đã xóa trả 404", r.status);
const second = (await call("/auth/login", { method: "POST", body: { username: U, password: P2 } })).data.token;
r = await call("/auth/change-password", { method: "POST", token, body: { current_password: P2, new_password: P, confirm_password: P } });
ok(r.status === 200, "đổi mật khẩu", r.status + JSON.stringify(r.data).slice(0, 120));
r = await call("/auth/me", { token: second });
ok(r.status === 401, "thiết bị khác bị đăng xuất sau đổi mật khẩu", r.status);
r = await call("/auth/recovery-code", { method: "POST", token, body: { password: P } });
ok(r.status === 200 && r.data.recovery_code, "mã khôi phục mới", r.status);

// --- Bảo mật ---
const other = (await call("/auth/demo", { method: "POST", body: { today, now } })).data.token;
r = await call(`/transactions?month=${month}&q=${encodeURIComponent("phở")}`, { token: other });
ok(r.status === 200 && len(r.data) <= 1 && !JSON.stringify(r.data).includes("Cơm trưa + trà đá"), "tài khoản khác không thấy dữ liệu");
r = await call(`/transactions/${txId - 1}`, { token: other });
ok(r.status === 404, "không đọc được giao dịch của người khác theo id", r.status);
r = await call(`/challenges?today=${today}`, { token });
const runningId = r.data.active[0] && r.data.active[0].id;
r = await call(`/challenges/${runningId}/abandon`, { method: "POST", token: other });
ok(r.status === 404, "không bỏ cuộc được thử thách của người khác", r.status);
r = await call(`/categories/${myCat.id}`, { method: "PUT", token: other, body: { name: "Của tôi" } });
ok(r.status === 400 && r.data.error_code === "INVALID_CATEGORY", "không sửa được danh mục của người khác", r.status + " " + r.data.error_code);
r = await call("/survey/status", { token: other });
ok(r.data.due === false, "demo không bị hỏi khảo sát");
// --- Tiếng Anh (X-Lang: en): câu hệ thống được dịch, chữ người dùng tự gõ giữ nguyên ---
r = await call("/categories?type=expense", { token, lang: "en" });
ok(r.data.some((c) => c.id === food.id && c.name === "Food & Drinks") && r.data.some((c) => c.id === myCat.id && c.name === "Trà sữa & cà phê"),
  "tiếng Anh: dịch danh mục mặc định, giữ tên danh mục tự tạo", JSON.stringify(r.data).slice(0, 160));
r = await call(`/categories/${food.id}`, { method: "PUT", token, lang: "en", body: { name: "Đồ ăn" } });
ok(r.status === 400 && r.data.message === "Default categories can't be edited, but you can hide them.", "tiếng Anh: thông báo lỗi được dịch", r.data.message);
r = await call("/khong-co", { lang: "en" });
ok(r.status === 404 && r.data.message.startsWith("Endpoint not found"), "tiếng Anh: lỗi 404 được dịch", r.data.message);
r = await call(`/transactions?month=${month}&q=${encodeURIComponent("phở")}`, { token, lang: "en" });
ok(JSON.stringify(r.data).includes("phở"), "tiếng Anh: ghi chú người dùng giữ nguyên", JSON.stringify(r.data).slice(0, 160));
r = await call("/transactions", { token: "abc.def.ghi" });
ok(r.status === 401, "token giả bị chặn", r.status);
r = await call("/auth/logout", { method: "POST", token });
r = await call("/auth/me", { token });
ok(r.status === 401, "đăng xuất xong token hết hiệu lực", r.status);

console.log(`\nAPI - Tổng: ${stt} ca | PASS: ${pass} | FAIL: ${fail}`);
process.exitCode = fail ? 1 : 0;
