/**
 * @file ui.js
 * @description Các mảnh giao diện dùng chung: tạo phần tử an toàn (không dùng innerHTML với dữ liệu người dùng),
 * biểu tượng, định dạng tiền, thông báo, bảng trượt, trượt-để-xác-nhận, số đếm chạy, pháo giấy, rung.
 */

import { tr } from "./i18n.js";
import ICONS from "./icons.js";
import { getPref } from "./prefs.js";

/**
 * Tạo phần tử DOM. Chuỗi con luôn được thêm dưới dạng text nên không bị chèn mã.
 * @param {string} tag
 * @param {object} [props] - class, style, dataset, on<Sự kiện>, và thuộc tính khác
 * @param {...any} children
 */
export function h(tag, props, ...children) {
  const el = tag === "svg" || props?.svg ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null || value === false || key === "svg") continue;
      if (key === "class") el.setAttribute("class", value);
      else if (key === "style" && typeof value === "object") {
        for (const [prop, v] of Object.entries(value)) {
          if (prop.startsWith("--")) el.style.setProperty(prop, v);
          else el.style[prop] = v;
        }
      }
      else if (key === "dataset") Object.assign(el.dataset, value);
      else if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2).toLowerCase(), value);
      else if (key in el && typeof value !== "string" && !(el instanceof SVGElement)) el[key] = value;
      else el.setAttribute(key, value === true ? "" : value);
    }
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(el, child);
    else el.append(child instanceof Node ? child : String(child));
  }
}

/** Biểu tượng Lucide theo tên dạng kebab ("shopping-bag"), lấy từ bộ rút gọn icons.js. */
const SVG_NS = "http://www.w3.org/2000/svg";
const iconCache = new Map();

function iconTemplate(name) {
  let tpl = iconCache.get(name);
  if (tpl) return tpl;
  const parts = ICONS[name] || ICONS.circle;
  tpl = document.createElementNS(SVG_NS, "svg");
  for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round", class: "lucide" })) tpl.setAttribute(k, v);
  for (const [tag, attrs] of parts) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    tpl.append(el);
  }
  iconCache.set(name, tpl);
  return tpl;
}

export function icon(name, size = 20, className = "") {
  const svg = iconTemplate(String(name || "circle")).cloneNode(true);
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("aria-hidden", "true");
  if (className) svg.classList.add(...className.split(" "));
  return svg;
}

/* ---------------------------------------------------------------------------
   Định dạng
   ------------------------------------------------------------------------ */
const moneyFormat = new Intl.NumberFormat("vi-VN");

export function money(value, { sign = false } = {}) {
  const n = Math.round(Number(value) || 0);
  const text = `${moneyFormat.format(Math.abs(n))}đ`;
  if (n < 0) return `-${text}`;
  return sign && n > 0 ? `+${text}` : text;
}

/** Rút gọn: 1.250.000 -> 1,25tr ; 45.000 -> 45k */
export function moneyShort(value) {
  const n = Math.round(Number(value) || 0);
  const abs = Math.abs(n);
  const s = n < 0 ? "-" : "";
  if (abs >= 1e6) return `${s}${(abs / 1e6).toFixed(abs >= 1e7 ? 1 : 2).replace(/\.?0+$/, "").replace(".", ",")}tr`;
  if (abs >= 1e3) return `${s}${Math.round(abs / 1e3)}k`;
  return `${s}${abs}đ`;
}

/** Đọc số tiền người dùng gõ: "45k", "1tr2", "1.250.000", "45 nghìn" */
export function parseMoneyInput(text) {
  const raw = String(text || "").trim().toLowerCase().replace(/\s+/g, "");
  if (!raw) return null;
  let m = raw.match(/^(\d+(?:[.,]\d+)?)(tr|triệu|m)(\d{1,3})?$/);
  if (m) {
    const base = Number(m[1].replace(",", ".")) * 1e6;
    const tail = m[3] ? Number(m[3].padEnd(3, "0")) * 1e3 : 0;
    return Math.round(base + tail);
  }
  m = raw.match(/^(\d+(?:[.,]\d+)?)(k|nghìn|ngàn|n)$/);
  if (m) return Math.round(Number(m[1].replace(",", ".")) * 1e3);
  const digits = raw.replace(/[.,đd]/g, "");
  return /^\d+$/.test(digits) ? Number(digits) : null;
}

