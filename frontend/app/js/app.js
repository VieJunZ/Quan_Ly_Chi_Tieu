/**
 * @file app.js
 * @description Khởi động ứng dụng: điều hướng theo hash (#/home, #/history...), thanh điều hướng dưới,
 * băng "đang dùng thử", kiểm tra phiên đăng nhập, khảo sát sau 1 ngày và lời nhắc buổi tối.
 */

import { tr } from "./i18n.js";
import { api, session } from "./api.js";
import { h, icon, toast, withTransition, closeAllSheets } from "./ui.js";

const ROUTES = {
  welcome: { public: true, load: () => import("./screens/auth.js").then((m) => m.welcomeScreen) },
  login: { public: true, load: () => import("./screens/auth.js").then((m) => m.loginScreen) },
  register: { public: true, load: () => import("./screens/auth.js").then((m) => m.registerScreen) },
  recover: { public: true, load: () => import("./screens/auth.js").then((m) => m.recoverScreen) },
  home: { nav: "home", load: () => import("./screens/home.js").then((m) => m.homeScreen) },
  history: { nav: "history", load: () => import("./screens/history.js").then((m) => m.historyScreen) },
  debts: { nav: "debts", load: () => import("./screens/debts.js").then((m) => m.debtsScreen) },
  wallet: { nav: "me", load: () => import("./screens/wallet.js").then((m) => m.walletScreen) },
  me: { nav: "me", load: () => import("./screens/me.js").then((m) => m.meScreen) },
  challenges: { nav: "home", load: () => import("./screens/challenges.js").then((m) => m.challengesScreen) },
  settings: { nav: "me", load: () => import("./screens/settings.js").then((m) => m.settingsScreen) },
  categories: { nav: "me", load: () => import("./screens/categories.js").then((m) => m.categoriesScreen) }
};

const root = document.getElementById("app");
let current = null;
let renderSeq = 0;

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [name, qs] = raw.split("?");
  return { name: name || "", params: new URLSearchParams(qs || "") };
}

const ctx = {
  get user() {
    return session.user;
  },
  /** Chuyển màn hình. */
  go(name, params) {
    const target = `#/${name}${params ? `?${new URLSearchParams(params)}` : ""}`;
    if (location.hash === target) render();
    else location.hash = target;
  },
  /** Vẽ lại màn hình hiện tại (sau khi thêm/sửa dữ liệu). */
  refresh() {
    render({ soft: true });
    // Báo cho Mini-View đang mở cập nhật số liệu
    window.dispatchEvent(new Event("sochi:data"));
  },
  /** Thay nội dung bằng một màn hình không có đường dẫn riêng (ví dụ mã khôi phục). */
  mount(el) {
    swap(el);
  },
  /** Mở bảng thêm khoản: mode = voice | scan | sms | manual */
  async openAdd(mode = "menu", preset) {
    const m = await import("./flows/add.js");
    m.openAdd(ctx, mode, preset);
  },
  async openUpgrade() {
    const m = await import("./screens/auth.js");
    m.openUpgradeSheet(ctx);
  }
};

function swap(el, { animate = true } = {}) {
  if (current && typeof current.cleanup === "function") current.cleanup();
  current = el;
  const update = () => root.replaceChildren(el);
  if (animate) withTransition(update);
  else update();
}

let loadingTimer = null;
let preloaded = false;

