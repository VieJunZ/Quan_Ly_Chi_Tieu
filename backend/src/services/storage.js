// backend/src/services/storage.js
const fs = require("fs");
const path = require("path");
const { getDbPool, testDbConnection } = require("../config/db");

const DEFAULT_CATEGORIES = [
  { id: 1, name: "Ăn uống", type: "expense", icon: "utensils", color: "amber" },
  { id: 2, name: "Nhà cửa & Phòng trọ", type: "expense", icon: "home", color: "blue" },
  { id: 3, name: "Di chuyển & Xăng xe", type: "expense", icon: "car", color: "cyan" },
  { id: 4, name: "Mua sắm cá nhân", type: "expense", icon: "shopping-bag", color: "rose" },
  { id: 5, name: "Hóa đơn & Tiện ích", type: "expense", icon: "receipt", color: "orange" },
  { id: 6, name: "Học tập & Tri thức", type: "expense", icon: "book-open", color: "indigo" },
  { id: 7, name: "Giải trí & Bạn bè", type: "expense", icon: "gamepad-2", color: "violet" },
  { id: 8, name: "Y tế & Sức khỏe", type: "expense", icon: "heart-pulse", color: "red" },
  { id: 9, name: "Khoản chi khác", type: "expense", icon: "circle-ellipsis", color: "emerald" },
  { id: 10, name: "Tiền lương", type: "income", icon: "wallet", color: "emerald" },
  { id: 11, name: "Tiền thưởng", type: "income", icon: "gift", color: "green" },
  { id: 12, name: "Trợ cấp & Học bổng", type: "income", icon: "hand-coins", color: "teal" },
  { id: 13, name: "Thu nhập khác", type: "income", icon: "plus-circle", color: "lime" }
];

const DATA_DIR = path.resolve(__dirname, "../../data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function isDbEnabled() {
  return String(process.env.USE_DATABASE).toLowerCase() === "true";
}

function ensureLocalFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [],
      categories: DEFAULT_CATEGORIES,
      transactions: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf8");
  }
}

function readLocalDb() {
  ensureLocalFile();
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    return { users: [], categories: DEFAULT_CATEGORIES, transactions: [] };
  }
}