const DOW = [tr("Chủ nhật"), tr("Thứ 2"), tr("Thứ 3"), tr("Thứ 4"), tr("Thứ 5"), tr("Thứ 6"), tr("Thứ 7")];

export function dateLabel(iso, todayIso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (todayIso) {
    const [ty, tm, td] = todayIso.split("-").map(Number);
    const diff = Math.round((new Date(ty, tm - 1, td) - date) / 86400000);
    if (diff === 0) return tr("Hôm nay");
    if (diff === 1) return tr("Hôm qua");
    if (diff === -1) return tr("Ngày mai");
  }
  return `${DOW[date.getDay()]}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}${todayIso && Number(todayIso.slice(0, 4)) !== y ? `/${y}` : ""}`;
}

export function greeting(time) {
  const hour = Number(String(time).slice(0, 2));
  if (hour < 11) return tr("Chào buổi sáng");
  if (hour < 14) return tr("Trưa rồi nè");
  if (hour < 18) return tr("Chiều vui nha");
  return tr("Tối an lành");
}

/* ---------------------------------------------------------------------------
   Hiệu ứng
   ------------------------------------------------------------------------ */
export function haptic(pattern = 12) {
  if (getPref("haptics") === "off") return;
  try {
    // Trình duyệt chỉ cho rung sau khi người dùng đã chạm vào trang
    const active = !navigator.userActivation || navigator.userActivation.hasBeenActive;
    if (navigator.vibrate && active) navigator.vibrate(pattern);
  } catch {
    /* không hỗ trợ rung */
  }
}

const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Số chạy từ giá trị cũ tới giá trị mới (requestAnimationFrame, easeOutExpo). */
export function countUp(el, to, { duration = 1100, format = money } = {}) {
  const from = Number(el.dataset.value || 0);
  el.dataset.value = to;
  if (reduceMotion() || from === to) {
    el.textContent = format(to);
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = t === 1 ? 1 : 1 - 2 ** (-10 * t);
    el.textContent = format(from + (to - from) * eased);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Đổi màn hình có hiệu ứng View Transitions (trình duyệt không hỗ trợ thì đổi thẳng). */
export function withTransition(update) {
  if (document.startViewTransition && !reduceMotion() && document.visibilityState === "visible") {
    // Chốt an toàn: nếu trình duyệt chưa kịp vẽ khung hình (tab nền) thì vẫn đổi màn hình
    let done = false;
    const once = () => {
      if (!done) {
        done = true;
        update();
      }
    };
    const timer = setTimeout(once, 200);
    const vt = document.startViewTransition(() => {
      clearTimeout(timer);
      once();
    });
    vt.ready.catch(() => {});
    vt.updateCallbackDone.catch(() => {});
    return vt.finished.catch(() => {});
  }
  update();
  return Promise.resolve();
}

/** Pháo giấy bằng canvas. */
export function confetti({ count = 120, origin } = {}) {
  if (reduceMotion()) return;
  const canvas = h("canvas", { class: "confetti-canvas" });
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);
  const colors = ["#ff7eb9", "#b38cff", "#7fb2ff", "#7ee8c3", "#ffe58a", "#ff9a8b"];
  const ox = origin ? origin.x : W / 2;
  const oy = origin ? origin.y : H * 0.35;
  const parts = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 8;
    return {
      x: ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 6,
      size: 5 + Math.random() * 7,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      color: colors[(Math.random() * colors.length) | 0],
      round: Math.random() < 0.35
    };
  });
  const started = performance.now();
  const frame = (now) => {
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.28;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    }
    if (now - started < 2600) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

/* ---------------------------------------------------------------------------
   Thông báo nhỏ
   ------------------------------------------------------------------------ */
let toastWrap = null;

/**
 * @param {string} message
 * @param {"ok"|"error"|"info"} [kind]
 * @param {number} [ms]
 * @param {{label: string, onClick: Function}} [action] nút phụ, ví dụ "Hoàn tác"
 */
