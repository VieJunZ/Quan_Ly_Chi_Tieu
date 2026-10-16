/**
 * Tái hiện các lỗi API đã ghi nhận ở Sprint 1, dùng để lấy bằng chứng và kiểm thử lại (retest)
 * sau khi các bạn sửa xong.
 *
 * Cách chạy (Backend đang chạy):
 *   node tester/scripts/tai_hien_loi.js [http://localhost:8080]
 *
 * Mỗi lỗi in ra: request gửi đi, response nhận về, và kết luận
 * "VẪN CÒN LỖI" hoặc "ĐÃ SỬA". Kết quả được ghi vào tester/bang_chung/api/.
 * Các lỗi giao diện BUG-04, BUG-10, BUG-11 kiểm tra lại bằng tay theo báo cáo.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const BASE_URL = (process.argv[2] || process.env.API_URL || "http://localhost:8080").replace(/\/$/, "");
const DEFAULT_JWT_SECRET = "supersecretjwtkey_sprint1";
const suffix = crypto.randomBytes(3).toString("hex");
const lines = [];
const summary = [];

const log = (text = "") => {
  console.log(text);
  lines.push(text);
};

async function call(method, url, { body, token, rawBody } = {}) {
  const headers = {};
  if (body !== undefined || rawBody !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const payload = rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined;
  const res = await fetch(BASE_URL + url, { method, headers, body: payload });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, json, text, payload };
}

function shorten(value, max = 300) {
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return s.length > max ? `${s.slice(0, max)}… (${s.length} ký tự)` : s;
}

function show(method, url, r) {
  log(`  Request : ${method} ${url}${r.payload ? `  body=${shorten(r.payload, 160)}` : ""}`);
  log(`  Response: HTTP ${r.status}  ${shorten(r.json ?? r.text)}`);
}

function verdict(id, title, stillBug) {
  log(`  => ${stillBug ? "VẪN CÒN LỖI" : "ĐÃ SỬA"}`);
  log("");
  summary.push(`${id}  ${stillBug ? "VẪN CÒN LỖI" : "ĐÃ SỬA    "}  ${title}`);
}

function signJwt(payload, secret) {
  const enc = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const head = enc({ alg: "HS256", typ: "JWT" });
  const body = enc(payload);
  const sig = crypto.createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}

async function main() {
  const health = await call("GET", "/api/health").catch(() => null);
  if (!health) {
    console.error(`Không kết nối được Backend tại ${BASE_URL}.`);
    process.exit(2);
  }
  log(`Tái hiện lỗi Sprint 1 – ${BASE_URL} – ${new Date().toLocaleString("vi-VN")}`);
  log("");

  // Chuẩn bị 2 tài khoản thử
  const victim = { username: `nan_nhan_${suffix}`, password: "MatKhauNN_123" };
  const tester = { username: `kiem_thu_${suffix}`, password: "MatKhauKT_123" };
  const regV = await call("POST", "/api/auth/register", { body: victim });
  const regT = await call("POST", "/api/auth/register", { body: tester });
  const victimId = regV.json?.user?.id;
  const token = regT.json?.token;
  if (!victimId || !token) {
    console.error("Không tạo được tài khoản thử (có thể đang bị giới hạn 30 lần/phút, đợi 1 phút rồi chạy lại).");
    process.exit(2);
  }
  await call("POST", "/api/transactions", {
    token: regV.json.token,
    body: { amount: 2500000, category_id: 12, transaction_date: new Date().toLocaleDateString("en-CA"), note: "Học bổng (dữ liệu riêng tư)" }
  });
  const today = new Date().toLocaleDateString("en-CA");
  const base = { amount: 10000, category_id: 1, transaction_date: today, note: "kiểm thử" };

  // BUG-01
  log("BUG-01  Giả mạo token bằng khóa JWT mặc định trong mã nguồn để xem dữ liệu người khác");
  const forged = signJwt({ id: victimId, username: victim.username, iat: Math.floor(Date.now() / 1000) }, DEFAULT_JWT_SECRET);
  log(`  Token tự ký với khóa "${DEFAULT_JWT_SECRET}" cho user id=${victimId} (không cần mật khẩu)`);
  const r1 = await call("GET", "/api/dashboard", { token: forged });
  show("GET", "/api/dashboard", r1);
  verdict("BUG-01", "Giả mạo token bằng khóa JWT mặc định", r1.status === 200);

  // BUG-02
  log("BUG-02  Backend chưa lưu dữ liệu vào SQL Server");
  show("GET", "/api/health", health);
  verdict("BUG-02", "Backend chưa kết nối SQL Server", !(health.json?.db_connected === true && health.json?.storage_mode !== "local"));

  // BUG-03
  log("BUG-03  Chưa có API tạo danh mục cá nhân");
  const r3 = await call("POST", "/api/categories", { token, body: { name: "Trà sữa", type: "expense" } });
  show("POST", "/api/categories", r3);
  verdict("BUG-03", "Chưa có API tạo danh mục cá nhân", r3.status === 404);

  // BUG-05
  log("BUG-05  Chấp nhận ngày giao dịch không có thật");
  let accepted = 0;
  for (const d of ["2026-13-45", "2026-02-30"]) {
    const r = await call("POST", "/api/transactions", { token, body: { ...base, transaction_date: d } });
    show("POST", "/api/transactions", r);
    if (r.status === 201) accepted += 1;
  }
  verdict("BUG-05", "Chấp nhận ngày không có thật", accepted > 0);

  // BUG-06
  log("BUG-06  Không giới hạn độ dài ghi chú ở server (CSDL chỉ cho 500 ký tự)");
  const r5 = await call("POST", "/api/transactions", { token, body: { ...base, note: "a".repeat(5000) } });
  show("POST", "/api/transactions", r5);
  verdict("BUG-06", "Không giới hạn độ dài ghi chú", r5.status === 201);

  // BUG-07
  log("BUG-07  Không giới hạn số tiền tối đa (CSDL DECIMAL(15,2) tối đa 9.999.999.999.999,99)");
  const r6 = await call("POST", "/api/transactions", { token, body: { ...base, amount: 1e16 } });
  show("POST", "/api/transactions", r6);
  verdict("BUG-07", "Không giới hạn số tiền tối đa", r6.status === 201);

  // BUG-08
  log("BUG-08  Nhật ký chỉ trả 30 giao dịch gần nhất, không xem được toàn bộ");
  const before = await call("GET", "/api/dashboard", { token });
  const need = Math.max(0, 31 - (before.json?.recent_transactions || []).length);
  for (let i = 0; i < need; i += 1) await call("POST", "/api/transactions", { token, body: { ...base, amount: 1000 + i } });
  const all = await call("GET", "/api/dashboard", { token });
  const total = 31 > (before.json?.recent_transactions || []).length ? 31 : (before.json?.recent_transactions || []).length;
  const listApi = await call("GET", "/api/transactions", { token });
  log(`  Tài khoản có ít nhất ${total} giao dịch, GET /api/dashboard trả ${(all.json?.recent_transactions || []).length} giao dịch`);
  show("GET", "/api/transactions", listApi);
  verdict("BUG-08", "Nhật ký chỉ có 30 giao dịch gần nhất", (all.json?.recent_transactions || []).length < total && listApi.status !== 200);

  // BUG-09
  log("BUG-09  JSON hỏng / payload quá lớn trả mã lỗi INTERNAL_SERVER_ERROR và lộ thông báo nội bộ");
  const r8a = await call("POST", "/api/transactions", { token, rawBody: "{amount: 1000," });
  show("POST", "/api/transactions", r8a);
  const r8b = await call("POST", "/api/transactions", { token, body: { ...base, note: "a".repeat(120 * 1024) } });
  log(`  Request : POST /api/transactions  body=(ghi chú 120KB)`);
  log(`  Response: HTTP ${r8b.status}  ${shorten(r8b.json ?? r8b.text)}`);
  verdict("BUG-09", "Mã lỗi INTERNAL_SERVER_ERROR cho lỗi phía client", r8a.json?.error_code === "INTERNAL_SERVER_ERROR" || r8b.json?.error_code === "INTERNAL_SERVER_ERROR");

  log("TÓM TẮT");
  summary.forEach((s) => log(`  ${s}`));

  const outDir = path.join(__dirname, "..", "bang_chung", "api");
  fs.mkdirSync(outDir, { recursive: true });
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  const file = path.join(outDir, `tai_hien_loi_${stamp}.txt`);
  fs.writeFileSync(file, lines.join("\n") + "\n", "utf8");
  console.log(`\nĐã ghi bằng chứng vào ${file}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
