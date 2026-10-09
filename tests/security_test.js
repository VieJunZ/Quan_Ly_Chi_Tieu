/**
 * @file security_test.js
 * @description Kịch bản kiểm thử bảo mật chuyên sâu cho Backend (Security Audit Suite).
 * Kiểm tra các lỗ hổng theo chuẩn OWASP Top 10:
 *   1. Chống tấn công SQL Injection
 *   2. Chống truy cập trái phép dữ liệu người khác (IDOR - Insecure Direct Object Reference)
 *   3. Kiểm tra tính toàn vẹn và chống giả mạo JWT Token
 *   4. Chống lộ lọt thông tin máy chủ (Information Disclosure / Password Leaks)
 *   5. Kiểm soát dữ liệu đầu vào & Chống thao túng số tiền (Input Validation)
 *   6. Chống dò quét tài khoản (User Enumeration Prevention)
 */

const http = require("http");

const BASE_URL = "http://localhost:8080";

function request(options, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const url = new URL(options.path, BASE_URL);

    const headers = {
      "Content-Type": "application/json",
      ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
      ...(options.headers || {})
    };

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: options.method || "GET",
        headers
      },
      (res) => {
        let resData = "";
        res.on("data", (chunk) => (resData += chunk));
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(resData);
          } catch {
            parsed = resData;
          }
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        });
      }
    );

    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    passedCount++;
    console.log(`  ${colors.green}✔ AN TOÀN:${colors.reset} ${testName}`);
  } else {
    failedCount++;
    console.error(`  ${colors.red}✖ LỖ HỔNG:${colors.reset} ${testName} ${details ? `(${details})` : ""}`);
  }
}