export function toast(message, kind = "info", ms = 3200, action) {
  if (!toastWrap) {
    toastWrap = h("div", { class: "toast-wrap", role: "status", "aria-live": "polite" });
    document.body.append(toastWrap);
  }
  const iconName = kind === "ok" ? "circle-check" : kind === "error" ? "circle-alert" : "sparkles";
  const el = h("div", { class: `toast ${kind}` }, icon(iconName), h("span", { class: "grow" }, message));
  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    el.classList.add("out");
    el.addEventListener("animationend", () => el.remove(), { once: true });
    // Máy tắt hiệu ứng hoặc tab chạy nền thì không có animationend
    setTimeout(() => el.remove(), 450);
  };
  if (action) {
    const btn = h("button", { class: "toast-action", type: "button" }, action.label);
    btn.addEventListener("click", () => {
      remove();
      action.onClick();
    });
    el.append(btn);
  }
  toastWrap.append(el);
  // Giữ tối đa 3 thông báo, cái cũ nhất tự tắt
  const shown = [...toastWrap.children].filter((t) => !t.classList.contains("out"));
  for (const old of shown.slice(0, -3)) old.dispatchEvent(new Event("toast:close"));
  el.addEventListener("toast:close", remove, { once: true });
  if (kind === "error") haptic([30, 40, 30]);
  setTimeout(remove, ms);
}

/* ---------------------------------------------------------------------------
   Bảng trượt từ dưới lên, kéo tay cầm xuống để đóng
   ------------------------------------------------------------------------ */
const openSheets = [];

export function openSheet({ title, content, onClose, label } = {}) {
  const backdrop = h("div", { class: "sheet-backdrop" });
  const handle = h("div", { class: "sheet-handle", "aria-hidden": "true" });
  const body = h("div", { class: "sheet-body" });
  const closeBtn = h("button", { class: "icon-btn", type: "button", "aria-label": tr("Đóng") }, icon("x"));
  const sheet = h("section", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": label || title || tr("Bảng") },
    handle,
    title ? h("div", { class: "sheet-head" }, h("h2", null, title), closeBtn) : null,
    body);

  let closed = false;
  const close = (reason) => {
    if (closed) return;
    closed = true;
    sheet.classList.add("closing");
    backdrop.classList.add("closing");
    setTimeout(() => {
      sheet.remove();
      backdrop.remove();
    }, 240);
    document.removeEventListener("keydown", onKey);
    const index = openSheets.indexOf(api);
    if (index >= 0) openSheets.splice(index, 1);
    if (onClose) onClose(reason);
  };
  const onKey = (e) => {
    if (e.key === "Escape" && openSheets[openSheets.length - 1] === api) close("escape");
  };

  backdrop.addEventListener("click", () => close("backdrop"));
  closeBtn.addEventListener("click", () => close("button"));
  document.addEventListener("keydown", onKey);

  // Kéo tay cầm xuống để đóng
  let startY = null;
  handle.addEventListener("pointerdown", (e) => {
    startY = e.clientY;
    handle.setPointerCapture(e.pointerId);
    sheet.style.transition = "none";
  });
  handle.addEventListener("pointermove", (e) => {
    if (startY === null) return;
    const dy = Math.max(0, e.clientY - startY);
    sheet.style.transform = `translateY(${dy}px)`;
  });
  const endDrag = (e) => {
    if (startY === null) return;
    const dy = e.clientY - startY;
    startY = null;
    sheet.style.transition = "transform 0.4s var(--spring)";
    if (dy > 110) close("drag");
    else sheet.style.transform = "";
  };
  handle.addEventListener("pointerup", endDrag);
  handle.addEventListener("pointercancel", endDrag);

  const api = { el: sheet, body, close, setContent };
  function setContent(...nodes) {
    body.replaceChildren(...nodes.flat().filter(Boolean));
  }
  if (content) setContent(content);
  document.body.append(backdrop, sheet);
  openSheets.push(api);
  requestAnimationFrame(() => {
    const first = sheet.querySelector("input:not([type=hidden]), textarea, select");
    if (first && window.matchMedia("(pointer: fine)").matches) first.focus();
  });
  return api;
}

export function closeAllSheets() {
  [...openSheets].forEach((s) => s.close("navigate"));
}

