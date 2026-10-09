(function () {
  const apiBaseUrl = window.APP_CONFIG?.apiBaseUrl || "http://localhost:8080";
  const useMock = window.APP_CONFIG?.useMock !== false;
  const storageKeys = {
    transactions: "sochi_demo_transactions",
    token: "sochi_session_token",
    user: "sochi_session_user"
  };

  let availableCategories = [];

  function normalizeType(type) {
    if (type === "thu" || type === "income") return "income";
    if (type === "chi" || type === "expense") return "expense";
    return "";
  }

  function normalizeCategory(category) {
    return { ...category, type: normalizeType(category.type) || category.type };
  }

  function normalizeDashboard(data) {
    const transactions = (data.recent_transactions || []).map((record) => {
      const category = availableCategories.find((item) => Number(item.id) === Number(record.category_id));
      return {
        ...record,
        category_id: Number(record.category_id),
        transaction_date: String(record.transaction_date || "").slice(0, 10),
        type: normalizeType(record.type) || category?.type || "expense"
      };
    });
    return {
      ...data,
      total_income: Number(data.total_income) || 0,
      total_expense: Number(data.total_expense) || 0,
      balance: Number(data.balance) || 0,
      recent_transactions: transactions
    };
  }

  function localDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function readTransactions() {
    let stored;
    try {
      stored = JSON.parse(localStorage.getItem(storageKeys.transactions) || "[]");
    } catch {
      stored = [];
    }
    if (!Array.isArray(stored)) stored = [];
    const records = stored.filter((record) => !/^demo-(?:[1-9]|1[0-2])$/.test(String(record.id)));
    if (records.length !== stored.length || localStorage.getItem(storageKeys.transactions) === null) {
      localStorage.setItem(storageKeys.transactions, JSON.stringify(records));
    }
    return records;
  }

  async function request(path, options = {}) {
    const token = localStorage.getItem(storageKeys.token);
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || "Không thể kết nối máy chủ.");
      error.status = response.status;
      error.code = payload.error_code;
      throw error;
    }
    return payload.data ?? payload;
  }

  const demoApi = {
    async login(username) {
      const user = { id: 1, username: username.trim() };
      localStorage.setItem(storageKeys.user, JSON.stringify(user));
      localStorage.setItem(storageKeys.token, "sochi-demo-token");
      return { token: "sochi-demo-token", user_id: user.id, user };
    },
    async register(username) {
      return this.login(username);
    },
    async getCategories(type) {
      return availableCategories.filter((category) => !type || category.type === type);
    },
    async getDashboard() {
      const records = readTransactions();
      const currentMonth = localDate(new Date()).slice(0, 7);
      const monthRecords = records.filter((item) => item.transaction_date.startsWith(currentMonth));
      const totalIncome = monthRecords.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
      const totalExpense = monthRecords.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
      return {
        total_income: totalIncome,
        total_expense: totalExpense,
        balance: totalIncome - totalExpense,
        recent_transactions: [...records].sort((a, b) => b.transaction_date.localeCompare(a.transaction_date)).slice(0, 30)
      };
    },
    async createTransaction(transaction) {
      const records = readTransactions();
      const category = availableCategories.find((item) => Number(item.id) === Number(transaction.category_id));
      const record = {
        ...transaction,
        id: `demo-${Date.now()}`,
        category_id: Number(transaction.category_id),
        type: category?.type || transaction.type
      };
      records.push(record);
      localStorage.setItem(storageKeys.transactions, JSON.stringify(records));
      return { transaction_id: record.id, amount: record.amount };
    }
  };

  window.sochiApi = {
    useMock,
    async login(username, password) {
      if (useMock) return demoApi.login(username);
      const result = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
      if (result.token) localStorage.setItem(storageKeys.token, result.token);
      localStorage.setItem(storageKeys.user, JSON.stringify({ id: result.user_id, username }));
      return result;
    },
    async register(username, password) {
      if (useMock) return demoApi.register(username);
      const result = await request("/api/auth/register", { method: "POST", body: JSON.stringify({ username, password }) });
      if (result.token) localStorage.setItem(storageKeys.token, result.token);
      localStorage.setItem(storageKeys.user, JSON.stringify({ id: result.user_id, username }));
      return result;
    },
    async getCategories(type) {
      if (useMock) return demoApi.getCategories(type);
      const result = await request("/api/categories");
      availableCategories = (Array.isArray(result) ? result : result.categories || []).map(normalizeCategory);
      return availableCategories.filter((category) => !type || category.type === type);
    },
    async getDashboard() {
      if (useMock) return demoApi.getDashboard();
      return normalizeDashboard(await request("/api/dashboard"));
    },
    async createTransaction(transaction) {
      if (useMock) return demoApi.createTransaction(transaction);
      const { type, ...contract } = transaction;
      return request("/api/transactions", { method: "POST", body: JSON.stringify(contract) });
    },
    getCurrentUser() {
      try { return JSON.parse(localStorage.getItem(storageKeys.user) || "null"); } catch { return null; }
    }
  };
})();