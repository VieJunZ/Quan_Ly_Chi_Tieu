/**
 * @file coach.js
 * @description Những mảnh giao diện "huấn luyện viên chi tiêu" dùng chung cho Trang chủ, Lịch sử và màn Thử thách:
 * thanh tiến độ thử thách, đồng hồ đếm ngược, thẻ "Việc nên làm" (cắt giảm gì, giữ lại được bao nhiêu)
 * và tổng kết tuần (điểm tốt nói trước, tổng tiền chỉ hiện khi người dùng chủ động xem).
 */

import { tr } from "./i18n.js";
import { h, icon, money, moneyShort, toast, confetti, openSheet, haptic } from "./ui.js";

/* ---------- Đếm ngược ---------- */

/** Hết hạn lúc 23:59:59 ngày cuối, theo giờ trên máy. */
function deadline(endIso) {
  const [y, m, d] = endIso.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59).getTime();
}

const pad = (n) => String(n).padStart(2, "0");

function countdownText(ms) {
  if (ms <= 0) return tr("Đang chốt kết quả");
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const clock = `${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  return days ? tr`Còn ${days} ngày ${clock}` : tr`Còn ${clock}`;
}

export function countdown(endIso) {
  const el = h("span", { class: "countdown", "data-deadline": String(deadline(endIso)) });
  el.textContent = countdownText(deadline(endIso) - Date.now());
  return el;
}

/** Cập nhật mọi đồng hồ trong `root` mỗi giây. Trả về hàm dừng. */
export function startTicker(root) {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const el of root.querySelectorAll("[data-deadline]")) {
      el.textContent = countdownText(Number(el.dataset.deadline) - now);
    }
  }, 1000);
  return () => clearInterval(timer);
}

/* ---------- Tiến độ ---------- */

/** {pct, tone, text} cho thanh tiến độ của một thử thách đang chạy. */
export function progressOf(c) {
  const p = c.progress || {};
  const ratio = p.target ? p.value / p.target : p.value > 0 ? 2 : 0;
  // Mục tiêu "giữ dưới mức trần": càng đầy càng nguy; mục tiêu "đạt đủ": càng đầy càng tốt
  const capKind = p.unit === "money" || p.unit === "money_daily" || p.unit === "count";
  const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  let tone = "ok";
  if (capKind) tone = ratio >= 1 ? "danger" : ratio >= 0.7 ? "warn" : "ok";
  let text = "";
  switch (p.unit) {
    case "money":
      text = tr`Đã tiêu ${moneyShort(p.value)} / ${moneyShort(p.target)}`;
      if (p.left > 0 && p.per_day !== undefined) text += tr` · còn ${moneyShort(p.left)} (~${moneyShort(p.per_day)}/ngày)`;
      else if (p.left === 0) text += tr(" · chạm trần rồi, giữ nhé!");
      break;
    case "money_daily":
      text = tr`Hôm nay ${moneyShort(p.value)} / ${moneyShort(p.target)}`;
      text += p.left > 0 ? tr` · còn ${moneyShort(p.left)}` : tr(" · đủ rồi, mai tiếp nhé");
      break;
    case "count":
      text = p.target === 0 ? (p.value ? tr`Đã ${p.value} lần` : tr("Chưa lần nào, tốt lắm!")) : tr`Đã ${p.value} / ${p.target} lần`;
      break;
    case "days":
      text = tr`Đạt ${p.value} / ${p.target} ngày không tiêu`;
      break;
    case "streak":
      text = tr`Đã ghi ${p.value} / ${p.target} ngày`;
      break;
    default:
      text = "";
  }
  return { pct: capKind && p.target === 0 ? (p.value ? 100 : 0) : pct, tone, text };
}

export function goalBar(pct, tone) {
  return h("div", { class: `goal-bar ${tone || ""}`, role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(pct) },
    h("i", { style: { width: `${pct}%` } }));
}

/* ---------- Ăn mừng thắng / huy hiệu mới (mỗi thứ chỉ một lần trên máy này) ---------- */

const SEEN_KEY = "thuchi.coach.seen";

function readSeen() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function writeSeen(set) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...set].slice(-300)));
  } catch {
    // Không lưu được thì lần sau có thể chúc mừng lại, không sao
  }
}

const recent = (iso) => iso && Date.now() - Date.parse(iso) < 3 * 86400000;

export function badgeTile(b, onClick) {
  const tile = h(onClick ? "button" : "div", {
    class: `medal ${b.tier} ${b.earned ? "" : "locked"}`,
    type: onClick ? "button" : undefined,
    "aria-label": `${b.name}${b.earned ? "" : tr(" (chưa mở)")}`
  },
  h("span", { class: "medal-icon" }, icon(b.icon, 26), b.earned ? null : h("span", { class: "medal-lock" }, icon("lock", 11))),
  h("span", { class: "medal-name" }, b.name));
  if (onClick) tile.addEventListener("click", () => onClick(b));
  return tile;
}

export function celebrate(ov) {
  if (!ov) return;
  const seen = readSeen();
  let changed = false;
  for (const c of ov.finished || []) {
    const id = `c${c.id}`;
    if (seen.has(id) || (c.status !== "won" && c.status !== "lost")) continue;
    seen.add(id);
    changed = true;
    if (!recent(c.finished_at)) continue;
    if (c.status === "won") {
      confetti({ count: 140 });
      haptic([10, 40, 10, 40, 20]);
      toast(tr`Thắng thử thách: ${c.title}!`, "ok", 4200);
    } else {
      toast(tr`"${c.title}" chưa thành. Không sao, thử lại ở mức nhẹ hơn nhé.`, "info", 4200);
    }
  }
  const fresh = (ov.badges || []).filter((b) => b.earned && !seen.has(`b${b.key}`));
  for (const b of fresh) seen.add(`b${b.key}`);
  if (fresh.length) changed = true;
  const show = fresh.filter((b) => recent(b.earned_at));
  if (show.length) {
    setTimeout(() => {
      confetti({ count: 90 });
      openSheet({
        title: show.length > 1 ? tr`${show.length} huy hiệu mới!` : tr("Huy hiệu mới!"),
        content: h("div", { class: "stack center" },
          h("div", { class: "medal-grid" }, ...show.map((b) => badgeTile(b))),
          h("p", { class: "muted" }, show.map((b) => `${b.name}: ${b.desc}.`).join(" ")),
          h("a", { class: "btn block", href: "#/challenges" }, icon("trophy", 18), tr("Xem bộ sưu tập")))
      });
    }, 500);
  }
  if (changed) writeSeen(seen);
}

/* ---------- Thẻ trên trang chủ ---------- */

/** Thử thách đang chạy (tối đa 3) hoặc lời mời nhận thử thách đầu tiên. */
export function challengeStrip(ctx, ov) {
  if (!ov) return null;
  const head = h("div", { class: "row between" },
    h("h2", { style: { fontSize: "16px" } }, tr("Thử thách")),
    h("a", { class: "link", href: "#/challenges" }, tr`${ov.stats.badges}/${ov.stats.badges_total} huy hiệu`));

  if (!ov.active.length) {
    const top = ov.suggestions.find((s) => !s.running && s.unit !== "streak" && s.unit !== "days") || ov.suggestions[0];
    if (!top) return null;
    const goal = top.targets[7] && (top.targets[7].medium || top.targets[7].light);
    return h("section", { class: "card stack" }, head,
      h("a", { class: "ch-invite", href: `#/challenges?key=${encodeURIComponent(top.key)}` },
        h("span", { class: "ch-icon" }, icon(top.icon, 22)),
        h("span", { class: "grow" },
          h("strong", null, goal ? goal.title : top.name),
          h("small", null, top.reason)),
        icon("chevron-right")));
  }

  const list = h("div", { class: "stack", style: { gap: "12px" } });
  for (const c of ov.active.slice(0, 3)) {
    const p = progressOf(c);
    list.append(h("a", { class: "ch-mini", href: "#/challenges" },
      h("span", { class: "ch-icon small-icon" }, icon(c.icon, 18)),
      h("span", { class: "grow stack", style: { gap: "4px" } },
        h("span", { class: "row between" }, h("strong", { class: "ch-title" }, c.title), countdown(c.end_date)),
        goalBar(p.pct, p.tone),
        h("small", { class: "faint" }, p.text))));
  }
  if (ov.active.length > 3) list.append(h("a", { class: "link", href: "#/challenges" }, tr`+${ov.active.length - 3} thử thách nữa`));
  return h("section", { class: "card stack" }, head, list);
}