/** Hộp xác nhận nhỏ dạng bảng trượt. Trả về Promise<boolean>. */
export function confirmSheet({ title, message, okText = tr("Đồng ý"), cancelText = tr("Thôi"), danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    const sheet = openSheet({
      title,
      onClose: () => {
        if (!answered) resolve(false);
      }
    });
    const ok = h("button", { class: `btn block ${danger ? "danger" : ""}`, type: "button" }, okText);
    const cancel = h("button", { class: "btn soft block", type: "button" }, cancelText);
    ok.addEventListener("click", () => {
      answered = true;
      resolve(true);
      sheet.close("ok");
    });
    cancel.addEventListener("click", () => sheet.close("cancel"));
    sheet.setContent(h("div", { class: "stack" }, message ? h("p", { class: "muted" }, message) : null, ok, cancel));
  });
}

/* ---------------------------------------------------------------------------
   Trượt để xác nhận: chống bấm nhầm khi ghi tiền
   ------------------------------------------------------------------------ */
export function slideToConfirm({ label = tr("Trượt để xác nhận"), onConfirm }) {
  const fill = h("div", { class: "track-fill" });
  const knob = h("div", { class: "knob", role: "button", tabindex: "0", "aria-label": label }, icon("chevrons-right", 26));
  const wrap = h("div", { class: "slide-confirm" }, fill, h("div", { class: "label" }, label), knob);

  let startX = null;
  let max = 0;
  let done = false;
  const setX = (x) => {
    knob.style.transform = `translateX(${x}px)`;
    fill.style.width = `${x + 62}px`;
  };
  const finish = async () => {
    done = true;
    wrap.classList.add("done");
    knob.replaceChildren(icon("check", 26));
    haptic([18, 30, 18]);
    try {
      await onConfirm();
    } catch {
      reset();
    }
  };
  const reset = () => {
    done = false;
    wrap.classList.remove("done");
    wrap.classList.add("snap");
    knob.replaceChildren(icon("chevrons-right", 26));
    setX(0);
  };

  knob.addEventListener("pointerdown", (e) => {
    if (done) return;
    startX = e.clientX;
    max = wrap.clientWidth - knob.offsetWidth - 10;
    wrap.classList.remove("snap");
    knob.setPointerCapture(e.pointerId);
  });
  knob.addEventListener("pointermove", (e) => {
    if (startX === null) return;
    const x = Math.min(max, Math.max(0, e.clientX - startX));
    setX(x);
    if (x >= max) {
      startX = null;
      finish();
    }
  });
  const release = () => {
    if (startX === null) return;
    startX = null;
    if (!done) reset();
  };
  knob.addEventListener("pointerup", release);
  knob.addEventListener("pointercancel", release);
  // Bàn phím: Enter/Space xác nhận luôn
  knob.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && !done) {
      e.preventDefault();
      max = wrap.clientWidth - knob.offsetWidth - 10;
      wrap.classList.add("snap");
      setX(max);
      finish();
    }
  });

  return Object.assign(wrap, { reset });
}

/* ---------------------------------------------------------------------------
   Ô nhập có nhãn nổi
   ------------------------------------------------------------------------ */
let fieldSeq = 0;

export function field({ label, name, type = "text", value = "", autocomplete, inputmode, maxlength, hint, required, suffix }) {
  const id = `f${++fieldSeq}`;
  const input = h(type === "textarea" ? "textarea" : "input", {
    id,
    name,
    type: type === "textarea" ? undefined : type,
    placeholder: " ",
    autocomplete,
    inputmode,
    maxlength,
    required
  });
  input.value = value;
  const hintEl = h("p", { class: "field-hint", id: `${id}-hint` }, hint || "");
  if (!hint) hintEl.hidden = true;
  input.setAttribute("aria-describedby", hintEl.id);
  const wrap = h("div", { class: `field${suffix ? " has-suffix" : ""}` }, input, h("label", { for: id }, label), suffix ? h("div", { class: "suffix" }, suffix) : null);

  return {
    el: h("div", null, wrap, hintEl),
    input,
    wrap,
    setHint(text, kind = "") {
      hintEl.textContent = text || "";
      hintEl.className = `field-hint ${kind}`;
      hintEl.hidden = !text;
      wrap.classList.toggle("invalid", kind === "error");
    }
  };
}

