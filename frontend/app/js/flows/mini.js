/**
 * @file mini.js
 * @description Mini-View "Đã chi hôm nay": cửa sổ nhỏ luôn nổi trên các cửa sổ khác
 * (Document Picture-in-Picture trên Chrome/Edge máy tính). Trình duyệt không hỗ trợ thì hiện
 * thành bong bóng nổi kéo thả được ngay trong app. Có ô ghi nhanh: gõ "trà sữa 35k" là xong.
 */

import { tr } from "../i18n.js";
import { api, today, nowTime } from "../api.js";
import { h, icon, money, moneyShort } from "../ui.js";

const POS_KEY = "sochi.mini.pos";
const REFRESH_MS = 60000;

let current = null;

/** Ghi nhanh trong Mini-View cần danh mục để chọn danh mục dự phòng. */
let categories = null;
async function loadCategories() {
  if (!categories) categories = await api("/categories");
  return categories;
}

function pickCategory(cats, item) {
  const type = item.type === "income" ? "income" : "expense";
  const byId = cats.find((c) => c.id === item.category_id && c.type === type);
  if (byId) return byId;
  const same = cats.filter((c) => c.type === type);
  return same.find((c) => /khác/i.test(c.name)) || same[0];
}

/**
 * Tạo nội dung Mini-View. Trả về {el, load, destroy}.
 * @param {{onClose: Function, compact?: boolean}} options
 */
function buildWidget({ onClose }) {
  const spent = h("div", { class: "mini-money" }, "...");
  const sub = h("div", { class: "mini-sub" }, "");
  const bar = h("span");
  const progress = h("div", { class: "progress mini-progress", hidden: true }, bar);
  const status = h("div", { class: "mini-status", role: "status", "aria-live": "polite" });
  const input = h("input", { class: "mini-input mini-quick", placeholder: tr("Ghi nhanh: trà sữa 35k"), maxlength: 200, "aria-label": tr("Ghi nhanh một khoản"), autocomplete: "off" });
  const closeBtn = h("button", { class: "icon-btn mini-close", type: "button", "aria-label": tr("Đóng Mini-View") }, icon("x", 16));
  closeBtn.addEventListener("click", onClose);

  let pending = null;

  async function load() {
    try {
      const m = await api("/dashboard/mini", { query: { today: today(), now: nowTime() } });
      spent.textContent = money(m.spent_today || 0);
      const b = m.budget;
      if (b) {
        const allowance = Math.max(0, b.daily_allowance || 0);
        const left = b.left_today || 0;
        const over = left < 0 || (allowance === 0 && m.spent_today > 0);
        sub.replaceChildren(over
          ? h("span", { class: "mini-over" }, tr`Lố ${money(Math.abs(left))} rồi, chậm lại nha`)
          : h("span", null, tr("Còn được tiêu "), h("b", null, money(Math.max(0, left)))));
        progress.hidden = false;
        progress.classList.toggle("over", over);
        bar.style.width = `${allowance > 0 ? Math.min(100, ((m.spent_today || 0) / allowance) * 100) : 100}%`;
      } else {
        progress.hidden = true;
        sub.textContent = tr`${m.transaction_count || 0} khoản · thu +${moneyShort(m.received_today || 0)}`;
      }
    } catch (error) {
      sub.textContent = error.message;
    }
  }

  function showStatus(...nodes) {
    status.replaceChildren(...nodes);
  }

  async function parse() {
    const text = input.value.trim();
    if (!text) return;
    showStatus(h("span", { class: "mini-sub" }, tr("Đang đọc...")));
    try {
      const [data, cats] = await Promise.all([
        api("/scan/voice", { method: "POST", body: { text, today: today(), now: nowTime() } }),
        loadCategories()
      ]);
      const items = (data.items || []).filter((it) => Number(it.amount) > 0);
      if (!items.length) {
        showStatus(h("span", { class: "mini-sub" }, tr("Chưa thấy số tiền, thử \"ăn sáng 25k\".")));
        return;
      }
      pending = items.map((it) => {
        const cat = pickCategory(cats, it);
        return {
          category_id: cat.id,
          type: cat.type,
          amount: Number(it.amount),
          note: it.note || null,
          transaction_date: it.transaction_date ? String(it.transaction_date).slice(0, 10) : today(),
          transaction_time: it.transaction_time ? String(it.transaction_time).slice(0, 5) : nowTime(),
          source: "quick"
        };
      });
      const total = pending.reduce((s, p) => s + (p.type === "income" ? 0 : p.amount), 0);
      const label = pending.length === 1 ? `"${pending[0].note || cats.find((c) => c.id === pending[0].category_id).name}"` : tr`${pending.length} khoản`;
      const ok = h("button", { class: "btn small mini-ok", type: "button" }, icon("check", 14), "Ghi");
      const no = h("button", { class: "btn small ghost", type: "button" }, tr("Thôi"));
      ok.addEventListener("click", save);
      no.addEventListener("click", () => {
        pending = null;
        showStatus();
        input.focus();
      });
      showStatus(h("div", { class: "mini-ask" },
        h("span", null, `Ghi ${pending.length === 1 && pending[0].type === "income" ? "+" : ""}${money(pending.length === 1 ? pending[0].amount : total)} cho ${label}?`),
        h("span", { class: "mini-actions" }, ok, no)));
      ok.focus();
    } catch (error) {
      showStatus(h("span", { class: "mini-over" }, error.message));
    }
  }

  async function save() {
    if (!pending) return;
    const items = pending;
    pending = null;
    showStatus(h("span", { class: "mini-sub" }, tr("Đang ghi...")));
    try {
      for (const item of items) {
        const { type, ...body } = item;
        await api("/transactions", { method: "POST", body });
      }
      input.value = "";
      showStatus(h("span", { class: "mini-done" }, icon("check", 14), tr(" Đã ghi")));
      setTimeout(() => showStatus(), 2500);
      window.dispatchEvent(new Event("sochi:mini-saved"));
      await load();
      input.focus();
    } catch (error) {
      showStatus(h("span", { class: "mini-over" }, error.message));
    }
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (pending) save();
      else parse();
    } else if (e.key === "Escape" && pending) {
      pending = null;
      showStatus();
    }
  });

  const el = h("div", { class: "mini-widget" },
    h("div", { class: "mini-head" }, icon("wallet", 16), h("span", { class: "grow" }, tr("Đã chi hôm nay")), closeBtn),
    spent, progress, sub, input, status);

  const onData = () => load();
  window.addEventListener("sochi:data", onData);
  const timer = setInterval(load, REFRESH_MS);
  load();
  return {
    el,
    input,
    load,
    destroy() {
      clearInterval(timer);
      window.removeEventListener("sochi:data", onData);
    }
  };
}