function markNav(active) {
  const nav = root.querySelector(".bottom-nav");
  if (!nav) return;
  for (const a of nav.querySelectorAll("a")) {
    if (a.getAttribute("href") === `#/${active}`) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
}

function bottomNav(active) {
  const item = (name, label, iconName) => h("a", { href: `#/${name}`, "aria-current": active === name ? "page" : null }, icon(iconName), label);
  const fab = h("button", { class: "fab", type: "button", "aria-label": tr("Ghi khoản mới") }, icon("plus"));
  fab.addEventListener("click", () => ctx.openAdd("menu"));
  return h("nav", { class: "bottom-nav", "aria-label": tr("Điều hướng chính") },
    item("home", tr("Hôm nay"), "house"),
    item("history", tr("Lịch sử"), "calendar-days"),
    fab,
    item("debts", tr("Sổ nợ"), "hand-coins"),
    item("me", tr("Tôi"), "user-round"));
}

/** Băng nhắc khi đang dùng thử: còn bao lâu và nút lưu tài khoản. */
function demoBanner() {
  const user = session.user;
  if (!user || !user.is_demo) return null;
  const expires = Date.parse(user.demo_expires_at);
  const hours = Number.isFinite(expires) ? Math.max(0, Math.ceil((expires - Date.now()) / 3600000)) : 24;
  const save = h("button", { class: "btn", type: "button" }, tr("Lưu lại"));
  save.addEventListener("click", () => ctx.openUpgrade());
  return h("div", { class: "demo-banner", role: "note" }, icon("hourglass", 18),
    h("span", null, tr`Đang dùng thử, còn khoảng ${hours} giờ. Lưu tài khoản để không mất dữ liệu.`), save);
}

async function render({ soft = false } = {}) {
  const seq = ++renderSeq;
  let { name, params } = parseHash();
  const loggedIn = Boolean(session.token);
  if (!ROUTES[name]) name = loggedIn ? "home" : "welcome";
  let route = ROUTES[name];
  if (!route.public && !loggedIn) {
    name = "welcome";
    route = ROUTES.welcome;
  } else if (route.public && loggedIn) {
    name = "home";
    route = ROUTES.home;
  }
  if (`#/${name}` !== location.hash.split("?")[0]) history.replaceState(null, "", `#/${name}`);
  if (!soft) {
    closeAllSheets();
    // Phản hồi ngay khi chạm: sáng mục vừa chọn, quá 120 ms chưa có số liệu thì hiện vạch tải
    markNav(route.nav);
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(() => document.body.classList.add("is-loading"), 120);
  }

  let screen;
  try {
    const screenFn = await route.load();
    if (seq !== renderSeq) return;
    screen = await screenFn(ctx, params);
  } catch (error) {
    console.error(error);
    if (seq === renderSeq) toast(tr("Không tải được màn hình, thử tải lại trang nhé."), "error");
    return;
  } finally {
    if (seq === renderSeq) {
      clearTimeout(loadingTimer);
      document.body.classList.remove("is-loading");
    }
  }
  if (seq !== renderSeq) return;
  if (route.public) {
    swap(screen, { animate: !soft });
    return;
  }
  const banner = demoBanner();
  if (banner) screen.prepend(banner);
  const page = h("div", null, screen, bottomNav(route.nav));
  page.cleanup = () => screen.cleanup && screen.cleanup();
  swap(page, { animate: !soft });
  if (!preloaded) {
    preloaded = true;
    preloadScreens();
  }
  // Lối tắt "Ghi khoản mới" khi nhấn giữ biểu tượng app: #/home?add=1
  if (params.get("add")) {
    history.replaceState(null, "", `#/${name}`);
    ctx.openAdd("menu");
  }
}

window.addEventListener("hashchange", () => render());
// Màn hình đang hiện số liệu cũ trong bộ đệm, máy chủ vừa trả số mới khác đi: vẽ lại nhẹ nhàng.
// Đang gõ dở trong ô nhập thì chờ gõ xong mới vẽ lại để không mất chữ.
window.addEventListener("thuchi:stale", function onStale() {
  if (!session.token) return;
  const active = document.activeElement;
  if (active && root.contains(active) && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) {
    active.addEventListener("blur", onStale, { once: true });
    return;
  }
  render({ soft: true });
});
// Ghi nhanh từ Mini-View thì vẽ lại màn hình đang xem
window.addEventListener("sochi:mini-saved", () => {
  if (session.token) render({ soft: true });
});
window.addEventListener("sochi:signed-out", (e) => {
  toast(e.detail || tr("Phiên đăng nhập đã kết thúc."), "error");
  ctx.go("welcome");
});

async function checkSession() {
  try {
    const me = await api("/auth/me", { fresh: true });
    session.save({ user: me });
    return true;
  } catch (error) {
    if (error.status === 401) session.clear();
    else if (error.code === "NETWORK") toast(error.message, "error", 6000);
    return false;
  }
}

/** Tải sẵn mã các màn hình lúc rảnh để lần đầu chạm vào không phải chờ tải file. */
function preloadScreens() {
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
  idle(() => {
    for (const route of Object.values(ROUTES)) if (!route.public) route.load().catch(() => {});
    import("./flows/add.js").catch(() => {});
  });
}

async function boot() {
  root.replaceChildren(h("div", { class: "splash" }, h("span", { class: "btn loading", style: { background: "none", boxShadow: "none", color: "var(--violet)" } }), tr("Đang mở ví...")));
  if (session.token && session.user) {
    // Đã từng đăng nhập trên máy này: mở app ngay, kiểm tra phiên ở nền (phiên hết hạn thì tự về trang chào)
    checkSession().then(() => {
      if (!session.token) ctx.go("welcome");
    });
  } else if (session.token) {
    await checkSession();
  }
  await render();
  if (session.token) {
    import("./flows/survey.js").then((m) => m.maybeShowSurvey(ctx)).catch(() => {});
  }
}

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

boot();

export { ctx };
