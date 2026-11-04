/**
 * @file preview_server.js
 * @description Máy chủ Node.js độc lập (Zero external dependencies)
 * Dùng trực tiếp Node.js built-in (http, fs, path, url) để phục vụ Static frontend
 * và Mock REST APIs cho cả giao diện PWA (/app/) và Classic Dashboard (/index.html).
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = Number(process.env.PORT) || 8090;
const ROOT_DIR = __dirname;
const FRONTEND_DIR = path.join(ROOT_DIR, "frontend");

const CATEGORIES = [
  { id: 1, name: "Ăn uống", type: "expense", icon: "utensils", color: "amber", is_default: true },
  { id: 2, name: "Nhà cửa & Phòng trọ", type: "expense", icon: "home", color: "blue", is_default: true },
  { id: 3, name: "Di chuyển & Xăng xe", type: "expense", icon: "car", color: "cyan", is_default: true },
  { id: 4, name: "Mua sắm cá nhân", type: "expense", icon: "shopping-bag", color: "rose", is_default: true },
  { id: 5, name: "Hóa đơn & Tiện ích", type: "expense", icon: "receipt", color: "orange", is_default: true },
  { id: 6, name: "Học tập & Tri thức", type: "expense", icon: "book-open", color: "indigo", is_default: true },
  { id: 7, name: "Giải trí & Bạn bè", type: "expense", icon: "gamepad-2", color: "violet", is_default: true },
  { id: 8, name: "Y tế & Sức khỏe", type: "expense", icon: "heart-pulse", color: "red", is_default: true },
  { id: 9, name: "Khoản chi khác", type: "expense", icon: "circle-ellipsis", color: "emerald", is_default: true },
  { id: 10, name: "Tiền lương", type: "income", icon: "wallet", color: "emerald", is_default: true },
  { id: 11, name: "Tiền thưởng", type: "income", icon: "gift", color: "green", is_default: true },
  { id: 12, name: "Trợ cấp & Học bổng", type: "income", icon: "hand-coins", color: "teal", is_default: true },
  { id: 13, name: "Thu nhập khác", type: "income", icon: "plus-circle", color: "lime", is_default: true }
];

const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const TRANSACTIONS = [
  { id: 1, user_id: 1, category_id: 12, category_name: "Trợ cấp & Học bổng", category_icon: "hand-coins", category_color: "teal", type: "income", amount: 3000000, note: "Bố mẹ gửi tiền tháng", transaction_date: fmtDate(new Date(Date.now() - 10 * 86400000)), transaction_time: "09:00" },
  { id: 2, user_id: 1, category_id: 2, category_name: "Nhà cửa & Phòng trọ", category_icon: "home", category_color: "blue", type: "expense", amount: 1800000, note: "Tiền phòng trọ", transaction_date: fmtDate(new Date(Date.now() - 9 * 86400000)), transaction_time: "19:30" },
  { id: 3, user_id: 1, category_id: 5, category_name: "Hóa đơn & Tiện ích", category_icon: "receipt", category_color: "orange", type: "expense", amount: 250000, note: "Tiền điện nước", transaction_date: fmtDate(new Date(Date.now() - 7 * 86400000)), transaction_time: "20:10" },
  { id: 4, user_id: 1, category_id: 10, category_name: "Tiền lương", category_icon: "wallet", category_color: "emerald", type: "income", amount: 1500000, note: "Lương làm thêm quán cà phê", transaction_date: fmtDate(new Date(Date.now() - 5 * 86400000)), transaction_time: "21:00" },
  { id: 5, user_id: 1, category_id: 4, category_name: "Mua sắm cá nhân", category_icon: "shopping-bag", category_color: "rose", type: "expense", amount: 159000, note: "Áo phông Shopee", transaction_date: fmtDate(new Date(Date.now() - 4 * 86400000)), transaction_time: "18:40" },
  { id: 6, user_id: 1, category_id: 7, category_name: "Giải trí & Bạn bè", category_icon: "gamepad-2", category_color: "violet", type: "expense", amount: 90000, note: "Xem phim cùng bạn", transaction_date: fmtDate(new Date(Date.now() - 2 * 86400000)), transaction_time: "20:30" },
  { id: 7, user_id: 1, category_id: 1, category_name: "Ăn uống", category_icon: "utensils", category_color: "amber", type: "expense", amount: 35000, note: "Cơm trưa sườn trứng", transaction_date: fmtDate(now), transaction_time: "11:45" },
  { id: 8, user_id: 1, category_id: 3, category_name: "Di chuyển & Xăng xe", category_icon: "car", category_color: "cyan", type: "expense", amount: 5000, note: "Gửi xe giảng đường", transaction_date: fmtDate(now), transaction_time: "07:45" }
];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

function sendJson(res, statusCode, payload) {
  const jsonStr = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(jsonStr),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Lang"
  });
  res.end(jsonStr);
}

function serveStatic(req, res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("404 Not Found");
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stats.size,
      "Access-Control-Allow-Origin": "*"
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

const server = http.createServer((req, res) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Lang"
    });
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // --- API ROUTING ---
  if (pathname.startsWith("/api/")) {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      let data = {};
      try {
        if (body) data = JSON.parse(body);
      } catch (e) {
        data = {};
      }

      if (pathname === "/api/health") {
        return sendJson(res, 200, {
          status: "ok",
          storage: "mock-preview",
          database: { connected: true, name: "so_chi_tri_db (preview)", server_time: new Date().toISOString() },
          ocr_language_data: true,
          uptime_seconds: Math.round(process.uptime())
        });
      }

      if (pathname === "/api/categories") {
        const type = query.type;
        const result = CATEGORIES.filter((c) => !type || c.type === type);
        return sendJson(res, 200, result);
      }

      if (pathname === "/api/dashboard") {
        const totalIncome = TRANSACTIONS.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
        const totalExpense = TRANSACTIONS.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
        const todayStr = fmtDate(new Date());
        const todayExpense = TRANSACTIONS.filter((t) => t.type === "expense" && t.transaction_date === todayStr).reduce((s, t) => s + t.amount, 0);

        const byCategoryMap = {};
        for (const t of TRANSACTIONS) {
          if (t.type === "expense") {
            if (!byCategoryMap[t.category_id]) {
              byCategoryMap[t.category_id] = {
                category_id: t.category_id,
                category_name: t.category_name,
                category_icon: t.category_icon || "coffee",
                category_color: t.category_color || "amber",
                type: "expense",
                total: 0,
                transaction_count: 0
              };
            }
            byCategoryMap[t.category_id].total += t.amount;
            byCategoryMap[t.category_id].transaction_count += 1;
          }
        }

        return sendJson(res, 200, {
          month: fmtDate(new Date()).slice(0, 7),
          total_income: totalIncome,
          total_expense: totalExpense,
          month_balance: totalIncome - totalExpense,
          balance: totalIncome - totalExpense,
          transaction_count: TRANSACTIONS.length,
          by_category: Object.values(byCategoryMap),
          recent_transactions: TRANSACTIONS.slice(-6).reverse(),
          today: {
            total_income: 0,
            total_expense: todayExpense,
            transaction_count: 2,
            marked_no_spend: false
          }
        });
      }

      if (pathname === "/api/dashboard/suggestions") {
        return sendJson(res, 200, [
          { category_id: 1, category_name: "Ăn uống", category_icon: "utensils", category_color: "amber", amount: 35000, note: "Cơm trưa" },
          { category_id: 3, category_name: "Di chuyển & Xăng xe", category_icon: "car", category_color: "cyan", amount: 5000, note: "Gửi xe" }
        ]);
      }

      if (pathname === "/api/dashboard/nudge") {
        return sendJson(res, 200, { show: false });
      }

      if (pathname === "/api/dashboard/streak") {
        return sendJson(res, 200, { streak: 5, has_recorded_today: true });
      }

      if (pathname === "/api/transactions") {
        if (req.method === "POST") {
          const cid = Number(data.category_id) || 1;
          const cat = CATEGORIES.find((c) => c.id === cid) || CATEGORIES[0];
          const newTx = {
            id: TRANSACTIONS.length + 1,
            user_id: 1,
            category_id: cid,
            category_name: cat.name,
            category_icon: cat.icon,
            category_color: cat.color,
            type: cat.type,
            amount: Number(data.amount) || 0,
            note: data.note || "",
            transaction_date: data.transaction_date || fmtDate(new Date()),
            transaction_time: data.transaction_time || "12:00"
          };
          TRANSACTIONS.push(newTx);
          return sendJson(res, 201, newTx);
        }

        return sendJson(res, 200, {
          items: [...TRANSACTIONS].reverse(),
          total: TRANSACTIONS.length,
          page: 1,
          page_size: 20
        });
      }

      if (pathname === "/api/auth/demo" || pathname === "/api/auth/login" || pathname === "/api/auth/register") {
        return sendJson(res, 200, {
          token: "preview-token-session-active",
          user_id: 1,
          user: {
            id: 1,
            username: data.username || "sinhvien_k20",
            display_name: "Sinh Viên K20",
            is_demo: true,
            demo_expires_at: new Date(Date.now() + 86400000).toISOString(),
            created_at: new Date().toISOString()
          }
        });
      }

      if (pathname === "/api/auth/me") {
        return sendJson(res, 200, {
          id: 1,
          username: "sinhvien_k20",
          display_name: "Sinh Viên K20",
          is_demo: true,
          demo_expires_at: new Date(Date.now() + 86400000).toISOString()
        });
      }

      if (pathname === "/api/debts") {
        return sendJson(res, 200, { debts: [], total_lent: 0, total_borrowed: 0 });
      }

      if (pathname === "/api/wallet") {
        return sendJson(res, 200, {
          wallets: [
            { name: "Tiền mặt", balance: 450000 },
            { name: "Tài khoản ngân hàng", balance: 2195000 }
          ]
        });
      }

      if (pathname === "/api/budget") {
        return sendJson(res, 200, { budgets: [], total_budget: 4000000, spent: 2339000 });
      }

      if (pathname === "/api/challenges") {
        return sendJson(res, 200, { active: [], available: [] });
      }

      if (pathname === "/api/pet-shop") {
        return sendJson(res, 200, { items: [], coins: 150 });
      }

      return sendJson(res, 200, { status: "ok" });
    });
    return;
  }

  // --- STATIC ROUTING ---
  if (pathname === "/" || pathname === "") {
    res.writeHead(302, { Location: "/app/" });
    return res.end();
  }

  if (pathname === "/app" || pathname === "/app/") {
    return serveStatic(req, res, path.join(FRONTEND_DIR, "app", "index.html"));
  }

  if (pathname.startsWith("/app/")) {
    const subpath = pathname.slice(5);
    return serveStatic(req, res, path.join(FRONTEND_DIR, "app", subpath));
  }

  // Classic frontend
  const cleanPath = pathname.replace(/^\/+/, "");
  serveStatic(req, res, path.join(FRONTEND_DIR, cleanPath));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("====================================================");
  console.log(`  Preview Server running on:`);
  console.log(`  - PWA App (Mobile-first): http://localhost:${PORT}/app/`);
  console.log(`  - Mobile view simulator:  http://localhost:${PORT}/app/mobile.html`);
  console.log(`  - Desktop Dashboard:      http://localhost:${PORT}/index.html`);
  console.log("====================================================");
});

