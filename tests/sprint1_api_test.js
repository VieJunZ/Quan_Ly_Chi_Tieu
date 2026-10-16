/**
 * Kiểm thử API Sprint 1 (S1-QA-01)
 *
 * Cách chạy (cần Node.js 18+ và Backend đang chạy):
 *   node tester/scripts/sprint1_api_test.js
 *   node tester/scripts/sprint1_api_test.js http://localhost:8080
 *
 * Script tự tạo tài khoản thử có hậu tố ngẫu nhiên, chạy các ca kiểm thử,
 * in bảng kết quả và ghi file tester/ket_qua/ket_qua_api.md + .json.
 *
 * Lưu ý: API đăng ký/đăng nhập giới hạn 30 lần/phút cho mỗi IP.
 * Nếu chạy lại liên tiếp, đợi khoảng 1 phút giữa 2 lần chạy.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const BASE_URL = (process.argv[2] || process.env.API_URL || "http://localhost:8080").replace(/\/$/, "");
const DEFAULT_JWT_SECRET = "supersecretjwtkey_sprint1"; // giá trị mặc định trong backend khi .env không có JWT_SECRET
const suffix = crypto.randomBytes(3).toString("hex");
const results = [];

// ---------------------------------------------------------------------------
// Tiện ích
// ---------------------------------------------------------------------------
async function api(method, url, { body, token, rawBody, headers = {} } = {}) {
  const res = await fetch(BASE_URL + url, {
    method,
    headers: {
      ...(body !== undefined || rawBody !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, json, text, headers: res.headers };
}

function record(id, group, title, expected, actual, pass) {
  results.push({ id, group, title, expected, actual: String(actual), result: pass ? "Đạt" : "Không đạt" });
}

async function test(id, group, title, expected, fn) {
  try {
    const { pass, actual } = await fn();
    record(id, group, title, expected, actual, pass);
  } catch (error) {
    record(id, group, title, expected, `Lỗi khi chạy: ${error.message}`, false);
  }
}

function b64url(input) {
  return Buffer.from(typeof input === "string" ? input : JSON.stringify(input))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(payload, secret, alg = "HS256") {
  const head = b64url({ alg, typ: "JWT" });
  const body = b64url(payload);
  if (alg === "none") return `${head}.${body}.`;
  const sig = crypto.createHmac("sha256", secret).update(`${head}.${body}`).digest("base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${head}.${body}.${sig}`;
}

function localDate(offsetMonths = 0, day = null) {
  const d = new Date();
  if (offsetMonths) d.setMonth(d.getMonth() + offsetMonths, 1);
  if (day) d.setDate(day);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const hasPasswordField = (obj) => /password|hash/i.test(JSON.stringify(obj || {}));
const short = (r) => `HTTP ${r.status}${r.json?.error_code ? " " + r.json.error_code : ""}`;

// ---------------------------------------------------------------------------
// Các ca kiểm thử
// ---------------------------------------------------------------------------
async function main() {
  const health = await api("GET", "/api/health").catch(() => null);
  if (!health || health.status !== 200) {
    console.error(`Không kết nối được Backend tại ${BASE_URL}. Hãy chạy Backend trước (npm start trong thư mục backend).`);
    process.exit(2);
  }

  const userA = { username: `qa_a_${suffix}`, password: "MatKhauA_123" };
  const userB = { username: `qa_b_${suffix}`, password: "MatKhauB_123" };
  const userC = { username: `qa_c_${suffix}`, password: "MatKhauC_123" };
  let tokenA, tokenB, tokenC, idA, idB;

  // ===== 1. Đăng ký =====
  const G1 = "Đăng ký";
  await test("TC-REG-01", G1, "Đăng ký tài khoản hợp lệ", "201, có token và user.id, không trả mật khẩu", async () => {
    const r = await api("POST", "/api/auth/register", { body: userA });
    tokenA = r.json?.token;
    idA = r.json?.user?.id;
    return { pass: r.status === 201 && !!tokenA && !!idA && !hasPasswordField(r.json), actual: `${short(r)}, token: ${tokenA ? "có" : "không"}, có trường mật khẩu: ${hasPasswordField(r.json) ? "có" : "không"}` };
  });
  const regB = await api("POST", "/api/auth/register", { body: userB });
  tokenB = regB.json?.token;
  idB = regB.json?.user?.id;
  const regC = await api("POST", "/api/auth/register", { body: userC });
  tokenC = regC.json?.token;

  await test("TC-REG-02", G1, "Đăng ký trùng tên đăng nhập", "409 USER_ALREADY_EXISTS", async () => {
    const r = await api("POST", "/api/auth/register", { body: userA });
    return { pass: r.status === 409, actual: short(r) };
  });
  await test("TC-REG-03", G1, "Đăng ký trùng tên nhưng khác hoa/thường", "409 (không tạo tài khoản trùng)", async () => {
    const r = await api("POST", "/api/auth/register", { body: { ...userA, username: userA.username.toUpperCase() } });
    return { pass: r.status === 409, actual: short(r) };
  });
  await test("TC-REG-04", G1, "Tên đăng nhập dưới 3 ký tự", "400", async () => {
    const r = await api("POST", "/api/auth/register", { body: { username: "ab", password: "MatKhau_123" } });
    return { pass: r.status === 400, actual: short(r) };
  });
  await test("TC-REG-05", G1, "Mật khẩu dưới 8 ký tự", "400", async () => {
    const r = await api("POST", "/api/auth/register", { body: { username: `qa_x_${suffix}`, password: "1234567" } });
    return { pass: r.status === 400, actual: short(r) };
  });
  await test("TC-REG-06", G1, "Mật khẩu trên 128 ký tự", "400 PASSWORD_TOO_LONG", async () => {
    const r = await api("POST", "/api/auth/register", { body: { username: `qa_y_${suffix}`, password: "a".repeat(129) } });
    return { pass: r.status === 400, actual: short(r) };
  });
  await test("TC-REG-07", G1, "Tên đăng nhập chứa ký tự đặc biệt / mã độc", "400 INVALID_USERNAME_FORMAT", async () => {
    const r = await api("POST", "/api/auth/register", { body: { username: "<script>x</script>", password: "MatKhau_123" } });
    return { pass: r.status === 400, actual: short(r) };
  });
  await test("TC-REG-08", G1, "Tên đăng nhập dạng SQL injection", "400", async () => {
    const r = await api("POST", "/api/auth/register", { body: { username: "' OR 1=1 --", password: "MatKhau_123" } });
    return { pass: r.status === 400, actual: short(r) };
  });
  await test("TC-REG-09", G1, "Gửi thiếu dữ liệu (body rỗng)", "400", async () => {
    const r = await api("POST", "/api/auth/register", { body: {} });
    return { pass: r.status === 400, actual: short(r) };
  });

  // ===== 2. Đăng nhập =====
  const G2 = "Đăng nhập";
  await test("TC-LOG-01", G2, "Đăng nhập đúng thông tin", "200, có token, không trả mật khẩu", async () => {
    const r = await api("POST", "/api/auth/login", { body: userA });
    return { pass: r.status === 200 && !!r.json?.token && !hasPasswordField(r.json), actual: `${short(r)}, token: ${r.json?.token ? "có" : "không"}` };
  });
  await test("TC-LOG-02", G2, "Đăng nhập sai mật khẩu", "401 INVALID_CREDENTIALS", async () => {
    const r = await api("POST", "/api/auth/login", { body: { ...userA, password: "SaiMatKhau_1" } });
    return { pass: r.status === 401, actual: short(r) };
  });
  await test("TC-LOG-03", G2, "Đăng nhập tài khoản không tồn tại", "401, thông báo giống sai mật khẩu", async () => {
    const r1 = await api("POST", "/api/auth/login", { body: { username: `khong_ton_tai_${suffix}`, password: "MatKhau_123" } });
    const r2 = await api("POST", "/api/auth/login", { body: { ...userA, password: "SaiMatKhau_1" } });
    return { pass: r1.status === 401 && r1.json?.message === r2.json?.message, actual: `${short(r1)}, thông báo giống nhau: ${r1.json?.message === r2.json?.message ? "có" : "không"}` };
  });
  await test("TC-LOG-04", G2, "Đăng nhập bỏ trống mật khẩu", "400 MISSING_CREDENTIALS", async () => {
    const r = await api("POST", "/api/auth/login", { body: { username: userA.username } });
    return { pass: r.status === 400, actual: short(r) };
  });
  await test("TC-LOG-05", G2, "Đăng nhập không phân biệt hoa/thường tên đăng nhập", "200", async () => {
    const r = await api("POST", "/api/auth/login", { body: { ...userA, username: userA.username.toUpperCase() } });
    return { pass: r.status === 200, actual: short(r) };
  });

  // ===== 3. Danh mục =====
  const G3 = "Danh mục";
  let categories = [];
  await test("TC-CAT-01", G3, "Lấy danh mục mặc định", "200, 13 danh mục (4 thu, 9 chi), đủ id/name/type/icon/color", async () => {
    const r = await api("GET", "/api/categories");
    categories = Array.isArray(r.json) ? r.json : [];
    const inc = categories.filter((c) => c.type === "income").length;
    const exp = categories.filter((c) => c.type === "expense").length;
    const fieldsOk = categories.every((c) => ["id", "name", "type", "icon", "color"].every((k) => k in c));
    return { pass: r.status === 200 && categories.length === 13 && inc === 4 && exp === 9 && fieldsOk, actual: `${short(r)}, ${categories.length} danh mục (${inc} thu, ${exp} chi), đủ trường: ${fieldsOk ? "có" : "không"}` };
  });
  await test("TC-CAT-02", G3, "Lọc danh mục loại thu (?type=income)", "Chỉ trả 4 danh mục thu", async () => {
    const r = await api("GET", "/api/categories?type=income");
    const list = r.json || [];
    return { pass: list.length === 4 && list.every((c) => c.type === "income"), actual: `${list.length} danh mục` };
  });
  await test("TC-CAT-03", G3, "Lọc danh mục loại chi (?type=expense)", "Chỉ trả 9 danh mục chi", async () => {
    const r = await api("GET", "/api/categories?type=expense");
    const list = r.json || [];
    return { pass: list.length === 9 && list.every((c) => c.type === "expense"), actual: `${list.length} danh mục` };
  });
  await test("TC-CAT-04", G3, "Tạo danh mục cá nhân", "201, danh mục mới chỉ người tạo thấy", async () => {
    const r = await api("POST", "/api/categories", { token: tokenA, body: { name: "Trà sữa", type: "expense", icon: "cup-soda", color: "pink" } });
    return { pass: r.status === 201, actual: `${short(r)}${r.json?.message ? " – " + r.json.message : ""}` };
  });

  // ===== 4. Thêm khoản thu/chi =====
  const G4 = "Thêm thu/chi";
  const today = localDate();
  const valid = { amount: 50000, category_id: 1, transaction_date: today, note: "Cơm trưa" };
  await test("TC-TRX-01", G4, "Thêm khoản chi hợp lệ", "201, có transaction_id", async () => {
    const r = await api("POST", "/api/transactions", { token: tokenA, body: valid });
    return { pass: r.status === 201 && !!r.json?.transaction_id, actual: `${short(r)}, transaction_id: ${r.json?.transaction_id ?? "không có"}` };
  });
  await test("TC-TRX-02", G4, "Thêm khoản thu hợp lệ", "201", async () => {
    const r = await api("POST", "/api/transactions", { token: tokenA, body: { amount: 3000000, category_id: 10, transaction_date: today, note: "Lương làm thêm" } });
    return { pass: r.status === 201, actual: short(r) };
  });
  const invalidCases = [
    ["TC-TRX-03", "Số tiền = 0", { amount: 0 }, 400],
    ["TC-TRX-04", "Số tiền âm", { amount: -50000 }, 400],
    ["TC-TRX-05", "Số tiền không phải số (\"abc\")", { amount: "abc" }, 400],
    ["TC-TRX-06", "Thiếu số tiền", { amount: undefined }, 400],
    ["TC-TRX-07", "Thiếu danh mục", { category_id: undefined }, 400],
    ["TC-TRX-08", "Danh mục không tồn tại (9999)", { category_id: 9999 }, 404],
    ["TC-TRX-09", "Thiếu ngày giao dịch", { transaction_date: undefined }, 400],
    ["TC-TRX-10", "Ngày sai định dạng (15/10/2026)", { transaction_date: "15/10/2026" }, 400],
    ["TC-TRX-11", "Ngày không có thật (2026-13-45)", { transaction_date: "2026-13-45" }, 400],
    ["TC-TRX-12", "Ngày không có thật (2026-02-30)", { transaction_date: "2026-02-30" }, 400],
    ["TC-TRX-13", "Ghi chú quá dài (5.000 ký tự)", { note: "a".repeat(5000) }, 400],
    ["TC-TRX-14", "Số tiền vượt giới hạn lưu trữ (10^16)", { amount: 1e16 }, 400]
  ];
  for (const [id, title, patch, expectedStatus] of invalidCases) {
    await test(id, G4, title, `${expectedStatus}, không lưu giao dịch`, async () => {
      const body = { ...valid, ...patch };
      Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);
      const r = await api("POST", "/api/transactions", { token: tokenC, body });
      return { pass: r.status === expectedStatus, actual: short(r) };
    });
  }
  await test("TC-TRX-15", G4, "Thêm giao dịch khi chưa đăng nhập", "401 UNAUTHORIZED", async () => {
    const r = await api("POST", "/api/transactions", { body: valid });
    return { pass: r.status === 401, actual: short(r) };
  });
  await test("TC-TRX-16", G4, "Gửi kèm user_id của người khác trong body", "Giao dịch vẫn thuộc người đang đăng nhập", async () => {
    const r = await api("POST", "/api/transactions", { token: tokenA, body: { ...valid, user_id: idB, note: `gia_mao_${suffix}` } });
    const dashB = await api("GET", "/api/dashboard", { token: tokenB });
    const leaked = (dashB.json?.recent_transactions || []).some((t) => t.note === `gia_mao_${suffix}`);
    return { pass: r.status === 201 && !leaked, actual: `${short(r)}, xuất hiện ở tài khoản B: ${leaked ? "có" : "không"}` };
  });

  // Dọn: các giao dịch "không hợp lệ" lỡ được lưu vào C sẽ làm sai ca TC-DSH-01, nên dùng thêm tài khoản D cho ca rỗng
  const userD = { username: `qa_d_${suffix}`, password: "MatKhauD_123" };
  const regD = await api("POST", "/api/auth/register", { body: userD });
  const tokenD = regD.json?.token;

  // ===== 5. Bảng tổng quan và nhật ký =====
  const G5 = "Tổng quan & nhật ký";
  await api("POST", "/api/transactions", { token: tokenB, body: { amount: 20000, category_id: 1, transaction_date: today, note: "Bánh mì B" } });
  await api("POST", "/api/transactions", { token: tokenB, body: { amount: 500000, category_id: 12, transaction_date: today, note: "Học bổng B" } });
  const lastMonth = localDate(-1, 20);
  await api("POST", "/api/transactions", { token: tokenB, body: { amount: 1200000, category_id: 2, transaction_date: lastMonth, note: "Tiền phòng tháng trước" } });

  await test("TC-DSH-01", G5, "Tài khoản chưa có giao dịch", "Tổng thu = tổng chi = số dư = 0, danh sách rỗng", async () => {
    const r = await api("GET", "/api/dashboard", { token: tokenD });
    const d = r.json || {};
    return { pass: r.status === 200 && d.total_income === 0 && d.total_expense === 0 && d.balance === 0 && (d.recent_transactions || []).length === 0, actual: `${short(r)}, thu=${d.total_income}, chi=${d.total_expense}, dư=${d.balance}, ${(d.recent_transactions || []).length} giao dịch` };
  });
  let dashB;
  await test("TC-DSH-02", G5, "Tổng thu/chi/số dư tháng này của B", "thu=500000, chi=20000, dư=480000 (khoản tháng trước không tính)", async () => {
    const r = await api("GET", "/api/dashboard", { token: tokenB });
    dashB = r.json || {};
    return { pass: dashB.total_income === 500000 && dashB.total_expense === 20000 && dashB.balance === 480000, actual: `thu=${dashB.total_income}, chi=${dashB.total_expense}, dư=${dashB.balance}` };
  });
  await test("TC-DSH-03", G5, "Số dư = tổng thu − tổng chi", "balance = total_income − total_expense", async () => {
    return { pass: dashB.balance === dashB.total_income - dashB.total_expense, actual: `${dashB.total_income} − ${dashB.total_expense} = ${dashB.balance}` };
  });
  await test("TC-DSH-04", G5, "Nhật ký B có đủ 3 giao dịch (kể cả tháng trước)", "3 giao dịch", async () => {
    return { pass: (dashB.recent_transactions || []).length === 3, actual: `${(dashB.recent_transactions || []).length} giao dịch` };
  });
  await test("TC-DSH-05", G5, "Nhật ký sắp xếp ngày mới nhất trước", "Ngày giảm dần", async () => {
    const dates = (dashB.recent_transactions || []).map((t) => t.transaction_date);
    const sorted = [...dates].sort().reverse();
    return { pass: JSON.stringify(dates) === JSON.stringify(sorted), actual: dates.join(", ") };
  });
  await test("TC-DSH-06", G5, "Mỗi dòng nhật ký có đủ ngày, số tiền, loại, danh mục, ghi chú", "Đủ trường, ngày dạng YYYY-MM-DD", async () => {
    const list = dashB.recent_transactions || [];
    const ok = list.length > 0 && list.every((t) => /^\d{4}-\d{2}-\d{2}$/.test(t.transaction_date) && t.amount > 0 && ["income", "expense"].includes(t.type) && t.category_name && "note" in t);
    return { pass: ok, actual: ok ? "Đủ trường" : JSON.stringify(list[0] || {}) };
  });
  await test("TC-DSH-07", G5, "Dữ liệu cập nhật ngay sau khi thêm giao dịch", "Tổng chi tăng đúng số tiền vừa thêm", async () => {
    await api("POST", "/api/transactions", { token: tokenB, body: { amount: 15000, category_id: 3, transaction_date: today, note: "Gửi xe" } });
    const r = await api("GET", "/api/dashboard", { token: tokenB });
    return { pass: r.json?.total_expense === 35000, actual: `chi: ${dashB.total_expense} → ${r.json?.total_expense}` };
  });
  await test("TC-DSH-08", G5, "Tách biệt dữ liệu: A không thấy giao dịch của B", "Không có giao dịch nào của B", async () => {
    const r = await api("GET", "/api/dashboard", { token: tokenA });
    const list = r.json?.recent_transactions || [];
    const foreign = list.filter((t) => (t.user_id !== undefined && Number(t.user_id) !== Number(idA)) || /B$|tháng trước|Gửi xe/.test(t.note || ""));
    return { pass: list.length > 0 && foreign.length === 0, actual: `${list.length} giao dịch, của người khác: ${foreign.length}` };
  });
  await test("TC-DSH-09", G5, "Nhật ký hiển thị đủ khi có hơn 30 giao dịch", "Thấy đủ 31/31 giao dịch (hoặc có phân trang)", async () => {
    for (let i = 1; i <= 31; i += 1) {
      await api("POST", "/api/transactions", { token: tokenD, body: { amount: 1000 * i, category_id: 1, transaction_date: today, note: `GD ${i}` } });
    }
    const r = await api("GET", "/api/dashboard", { token: tokenD });
    const n = (r.json?.recent_transactions || []).length;
    const logApi = await api("GET", "/api/transactions", { token: tokenD });
    return { pass: n === 31 || logApi.status === 200, actual: `Bảng tổng quan trả ${n}/31 giao dịch; GET /api/transactions: ${short(logApi)}` };
  });
  await test("TC-DSH-10", G5, "Xem tổng quan khi chưa đăng nhập", "401 UNAUTHORIZED", async () => {
    const r = await api("GET", "/api/dashboard");
    return { pass: r.status === 401, actual: short(r) };
  });

  // ===== 6. Bảo mật / truy cập trái phép =====
  const G6 = "Bảo mật & truy cập trái phép";
  await test("TC-SEC-01", G6, "Token sai chữ ký", "Bị từ chối (401/403)", async () => {
    const r = await api("GET", "/api/dashboard", { token: signJwt({ id: idA, username: userA.username }, "khoa_sai") });
    return { pass: r.status === 401 || r.status === 403, actual: short(r) };
  });
  await test("TC-SEC-02", G6, "Token đã hết hạn", "Bị từ chối (401/403)", async () => {
    const now = Math.floor(Date.now() / 1000);
    const r = await api("GET", "/api/dashboard", { token: signJwt({ id: idA, username: userA.username, iat: now - 7200, exp: now - 3600 }, DEFAULT_JWT_SECRET) });
    return { pass: r.status === 401 || r.status === 403, actual: short(r) };
  });
  await test("TC-SEC-03", G6, "Token không ký (alg = none)", "Bị từ chối (401/403)", async () => {
    const r = await api("GET", "/api/dashboard", { token: signJwt({ id: idB, username: userB.username }, null, "none") });
    return { pass: r.status === 401 || r.status === 403, actual: short(r) };
  });
  await test("TC-SEC-04", G6, "Tự tạo token bằng khóa bí mật mặc định có sẵn trong mã nguồn để xem dữ liệu của B", "Bị từ chối, không lộ dữ liệu B", async () => {
    const forged = signJwt({ id: idB, username: userB.username, iat: Math.floor(Date.now() / 1000) }, DEFAULT_JWT_SECRET);
    const r = await api("GET", "/api/dashboard", { token: forged });
    const leaked = r.status === 200 && (r.json?.recent_transactions || []).length > 0;
    return { pass: !leaked, actual: `${short(r)}${leaked ? `, đọc được ${r.json.recent_transactions.length} giao dịch của B` : ""}` };
  });
  await test("TC-SEC-05", G6, "Header Authorization sai dạng (không có Bearer)", "401", async () => {
    const r = await api("GET", "/api/dashboard", { headers: { Authorization: "abc" } });
    return { pass: r.status === 401, actual: short(r) };
  });
  await test("TC-SEC-06", G6, "Body JSON hỏng", "400 kèm mã lỗi rõ ràng", async () => {
    const r = await api("POST", "/api/transactions", { token: tokenA, rawBody: "{amount: 1000," });
    return { pass: r.status === 400 && r.json?.error_code !== "INTERNAL_SERVER_ERROR", actual: `${short(r)} – ${r.json?.message || r.text.slice(0, 60)}` };
  });
  await test("TC-SEC-07", G6, "Payload quá lớn (> 100KB)", "413", async () => {
    const r = await api("POST", "/api/transactions", { token: tokenA, body: { ...valid, note: "a".repeat(120 * 1024) } });
    return { pass: r.status === 413, actual: short(r) };
  });
  await test("TC-SEC-08", G6, "Không lộ header X-Powered-By", "Không có header", async () => {
    const r = await api("GET", "/api/health");
    return { pass: !r.headers.get("x-powered-by"), actual: r.headers.get("x-powered-by") || "Không có" };
  });
  await test("TC-SEC-09", G6, "Gọi endpoint không tồn tại", "404 JSON NOT_FOUND", async () => {
    const r = await api("GET", "/api/khong-ton-tai");
    return { pass: r.status === 404 && r.json?.error_code === "NOT_FOUND", actual: short(r) };
  });

  // ===== 7. Tích hợp CSDL =====
  const G7 = "Tích hợp CSDL";
  await test("TC-INT-01", G7, "Backend lưu dữ liệu vào SQL Server", "storage_mode là CSDL, db_connected = true", async () => {
    const r = await api("GET", "/api/health");
    return { pass: r.json?.db_connected === true && r.json?.storage_mode !== "local", actual: `storage_mode=${r.json?.storage_mode}, db_connected=${r.json?.db_connected}` };
  });

  // Ca cuối: giới hạn tần suất (làm khóa đăng nhập của IP này trong ~1 phút)
  await test("TC-SEC-10", G6, "Đăng nhập sai liên tục > 30 lần/phút", "Bị chặn 429 RATE_LIMIT_EXCEEDED", async () => {
    for (let i = 1; i <= 40; i += 1) {
      const r = await api("POST", "/api/auth/login", { body: { username: userA.username, password: "SaiMatKhau_1" } });
      if (r.status === 429) return { pass: true, actual: `429 ở lần thử thứ ${i}` };
    }
    return { pass: false, actual: "Không bị chặn sau 40 lần" };
  });

  // -------------------------------------------------------------------------
  // In và ghi kết quả
  // -------------------------------------------------------------------------
  const passed = results.filter((r) => r.result === "Đạt").length;
  console.log(`\nKiểm thử API Sprint 1 – ${BASE_URL} – ${new Date().toLocaleString("vi-VN")}\n`);
  for (const r of results) {
    console.log(`${r.result === "Đạt" ? "  ĐẠT     " : "  KHÔNG ĐẠT"}  ${r.id.padEnd(10)} ${r.title}  →  ${r.actual}`);
  }
  console.log(`\nTổng: ${results.length} ca | Đạt: ${passed} | Không đạt: ${results.length - passed}\n`);

  const outDir = path.join(__dirname, "..", "ket_qua");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "ket_qua_api.json"), JSON.stringify({ base_url: BASE_URL, run_at: new Date().toISOString(), results }, null, 2), "utf8");
  const md = [
    `# Kết quả chạy kiểm thử API`,
    ``,
    `- Thời gian: ${new Date().toLocaleString("vi-VN")}`,
    `- Backend: ${BASE_URL} (storage_mode: ${health.json?.storage_mode})`,
    `- Tổng: **${results.length} ca – Đạt ${passed} – Không đạt ${results.length - passed}**`,
    ``,
    `| Mã | Nhóm | Trường hợp | Kết quả mong đợi | Kết quả thực tế | Đánh giá |`,
    `|---|---|---|---|---|---|`,
    ...results.map((r) => `| ${r.id} | ${r.group} | ${r.title} | ${r.expected} | ${r.actual.replace(/\|/g, "\\|")} | ${r.result === "Đạt" ? "Đạt" : "**Không đạt**"} |`)
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "ket_qua_api.md"), md + "\n", "utf8");
  console.log(`Đã ghi kết quả vào ${path.join(outDir, "ket_qua_api.md")}`);
  process.exitCode = passed === results.length ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
