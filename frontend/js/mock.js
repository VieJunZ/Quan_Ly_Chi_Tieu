/**
 * @file mock.js
 * @description Mock Adapter ngoại tuyến cho app Quản Lý Thu Chi trên mobile.
 * Tự động kích hoạt khi không kết nối được máy chủ Backend Node.js / SQL Server,
 * cho phép app chạy độc lập 100% trên điện thoại (Offline-First) với LocalStorage.
 */

const STORAGE_KEY_PREFIX = "thuchi.mock.";

function getStore(key, defaultVal) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStore(key, val) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(val));
  } catch {}
}

const DEFAULT_CATEGORIES = [
  { id: 1, name: "Ăn uống", type: "expense", icon: "utensils", color: "amber", is_default: true, hidden: 0 },
  { id: 2, name: "Nhà cửa & Phòng trọ", type: "expense", icon: "home", color: "blue", is_default: true, hidden: 0 },
  { id: 3, name: "Di chuyển & Xăng xe", type: "expense", icon: "car", color: "cyan", is_default: true, hidden: 0 },
  { id: 4, name: "Mua sắm cá nhân", type: "expense", icon: "shopping-bag", color: "rose", is_default: true, hidden: 0 },
  { id: 5, name: "Hóa đơn & Tiện ích", type: "expense", icon: "receipt", color: "orange", is_default: true, hidden: 0 },
  { id: 6, name: "Học tập & Tri thức", type: "expense", icon: "book-open", color: "indigo", is_default: true, hidden: 0 },
  { id: 7, name: "Giải trí & Bạn bè", type: "expense", icon: "gamepad-2", color: "violet", is_default: true, hidden: 0 },
  { id: 8, name: "Y tế & Sức khỏe", type: "expense", icon: "heart-pulse", color: "red", is_default: true, hidden: 0 },
  { id: 9, name: "Khoản chi khác", type: "expense", icon: "circle-ellipsis", color: "emerald", is_default: true, hidden: 0 },
  { id: 10, name: "Tiền lương", type: "income", icon: "wallet", color: "emerald", is_default: true, hidden: 0 },
  { id: 11, name: "Tiền thưởng", type: "income", icon: "gift", color: "green", is_default: true, hidden: 0 },
  { id: 12, name: "Trợ cấp & Học bổng", type: "income", icon: "hand-coins", color: "teal", is_default: true, hidden: 0 },
  { id: 13, name: "Thu nhập khác", type: "income", icon: "plus-circle", color: "lime", is_default: true, hidden: 0 }
];

function initSeedData() {
  if (getStore("initialized", false)) return;

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const sampleTxs = [
    { id: 1, category_id: 1, type: "expense", amount: 45000, note: "Bún bò sáng", transaction_date: todayStr, transaction_time: "08:15" },
    { id: 2, category_id: 3, type: "expense", amount: 5000, note: "Gửi xe trường", transaction_date: todayStr, transaction_time: "09:00" },
    { id: 3, category_id: 1, type: "expense", amount: 35000, note: "Cơm trưa sinh viên", transaction_date: todayStr, transaction_time: "11:45" },
    { id: 4, category_id: 1, type: "expense", amount: 30000, note: "Trà sữa cùng bạn", transaction_date: todayStr, transaction_time: "15:30" },
    { id: 5, category_id: 12, type: "income", amount: 3500000, note: "Bố mẹ gửi tiền tháng", transaction_date: todayStr, transaction_time: "07:30" },
    { id: 6, category_id: 2, type: "expense", amount: 1200000, note: "Tiền phòng trọ", transaction_date: todayStr, transaction_time: "10:00" }
  ];

  const sampleDebts = [
    { id: 1, person_name: "Hoàng", direction: "they_owe_me", amount: 45000, note: "Tiền trà sữa hôm qua", created_at: todayStr, status: "pending" },
    { id: 2, person_name: "Tuấn", direction: "i_owe_them", amount: 30000, note: "Gửi xe tháng", created_at: todayStr, status: "pending" }
  ];

  setStore("transactions", sampleTxs);
  setStore("debts", sampleDebts);
  setStore("budget", { amount: 3500000 });
  setStore("pet", { mood: "happy", level: 3, exp: 140, next_level_exp: 200, name: "Mochi" });
  setStore("streak", 5);
  setStore("initialized", true);
}

