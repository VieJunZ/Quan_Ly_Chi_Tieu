(function () {
  const api = window.sochiApi;
  const state = { dashboard: null, categories: [], filter: "all", search: "", showAll: false, type: "expense", toastTimer: null, passwordSpotlightActive: false };
  const byId = (id) => document.getElementById(id);

  function money(value, compact = false) {
    const amount = Number(value) || 0;
    if (compact && Math.abs(amount) >= 1000000) {
      return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(amount / 1000000)} tr`;
    }
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(amount);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  }

  function dateFromIso(value) {
    const [year, month, day] = String(value || "").split("-").map(Number);
    return year && month && day ? new Date(year, month - 1, day) : new Date();
  }

  function dateLabel(value, includeYear = false) {
    return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "short", ...(includeYear ? { year: "numeric" } : {}) }).format(dateFromIso(value));
  }

  function currentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  function categoryFor(id) {
    return state.categories.find((category) => Number(category.id) === Number(id)) || { name: "Khác", icon: "circle-ellipsis", color: "blue" };
  }

  function createIcons() {
    if (window.lucide?.createIcons) window.lucide.createIcons();
  }

  function updateDateLabels() {
    const now = new Date();
    const dateText = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "long" }).format(now).toLocaleUpperCase("vi-VN");
    byId("todayLabel").textContent = dateText;
    byId("sidebarMonth").textContent = new Intl.DateTimeFormat("vi-VN", { month: "long" }).format(now).replace(/^./, (letter) => letter.toLocaleUpperCase("vi-VN"));
    byId("sidebarMonthYear").textContent = now.getFullYear();
    byId("monthDayLabel").textContent = now.getDate();
    byId("monthMeter").style.width = `${Math.round(now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() * 100)}%`;
  }

  function renderSummary() {
    const dashboard = state.dashboard || {};
    const hasTransactions = (dashboard.recent_transactions || []).length > 0;
    byId("balanceValue").textContent = `${money(dashboard.balance)} ₫`;
    byId("incomeValue").textContent = `${money(dashboard.total_income)} ₫`;
    byId("expenseValue").textContent = `${money(dashboard.total_expense)} ₫`;
    byId("categoryTotalLabel").textContent = `${money(dashboard.total_expense, true)} ₫ đã chi`;
    byId("balanceTrend").innerHTML = hasTransactions ? '<i data-lucide="wallet"></i>Đã có ghi chép' : '<i data-lucide="circle-dot"></i>Chưa có giao dịch';
    byId("balanceNote").textContent = hasTransactions ? "Thu trừ chi trong tháng" : "Số dư sẽ hiển thị khi bạn ghi chép";
  }

  function renderFlow() {
    const records = state.dashboard?.recent_transactions || [];
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const dayRecords = records.filter((record) => record.transaction_date === iso);
      return {
        iso,
        label: new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(date).replace("Th ", "T"),
        income: dayRecords.filter((record) => record.type === "income").reduce((sum, record) => sum + Number(record.amount), 0),
        expense: dayRecords.filter((record) => record.type === "expense").reduce((sum, record) => sum + Number(record.amount), 0),
        today: iso === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
      };
    });
    const max = Math.max(1, ...days.flatMap((day) => [day.income, day.expense]));
    byId("flowChart").innerHTML = days.map((day) => {
      const incomeHeight = day.income ? Math.max(5, day.income / max * 100) : 3;
      const expenseHeight = day.expense ? Math.max(5, day.expense / max * 100) : 3;
      return `<div class="flow-day ${day.today ? "is-today" : ""}" title="${escapeHtml(day.label)}: thu ${money(day.income)} ₫, chi ${money(day.expense)} ₫">
        <div class="flow-bars"><span class="flow-bar income" style="height:${incomeHeight}%"></span><span class="flow-bar expense" style="height:${expenseHeight}%"></span></div>
        <span class="flow-day-label">${escapeHtml(day.label)}</span>
      </div>`;
    }).join("");
    byId("chartTotalLabel").textContent = `${days.reduce((sum, day) => sum + day.expense, 0) ? "Có giao dịch trong tuần" : "Chưa có giao dịch tuần này"}`;
  }

  function renderCategories() {
    const records = state.dashboard?.recent_transactions || [];
    const totals = new Map();
    records.filter((record) => record.type === "expense" && record.transaction_date.startsWith(currentMonthKey())).forEach((record) => {
      const key = Number(record.category_id);
      totals.set(key, (totals.get(key) || 0) + Number(record.amount));
    });
    const rows = [...totals.entries()].sort((left, right) => right[1] - left[1]).slice(0, 4);
    const max = Math.max(1, ...rows.map((row) => row[1]));
    if (!rows.length) {
      byId("categoryList").innerHTML = `<div class="empty-category">Chưa có khoản chi nào trong kỳ này.</div>`;
      return;
    }
    byId("categoryList").innerHTML = rows.map(([id, amount]) => {
      const category = categoryFor(id);
      const width = Math.max(7, amount / max * 100);
      return `<div class="category-row">
        <span class="category-symbol" data-color="${escapeHtml(category.color || "green")}"><i data-lucide="${escapeHtml(category.icon || "circle-ellipsis")}"></i></span>
        <span class="category-info"><span class="category-name">${escapeHtml(category.name)}</span><span class="category-track"><span style="width:${width}%"></span></span></span>
        <span class="category-amount">${money(amount, true)} ₫</span>
      </div>`;
    }).join("");
    createIcons();
  }

  function renderTransactions() {
    const records = state.dashboard?.recent_transactions || [];
    const filtered = records.filter((record) => {
      const category = categoryFor(record.category_id);
      const matchesFilter = state.filter === "all" || record.type === state.filter;
      const searchText = `${record.note || ""} ${category.name} ${record.type === "income" ? "thu" : "chi"}`.toLocaleLowerCase("vi-VN");
      return matchesFilter && searchText.includes(state.search.toLocaleLowerCase("vi-VN"));
    });
    const visibleRecords = state.showAll ? filtered : filtered.slice(0, 6);
    byId("transactionsBody").innerHTML = visibleRecords.map((record) => {
      const income = record.type === "income";
      const category = categoryFor(record.category_id);
      const title = record.note || category.name;
      return `<tr>
        <td><div class="transaction-main"><span class="transaction-icon ${income ? "" : "is-expense"}"><i data-lucide="${escapeHtml(category.icon || "circle-ellipsis")}"></i></span><span class="transaction-title"><strong>${escapeHtml(title)}</strong><small>${income ? "Khoản thu" : "Khoản chi"}</small></span></div></td>
        <td><span class="category-cell ${income ? "" : "expense"}"><i></i>${escapeHtml(category.name)}</span></td>
        <td class="date-cell">${escapeHtml(dateLabel(record.transaction_date))}</td>
        <td class="amount-cell ${income ? "" : "is-expense"}">${income ? "+" : "−"}${money(record.amount)} ₫</td>
      </tr>`;
    }).join("");
    byId("emptyState").hidden = visibleRecords.length > 0;
    byId("transactionsBody").closest("table").hidden = visibleRecords.length === 0;
    byId("transactionCount").textContent = filtered.length ? `Hiển thị ${visibleRecords.length} / ${filtered.length} giao dịch` : "0 giao dịch";
    byId("viewAllButton").hidden = filtered.length <= 6;
    byId("viewAllButton").innerHTML = state.showAll ? 'Thu gọn <i data-lucide="chevron-up"></i>' : 'Xem tất cả <i data-lucide="arrow-right"></i>';
    createIcons();
  }

  function renderAll() {
    renderSummary();
    renderFlow();
    renderCategories();
    renderTransactions();
    createIcons();
  }

  function renderCategoryOptions() {
    const available = state.categories.filter((category) => category.type === state.type);
    byId("categoryInput").innerHTML = `<option value="">${available.length ? "Chọn danh mục" : "Chưa có danh mục"}</option>${available.map((category) => `<option value="${Number(category.id)}">${escapeHtml(category.name)}</option>`).join("")}`;
    byId("categoryInput").disabled = available.length === 0;
    byId("categoryHint").hidden = available.length > 0;
    byId("saveTransaction").disabled = available.length === 0;
  }

  function showToast(message) {
    const toast = byId("toast");
    byId("toastMessage").textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3000);
  }

  function openTransactionDialog() {
    byId("transactionForm").reset();
    state.type = "expense";
    document.querySelectorAll("[data-type-option]").forEach((option) => option.classList.toggle("is-active", option.dataset.typeOption === state.type));
    byId("dateInput").value = new Date().toLocaleDateString("en-CA");
    byId("amountError").textContent = "";
    byId("categoryError").textContent = "";
    renderCategoryOptions();
    byId("transactionDialog").showModal();
    window.setTimeout(() => byId("amountInput").focus(), 40);
  }

  function setAuthMode(mode) {
    const registering = mode === "register";
    byId("authTitle").textContent = registering ? "Tạo tài khoản" : "Đăng nhập";
    byId("authSubtitle").textContent = registering ? "Bắt đầu ghi chép tài chính theo cách của bạn." : "Tiếp tục hành trình quản lý chi tiêu của bạn.";
    byId("authSubmit").innerHTML = `${registering ? "Tạo tài khoản" : "Đăng nhập"} <i data-lucide="arrow-right"></i>`;
    byId("passwordInput").autocomplete = registering ? "new-password" : "current-password";
    byId("authError").textContent = "";
    document.querySelectorAll("[data-auth-mode]").forEach((tab) => {
      const active = tab.dataset.authMode === mode;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    byId("authForm").dataset.mode = mode;
    createIcons();
  }

  function showAuth(mode = "login") {
    byId("profileMenu").hidden = true;
    byId("profileButton").setAttribute("aria-expanded", "false");
    byId("authScreen").hidden = false;
    document.body.classList.add("is-auth");
    setAuthMode(mode);
    byId("usernameInput").focus();
  }

  function closeAuth() {
    stopPasswordSpotlight();
    byId("authScreen").hidden = true;
    document.body.classList.remove("is-auth");
  }

  function updatePasswordSpotlightText() {
    const characters = Array.from(byId("passwordInput").value);
    const mask = byId("passwordMask");
    mask.replaceChildren();
    characters.forEach(() => {
      const maskCharacter = document.createElement("span");
      maskCharacter.textContent = "•";
      mask.append(maskCharacter);
    });
    updatePasswordSpotlightCharacters();
  }

  function updatePasswordSpotlightCharacters() {
    const maskCharacters = byId("passwordMask").children;
    const characters = Array.from(byId("passwordInput").value);
    const spotlightX = Number.parseFloat(byId("passwordField").style.getPropertyValue("--spot-x")) || 0;
    const characterWidth = maskCharacters[0]?.getBoundingClientRect().width || 9;
    for (let index = 0; index < maskCharacters.length; index += 1) {
      const characterCenter = index * characterWidth + characterWidth / 2;
      const isLit = Math.abs(characterCenter - spotlightX) <= 17;
      maskCharacters[index].textContent = isLit ? characters[index] : "•";
      maskCharacters[index].classList.toggle("is-lit", isLit);
    }
  }

  function movePasswordSpotlight(event) {
    if (!state.passwordSpotlightActive || event.clientX === undefined) return;
    const spotlight = byId("passwordSpotlight");
    const bounds = spotlight.getBoundingClientRect();
    const x = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
    byId("passwordField").style.setProperty("--spot-x", `${x}px`);
    updatePasswordSpotlightCharacters();
  }

  function togglePasswordSpotlight() {
    if (state.passwordSpotlightActive) {
      stopPasswordSpotlight();
      return;
    }
    state.passwordSpotlightActive = true;
    const field = byId("passwordField");
    const spotlight = byId("passwordSpotlight");
    field.classList.add("is-spotlit");
    byId("passwordToggle").setAttribute("aria-pressed", "true");
    byId("passwordToggle").setAttribute("aria-label", "Tắt đèn pin soi mật khẩu");
    byId("passwordToggle").title = "Tắt đèn pin soi mật khẩu";
    updatePasswordSpotlightText();
    const initialX = 0;
    field.style.setProperty("--spot-x", `${initialX}px`);
    updatePasswordSpotlightCharacters();
  }

  function stopPasswordSpotlight() {
    state.passwordSpotlightActive = false;
    const field = byId("passwordField");
    if (!field) return;
    field.classList.remove("is-spotlit");
    byId("passwordToggle").setAttribute("aria-pressed", "false");
    byId("passwordToggle").setAttribute("aria-label", "Bật đèn pin soi mật khẩu");
    byId("passwordToggle").title = "Bật đèn pin soi mật khẩu";
  }

  function bindEvents() {
    document.querySelectorAll("[data-scroll]").forEach((button) => button.addEventListener("click", () => {
      const target = byId(button.dataset.scroll);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.querySelectorAll(".nav-link, .mobile-nav-link").forEach((link) => link.classList.toggle("is-active", link.dataset.scroll === button.dataset.scroll));
    }));
    document.querySelectorAll("[data-auth-open]").forEach((button) => button.addEventListener("click", () => showAuth(button.dataset.authOpen)));
    byId("profileButton").addEventListener("click", () => {
      const expanded = byId("profileButton").getAttribute("aria-expanded") === "true";
      byId("profileButton").setAttribute("aria-expanded", String(!expanded));
      byId("profileMenu").hidden = expanded;
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".profile-wrap")) {
        byId("profileMenu").hidden = true;
        byId("profileButton").setAttribute("aria-expanded", "false");
      }
    });
    ["openTransaction", "transactionsAdd", "mobileAdd"].forEach((id) => byId(id).addEventListener("click", openTransactionDialog));
    ["closeTransaction", "cancelTransaction"].forEach((id) => byId(id).addEventListener("click", () => byId("transactionDialog").close()));
    byId("transactionDialog").addEventListener("click", (event) => { if (event.target === byId("transactionDialog")) byId("transactionDialog").close(); });
    document.querySelectorAll("[data-type-option]").forEach((option) => option.addEventListener("click", () => {
      state.type = option.dataset.typeOption;
      document.querySelectorAll("[data-type-option]").forEach((item) => item.classList.toggle("is-active", item === option));
      renderCategoryOptions();
      byId("categoryError").textContent = "";
    }));
    byId("transactionForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const amount = Number(byId("amountInput").value);
      const categoryId = byId("categoryInput").value;
      const date = byId("dateInput").value;
      byId("amountError").textContent = amount > 0 ? "" : "Số tiền phải lớn hơn 0.";
      byId("categoryError").textContent = categoryId ? "" : "Hãy chọn một danh mục.";
      if (!(amount > 0) || !categoryId || !date) return;
      const saveButton = byId("saveTransaction");
      saveButton.disabled = true;
      try {
        await api.createTransaction({ amount, category_id: Number(categoryId), transaction_date: date, note: byId("noteInput").value.trim(), type: state.type });
        state.dashboard = await api.getDashboard();
        renderAll();
        byId("transactionDialog").close();
        showToast("Đã lưu giao dịch. Tốt lắm!");
      } catch (error) {
        showToast(error.message || "Không lưu được giao dịch.");
      } finally {
        saveButton.disabled = state.categories.filter((category) => category.type === state.type).length === 0;
      }
    });
    document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-selected", active);
        item.setAttribute("aria-pressed", String(active));
      });
      renderTransactions();
    }));
    byId("transactionSearch").addEventListener("input", (event) => { state.search = event.target.value.trim(); renderTransactions(); });
    document.addEventListener("keydown", (event) => {
      if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
        event.preventDefault();
        byId("transactionSearch").focus();
      }
    });
    byId("viewAllButton").addEventListener("click", () => {
      state.showAll = !state.showAll;
      renderTransactions();
    });
    document.querySelectorAll("[data-auth-mode]").forEach((tab) => tab.addEventListener("click", () => setAuthMode(tab.dataset.authMode)));
    byId("authBack").addEventListener("click", closeAuth);
    byId("passwordInput").addEventListener("input", updatePasswordSpotlightText);
    byId("passwordToggle").addEventListener("click", togglePasswordSpotlight);
    document.addEventListener("pointermove", movePasswordSpotlight);
    document.addEventListener("pointerdown", (event) => {
      if (state.passwordSpotlightActive && !byId("passwordField").contains(event.target)) stopPasswordSpotlight();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.passwordSpotlightActive) stopPasswordSpotlight();
    });
    window.addEventListener("blur", stopPasswordSpotlight);
    byId("authForm").addEventListener("reset", stopPasswordSpotlight);
    byId("authForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const username = byId("usernameInput").value.trim();
      const password = byId("passwordInput").value;
      const registering = byId("authForm").dataset.mode === "register";
      if (username.length < 3 || password.length < 8) {
        byId("authError").textContent = "Tên đăng nhập cần ít nhất 3 ký tự, mật khẩu ít nhất 8 ký tự.";
        return;
      }
      const submitButton = byId("authSubmit");
      submitButton.disabled = true;
      try {
        await (registering ? api.register(username, password) : api.login(username, password));
        byId("profileName").textContent = username;
        const initials = username.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("vi-VN");
        byId("profileAvatar").textContent = initials;
        byId("topAvatar").textContent = initials;
        closeAuth();
        showToast(registering ? "Tài khoản đã sẵn sàng." : "Đăng nhập thành công.");
        state.dashboard = await api.getDashboard();
        renderAll();
      } catch (error) {
        byId("authError").textContent = error.message || "Không thể xác thực tài khoản.";
      } finally {
        submitButton.disabled = false;
      }
    });
  }

  async function initialize() {
    updateDateLabels();
    bindEvents();
    const currentUser = api.getCurrentUser();
    if (currentUser?.username) {
      byId("profileName").textContent = currentUser.username;
      const initials = currentUser.username.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("vi-VN");
      byId("profileAvatar").textContent = initials;
      byId("topAvatar").textContent = initials;
    }
    try {
      state.categories = await api.getCategories();
      state.dashboard = await api.getDashboard();
      renderAll();
    } catch (error) {
      showToast(error.message || "Chưa kết nối được API.");
      byId("chartTotalLabel").textContent = "Chưa kết nối được backend";
    }
  }

  initialize();
})();