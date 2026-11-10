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
      received_today: totalIncome,
      transaction_count: todayTxs.length,
      budget: {
        amount: budget,
        spent_month: totalExpense,
        remaining_month: budget - totalExpense,
        daily_allowance: Math.round(budget / 30),
        left_today: Math.max(0, Math.round(budget / 30) - spentToday),
        days_left: 20
      },
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
      recent_transactions: txs.slice(0, 10),
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
    const debts = getStore("debts", [
      { id: 1, person_name: "Hoàng", direction: "owed_to_me", amount: 45000, note: "Tiền trà sữa hôm qua", created_at: new Date().toISOString().slice(0, 10), status: "pending" },
      { id: 2, person_name: "Tuấn", direction: "i_owe", amount: 30000, note: "Gửi xe tháng", created_at: new Date().toISOString().slice(0, 10), status: "pending" }
    ]);
    if (method === "GET") {
      const open = debts.filter((d) => d.status === "pending");
      const history = debts.filter((d) => d.status === "settled");
      const owedToMe = open.filter((d) => d.direction === "owed_to_me" || d.direction === "they_owe_me").reduce((s, d) => s + (d.amount || 0), 0);
      const iOwe = open.filter((d) => d.direction === "i_owe" || d.direction === "i_owe_them").reduce((s, d) => s + (d.amount || 0), 0);
      return {
        owed_to_me: owedToMe,
        i_owe: iOwe,
        open,
        history,
        people: [
          { person_name: "Hoàng", net_amount: 45000, open_count: 1 },
          { person_name: "Tuấn", net_amount: -30000, open_count: 1 }
        ]
      };
    }
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
    const todayIso = new Date().toISOString();
    return {
      active: [
        {
          id: 1,
          key: "tea",
          title: "Cắt giảm 40% trà sữa",
          icon: "coffee",
          days: 14,
          days_left: 9,
          end_date: new Date(Date.now() + 9 * 86400000).toISOString(),
          status: "active",
          progress: { unit: "money", value: 60000, target: 150000, left: 90000, per_day: 10000 }
        },
        {
          id: 2,
          key: "cook",
          title: "Tự nấu ăn tiết kiệm",
          icon: "utensils",
          days: 7,
          days_left: 4,
          end_date: new Date(Date.now() + 4 * 86400000).toISOString(),
          status: "active",
          progress: { unit: "money", value: 70000, target: 200000, left: 130000, per_day: 32500 }
        }
      ],
      finished: [],
      suggestions: [
        {
          key: "tea",
          name: "Cắt trà sữa",
          icon: "coffee",
          reason: "Tiết kiệm 150k mỗi tuần",
          targets: { 7: { light: { title: "Uống ít hơn 2 ly trà sữa" }, medium: { title: "Uống ít hơn 1 ly trà sữa" } } }
        }
      ],
      badges: [
        { key: "streak3", name: "Chiến thần ghi chép", earned: true }
      ],
      stats: {
        badges: 3,
        badges_total: 10,
        active: 2,
        won: 1
      }
    };
  }

  if (path === "/challenges/insights") {
    return { top_expense_category: "Ăn uống", suggested_challenge: "tea" };
  }

  // 8. PET SHOP
  if (path === "/pet-shop/items") {
    const storeStats = getStore("pet_stats", { coins: 150, pet_fullness: 80, badge_points: 3 });
    const defaultItems = [
      { id: "egg_elemental", name: "Trứng Linh Thú Ngũ Hành", slot: "egg", price_coins: 80, price_badges: 1, rarity: "rare", description: "Mở ngẫu nhiên 1 trong 5 Linh Thú Ngũ Hành hoặc 20% Thần Thú", owned_quantity: 0, is_equipped: false },
      { id: "egg_divine", name: "Trứng Thần Thú Thượng Cổ", slot: "egg", price_coins: 160, price_badges: 2, rarity: "legendary", description: "Mở ngẫu nhiên 1 trong 5 Thần Thú Thượng Cổ cực hiếm", owned_quantity: 0, is_equipped: false },
      { id: "pet_moc", name: "Linh Thú Mộc (Mộc Linh Nhi)", slot: "pet", price_coins: 0, price_badges: 1, rarity: "rare", description: "Gieo mầm tiết kiệm, gặt hái tương lai xanh tươi!", owned_quantity: 0, is_equipped: false },
      { id: "pet_hoa", name: "Linh Thú Hỏa (Xích Viêm Linh)", slot: "pet", price_coins: 0, price_badges: 1, rarity: "rare", description: "Ngọn lửa kỷ luật tài chính bừng cháy trong từng khoản chi!", owned_quantity: 0, is_equipped: false },
      { id: "food_noddles_dragon", name: "Mì tôm thanh long", slot: "consumable", price_coins: 15, price_badges: 0, rarity: "common", description: "Đặc sản cứu đói tăng 30 điểm no bụng", owned_quantity: 2, is_equipped: false }
    ];
    return {
      success: true,
      coins: storeStats.coins,
      pet_fullness: storeStats.pet_fullness,
      badge_points: storeStats.badge_points,
      items: getStore("pet_items", defaultItems)
    };
  }

  if (path === "/pet-shop/pet") {
    return {
      success: true,
      pet: getStore("pet", { mood: "happy", level: 3, exp: 140, next_level_exp: 200, name: "Mochi", badge_points: 3, equipped: {} })
    };
  }

  if (path === "/pet-shop/hatch-egg" && method === "POST") {
    const eggId = (body && body.egg_id) || "egg_elemental";
    const payWith = (body && body.pay_with) || "badges";
    const storeStats = getStore("pet_stats", { coins: 150, pet_fullness: 80, badge_points: 3 });

    const pool = eggId === "egg_divine"
      ? [
          { id: "pet_thanhlong", name: "Thần Thú Thanh Long (Tử Long Dạ Châu)", rarity: "legendary" },
          { id: "pet_bachho", name: "Thần Thú Bạch Hổ (Chiêu Tài Bạch Hổ)", rarity: "legendary" },
          { id: "pet_chutuoc", name: "Thần Thú Chu Tước (Hỏa Diễm Phượng Hoàng)", rarity: "legendary" },
          { id: "pet_huyenvu", name: "Thần Thú Huyền Vũ (Huyền Vũ Trấn Khố)", rarity: "legendary" },
          { id: "pet_kylan", name: "Thần Thú Kỳ Lân (Cát Tường Kỳ Lân)", rarity: "legendary" }
        ]
      : [
          { id: "pet_moc", name: "Linh Thú Mộc (Mộc Linh Nhi)", rarity: "rare" },
          { id: "pet_hoa", name: "Linh Thú Hỏa (Xích Viêm Linh)", rarity: "rare" },
          { id: "pet_tho", name: "Linh Thú Thổ (Thạch Thổ Linh)", rarity: "rare" },
          { id: "pet_kim", name: "Linh Thú Kim (Hoàng Kim Linh)", rarity: "rare" },
          { id: "pet_thuy", name: "Linh Thú Thủy (Lam Thủy Linh)", rarity: "rare" },
          { id: "pet_thanhlong", name: "Thần Thú Thanh Long (Tử Long Dạ Châu)", rarity: "legendary" }
        ];

    const hatched = pool[Math.floor(Math.random() * pool.length)];

    if (payWith === "coins") {
      storeStats.coins = Math.max(0, storeStats.coins - (eggId === "egg_divine" ? 160 : 80));
    } else {
      storeStats.badge_points = Math.max(0, storeStats.badge_points - (eggId === "egg_divine" ? 2 : 1));
    }
    setStore("pet_stats", storeStats);

    return {
      success: true,
      message: `Chúc mừng bạn! Quả trứng đã nở ra: ${hatched.name}!`,
      is_new: true,
      egg: { id: eggId, name: eggId === "egg_divine" ? "Trứng Thần Thú Thượng Cổ" : "Trứng Linh Thú Ngũ Hành" },
      pet: {
        id: hatched.id,
        name: hatched.name,
        slot: "pet",
        rarity: hatched.rarity,
        description: "Linh thú đồng hành đắc lực của bạn",
        effect_data: "{}",
        is_new: true,
        is_equipped: true
      },
      duplicate_reward: null,
      coins: storeStats.coins,
      badge_points: storeStats.badge_points,
      pet_fullness: storeStats.pet_fullness
    };
  }

  if (path === "/pet-shop/buy" && method === "POST") {
    const storeStats = getStore("pet_stats", { coins: 150, pet_fullness: 80, badge_points: 3 });
    return {
      success: true,
      coins: storeStats.coins,
      badge_points: storeStats.badge_points
    };
  }

  if (path === "/pet-shop/equip" && method === "POST") {
    return { success: true };
  }

  if (path === "/pet-shop/use" && method === "POST") {
    const storeStats = getStore("pet_stats", { coins: 150, pet_fullness: 80, badge_points: 3 });
    storeStats.pet_fullness = Math.min(100, storeStats.pet_fullness + 30);
    setStore("pet_stats", storeStats);
    return { success: true, pet_fullness: storeStats.pet_fullness };
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