/** Ô mật khẩu có nút hiện/ẩn. */
export function passwordField(options) {
  const toggle = h("button", { class: "icon-btn", type: "button", "aria-label": tr("Hiện mật khẩu"), style: { border: "0", background: "transparent" } }, icon("eye"));
  const f = field({ ...options, type: "password", suffix: toggle });
  toggle.addEventListener("click", () => {
    const show = f.input.type === "password";
    f.input.type = show ? "text" : "password";
    toggle.replaceChildren(icon(show ? "eye-off" : "eye"));
    toggle.setAttribute("aria-label", show ? tr("Ẩn mật khẩu") : tr("Hiện mật khẩu"));
  });
  return f;
}

/** Đặt nút vào trạng thái đang tải; trả về hàm khôi phục. */
export function busy(button) {
  button.classList.add("loading");
  button.disabled = true;
  return () => {
    button.classList.remove("loading");
    button.disabled = false;
  };
}

/** Tên màu lưu trong CSDL -> cặp màu gradient kẹo ngọt. */
const CATEGORY_COLORS = {
  amber: ["#ffcf6b", "#ff9f5a"],
  blue: ["#8ec5ff", "#6b8cff"],
  cyan: ["#7ee8e0", "#4fb8e8"],
  rose: ["#ff9ac1", "#ff6b95"],
  orange: ["#ffb37a", "#ff7f50"],
  indigo: ["#a5a8ff", "#7b6cff"],
  violet: ["#d0a6ff", "#9b6cff"],
  red: ["#ff9a9a", "#f4567a"],
  emerald: ["#7ee8c3", "#22b98a"],
  green: ["#a6ec8f", "#3cc26b"],
  teal: ["#7fe3d3", "#1fa8a0"],
  lime: ["#d4f27a", "#8fcf3c"]
};

/** Tên các màu danh mục, dùng cho ô chọn màu khi thêm / sửa danh mục. */
export const CATEGORY_COLOR_NAMES = Object.keys(CATEGORY_COLORS);

export function categoryColor(name) {
  const pair = CATEGORY_COLORS[name] || (String(name || "").startsWith("#") ? [name, name] : ["#d0a6ff", "#9b6cff"]);
  return `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`;
}

/** Ô biểu tượng tròn của danh mục. */
export function categoryBadge(cat, size = 42) {
  return h("span", {
    class: "tx-icon",
    style: { background: categoryColor(cat.category_color || cat.color), width: `${size}px`, height: `${size}px` }
  }, icon(cat.category_icon || cat.icon || "circle", Math.round(size / 2)));
}

const SOURCE_ICONS = { voice: "mic", bill: "image-up", sms: "message-square-text", quick: "zap", split: "users", reconcile: "scale" };

/** Một dòng giao dịch trong danh sách. */
export function txRow(tx, onClick) {
  const time = tx.transaction_time ? String(tx.transaction_time).slice(0, 5) : "";
  const meta = [time, tx.category_name].filter(Boolean).join(" · ");
  const row = h("button", { class: "tx", type: "button" },
    categoryBadge(tx),
    h("span", { class: "tx-main" },
      h("strong", null, tx.note || tx.category_name),
      h("small", null, meta, SOURCE_ICONS[tx.source] ? " " : "", SOURCE_ICONS[tx.source] ? icon(SOURCE_ICONS[tx.source], 12) : null)),
    h("span", { class: `tx-amt ${tx.type}` }, `${tx.type === "income" ? "+" : "-"}${money(tx.amount)}`));
  if (onClick) row.addEventListener("click", () => onClick(tx));
  return row;
}

/** Một dòng trong danh sách menu (Công cụ, Cài đặt). */
export function menuItem(iconName, title, sub, onClick, { danger = false, href, trailing } = {}) {
  const el = h(href ? "a" : "button", { class: `menu-item${danger ? " danger" : ""}`, type: href ? undefined : "button", href },
    h("span", { class: "mi-icon" }, icon(iconName)),
    h("span", { class: "grow" }, title, sub ? h("small", null, sub) : null),
    trailing || icon("chevron-right"));
  if (onClick) el.addEventListener("click", onClick);
  return el;
}

/** Nút bánh răng ở góc phải đầu màn hình, mở màn Cài đặt. */
export function settingsButton() {
  return h("a", { class: "icon-btn", href: "#/settings", "aria-label": tr("Cài đặt") }, icon("settings"));
}

/** Tên để chào: tên hiển thị nếu có, không thì tên đăng nhập. */
export function displayName(user) {
  if (!user || user.is_demo) return tr("bạn");
  return user.display_name || user.username || tr("bạn");
}