export function handleMockRequest(url, method, body) {
  initSeedData();

  const path = url.replace(/^\/api/, "").split("?")[0];
  const params = new URLSearchParams(url.includes("?") ? url.split("?")[1] : "");

  // 1. AUTH
  if (path === "/auth/demo" && method === "POST") {
    const user = {
      id: null,
      username: "KhachTraiNghiem",
      display_name: "Khách trải nghiệm",
      is_demo: true,
      demo_expires_at: null
    };
    return { token: "demo-jwt-token-local", user };
  }

  if ((path === "/auth/login" || path === "/auth/register") && method === "POST") {
    const uname = (body && body.username) ? body.username.trim() : "sinhvien";
    const user = { id: 2, username: uname, display_name: uname, is_demo: false };
    return { token: "jwt-token-" + Date.now(), user };
  }

  if (path === "/auth/me") {
    return {
      user: {
        id: null,
        username: "KhachTraiNghiem",
        display_name: "Khách trải nghiệm",
        is_demo: true
      }
    };
  }

  if (path === "/auth/logout") {
    return { ok: true };
  }

  if (path === "/auth/sessions") {
    return [{ id: "sess-1", user_agent: "Mobile App", created_at: new Date().toISOString(), is_current: true }];
  }

  // 2. CATEGORIES
  if (path === "/categories") {
    if (method === "GET") {
      return DEFAULT_CATEGORIES;
    }
    if (method === "POST") {
      const newCat = { id: Date.now(), ...body, hidden: 0 };
      return newCat;
    }
  }

  // 3. TRANSACTIONS
  if (path === "/transactions") {
    const txs = getStore("transactions", []);
    if (method === "GET") {
      const q = params.get("q");
      const month = params.get("month");
      const type = params.get("type");
      let filtered = [...txs];
      if (month) filtered = filtered.filter((t) => (t.transaction_date || "").startsWith(month));
      if (type && type !== "all") filtered = filtered.filter((t) => t.type === type);
      if (q) filtered = filtered.filter((t) => (t.note || "").toLowerCase().includes(q.toLowerCase()));
      return filtered.sort((a, b) => (b.transaction_date + b.transaction_time || "").localeCompare(a.transaction_date + a.transaction_time || ""));
    }
    if (method === "POST") {
      const newTx = {
        id: Date.now(),
        ...body,
        transaction_date: body.transaction_date || new Date().toISOString().slice(0, 10),
        transaction_time: body.transaction_time || "12:00"
      };
      txs.unshift(newTx);
      setStore("transactions", txs);
      return newTx;
    }
  }

  if (path === "/transactions/batch" && method === "POST") {
    const txs = getStore("transactions", []);
    const items = (body && body.items) || [];
    for (const item of items) {
      txs.unshift({ id: Date.now() + Math.random(), ...item });
    }
    setStore("transactions", txs);
    return { count: items.length };
  }

  if (path.startsWith("/transactions/") && method === "DELETE") {
    const id = path.split("/")[2];
    let txs = getStore("transactions", []);
    txs = txs.filter((t) => String(t.id) !== String(id));
    setStore("transactions", txs);
    return { ok: true };
  }

  if (path === "/transactions/months") {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const m = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    return [m];
  }

  // 4. DASHBOARD
  if (path === "/dashboard/mini" || path === "/dashboard/today") {
    const txs = getStore("transactions", []);
    const todayIso = new Date().toISOString().slice(0, 10);
    const todayTxs = txs.filter((t) => t.transaction_date === todayIso);
    const spentToday = todayTxs.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalIncome = txs.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalExpense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
    const budget = getStore("budget", { amount: 3500000 }).amount;
    const pet = getStore("pet", { mood: "happy", level: 3, exp: 140, next_level_exp: 200, name: "Mochi" });
    const streak = getStore("streak", 5);

    return {
      today: todayIso,
      spent_today: spentToday,
      daily_allowance: Math.round(budget / 30),
      balance: totalIncome - totalExpense,
      pet,
      streak,
      nudge: { show: false, date: todayIso }
    };
  }

  if (path === "/dashboard") {
    const txs = getStore("transactions", []);
    const totalIncome = txs.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalExpense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
    return {
      total_income: totalIncome,
      total_expense: totalExpense,
      balance: totalIncome - totalExpense,
      category_breakdown: [
        { id: 1, name: "Ăn uống", total_amount: 115000, percentage: 60, color: "amber", icon: "utensils" },
        { id: 2, name: "Nhà cửa", total_amount: 1200000, percentage: 35, color: "blue", icon: "home" },
        { id: 3, name: "Di chuyển", total_amount: 5000, percentage: 5, color: "cyan", icon: "car" }
      ]
    };
  }

  if (path === "/dashboard/suggestions") {
    return [
      { name: "Gửi xe", amount: 5000, category_id: 3, category_name: "Di chuyển", icon: "car" },
      { name: "Cơm trưa", amount: 35000, category_id: 1, category_name: "Ăn uống", icon: "utensils" },
      { name: "Trà sữa", amount: 30000, category_id: 1, category_name: "Ăn uống", icon: "coffee" }
    ];
  }

  if (path === "/dashboard/nudge") {
    return { show: false, date: new Date().toISOString().slice(0, 10) };
  }

  if (path === "/dashboard/streak") {
    return { current_streak: 5, longest_streak: 14, dates: [] };
  }

  if (path === "/dashboard/calendar") {
    return {};
  }

  // 5. BUDGET
  if (path === "/budget") {
    if (method === "PUT") {
      setStore("budget", { amount: Number(body.amount || 3500000) });
      return { ok: true };
    }
    const b = getStore("budget", { amount: 3500000 });
    return { amount: b.amount, spent: 1355000, remaining: b.amount - 1355000 };
  }

  // 6. DEBTS
  if (path === "/debts") {
    const debts = getStore("debts", []);
    if (method === "GET") return debts;
    if (method === "POST") {
      const newDebt = { id: Date.now(), ...body, created_at: new Date().toISOString().slice(0, 10), status: "pending" };
      debts.unshift(newDebt);
      setStore("debts", debts);
      return newDebt;
    }
  }

  if (path === "/debts/splits") {
    return [];
  }

  if (path === "/debts/people") {
    return ["Hoàng", "Tuấn", "Linh", "Minh"];
  }

  // 7. CHALLENGES
  if (path === "/challenges") {
    if (method === "POST") {
      return { ok: true, id: Date.now() };
    }
    return [
      { id: 1, key: "tea", title: "Cắt giảm 40% trà sữa", days: 14, days_left: 9, target_amount: 150000, current_amount: 60000, status: "active" },
      { id: 2, key: "cook", title: "Tự nấu ăn tiết kiệm", days: 7, days_left: 4, target_amount: 200000, current_amount: 70000, status: "active" }
    ];
  }

  if (path === "/challenges/insights") {
    return { top_expense_category: "Ăn uống", suggested_challenge: "tea" };
  }

  // 8. PET SHOP
  if (path === "/pet-shop/items") {
    return [
      { id: 1, name: "Mũ phù thủy", price: 50, icon: "sparkles", owned: true, equipped: true },
      { id: 2, name: "Kính râm ngầu", price: 80, icon: "sun", owned: false, equipped: false },
      { id: 3, name: "Bóng đồ chơi", price: 30, icon: "circle-dot", owned: true, equipped: false }
    ];
  }

  if (path === "/pet-shop/pet") {
    return getStore("pet", { mood: "party", level: 3, exp: 140, next_level_exp: 200, name: "Mochi" });
  }

  // 9. SCAN VOICE / TEXT
  if (path === "/scan/voice" && method === "POST") {
    const text = (body && body.text) || "";
    const m = text.match(/(\d+)\s*(k|nghìn|nghin|ng|vnd|đ)?/i);
    let amount = 35000;
    if (m) {
      let num = parseInt(m[1], 10);
      if (m[2] && m[2].toLowerCase().startsWith("k") || m[2]?.startsWith("ng")) num *= 1000;
      else if (num < 1000) num *= 1000;
      amount = num;
    }
    return {
      items: [
        {
          amount,
          category_id: 1,
          type: "expense",
          note: text || "Khoản chi bằng giọng nói",
          date: new Date().toISOString().slice(0, 10),
          time: "12:00"
        }
      ]
    };
  }

  if (path === "/scan/text" && method === "POST") {
    return {
      amount: 50000,
      type: "expense",
      category_id: 1,
      note: "Giao dịch ngân hàng",
      date: new Date().toISOString().slice(0, 10),
      time: "12:00"
    };
  }

  // 10. WALLET & SURVEY
  if (path === "/wallet") {
    return { cash: 250000, bank: 3200000, system_balance: 3450000, diff: 0 };
  }

  if (path === "/wallet/check") {
    return { ok: true, matched: true };
  }

  if (path === "/survey/status") {
    return { answered: false, show: false };
  }

  // 11. GROUPS & LINKED DEBTS MOCK
  if (path === "/friends" && method === "GET") {
    const defaultFriends = [
      { id: 2, username: "VieJunZ", name: "VieJunZ", added_at: new Date().toISOString() },
      { id: 3, username: "rong.thanh.hoa", name: "Rồng Thanh Hóa", added_at: new Date().toISOString() }
    ];
    return { friends: getStore("friends", defaultFriends) };
  }

  if (path === "/friends" && method === "POST") {
    const list = getStore("friends", []);
    const target = (body && (body.target || body.friend_id)) || "ban_moi";
    const newFriend = { id: Date.now(), username: String(target).replace(/^[#@]/, ""), name: String(target), added_at: new Date().toISOString() };
    if (!list.some((f) => f.username === newFriend.username || f.id === newFriend.id)) {
      list.push(newFriend);
      setStore("friends", list);
    }
    return { message: "Đã thêm vào danh sách bạn bè!", friend: newFriend };
  }

  if (path.startsWith("/friends/") && method === "DELETE") {
    const fid = parseInt(path.split("/")[2], 10);
    const list = getStore("friends", []).filter((f) => f.id !== fid);
    setStore("friends", list);
    return { message: "Đã xóa khỏi danh sách bạn bè." };
  }

  if (path === "/debts/search-user") {
    const rawQ = (params.get("q") || "").replace(/^[#@]/, "").trim().toLowerCase();
    const mockUsers = [
      { id: 2, username: "VieJunZ", full_name: "VieJunZ" },
      { id: 3, username: "rong.thanh.hoa", full_name: "Rồng Thanh Hóa" }
    ];
    if (!rawQ) return { users: [] };
    const filtered = mockUsers.filter((u) =>
      String(u.id) === rawQ ||
      u.username.toLowerCase().includes(rawQ) ||
      u.full_name.toLowerCase().includes(rawQ)
    );
    return { users: filtered };
  }

  if (path === "/groups" && method === "GET") {
    const defaultGroups = [
      { id: 1, name: "Phòng Trọ 302", invite_code: "TRO302", member_count: 4, total_spent: 1200000, role: "owner" }
    ];
    return { groups: getStore("groups", defaultGroups) };
  }

  if (path === "/groups" && method === "POST") {
    const list = getStore("groups", []);
    const newG = {
      id: Date.now(),
      name: (body && body.name) || "Nhóm mới",
      invite_code: "NHOM" + Math.floor(100 + Math.random() * 900),
      member_count: 1,
      total_spent: 0,
      role: "owner"
    };
    list.unshift(newG);
    setStore("groups", list);
    return { group: newG };
  }

  if (path === "/groups/join" && method === "POST") {
    return { message: "Đã tham gia nhóm thành công!", group_id: 1 };
  }

  if (path.startsWith("/groups/") && method === "GET") {
    const gid = parseInt(path.split("/")[2], 10);
    return {
      group: { id: gid, name: "Phòng Trọ 302", invite_code: "TRO302" },
      my_role: "owner",
      total_spent: 1200000,
      fair_share: 300000,
      members: [
        { user_id: 1, username: "me", full_name: "Bạn", role: "owner", paid: 800000 },
        { user_id: 2, username: "anh", full_name: "Ngọc Ánh", role: "member", paid: 200000 },
        { user_id: 3, username: "tri", full_name: "Minh Trí", role: "member", paid: 200000 },
        { user_id: 4, username: "quynh", full_name: "Diễm Quỳnh", role: "member", paid: 0 }
      ],
      expenses: [
        { id: 1, amount: 650000, category_name: "Điện nước", note: "Tiền điện phòng tháng này", payer_name: "Bạn", created_at: new Date().toISOString() },
        { id: 2, amount: 550000, category_name: "Ăn uống", note: "Lẩu liên hoan phòng", payer_name: "Ngọc Ánh", created_at: new Date().toISOString() }
      ],
      settlements: [
        { from_name: "Diễm Quỳnh", to_name: "Bạn", amount: 300000 },
        { from_name: "Minh Trí", to_name: "Bạn", amount: 100000 }
      ]
    };
  }

  if (path.startsWith("/groups/") && path.endsWith("/expenses") && method === "POST") {
    return { expense: { id: Date.now(), amount: body && body.amount, note: body && body.note, created_at: new Date().toISOString() } };
  }

  // Default fallback
  return { ok: true };
}