function writeLocalDb(data) {
  ensureLocalFile();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

function getCurrentMonthPrefix() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

const storage = {
  async init() {
    if (isDbEnabled()) {
      const test = await testDbConnection();
      if (test.connected) {
        console.log(" [DB] Đã kết nối thành công MySQL Database.");
        return { mode: "mysql", connected: true };
      } else {
        console.warn(" [DB] USE_DATABASE=true nhưng không thể kết nối MySQL (" + test.error + "). Tạm thời dùng Local Storage.");
        ensureLocalFile();
        return { mode: "local", connected: false, error: test.error };
      }
    } else {
      ensureLocalFile();
      console.log(" [Storage] Đang hoạt động ở chế độ Local File Storage (data/db.json).");
      return { mode: "local", connected: false };
    }
  },

  async getHealthStatus() {
    const usingDb = isDbEnabled();
    const dbTest = usingDb ? await testDbConnection() : { connected: false };
    return {
      status: "ok",
      storage_mode: usingDb && dbTest.connected ? "mysql" : "local",
      use_database_config: usingDb,
      db_connected: dbTest.connected,
      timestamp: new Date().toISOString()
    };
  },

  async findUserByUsername(username) {
    const cleanUsername = String(username).trim();
    if (isDbEnabled()) {
      try {
        const pool = getDbPool();
        const [rows] = await pool.query("SELECT * FROM users WHERE username = ? LIMIT 1", [cleanUsername]);
        return rows[0] || null;
      } catch (err) {
        console.error("Lỗi truy vấn users từ MySQL:", err.message);
      }
    }
    const db = readLocalDb();
    return db.users.find((u) => u.username.toLowerCase() === cleanUsername.toLowerCase()) || null;
  },

  async findUserById(id) {
    const numId = Number(id);
    if (isDbEnabled()) {
      try {
        const pool = getDbPool();
        const [rows] = await pool.query("SELECT id, username, created_at FROM users WHERE id = ? LIMIT 1", [numId]);
        return rows[0] || null;
      } catch (err) {
        console.error("Lỗi truy vấn user theo id từ MySQL:", err.message);
      }
    }
    const db = readLocalDb();
    const user = db.users.find((u) => Number(u.id) === numId);
    if (!user) return null;
    const { password, ...safeUser } = user;
    return safeUser;
  },

  async createUser({ username, password }) {
    const cleanUsername = String(username).trim();
    if (isDbEnabled()) {
      try {
        const pool = getDbPool();
        const [result] = await pool.query(
          "INSERT INTO users (username, password) VALUES (?, ?)",
          [cleanUsername, password]
        );
        return { id: result.insertId, username: cleanUsername };
      } catch (err) {
        console.error("Lỗi tạo user trong MySQL:", err.message);
      }
    }
    const db = readLocalDb();
    const newId = db.users.length ? Math.max(...db.users.map((u) => Number(u.id) || 0)) + 1 : 1;
    const newUser = {
      id: newId,
      username: cleanUsername,
      password,
      created_at: new Date().toISOString()
    };
    db.users.push(newUser);
    writeLocalDb(db);
    return { id: newUser.id, username: newUser.username };
  },

  async getCategories(type) {
    if (isDbEnabled()) {
      try {
        const pool = getDbPool();
        let sql = "SELECT id, name, type, icon, color FROM categories";
        const params = [];
        if (type) {
          sql += " WHERE type = ?";
          params.push(type);
        }
        sql += " ORDER BY id ASC";
        const [rows] = await pool.query(sql, params);
        if (rows.length > 0) return rows;
      } catch (err) {
        console.error("Lỗi lấy categories từ MySQL:", err.message);
      }
    }
    const db = readLocalDb();
    let categories = db.categories || DEFAULT_CATEGORIES;
    if (type) {
      categories = categories.filter((c) => c.type === type);
    }
    return categories;
  },

  async getCategoryById(id) {
    const numId = Number(id);
    if (isDbEnabled()) {
      try {
        const pool = getDbPool();
        const [rows] = await pool.query("SELECT * FROM categories WHERE id = ? LIMIT 1", [numId]);
        if (rows[0]) return rows[0];
      } catch (err) {
        console.error("Lỗi lấy category by id từ MySQL:", err.message);
      }
    }
    const db = readLocalDb();
    const categories = db.categories || DEFAULT_CATEGORIES;
    return categories.find((c) => Number(c.id) === numId) || null;
  },

  async createTransaction({ user_id, category_id, amount, note, transaction_date }) {
    const record = {
      user_id: Number(user_id),
      category_id: Number(category_id),
      amount: Number(amount),
      note: String(note || "").trim(),
      transaction_date: String(transaction_date).slice(0, 10)
    };

    if (isDbEnabled()) {
      try {
        const pool = getDbPool();
        const [result] = await pool.query(
          "INSERT INTO transactions (user_id, category_id, amount, note, transaction_date) VALUES (?, ?, ?, ?, ?)",
          [record.user_id, record.category_id, record.amount, record.note, record.transaction_date]
        );
        return { transaction_id: result.insertId, amount: record.amount };
      } catch (err) {
        console.error("Lỗi thêm transaction trong MySQL:", err.message);
      }
    }

    const db = readLocalDb();
    const newId = db.transactions.length ? Math.max(...db.transactions.map((t) => Number(t.id) || 0)) + 1 : 1;
    const newTrans = {
      id: newId,
      ...record,
      created_at: new Date().toISOString()
    };
    db.transactions.push(newTrans);
    writeLocalDb(db);
    return { transaction_id: newTrans.id, amount: newTrans.amount };
  },

  async getDashboard(userId) {
    const numUserId = Number(userId);
    const monthPrefix = getCurrentMonthPrefix();

    if (isDbEnabled()) {
      try {
        const pool = getDbPool();
        // Lấy thống kê thu chi trong tháng
        const [stats] = await pool.query(
          `SELECT 
            COALESCE(SUM(CASE WHEN c.type = 'income' THEN t.amount ELSE 0 END), 0) AS total_income,
            COALESCE(SUM(CASE WHEN c.type = 'expense' THEN t.amount ELSE 0 END), 0) AS total_expense
          FROM transactions t
          JOIN categories c ON t.category_id = c.id
          WHERE t.user_id = ? AND t.transaction_date LIKE ?`,
          [numUserId, `${monthPrefix}%`]
        );

        const totalIncome = Number(stats[0]?.total_income || 0);
        const totalExpense = Number(stats[0]?.total_expense || 0);

        // Lấy danh sách giao dịch gần nhất kèm thông tin danh mục
        const [recent] = await pool.query(
          `SELECT 
            t.id, t.user_id, t.category_id, t.amount, t.note, 
            DATE_FORMAT(t.transaction_date, '%Y-%m-%d') AS transaction_date,
            c.type, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
          FROM transactions t
          JOIN categories c ON t.category_id = c.id
          WHERE t.user_id = ?
          ORDER BY t.transaction_date DESC, t.id DESC
          LIMIT 30`,
          [numUserId]
        );

        return {
          total_income: totalIncome,
          total_expense: totalExpense,
          balance: totalIncome - totalExpense,
          recent_transactions: recent
        };
      } catch (err) {
        console.error("Lỗi lấy dashboard từ MySQL:", err.message);
      }
    }

    const db = readLocalDb();
    const categories = db.categories || DEFAULT_CATEGORIES;
    const catMap = new Map(categories.map((c) => [Number(c.id), c]));

    const userTrans = (db.transactions || []).filter((t) => Number(t.user_id) === numUserId);
    const monthTrans = userTrans.filter((t) => String(t.transaction_date).startsWith(monthPrefix));

    let totalIncome = 0;
    let totalExpense = 0;

    for (const t of monthTrans) {
      const cat = catMap.get(Number(t.category_id));
      const type = cat?.type || "expense";
      if (type === "income") {
        totalIncome += Number(t.amount);
      } else {
        totalExpense += Number(t.amount);
      }
    }

    const recentTransactions = [...userTrans]
      .sort((a, b) => {
        const dateCmp = b.transaction_date.localeCompare(a.transaction_date);
        return dateCmp !== 0 ? dateCmp : Number(b.id) - Number(a.id);
      })
      .slice(0, 30)
      .map((t) => {
        const cat = catMap.get(Number(t.category_id));
        return {
          ...t,
          type: cat?.type || "expense",
          category_name: cat?.name || "Khác",
          category_icon: cat?.icon || "circle-ellipsis",
          category_color: cat?.color || "blue"
        };
      });

    return {
      total_income: totalIncome,
      total_expense: totalExpense,
      balance: totalIncome - totalExpense,
      recent_transactions: recentTransactions
    };
  }
};

module.exports = storage;