/** "Việc nên làm": hành động cụ thể + số tiền giữ lại được, kèm nút nhận thử thách tương ứng. */
export function actionsCard(ctx, ins, { compact = false } = {}) {
  if (!ins || !ins.actions || !ins.actions.length) return null;
  const items = compact ? ins.actions.slice(0, 2) : ins.actions;
  const list = h("div", { class: "stack", style: { gap: "10px" } });
  for (const a of items) {
    const row = h("div", { class: "action-row" },
      h("span", { class: "ch-icon small-icon" }, icon(a.icon, 18)),
      h("div", { class: "grow" },
        h("div", { class: "row between", style: { alignItems: "flex-start" } },
          h("strong", null, a.title),
          h("span", { class: "save-pill" }, `+${moneyShort(a.save_monthly)}/th`)),
        compact ? null : h("p", { class: "faint mt-0", style: { margin: "4px 0 0" } }, a.detail),
        a.challenge
          ? h("a", { class: "btn small soft mt-8", href: `#/challenges?key=${encodeURIComponent(a.challenge.key)}&level=${a.challenge.level}&days=${a.challenge.days}` },
            icon("flag", 15), tr("Biến thành thử thách"))
          : h("span", { class: "badge ok mt-8" }, icon("check", 12), tr("Đang thử thách"))));
    list.append(row);
  }
  return h("section", { class: "card stack" },
    h("div", { class: "card-title", style: { marginBottom: 0 } }, icon("target", 20), tr("Việc nên làm tháng này")),
    h("p", { class: "muted mt-0" }, tr("Làm theo những việc dưới đây, mỗi tháng bạn có thể giữ lại khoảng "),
      h("strong", { style: { color: "var(--income)" } }, money(ins.save_monthly_total)), "."),
    list,
    compact && ins.actions.length > 2 ? h("a", { class: "link", href: "#/history" }, tr("Xem thêm gợi ý và tổng kết tuần")) : null);
}

