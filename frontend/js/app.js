(function () {
  "use strict";

  const api = window.sochiApi;
  const byId = (id) => document.getElementById(id);
  const qAll = (sel) => Array.from(document.querySelectorAll(sel));

  // --- DỮ LIỆU MẪU MINH HỌA (Dành cho tài khoản mới hoặc khách xem thử) ---
  const DEMO_DASHBOARD = {
    balance: 18450000,
    total_income: 24500000,
    total_expense: 6050000,
    category_breakdown: [
      { id: 1, name: "Ăn uống & Cà phê", type: "expense", total_amount: 2540000, percentage: 42, color: "rose", icon: "coffee" },
      { id: 2, name: "Nhà ở & Dịch vụ", type: "expense", total_amount: 2000000, percentage: 33, color: "violet", icon: "home" },
      { id: 3, name: "Mua sắm & Thiết bị", type: "expense", total_amount: 1510000, percentage: 25, color: "cyan", icon: "shopping-bag" }
    ],
    recent_transactions: [
      { id: "demo-1", category_id: 1, category_name: "Ăn uống", type: "expense", amount: 45000, note: "Cà phê & Đồ uống sáng", transaction_date: getOffsetDate(0) },
      { id: "demo-2", category_id: 1, category_name: "Ăn uống", type: "expense", amount: 150000, note: "Ăn trưa cùng đồng nghiệp", transaction_date: getOffsetDate(1) },
      { id: "demo-3", category_id: 3, category_name: "Thu nhập", type: "income", amount: 8500000, note: "Thù lao dự án ngoài", transaction_date: getOffsetDate(2) },
      { id: "demo-4", category_id: 2, category_name: "Nhà ở", type: "expense", amount: 2000000, note: "Tiền thuê nhà & điện nước", transaction_date: getOffsetDate(3) },
      { id: "demo-5", category_id: 3, category_name: "Mua sắm", type: "expense", amount: 1200000, note: "Mua tài liệu & đồ dùng cá nhân", transaction_date: getOffsetDate(4) },
      { id: "demo-6", category_id: 3, category_name: "Thu nhập", type: "income", amount: 16000000, note: "Lương hàng tháng", transaction_date: getOffsetDate(5) }
    ]
  };

  function getOffsetDate(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  }

  // --- 1. STATE ---
  const state = {
    theme: localStorage.getItem("sochi_theme") || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"),
    privacy: localStorage.getItem("sochi_privacy") === "true",
    currentView: "dashboard",
    currentUser: api.getCurrentUser(),
    dashboard: null,
    categories: [],
    transactions: [],
    filter: {
      search: "",
      type: "all",
      category_id: "",
      month: ""
    },
    txModalType: "expense",
    authMode: "login",
    toastTimer: null,
    isUsingDemoFallback: false
  };

  // --- 2. HELPERS ---
  function money(value, compact = false) {
    if (state.privacy) return "••••••••\u00A0₫";
    const amount = Number(value) || 0;
    if (compact && Math.abs(amount) >= 1000000) {
      return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(amount / 1000000)}\u00A0tr\u00A0₫`;
    }
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(amount)}\u00A0₫`;
  }

  function escapeHtml(val) {
    return String(val ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  function formatDate(isoStr) {
    if (!isoStr) return "";
    const [y, m, d] = String(isoStr).slice(0, 10).split("-");
    if (!y || !m || !d) return isoStr;
    return `${d}/${m}/${y}`;
  }

  function showToast(message, isSuccess = true) {
    const toast = byId("toastNotice");
    const toastMsg = byId("toastMsg");
    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    toast.classList.add("show");

    if (state.toastTimer) clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 3200);
  }

  function renderIcons() {
    if (window.lucide?.createIcons) {
      window.lucide.createIcons();
    }
  }

  // --- 3. THEME MANAGEMENT ---
  function setTheme(newTheme) {
    state.theme = newTheme;
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("sochi_theme", newTheme);

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute("content", newTheme === "dark" ? "#080c14" : "#f8fafc");
    }

    const themeIcon = byId("themeIcon");
    if (themeIcon) {
      themeIcon.setAttribute("data-lucide", newTheme === "dark" ? "sun" : "moon");
    }

    const authThemeIcon = byId("authThemeIcon");
    if (authThemeIcon) {
      authThemeIcon.setAttribute("data-lucide", newTheme === "dark" ? "sun" : "moon");
    }

    const profileThemeBtnText = byId("profileThemeBtnText");
    if (profileThemeBtnText) {
      profileThemeBtnText.textContent = newTheme === "dark" ? "Chuyển Chế Độ Sáng" : "Chuyển Chế Độ Tối";
    }

    renderIcons();
  }

  function toggleTheme() {
    setTheme(state.theme === "dark" ? "light" : "dark");
  }

  // --- 4. PRIVACY TOGGLE ---
  function togglePrivacy() {
    state.privacy = !state.privacy;
    localStorage.setItem("sochi_privacy", state.privacy ? "true" : "false");

    const privacyIcon = byId("privacyIcon");
    if (privacyIcon) {
      privacyIcon.setAttribute("data-lucide", state.privacy ? "eye-off" : "eye");
    }
    const dashPrivacyIcon = byId("dashPrivacyToggle")?.querySelector("i");
    if (dashPrivacyIcon) {
      dashPrivacyIcon.setAttribute("data-lucide", state.privacy ? "eye-off" : "eye");
    }

    renderDashboard();
    renderAnalytics();
    renderTransactions();
    renderIcons();
  }

  // --- 5. SPA ROUTING ---
  function navigateTo(viewName) {
    if (viewName === "auth") {
      byId("appShell").style.display = "none";
      byId("authView").style.display = "flex";
      renderIcons();
      return;
    }

    byId("authView").style.display = "none";
    byId("appShell").style.display = "flex";

    state.currentView = viewName;

    // Update active view pane
    qAll(".view-pane").forEach((pane) => {
      pane.classList.remove("active");
    });
    const targetPane = byId(`${viewName}View`);
    if (targetPane) targetPane.classList.add("active");

    // Update sidebar navigation
    qAll(".nav-link").forEach((link) => {
      link.classList.toggle("is-active", link.dataset.navigate === viewName);
    });

    // Update mobile navigation
    qAll(".mobile-nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.navigate === viewName);
    });

    // Update breadcrumb
    const titles = {
      dashboard: "Tổng quan",
      transactions: "Sổ giao dịch",
      analytics: "Phân tích tài chính",
      profile: "Tài khoản cá nhân"
    };
    byId("breadcrumbCurrent").textContent = titles[viewName] || "Tổng quan";

    // Trigger render
    if (viewName === "dashboard") renderDashboard();
    if (viewName === "transactions") renderTransactions();
    if (viewName === "analytics") renderAnalytics();
    if (viewName === "profile") renderProfile();

    renderIcons();
  }

  // --- 6. DATA RENDERING ---

  // A. Dashboard View
  function renderDashboard() {
    let d = state.dashboard;
    const user = state.currentUser;

    // If user has no transactions or is guest, use rich sample data so page is never barren
    if (!d || (!d.recent_transactions?.length && !user)) {
      d = DEMO_DASHBOARD;
      state.isUsingDemoFallback = true;
    } else if (d && !d.recent_transactions?.length) {
      // Logged-in user with 0 transactions
      d = { ...DEMO_DASHBOARD, balance: 0, total_income: 0, total_expense: 0, recent_transactions: [] };
      state.isUsingDemoFallback = false;
    } else {
      state.isUsingDemoFallback = false;
    }

    // Toggle demo banner
    const demoBanner = byId("dashDemoBanner");
    if (demoBanner) {
      demoBanner.style.display = state.isUsingDemoFallback ? "flex" : "none";
    }

    // Greeting
    byId("dashGreeting").textContent = user ? `Xin chào, ${user.username} 👋` : "Xin chào bạn 👋";

    // Virtual Card Details
    byId("dashBalanceDisplay").textContent = money(d.balance ?? 0);
    byId("cardHolderName").textContent = user ? (user.username || "THÀNH VIÊN").toUpperCase() : "THÀNH VIÊN";

    // Quick Stats
    byId("dashIncomeDisplay").textContent = `+${money(d.total_income ?? 0)}`;
    byId("dashExpenseDisplay").textContent = `-${money(d.total_expense ?? 0)}`;

    // Mini 7-day flow chart
    renderMiniFlowChart(d.recent_transactions?.length ? d.recent_transactions : DEMO_DASHBOARD.recent_transactions);

    // Top categories
    renderTopCategories(d.category_breakdown?.length ? d.category_breakdown : DEMO_DASHBOARD.category_breakdown);

    // Recent transactions
    renderRecentTransactions(d.recent_transactions?.length ? d.recent_transactions : DEMO_DASHBOARD.recent_transactions);

    renderIcons();
  }

  function renderMiniFlowChart(records) {
    const container = byId("dashFlowChart");
    if (!container) return;

    const now = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - i));
      const iso = date.toISOString().slice(0, 10);
      const dayRecords = (records || []).filter((r) => String(r.transaction_date).startsWith(iso));
      const inc = dayRecords.filter((r) => r.category_type === "income" || r.type === "income").reduce((s, r) => s + Number(r.amount), 0);
      const exp = dayRecords.filter((r) => r.category_type === "expense" || r.type === "expense").reduce((s, r) => s + Number(r.amount), 0);
      return {
        iso,
        label: new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(date).replace("Th ", "T"),
        inc: inc || (i % 2 === 0 ? 1200000 : 0),
        exp: exp || (i * 150000 + 80000)
      };
    });

    const maxVal = Math.max(1, ...days.flatMap((d) => [d.inc, d.exp]));

    container.innerHTML = days
      .map((d) => {
        const incH = d.inc > 0 ? Math.max(8, Math.round((d.inc / maxVal) * 100)) : 4;
        const expH = d.exp > 0 ? Math.max(8, Math.round((d.exp / maxVal) * 100)) : 4;
        const tipText = `${d.label}: Thu ${money(d.inc, true)} · Chi ${money(d.exp, true)}`;
        return `
          <div class="chart-bar-group" data-tooltip="${escapeHtml(tipText)}">
            <div class="chart-bars-wrap">
              <span class="chart-bar income" style="height: ${incH}%;"></span>
              <span class="chart-bar expense" style="height: ${expH}%;"></span>
            </div>
            <span class="chart-label">${escapeHtml(d.label)}</span>
          </div>
        `;
      })
      .join("");
  }

  function renderTopCategories(breakdowns) {
    const container = byId("dashTopCategories");
    if (!container) return;

    const top3 = (breakdowns || []).slice(0, 3);
    if (!top3.length) {
      container.innerHTML = `<div style="padding: 18px 0; font-size: 0.85rem; color: var(--text-dim);">Chưa có chi tiêu nào trong tháng này.</div>`;
      return;
    }

    container.innerHTML = top3
      .map((cat, idx) => {
        const gradients = [
          "linear-gradient(90deg, #ec4899, #f43f5e)",
          "linear-gradient(90deg, #8b5cf6, #6366f1)",
          "linear-gradient(90deg, #06b6d4, #3b82f6)"
        ];
        const iconName = cat.icon || (idx === 0 ? "coffee" : idx === 1 ? "home" : "shopping-bag");
        const grad = gradients[idx % gradients.length];
        return `
          <div class="category-bar-item">
            <div class="cat-item-top">
              <span><i data-lucide="${iconName}" style="width: 16px; height: 16px; color: var(--accent-brand);"></i>${escapeHtml(cat.name)}</span>
              <strong class="tabular">${money(cat.total_amount)} (${cat.percentage}%)</strong>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${cat.percentage}%; background: ${grad};"></div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderRecentTransactions(records) {
    const container = byId("dashRecentTrans");
    if (!container) return;

    const list = (records || []).slice(0, 5);
    if (!list.length) {
      container.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-dim);">
          <p>Chưa có giao dịch nào được ghi chép.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list
      .map((r) => {
        const isIncome = r.type === "income" || r.category_type === "income";
        const cat = state.categories.find((c) => Number(c.id) === Number(r.category_id)) || {};
        const catName = r.category_name || cat.name || (isIncome ? "Khoản thu" : "Chi tiêu");
        const bg = isIncome ? "rgba(16, 185, 129, 0.16)" : "rgba(244, 63, 94, 0.16)";
        const color = isIncome ? "var(--accent-income)" : "var(--accent-expense)";
        const icon = isIncome ? "arrow-down-left" : "arrow-up-right";
        const sign = isIncome ? "+" : "-";

        return `
          <div class="mini-trans-row">
            <div class="mini-trans-left">
              <div class="cat-icon-badge" style="background: ${bg}; color: ${color};">
                <i data-lucide="${icon}" style="width: 19px; height: 19px;"></i>
              </div>
              <div class="mini-trans-meta">
                <strong>${escapeHtml(r.note || catName)}</strong>
                <small>${escapeHtml(catName)} · ${formatDate(r.transaction_date)}</small>
              </div>
            </div>
            <div class="mini-trans-amount ${isIncome ? "income" : "expense"} tabular">
              ${sign}${money(r.amount)}
            </div>
          </div>
        `;
      })
      .join("");
  }

  // B. Transactions View
  function renderTransactions() {
    const tbody = byId("transTableBody");
    if (!tbody) return;

    let items = state.transactions.length ? state.transactions : (state.isUsingDemoFallback ? DEMO_DASHBOARD.recent_transactions : []);

    // Filter by search
    if (state.filter.search) {
      const q = state.filter.search.toLowerCase();
      items = items.filter((r) => String(r.note || "").toLowerCase().includes(q) || String(r.category_name || "").toLowerCase().includes(q));
    }

    // Filter by type
    if (state.filter.type !== "all") {
      items = items.filter((r) => (r.type || r.category_type) === state.filter.type);
    }

    // Filter by category
    if (state.filter.category_id) {
      items = items.filter((r) => Number(r.category_id) === Number(state.filter.category_id));
    }

    // Filter by month
    if (state.filter.month) {
      items = items.filter((r) => String(r.transaction_date).startsWith(state.filter.month));
    }

    if (!items.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 36px; color: var(--text-dim);">
            Không tìm thấy giao dịch nào phù hợp với bộ lọc.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = items
      .map((r) => {
        const isIncome = r.type === "income" || r.category_type === "income";
        const cat = state.categories.find((c) => Number(c.id) === Number(r.category_id)) || {};
        const catName = r.category_name || cat.name || (isIncome ? "Khoản thu" : "Chi tiêu");
        const color = isIncome ? "var(--accent-income)" : "var(--accent-expense)";
        const sign = isIncome ? "+" : "-";

        return `
          <tr>
            <td>
              <span style="display: inline-flex; align-items: center; gap: 8px; font-weight: 700;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></span>
                ${escapeHtml(catName)}
              </span>
            </td>
            <td>${escapeHtml(r.note || "—")}</td>
            <td>${formatDate(r.transaction_date)}</td>
            <td style="text-align: right; font-weight: 800; font-family: var(--font-display); color: ${color};" class="tabular">
              ${sign}${money(r.amount)}
            </td>
          </tr>
        `;
      })
      .join("");
  }

  // C. Analytics View
  function renderAnalytics() {
    let d = state.dashboard;
    if (!d || (!d.recent_transactions?.length && !state.currentUser)) {
      d = DEMO_DASHBOARD;
    }

    const income = d?.total_income || 0;
    const expense = d?.total_expense || 0;
    const savingsRate = income > 0 ? Math.max(0, Math.round(((income - expense) / income) * 100)) : 0;

    byId("analyticsIncome").textContent = `+${money(income)}`;
    byId("analyticsExpense").textContent = `-${money(expense)}`;
    byId("analyticsSavingsRate").textContent = `${savingsRate}%`;

    const container = byId("analyticsCategoryList");
    if (!container) return;

    const breakdowns = d?.category_breakdown?.length ? d.category_breakdown : DEMO_DASHBOARD.category_breakdown;

    container.innerHTML = (breakdowns || [])
      .map((cat, idx) => {
        const gradients = [
          "linear-gradient(90deg, #ec4899, #f43f5e)",
          "linear-gradient(90deg, #8b5cf6, #6366f1)",
          "linear-gradient(90deg, #06b6d4, #3b82f6)",
          "linear-gradient(90deg, #10b981, #059669)",
          "linear-gradient(90deg, #f59e0b, #d97706)"
        ];
        const grad = gradients[idx % gradients.length];
        return `
          <div class="category-bar-item">
            <div class="cat-item-top">
              <span><strong>${escapeHtml(cat.name)}</strong> (${cat.percentage}%)</span>
              <strong class="tabular">${money(cat.total_amount)}</strong>
            </div>
            <div class="progress-track" style="height: 9px;">
              <div class="progress-fill" style="width: ${cat.percentage}%; background: ${grad};"></div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  // D. Profile View
  function renderProfile() {
    const user = state.currentUser;
    const name = user ? user.username : "Khách xem thử";
    const initial = name.charAt(0).toUpperCase();

    byId("profileLargeAvatar").textContent = initial;
    byId("profileLargeUsername").textContent = name;
    byId("profileRoleText").textContent = user ? "Thành viên chính thức" : "Tài khoản xem thử";

    byId("sidebarAvatar").textContent = initial;
    byId("sidebarUsername").textContent = name;
    byId("sidebarUserSub").textContent = user ? "Tài khoản cá nhân" : "Chưa đăng nhập";

    const profileThemeBtnText = byId("profileThemeBtnText");
    if (profileThemeBtnText) {
      profileThemeBtnText.textContent = state.theme === "dark" ? "Chuyển Chế Độ Sáng" : "Chuyển Chế Độ Tối";
    }
  }

  // --- 7. DATA FETCHING ---
  async function refreshData() {
    try {
      const [categories, dashboard, transactions] = await Promise.all([
        api.getCategories().catch(() => []),
        api.getDashboard().catch(() => null),
        api.getTransactions().catch(() => [])
      ]);

      state.categories = categories || [];
      state.dashboard = dashboard;
      state.transactions = transactions || [];

      populateCategorySelects();
      populateMonthSelect();

      // Re-render active view
      if (state.currentView === "dashboard") renderDashboard();
      if (state.currentView === "transactions") renderTransactions();
      if (state.currentView === "analytics") renderAnalytics();
      if (state.currentView === "profile") renderProfile();
    } catch (err) {
      console.warn("Could not fetch latest backend data, using local state", err);
    }
  }

  function populateCategorySelects() {
    const txSelect = byId("txCategory");
    const filterSelect = byId("transCategoryFilter");

    if (txSelect) {
      const filtered = state.categories.filter((c) => !state.txModalType || c.type === state.txModalType);
      txSelect.innerHTML = `<option value="">-- Chọn danh mục --</option>` +
        filtered.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
    }

    if (filterSelect) {
      filterSelect.innerHTML = `<option value="">Tất cả danh mục</option>` +
        state.categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
    }
  }

  function populateMonthSelect() {
    const monthSelect = byId("transMonthFilter");
    if (!monthSelect) return;

    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
      months.push({ val, label });
    }

    monthSelect.innerHTML = months.map((m, idx) => `<option value="${m.val}" ${idx === 0 ? "selected" : ""}>${m.label}</option>`).join("");
    state.filter.month = months[0]?.val || "";
  }

  // --- 8. SEED DEMO DATA ACTION ---
  async function seedSampleData() {
    const btn = byId("btnSeedDemoData");
    const profileBtn = byId("profileSeedBtn");
    if (btn) btn.disabled = true;
    if (profileBtn) profileBtn.disabled = true;

    showToast("Đang nạp 5 giao dịch mẫu vào hệ thống...", true);

    try {
      const sampleItems = [
        { category_id: 1, amount: 45000, note: "Cà phê & Đồ uống sáng", transaction_date: getOffsetDate(0), type: "expense" },
        { category_id: 1, amount: 120000, note: "Ăn trưa văn phòng", transaction_date: getOffsetDate(1), type: "expense" },
        { category_id: 2, amount: 2500000, note: "Tiền thuê nhà tháng này", transaction_date: getOffsetDate(2), type: "expense" },
        { category_id: 3, amount: 350000, note: "Mua tài liệu & sách tham khảo", transaction_date: getOffsetDate(3), type: "expense" },
        { category_id: 4, amount: 18500000, note: "Lương hàng tháng", transaction_date: getOffsetDate(4), type: "income" }
      ];

      for (const item of sampleItems) {
        await api.createTransaction(item).catch(() => {});
      }

      showToast(" Đã nạp thành công 5 giao dịch mẫu vào hệ thống!");
      await refreshData();
      renderDashboard();
    } catch (err) {
      showToast("Không thể nạp dữ liệu: " + err.message, false);
    } finally {
      if (btn) btn.disabled = false;
      if (profileBtn) profileBtn.disabled = false;
    }
  }

  // --- 9. EVENT BINDING ---
  function bindEvents() {
    // Theme toggles
    byId("themeToggleBtn")?.addEventListener("click", toggleTheme);
    byId("authThemeToggleBtn")?.addEventListener("click", toggleTheme);
    byId("profileThemeBtn")?.addEventListener("click", toggleTheme);

    // Privacy toggles
    byId("privacyToggleBtn")?.addEventListener("click", togglePrivacy);
    byId("dashPrivacyToggle")?.addEventListener("click", togglePrivacy);

    // Navigation triggers
    document.addEventListener("click", (e) => {
      const target = e.target.closest("[data-navigate]");
      if (target) {
        e.preventDefault();
        navigateTo(target.dataset.navigate);
      }
    });

    // Auth view quick navigation to dashboard
    byId("authNavToDashBtn")?.addEventListener("click", () => {
      navigateTo("dashboard");
    });

    // 1-Click Demo Credentials
    byId("btnQuickDemo")?.addEventListener("click", () => {
      byId("authUsername").value = "demo_user";
      byId("authPassword").value = "pass12345678";
      showToast(" Đã điền tài khoản mẫu: demo_user");
    });

    // Seed Demo Data buttons
    byId("btnSeedDemoData")?.addEventListener("click", seedSampleData);
    byId("profileSeedBtn")?.addEventListener("click", seedSampleData);

    // Transaction Modal open/close
    const openModal = (type = "expense") => {
      state.txModalType = type;
      byId("dialogTitle").textContent = type === "expense" ? "Ghi Khoản Chi Tiêu" : "Ghi Khoản Thu Nhập";
      byId("txDate").value = new Date().toISOString().slice(0, 10);
      populateCategorySelects();

      qAll(".type-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.txType === type);
      });

      const dialog = byId("transactionDialog");
      dialog.classList.add("show");
      const card = dialog.querySelector(".dialog-card");
      if (card) card.scrollTop = 0;
    };

    const closeModal = () => {
      byId("transactionDialog").classList.remove("show");
    };

    byId("topbarAddBtn")?.addEventListener("click", () => openModal("expense"));
    byId("dashQuickAddBtn")?.addEventListener("click", () => openModal("expense"));
    byId("transAddBtn")?.addEventListener("click", () => openModal("expense"));
    byId("dialogCloseBtn")?.addEventListener("click", closeModal);

    byId("transactionDialog")?.addEventListener("click", (e) => {
      if (e.target === byId("transactionDialog")) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && byId("transactionDialog")?.classList.contains("show")) {
        closeModal();
      }
    });

    // Preset amount buttons
    qAll(".preset-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = Number(btn.dataset.preset) || 0;
        const input = byId("txAmount");
        const current = Number(input.value) || 0;
        input.value = current + val;
      });
    });

    // Modal Type Toggle (Expense / Income)
    qAll(".type-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.txType;
        openModal(type);
      });
    });

    // Transaction Form Submit
    byId("transactionForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const amount = Number(byId("txAmount").value);
      const category_id = byId("txCategory").value;
      const note = byId("txNote").value.trim();
      const transaction_date = byId("txDate").value;

      if (!amount || amount < 1000) {
        showToast("Vui lòng nhập số tiền từ 1.000 ₫!", false);
        return;
      }
      if (!category_id) {
        showToast("Vui lòng chọn danh mục giao dịch!", false);
        return;
      }

      const submitBtn = byId("txSubmitBtn");
      submitBtn.disabled = true;

      try {
        await api.createTransaction({
          amount,
          category_id: Number(category_id),
          note,
          transaction_date,
          type: state.txModalType
        });

        showToast(" Đã thêm giao dịch thành công!");
        closeModal();
        byId("transactionForm").reset();
        await refreshData();
      } catch (err) {
        showToast("Lỗi: " + err.message, false);
      } finally {
        submitBtn.disabled = false;
      }
    });

    // Filters in Transactions View
    byId("transSearchInput")?.addEventListener("input", (e) => {
      state.filter.search = e.target.value;
      renderTransactions();
    });

    qAll("[data-type-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        qAll("[data-type-filter]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.filter.type = btn.dataset.typeFilter;
        renderTransactions();
      });
    });

    byId("transCategoryFilter")?.addEventListener("change", (e) => {
      state.filter.category_id = e.target.value;
      renderTransactions();
    });

    byId("transMonthFilter")?.addEventListener("change", (e) => {
      state.filter.month = e.target.value;
      renderTransactions();
    });

    // Auth Tabs (Login / Register)
    qAll(".auth-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        qAll(".auth-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        state.authMode = tab.dataset.authMode;
        byId("authSubmitText").textContent = state.authMode === "register" ? "Tạo tài khoản mới" : "Đăng nhập vào hệ thống";
        byId("authErrorMsg").textContent = "";
      });
    });

    // Password Peek
    byId("pwPeekBtn")?.addEventListener("click", () => {
      const input = byId("authPassword");
      if (input.type === "password") {
        input.type = "text";
        byId("pwPeekBtn").querySelector("i")?.setAttribute("data-lucide", "eye-off");
      } else {
        input.type = "password";
        byId("pwPeekBtn").querySelector("i")?.setAttribute("data-lucide", "eye");
      }
      renderIcons();
    });

    // Auth Form Submit
    byId("authForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = byId("authUsername").value.trim();
      const password = byId("authPassword").value;
      const errMsg = byId("authErrorMsg");
      errMsg.textContent = "";

      if (username.length < 3) {
        errMsg.textContent = "Tên đăng nhập cần ít nhất 3 ký tự!";
        return;
      }
      if (password.length < 8) {
        errMsg.textContent = "Mật khẩu cần ít nhất 8 ký tự!";
        return;
      }

      const submitBtn = byId("authSubmitBtn");
      submitBtn.disabled = true;

      try {
        if (state.authMode === "register") {
          await api.register(username, password);
          showToast(`Đăng ký thành công! Chào mừng ${username}`);
        } else {
          await api.login(username, password);
          showToast(`Đăng nhập thành công! Chào ${username}`);
        }

        state.currentUser = api.getCurrentUser();
        navigateTo("dashboard");
        await refreshData();
      } catch (err) {
        errMsg.textContent = err.message || "Xác thực không thành công.";
      } finally {
        submitBtn.disabled = false;
      }
    });

    byId("authGuestBtn")?.addEventListener("click", () => {
      navigateTo("dashboard");
    });

    // Google Sign-In Trigger & GIS Integration
    byId("btnGoogleAuth")?.addEventListener("click", async () => {
      const googleClientId = window.GOOGLE_CLIENT_ID;

      if (!googleClientId) {
        // Mock Mode: instant simulated Google login
        try {
          showToast("Đang kết nối tài khoản Google (Chế độ Demo)...");
          const res = await api.loginWithGoogle("mock-credential", true);
          state.currentUser = res.user || { id: res.user_id, username: "demo.google@gmail.com" };
          showToast(`Xin chào ${state.currentUser.username}! Đăng nhập Google thành công.`);
          navigateTo("dashboard");
          await refreshData();
        } catch (err) {
          showToast(err.message || "Lỗi đăng nhập Google", false);
        }
        return;
      }

      // Live Google Identity Services flow
      if (window.google?.accounts?.id) {
        window.google.accounts.id.prompt();
      } else {
        showToast("Đang kết nối tới máy chủ Google Identity...", false);
      }
    });

    // Initialize GIS if client ID is configured
    if (window.GOOGLE_CLIENT_ID && window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: window.GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            const res = await api.loginWithGoogle(response.credential, false);
            state.currentUser = res.user || { id: res.user_id, username: "google_user" };
            showToast(`Đăng nhập Google thành công!`);
            navigateTo("dashboard");
            await refreshData();
          } catch (err) {
            showToast(err.message || "Xác thực Google thất bại", false);
          }
        }
      });
      const badge = byId("googleMockBadge");
      if (badge) badge.style.display = "none";
    }

    byId("switchAccountBtn")?.addEventListener("click", () => {
      navigateTo("auth");
    });

    byId("logoutBtn")?.addEventListener("click", () => {
      api.logout();
      state.currentUser = null;
      showToast("Đã đăng xuất tài khoản.");
      refreshData();
      navigateTo("auth");
    });
  }

  // --- 10. INITIALIZATION ---
  async function init() {
    setTheme(state.theme);
    bindEvents();

    // Mở trực tiếp Dashboard để trải nghiệm ngay
    navigateTo("dashboard");

    await refreshData();
    renderIcons();
  }

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();