async function runSecurityAudit() {
  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  BẮT ĐẦU KIỂM THỬ BẢO MẬT BACKEND (SECURITY AUDIT) ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}\n`);

  try {
    // =========================================================================
    // 1. Kiểm tra rò rỉ thông tin máy chủ (Information Disclosure)
    // =========================================================================
    console.log(`${colors.bold}1. Kiểm tra rò rỉ Header máy chủ (Server Header Disclosure)${colors.reset}`);
    const healthRes = await request({ path: "/api/health" });
    const hasXPoweredBy = !!healthRes.headers["x-powered-by"];
    assert(!hasXPoweredBy, "Đã ẩn thành công header 'X-Powered-By' (chống quét lỗ hổng framework)");

    // =========================================================================
    // 2. Chống SQL Injection
    // =========================================================================
    console.log(`\n${colors.bold}2. Kiểm tra khả năng phòng chống SQL Injection${colors.reset}`);
    const sqlPayloads = [
      "' OR '1'='1",
      "admin'--",
      "'; DROP TABLE users; --",
      "' UNION SELECT null, null, null--"
    ];

    for (const payload of sqlPayloads) {
      const sqlLogin = await request(
        { path: "/api/auth/login", method: "POST" },
        { username: payload, password: "password123" }
      );
      // Phải bị từ chối 400 hoặc 401, tuyệt đối không được trả về 200 hay crash 500
      assert(
        sqlLogin.status === 400 || sqlLogin.status === 401,
        `Chặn thành công truy vấn SQL Injection: [${payload}] (Status: ${sqlLogin.status})`
      );
    }

    // =========================================================================
    // 3. Phân quyền và cô lập dữ liệu người dùng (IDOR Protection)
    // =========================================================================
    console.log(`\n${colors.bold}3. Kiểm tra cô lập dữ liệu giữa các tài khoản (IDOR Protection)${colors.reset}`);
    const userA_name = `usera_${Date.now()}`;
    const userB_name = `userb_${Date.now()}`;
    const password = "ValidPassword123";

    // Đăng ký User A & User B
    const userARes = await request({ path: "/api/auth/register", method: "POST" }, { username: userA_name, password });
    const userBRes = await request({ path: "/api/auth/register", method: "POST" }, { username: userB_name, password });
    const tokenA = userARes.data.token;
    const tokenB = userBRes.data.token;

    // User A tạo giao dịch riêng trị giá 1,000,000 VND
    await request(
      { path: "/api/transactions", method: "POST", headers: { Authorization: `Bearer ${tokenA}` } },
      { category_id: 1, amount: 1000000, note: "Chi tiêu bí mật của A", transaction_date: "2026-10-09" }
    );

    // User B tải Dashboard của mình -> Phải không được thấy số tiền của A
    const dashB = await request({ path: "/api/dashboard", method: "GET", headers: { Authorization: `Bearer ${tokenB}` } });
    assert(dashB.status === 200, "User B truy cập được dashboard của chính mình");
    assert(Number(dashB.data.total_expense) === 0, "User B KHÔNG THẤY dữ liệu chi tiêu của User A (Tổng chi = 0)");
    assert(dashB.data.recent_transactions.length === 0, "Danh sách giao dịch của User B rỗng, không bị lộ giao dịch của A");

    // =========================================================================
    // 4. Kiểm tra tính toàn vẹn và chống giả mạo JWT
    // =========================================================================
    console.log(`\n${colors.bold}4. Kiểm tra xác thực Token JWT & Chống giả mạo${colors.reset}`);

    // Gửi request không có Token
    const noTokenRes = await request({ path: "/api/dashboard", method: "GET" });
    assert(noTokenRes.status === 401, "Chặn request không có Token (401 Unauthorized)");

    // Gửi Token bị sửa đổi / giả mạo chữ ký
    const tamperedToken = tokenA.slice(0, -6) + "fake99";
    const fakeTokenRes = await request(
      { path: "/api/dashboard", method: "GET", headers: { Authorization: `Bearer ${tamperedToken}` } }
    );
    assert(fakeTokenRes.status === 403, "Chặn Token giả mạo hoặc sai chữ ký số (403 Forbidden)");

    // =========================================================================
    // 5. Kiểm tra rò rỉ mật khẩu trong phản hồi (Password Hash Leakage)
    // =========================================================================
    console.log(`\n${colors.bold}5. Kiểm tra bảo mật mật khẩu (Không lộ mã băm bcrypt)${colors.reset}`);
    assert(!userARes.data.password, "Phản hồi Đăng ký không chứa trường 'password'");
    assert(!userARes.data.user?.password, "Đối tượng user trong Đăng ký không chứa 'password'");

    const loginRes = await request({ path: "/api/auth/login", method: "POST" }, { username: userA_name, password });
    assert(!loginRes.data.password, "Phản hồi Đăng nhập không chứa trường 'password'");
    assert(!loginRes.data.user?.password, "Đối tượng user trong Đăng nhập không chứa 'password'");

    // =========================================================================
    // 6. Kiểm soát dữ liệu đầu vào (Input Validation & Business Logic)
    // =========================================================================
    console.log(`\n${colors.bold}6. Kiểm tra tính toàn vẹn dữ liệu giao dịch${colors.reset}`);

    // Số tiền âm
    const negAmount = await request(
      { path: "/api/transactions", method: "POST", headers: { Authorization: `Bearer ${tokenA}` } },
      { category_id: 1, amount: -999999, note: "Thao túng số dư", transaction_date: "2026-10-09" }
    );
    assert(negAmount.status === 400, "Chặn giao dịch với số tiền âm (400)");

    // Số tiền không phải số (NaN)
    const nanAmount = await request(
      { path: "/api/transactions", method: "POST", headers: { Authorization: `Bearer ${tokenA}` } },
      { category_id: 1, amount: "mot_trieu", note: "Hack tiền chữ", transaction_date: "2026-10-09" }
    );
    assert(nanAmount.status === 400, "Chặn giao dịch với số tiền không phải dạng số (400)");

    // Danh mục không tồn tại
    const fakeCategory = await request(
      { path: "/api/transactions", method: "POST", headers: { Authorization: `Bearer ${tokenA}` } },
      { category_id: 999999, amount: 50000, note: "Hack category", transaction_date: "2026-10-09" }
    );
    assert(fakeCategory.status === 404, "Chặn giao dịch với ID danh mục không tồn tại (404)");

    // Mật khẩu quá ngắn
    const shortPass = await request(
      { path: "/api/auth/register", method: "POST" },
      { username: `short_${Date.now()}`, password: "123" }
    );
    assert(shortPass.status === 400, "Chặn đăng ký với mật khẩu yếu dưới 8 ký tự (400)");

    // =========================================================================
    // 7. Chống dò quét tài khoản (User Enumeration Prevention)
    // =========================================================================
    console.log(`\n${colors.bold}7. Chống dò quét tài khoản (User Enumeration Prevention)${colors.reset}`);
    const wrongUserLogin = await request(
      { path: "/api/auth/login", method: "POST" },
      { username: "non_existent_user_99999", password: "SomePassword123" }
    );
    const wrongPassLogin = await request(
      { path: "/api/auth/login", method: "POST" },
      { username: userA_name, password: "WrongPassword999" }
    );
    assert(
      wrongUserLogin.data.message === wrongPassLogin.data.message,
      "Thông báo lỗi đăng nhập sai username và sai password đồng nhất (tránh kẻ xấu đoán được username có tồn tại hay không)"
    );

    console.log(`\n${colors.bold}${colors.cyan}----------------------------------------------------${colors.reset}`);
    console.log(
      `${colors.bold}KẾT QUẢ ĐÁNH GIÁ BẢO MẬT: ${colors.green}${passedCount} TIÊU CHÍ AN TOÀN${colors.reset}, ${failedCount > 0 ? colors.red : colors.green}${failedCount} LỖ HỔNG${colors.reset}`
    );
    console.log(`${colors.bold}${colors.cyan}----------------------------------------------------${colors.reset}\n`);

    process.exit(failedCount > 0 ? 1 : 0);
  } catch (error) {
    console.error("Lỗi trong quá trình audit:", error);
    process.exit(1);
  }
}

runSecurityAudit();