/* ---------------------------------------------------------------------------
   Cửa sổ nổi trên máy tính (Document Picture-in-Picture)
   ------------------------------------------------------------------------ */
async function openPip() {
  const pip = await window.documentPictureInPicture.requestWindow({ width: 300, height: 250 });
  // Mang theo giao diện của app
  for (const node of document.querySelectorAll("link[rel=stylesheet], style")) {
    pip.document.head.append(node.cloneNode(true));
  }
  const theme = document.documentElement.dataset.theme;
  if (theme) pip.document.documentElement.dataset.theme = theme;
  pip.document.title = "Thu Chi mini";
  pip.document.body.classList.add("mini-pip-body");

  const widget = buildWidget({ onClose: () => pip.close() });
  pip.document.body.append(widget.el);
  pip.addEventListener("pagehide", () => {
    widget.destroy();
    current = null;
  });
  current = { close: () => pip.close() };
}

/* ---------------------------------------------------------------------------
   Bong bóng nổi trong app (điện thoại, Firefox, Safari)
   ------------------------------------------------------------------------ */
function readPos() {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) || "null");
    return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : null;
  } catch {
    return null;
  }
}

function openBubble() {
  let widget;
  const box = h("aside", { class: "mini-float", "aria-label": tr("Mini-View đã chi hôm nay") });
  const close = () => {
    widget.destroy();
    box.remove();
    current = null;
  };
  widget = buildWidget({ onClose: close });
  const grip = h("div", { class: "mini-grip", "aria-hidden": "true" });
  box.append(grip, widget.el);
  document.body.append(box);

  const place = (x, y) => {
    const maxX = window.innerWidth - box.offsetWidth - 8;
    const maxY = window.innerHeight - box.offsetHeight - 8;
    box.style.left = `${Math.max(8, Math.min(maxX, x))}px`;
    box.style.top = `${Math.max(8, Math.min(maxY, y))}px`;
  };
  const saved = readPos();
  place(saved ? saved.x : window.innerWidth - box.offsetWidth - 12, saved ? saved.y : 90);

  // Kéo thả bằng thanh trên cùng
  let start = null;
  grip.addEventListener("pointerdown", (e) => {
    start = { x: e.clientX - box.offsetLeft, y: e.clientY - box.offsetTop };
    grip.setPointerCapture(e.pointerId);
  });
  grip.addEventListener("pointermove", (e) => {
    if (start) place(e.clientX - start.x, e.clientY - start.y);
  });
  const end = () => {
    if (!start) return;
    start = null;
    try {
      localStorage.setItem(POS_KEY, JSON.stringify({ x: box.offsetLeft, y: box.offsetTop }));
    } catch {
      // Không lưu được vị trí thì thôi
    }
  };
  grip.addEventListener("pointerup", end);
  grip.addEventListener("pointercancel", end);
  current = { close };
}

/** Bật/tắt Mini-View. */
export async function openFloatingMini() {
  if (current) {
    current.close();
    return;
  }
  if ("documentPictureInPicture" in window) {
    try {
      await openPip();
      return;
    } catch {
      // Bị chặn (ví dụ không phải thao tác người dùng) thì dùng bong bóng
    }
  }
  openBubble();
}
