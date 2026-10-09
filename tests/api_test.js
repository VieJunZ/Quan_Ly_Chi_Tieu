// tests/api_test.js
// Kịch bản kiểm thử tự động toàn diện tích hợp Backend API (End-to-End Test Suite)

const http = require("http");
const { startServer } = require("../backend/src/server");

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
    console.log(`  ${colors.green}✔ PASS:${colors.reset} ${testName}`);
  } else {
    failedCount++;
    console.error(`  ${colors.red}✖ FAIL:${colors.reset} ${testName} ${details ? `(${details})` : ""}`);
  }
}

async function runTestSuite() {
  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  BẮT ĐẦU CHẠY KIỂM THỬ TÍCH HỢP TOÀN DIỆN (API E2E)${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}\n`);

  let server;
  try {
    server = await startServer();
  } catch (err) {
    console.error("Không thể khởi động server test:", err);
    process.exit(1);
  }

  try {
    // 1. Kiểm tra Health Check
    console.log(`${colors.bold}1. Kiểm tra Health Check API (/api/health)${colors.reset}`);
    const health = await request({ path: "/api/health" });
    assert(health.status === 200, "Status HTTP 200 OK");
    assert(health.data.status === "ok", "Trạng thái status là 'ok'");
    assert(typeof health.data.storage_mode === "string", `Chế độ lưu trữ: ${health.data.storage_mode}`);

    // 2. Kiểm tra Danh mục Categories
    console.log(`\n${colors.bold}2. Kiểm tra Danh mục thu chi (/api/categories)${colors.reset}`);
    const categoriesRes = await request({ path: "/api/categories" });
    assert(categoriesRes.status === 200, "Status HTTP 200 OK");
    assert(Array.isArray(categoriesRes.data), "Dữ liệu trả về là mảng danh mục");
    assert(categoriesRes.data.length >= 10, `Số lượng danh mục mẫu: ${categoriesRes.data.length}`);
    const hasFood = categoriesRes.data.some((c) => c.name.toLowerCase().includes("ăn uống") && c.type === "expense");
    const hasSalary = categoriesRes.data.some((c) => c.name.toLowerCase().includes("lương") && c.type === "income");
    assert(hasFood, "Có danh mục chi tiêu 'Ăn uống'");
    assert(hasSalary, "Có danh mục thu nhập 'Tiền lương'");

    // 3. Kiểm tra Đăng ký tài khoản (Register)
    console.log(`\n${colors.bold}3. Kiểm tra Đăng ký tài khoản (/api/auth/register)${colors.reset}`);
    const randomSuffix = Math.floor(Math.random() * 100000);
    const testUsername = `user_${Date.now()}_${randomSuffix}`;
    const testPassword = "SecurePassword123";

    const registerRes = await request(
      { path: "/api/auth/register", method: "POST" },
      { username: testUsername, password: testPassword }
    );
    assert(registerRes.status === 201, "Status HTTP 201 Created khi đăng ký");
    assert(!!registerRes.data.token, "Trả về JWT token hợp lệ");
    assert(registerRes.data.user?.username === testUsername, "Tên tài khoản khớp thông tin đăng ký");

    // Đăng ký lại cùng username phải bị từ chối 409
    const dupRes = await request(
      { path: "/api/auth/register", method: "POST" },
      { username: testUsername, password: testPassword }
    );
    assert(dupRes.status === 409, "Từ chối tên đăng nhập trùng lặp (Status 409)");

    // 4. Kiểm tra Đăng nhập tài khoản (Login)
    console.log(`\n${colors.bold}4. Kiểm tra Đăng nhập tài khoản (/api/auth/login)${colors.reset}`);
    const loginRes = await request(
      { path: "/api/auth/login", method: "POST" },
      { username: testUsername, password: testPassword }
    );
    assert(loginRes.status === 200, "Status HTTP 200 OK khi đăng nhập");
    assert(!!loginRes.data.token, "Đăng nhập trả về JWT token");
    const authToken = loginRes.data.token;

    // Đăng nhập sai mật khẩu phải trả về 401
    const wrongPassRes = await request(
      { path: "/api/auth/login", method: "POST" },
      { username: testUsername, password: "WrongPassword999" }
    );
    assert(wrongPassRes.status === 401, "Từ chối mật khẩu sai (Status 401)");

    // 5. Kiểm tra Thêm giao dịch (Transactions)
    console.log(`\n${colors.bold}5. Kiểm tra Thêm giao dịch Thu & Chi (/api/transactions)${colors.reset}`);
    const today = new Date().toISOString().slice(0, 10);

    // Giao dịch 1: Thu nhập (+5.000.000)
    const incomeCat = categoriesRes.data.find((c) => c.type === "income") || { id: 10 };
    const trans1 = await request(
      {
        path: "/api/transactions",
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` }
      },
      {
        category_id: incomeCat.id,
        amount: 5000000,
        note: "Tiền lương làm thêm tháng này",
        transaction_date: today
      }
    );
    assert(trans1.status === 201, "Tạo giao dịch thu nhập thành công (201)");
    assert(Number(trans1.data.amount) === 5000000, "Số tiền thu nhập khớp 5,000,000 VND");

    // Giao dịch 2: Chi tiêu (-200.000)
    const expenseCat = categoriesRes.data.find((c) => c.type === "expense") || { id: 1 };
    const trans2 = await request(
      {
        path: "/api/transactions",
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` }
      },
      {
        category_id: expenseCat.id,
        amount: 200000,
        note: "Ăn lẩu liên hoan cùng nhóm",
        transaction_date: today
      }
    );
    assert(trans2.status === 201, "Tạo giao dịch chi tiêu thành công (201)");
    assert(Number(trans2.data.amount) === 200000, "Số tiền chi tiêu khớp 200,000 VND");

    // Thử thêm giao dịch không có token (phải bị chặn 401)
    const noAuthTrans = await request(
      { path: "/api/transactions", method: "POST" },
      { category_id: 1, amount: 10000, note: "Test", transaction_date: today }
    );
    assert(noAuthTrans.status === 401, "Bảo vệ endpoint khi không có token (401 Unauthorized)");

    // Thử thêm giao dịch với số tiền âm (phải bị từ chối 400)
    const invalidAmountTrans = await request(
      {
        path: "/api/transactions",
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` }
      },
      { category_id: 1, amount: -50000, note: "Số tiền âm", transaction_date: today }
    );
    assert(invalidAmountTrans.status === 400, "Từ chối số tiền không hợp lệ (400 Validation Error)");

    // 6. Kiểm tra Dashboard tổng quan (/api/dashboard)
    console.log(`\n${colors.bold}6. Kiểm tra Dashboard số dư & giao dịch gần đây (/api/dashboard)${colors.reset}`);
    const dashRes = await request({
      path: "/api/dashboard",
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(dashRes.status === 200, "Status HTTP 200 OK khi tải Dashboard");
    assert(Number(dashRes.data.total_income) === 5000000, `Tổng thu khớp: 5,000,000 VND (thực tế: ${dashRes.data.total_income})`);
    assert(Number(dashRes.data.total_expense) === 200000, `Tổng chi khớp: 200,000 VND (thực tế: ${dashRes.data.total_expense})`);
    assert(Number(dashRes.data.balance) === 4800000, `Số dư khớp (Thu - Chi = 4,800,000 VND): thực tế: ${dashRes.data.balance}`);
    assert(dashRes.data.recent_transactions.length >= 2, `Danh sách giao dịch gần đây có đủ các mục vừa tạo (có ${dashRes.data.recent_transactions.length} mục)`);

    console.log(`\n${colors.bold}${colors.cyan}----------------------------------------------------${colors.reset}`);
    console.log(
      `${colors.bold}KẾT QUẢ KIỂM THỬ: ${colors.green}${passedCount} PASSED${colors.reset}, ${failedCount > 0 ? colors.red : colors.green}${failedCount} FAILED${colors.reset}`
    );
    console.log(`${colors.bold}${colors.cyan}----------------------------------------------------${colors.reset}\n`);

    if (failedCount > 0) {
      server.close(() => process.exit(1));
    } else {
      server.close(() => process.exit(0));
    }
  } catch (error) {
    console.error("Lỗi trong quá trình chạy test:", error);
    server.close(() => process.exit(1));
  }
}

runTestSuite();
