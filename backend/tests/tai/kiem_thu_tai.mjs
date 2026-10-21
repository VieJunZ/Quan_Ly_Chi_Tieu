/**
 * @file kiem_thu_tai.mjs
 * @description Kiểm thử chịu tải: nhiều "người dùng ảo" gọi máy chủ cùng lúc trong vài giây,
 * đo số yêu cầu/giây, độ trễ trung bình, p95, p99 và số lỗi cho từng loại yêu cầu.
 *
 * Chạy (máy chủ phải đang chạy với NODE_ENV=test để tắt chống spam khi đăng nhập liên tục):
 *   node tests/tai/kiem_thu_tai.mjs http://localhost:8091 [số người ảo, mặc định 100] [số giây mỗi bài, mặc định 8]
 *
 * Tài khoản thử tên "kt_api_tai..." được kiem_thu_thu_chi.bat xóa cùng các tài khoản kiểm thử API.
 */

import http from "node:http";

const BASE =(process.argv[2] || "http://localhost:8091").replace(/\/+$/, "");
const USERS = Number(process.argv[3]) || 100;
const SECONDS = Number(process.argv[4]) || 8;

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Gọi thẳng bằng http (không dùng fetch) để công cụ đo không tốn CPU giải nén,
// nếu không chính máy đo sẽ chậm trước máy chủ.
const target = new URL(BASE);
const agent = new http.Agent({ keepAlive: true, maxSockets: 1000 });

function call(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: target.hostname,
      port: target.port,
      path,
      method: options.method || "GET",
      agent,
      headers: { "Content-Type": "application/json", "Accept-Encoding": "br, gzip", ...(options.headers || {}) }
    }, (res) => {
      res.on("data", () => {});
      res.on("end", () => resolve({ status: res.statusCode, headers: { get: (name) => res.headers[name.toLowerCase()] } }));
    });
    req.on("error", reject);
    req.end(options.body);
  });
}

/**
 * Cho `users` người ảo cùng gọi `request` liên tục trong `seconds` giây.
 * @returns {{ name, rps, avg, p95, p99, errors, total }}
 */
async function run(name, users, seconds, request) {
  const times = [];
  let errors = 0;
  const end = Date.now() + seconds * 1000;
  const worker = async (i) => {
    while (Date.now() < end) {
      const t = performance.now();
      try {
        const res = await request(i);
        if (res.status >= 400) errors++;
      } catch {
        errors++;
      }
      times.push(performance.now() - t);
    }
  };
  const started = performance.now();
  await Promise.all(Array.from({ length: users }, (_, i) => worker(i)));
  const elapsed = (performance.now() - started) / 1000;
  times.sort((a, b) => a - b);
  const at = (q) => Math.round(times[Math.min(times.length - 1, Math.floor(times.length * q))] || 0);
  return {
    name,
    rps: Math.round(times.length / elapsed),
    avg: Math.round(times.reduce((a, b) => a + b, 0) / (times.length || 1)),
    p95: at(0.95),
    p99: at(0.99),
    errors,
    total: times.length
  };
}

async function main() {
  console.log(`Kiểm thử chịu tải ${BASE}: ${USERS} người ảo, mỗi bài ${SECONDS} giây\n`);

  // Chuẩn bị: 1 tài khoản thật để đo đăng nhập, vài tài khoản dùng thử (có dữ liệu mẫu) để đo các trang chính
  const username = `kt_api_tai${Date.now().toString(36).slice(-6)}`;
  const password = "Tai@123456";
  const reg = await call("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password, confirm_password: password })
  });
  if (reg.status !== 201) throw new Error(`Không tạo được tài khoản thử (HTTP ${reg.status}). Máy chủ có chạy NODE_ENV=test không?`);

  const tokens = [];
  for (let i = 0; i < 10; i++) {
    const res = await fetch(`${BASE}/api/auth/demo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ today: today(), now: "12:00" })
    });
    tokens.push((await res.json()).token);
  }
  const auth = (i) => ({ headers: { Authorization: `Bearer ${tokens[i % tokens.length]}` } });

  const results = [];
  const bench = async (name, users, request) => {
    const r = await run(name, users, SECONDS, request);
    results.push(r);
    console.log(`  xong: ${name}`);
  };

  await bench("Trang /app/ (HTML)", USERS, () => call("/app/"));
  await bench("CSS đã nén", USERS, () => call("/app/css/app.css"));
  await bench("Hỏi lại file chưa đổi (304)", USERS, async () => {
    const first = await call("/app/js/app.js");
    return call("/app/js/app.js", { headers: { "If-None-Match": first.headers.get("etag") } });
  });
  await bench("API /health", USERS, () => call("/api/health"));
  await bench("API trang chủ /dashboard", USERS, (i) => call(`/api/dashboard?today=${today()}`, auth(i)));
  await bench("API lịch sử /transactions", USERS, (i) => call("/api/transactions?limit=30", auth(i)));
  // Đăng nhập tốn CPU (bcrypt) nên đo với ít người hơn
  await bench("Đăng nhập (bcrypt)", Math.min(USERS, 20), () => call("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  }));

  // Trường hợp thật: đang có 10 người đăng nhập liên tục, những người còn lại mở trang chủ có bị chậm theo không
  const loginLoad = run("(nền) đăng nhập", 10, SECONDS, () => call("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  }));
  await bench("Trang chủ khi 10 người đang đăng nhập", USERS, (i) => call(`/api/dashboard?today=${today()}`, auth(i)));
  await loginLoad;

  console.log("");
  console.table(results.map((r) => ({
    "Bài": r.name,
    "Yêu cầu/giây": r.rps,
    "TB (ms)": r.avg,
    "p95 (ms)": r.p95,
    "p99 (ms)": r.p99,
    "Lỗi": r.errors,
    "Tổng": r.total
  })));

  agent.destroy();
  const failed = results.filter((r) => r.errors > 0);
  if (failed.length) {
    console.log(`CÓ LỖI ở: ${failed.map((r) => r.name).join(", ")}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("LỖI:", error.message);
  process.exitCode = 1;
});