/** Tổng kết 7 ngày: nói điều tốt trước, tổng tiền giấu sau một lần chạm để người dùng không sợ mở app. */
export function weekCard(ins) {
  if (!ins || !ins.week) return null;
  const w = ins.week;
  const reveal = h("button", { class: "btn small ghost", type: "button" }, icon("eye", 16), tr("Xem tổng tiền tuần này"));
  const box = h("div", { class: "stack", hidden: true, style: { gap: "4px" } });
  reveal.addEventListener("click", () => {
    const change = w.change_pct === null ? "" : w.change_pct <= 0 ? tr` · ít hơn tuần trước ${-w.change_pct}%` : tr` · nhiều hơn tuần trước ${w.change_pct}%`;
    box.replaceChildren(
      h("div", { class: "money-mid" }, money(w.total)),
      h("span", { class: "faint" }, tr`7 ngày qua${change}`),
      w.biggest ? h("span", { class: "faint" }, tr`Khoản lớn nhất: ${w.biggest.note || tr("không ghi chú")} (${moneyShort(w.biggest.amount)})`) : null);
    box.hidden = false;
    reveal.remove();
    haptic(6);
  });
  return h("section", { class: "card stack" },
    h("div", { class: "card-title", style: { marginBottom: 0 } }, icon("sparkles", 20), tr("Tuần của bạn")),
    h("ul", { class: "good-list" }, ...w.positives.map((p) => h("li", null, icon(p.icon, 18), h("span", null, p.text)))),
    w.watch ? h("p", { class: "watch-line" }, icon("eye", 16), h("span", null, tr`Để ý nhẹ: ${w.watch}`)) : null,
    reveal, box);
}
