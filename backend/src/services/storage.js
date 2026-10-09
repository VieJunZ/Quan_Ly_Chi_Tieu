/**
 * @file storage.js
 * @description Lớp trừu tượng hóa tầng dữ liệu (Data Access Layer / Storage Abstraction).
 * Hỗ trợ chế độ linh hoạt (Dual Storage Mode):
 *  - Chế độ 1 (USE_DATABASE=false): Tự động lưu trữ cục bộ vào file JSON (backend/data/db.json).
 *    Giúp chạy server, đăng ký, đăng nhập, thêm giao dịch ngay tức thì mà không cần cài đặt MySQL.
 *  - Chế độ 2 (USE_DATABASE=true): Tự động chuyển đổi sang truy vấn trực tiếp CSDL MySQL 8.0.
 */

const fs = require("fs");
const path = require("path");
const { getDbPool, testDbConnection } = require("../config/db");

/**
 * Danh sách 13 danh mục thu/chi mặc định, đồng bộ với Lucide Icons và màu sắc giao diện.
 */
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

// Đường dẫn file lưu trữ dữ liệu cục bộ
const DATA_DIR = path.resolve(__dirname, "../../data");
const DB_FILE = path.join(DATA_DIR, "db.json");

/**
 * Kiểm tra xem cấu hình biến môi trường có bật kết nối CSDL MySQL không.
 * @returns {boolean}
 */
function isDbEnabled() {
  return String(process.env.USE_DATABASE).toLowerCase() === "true";
}

/**
 * Khởi tạo thư mục và file JSON lưu trữ cục bộ nếu chưa tồn tại.
 */
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

/**
 * Đọc toàn bộ dữ liệu từ file JSON cục bộ.
 * @returns {{users: Array, categories: Array, transactions: Array}}
 */
function readLocalDb() {
  ensureLocalFile();
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    return { users: [], categories: DEFAULT_CATEGORIES, transactions: [] };
  }
}

/**
 * Ghi đè dữ liệu mới vào file JSON cục bộ.
 * @param {object} data
 */
function writeLocalDb(data) {
  ensureLocalFile();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Lấy chuỗi tiền tố tháng hiện tại theo định dạng 'YYYY-MM' (ví dụ: '2026-10').
 * @returns {string}
 */
function getCurrentMonthPrefix() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

const storage = {
  /**
   * Khởi động tầng lưu trữ, kiểm tra tình trạng kết nối CSDL khi chạy server.
   * @async
   * @returns {Promise<{mode: string, connected: boolean, error?: string}>}
   */
  async init() {
    if (isDbEnabled()) {
      const test = await testDbConnection();
      if (test.connected) {
        console.log(" [DB] Đã kết nối thành công CSDL MySQL.");
        return { mode: "mysql", connected: true };
      } else {
        console.warn(" [DB] USE_DATABASE=true nhưng chưa kết nối được MySQL (" + test.error + "). Tự động fallback sang Local File Storage.");
        ensureLocalFile();
        return { mode: "local", connected: false, error: test.error };
      }
    } else {
      ensureLocalFile();
      console.log(" [Storage] Đang hoạt động ở chế độ Local File Storage (data/db.json).");
      return { mode: "local", connected: false };
    }
  },

  /**
   * Lấy thông tin trạng thái hoạt động của tầng lưu trữ cho endpoint /api/health.
   * @async
   * @returns {Promise<object>}
   */
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

  /**
   * Tìm kiếm người dùng theo tên đăng nhập (Username).
   * @async
   * @param {string} username
   * @returns {Promise<object|null>} Đối tượng người dùng kèm mật khẩu băm
   */
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

  /**
   * Tìm kiếm thông tin công khai của người dùng theo ID (đã lược bỏ mật khẩu).
   * @async
   * @param {number} id
   * @returns {Promise<object|null>}
   */
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

  /**
   * Tạo tài khoản người dùng mới vào hệ thống.
   * @async
   * @param {{username: string, password: string}} param0
   * @returns {Promise<{id: number, username: string}>}
   */
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

  /**
   * Lấy danh sách các danh mục thu nhập và chi tiêu.
   * @async
   * @param {string} [type] - Tùy chọn lọc: 'income' hoặc 'expense'
   * @returns {Promise<Array<object>>}
   */
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

  /**
   * Lấy thông tin chi tiết một danh mục theo ID.
   * @async
   * @param {number} id
   * @returns {Promise<object|null>}
   */
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

  /**
   * Tạo giao dịch thu nhập hoặc chi tiêu mới liên kết với người dùng.
   * @async
   * @param {{user_id: number, category_id: number, amount: number, note: string, transaction_date: string}} transaction
   * @returns {Promise<{transaction_id: number, amount: number}>}
   */
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

  /**
   * Tính toán thống kê Dashboard (Tổng thu, tổng chi tháng này, số dư và danh sách giao dịch gần nhất).
   * @async
   * @param {number} userId - ID của người dùng đăng nhập
   * @returns {Promise<{total_income: number, total_expense: number, balance: number, recent_transactions: Array}>}
   */
  async getDashboard(userId) {
    const numUserId = Number(userId);
    const monthPrefix = getCurrentMonthPrefix();

    if (isDbEnabled()) {
      try {
        const pool = getDbPool();
        // 1. Tính tổng thu và tổng chi trong tháng hiện tại
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

        // 2. Lấy danh sách giao dịch gần nhất kèm thông tin danh mục
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

    // Xử lý tính toán khi ở chế độ Local File Storage
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
