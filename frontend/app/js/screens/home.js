/**
 * @file home.js
 * @description Trang chủ: thú cưng ví tiền, "Đã chi hôm nay", "Còn được tiêu hôm nay",
 * lời nhắc buổi tối, lối tắt ghi nhanh, gợi ý theo thói quen và các khoản gần đây.
 */

import { tr } from "../i18n.js";
import { api, session, today, nowTime } from "../api.js";
import { h, icon, money, moneyShort, countUp, greeting, haptic, toast, txRow, categoryBadge, settingsButton, displayName } from "../ui.js";
import { getPref } from "../prefs.js";
import { renderPet, pokeLine, getStageTheme, renderStageBackdrop } from "../pet.js";
import { challengeStrip, actionsCard, celebrate, startTicker } from "../coach.js";

// Số đã hiện lần trước: vẽ lại (do có số mới) thì số chạy tiếp từ số cũ, không chạy lại từ 0
const shown = {};
function rolling(key, el, to, options) {
  const from = shown[key] || 0;
  el.dataset.value = from;
  el.textContent = money(from);
  shown[key] = to;
  requestAnimationFrame(() => countUp(el, to, options));
}

function petCard(mini) {
  const pet = mini.pet || { mood: "happy", level: 1, message: "", coins: 100, pet_fullness: 80, equipped: {} };
  const bgKey = pet.equipped?.bg?.id || pet.equipped?.bg || "default";
  const theme = getStageTheme(bgKey);

  const holder = h("div", { class: "hero-pet", style: { margin: 0, position: "relative", zIndex: 1 } },
    renderPet({ mood: pet.mood, level: pet.level, size: 128, equipped: pet.equipped }));
  const bubble = h("div", { class: "bubble", style: { position: "relative", zIndex: 1 } },
    pet.message || tr("Ghi một khoản để mình vui nha!"));

  holder.addEventListener("click", () => {
    const svg = holder.querySelector("svg");
    if (svg) {
      svg.classList.remove("poked");
      void svg.getBoundingClientRect();
      svg.classList.add("poked");
    }
    bubble.textContent = pokeLine(pet.mood);
    haptic([8, 30, 8]);
  });
  holder.setAttribute("role", "button");
  holder.setAttribute("tabindex", "0");
  holder.setAttribute("aria-label", tr("Chọc thú cưng"));
  holder.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      holder.click();
    }
  });

  const streak = mini.streak || {};
  const meta = h("div", { class: "pet-meta", style: { position: "relative", zIndex: 1 } },
    h("span", { class: "badge" }, icon("star", 13), tr`Cấp ${pet.level || 1}`),
    h("span", { class: `badge ${streak.current_streak ? "warn" : ""}` }, icon("flame", 13), tr`${streak.current_streak || 0} ngày liền`),
    h("a", { class: "badge", href: "#/shop", style: { textDecoration: "none", color: "inherit", fontWeight: 700 } },
      "🪙 ", tr`${pet.coins ?? 100} xu`),
    h("span", { class: "badge", title: tr("Độ no của thú cưng") }, "🍖 ", `${pet.pet_fullness ?? 80}%`));
  if (pet.next_level_in) meta.append(h("span", { class: "badge" }, tr`còn ${pet.next_level_in} ngày lên cấp`));

  const card = h("section", {
    class: "card pet-card",
    style: {
      background: theme.cardBg,
      border: theme.cardBorder,
      boxShadow: `0 14px 34px -10px ${theme.glowColor}`,
      position: "relative",
      overflow: "hidden",
      transition: "background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease"
    }
  });
  const backdropNode = renderStageBackdrop(bgKey);
  if (backdropNode) card.append(backdropNode);
  card.append(holder, h("div", { style: { position: "relative", zIndex: 1 } }, bubble, meta));
  return card;
}

function moneyCard(ctx, mini) {
  const spent = h("div", { class: "money-big" });
  const received = h("span");
  rolling("spent", spent, mini.spent_today || 0);
  rolling("received", received, mini.received_today || 0, { duration: 900 });

  const left = h("div", { class: "money-hero" },
    h("span", { class: "label" }, tr("Đã chi hôm nay")),
    spent,
    h("span", { class: "faint" }, tr("Thu: +"), received, tr` · ${mini.transaction_count || 0} khoản`));

  const budget = mini.budget;
  if (!budget) {
    const setBtn = h("a", { class: "btn small soft", href: "#/me?budget=1" }, icon("target", 16), tr("Đặt ngân sách"));
    return h("section", { class: "card stack" },
      h("div", { class: "row between" }, left),
      h("p", { class: "faint mt-0" }, tr("Đặt ngân sách tháng để biết mỗi ngày còn được tiêu bao nhiêu (tiêu ít hôm nay thì mai được thêm).")),
      setBtn);
  }

  const allowance = Math.max(0, budget.daily_allowance || 0);
  const leftToday = budget.left_today || 0;
  const pct = allowance > 0 ? Math.max(0, Math.min(100, (leftToday / allowance) * 100)) : 0;
  const ringColor = leftToday < 0 ? "#ff5f8f" : pct < 25 ? "#ff9f5a" : "var(--violet)";
  const ring = h("div", { class: "ring", style: { "--ring-color": ringColor, "--ring": `${shown.ring || 0}%` }, role: "img", "aria-label": tr`Còn ${Math.round(pct)}% hạn mức hôm nay` }, `${Math.round(pct)}%`);
  shown.ring = pct;
  requestAnimationFrame(() => requestAnimationFrame(() => ring.style.setProperty("--ring", `${pct}%`)));

  const leftEl = h("div", { class: `money-mid ${leftToday < 0 ? "neg" : ""}` });
  rolling("left", leftEl, leftToday, { duration: 1200 });

  const monthPct = budget.amount > 0 ? Math.min(100, (budget.spent_month / budget.amount) * 100) : 0;
  const bar = h("span", { style: { width: `${shown.bar || 0}%` } });
  shown.bar = monthPct;
  requestAnimationFrame(() => requestAnimationFrame(() => (bar.style.width = `${monthPct}%`)));

  return h("section", { class: "card stack" },
    h("div", { class: "row between" }, left, ring),
    h("div", { class: "row between" },
      h("div", null,
        h("span", { class: "faint" }, tr("Còn được tiêu hôm nay")),
        leftEl),
      h("div", { style: { textAlign: "right" } },
        h("span", { class: "faint" }, tr`Hạn mức/ngày${budget.is_inherited ? tr(" (theo tháng trước)") : ""}`),
        h("div", { style: { fontWeight: 700 } }, money(allowance)))),
    h("div", null,
      h("div", { class: `progress ${budget.remaining_month < 0 ? "over" : ""}` }, bar),
      h("div", { class: "row between faint mt-8" },
        h("span", null, tr`Tháng: ${moneyShort(budget.spent_month)} / ${moneyShort(budget.amount)}`),
        h("span", null, tr`còn ${budget.days_left} ngày`))));
}

function nudgeCard(ctx, nudge) {
  const noSpend = h("button", { class: "btn small mint", type: "button" }, icon("check", 16), tr("Không tiêu gì"));
  const say = h("button", { class: "btn small", type: "button" }, icon("mic", 16), tr("Nói nhanh"));
  const card = h("section", { class: "card nudge" },
    h("div", { class: "row" }, icon("moon-star", 22), h("strong", null, nudge.message || tr("Hôm nay bạn có tiêu gì không?"))),
    h("div", { class: "row" }, noSpend, say));
  noSpend.addEventListener("click", async () => {
    try {
      await api("/dashboard/no-spend", { method: "PUT", body: { date: nudge.date } });
      haptic(20);
      toast(tr("Ngày không tiêu! Chuỗi ngày vẫn giữ nhé ✦"), "ok");
      ctx.refresh();
    } catch (error) {
      toast(error.message, "error");
    }
  });
  say.addEventListener("click", () => ctx.openAdd("voice"));
  return card;
}

function quickActions(ctx) {
  const btn = (mode, label, iconName) => {
    const b = h("button", { type: "button" }, h("span", { class: `qa-icon qa-${mode}` }, icon(iconName, 22)), label);
    b.addEventListener("click", () => ctx.openAdd(mode));
    return b;
  };
  return h("section", { class: "quick-actions" },
    btn("voice", tr("Nói"), "mic"),
    btn("scan", tr("Up ảnh"), "image-up"),
    btn("sms", tr("Dán SMS"), "message-square-text"),
    btn("manual", tr("Tự nhập"), "pencil"));
}

function suggestionChips(ctx, list) {
  if (!list.length) return null;
  const chips = h("div", { class: "chips scroll" });
  for (const s of list) {
    const chip = h("button", { class: "chip", type: "button", title: s.usual_time ? tr`Thường vào khoảng ${s.usual_time}` : "" },
      categoryBadge(s, 22), s.note || s.category_name, h("span", { class: "amt" }, moneyShort(s.amount)));
    chip.addEventListener("click", () => ctx.openAdd("quick", s));
    chips.append(chip);
  }
  return h("section", null,
    h("div", { class: "row between" }, h("h2", { style: { fontSize: "16px" } }, tr("Một chạm theo thói quen")), icon("zap", 18)),
    h("div", { class: "mt-8" }, chips));
}

function recentList(ctx, items, todayIso) {
  const list = h("div", { class: "tx-list" });
  if (!items.length) {
    list.append(h("div", { class: "empty" }, icon("sprout"), tr("Chưa có khoản nào. Thử bấm Nói và đọc: \"trà sữa 35k, gửi xe 5k\"")));
  }
  for (const tx of items.slice(0, 6)) list.append(txRow(tx, () => ctx.openAdd("edit", tx)));
  return h("section", { class: "card" },
    h("div", { class: "row between" },
      h("h2", { style: { fontSize: "16px" } }, tr("Gần đây")),
      h("a", { class: "link", href: "#/history" }, tr("Xem hết"))),
    list);
}

export async function homeScreen(ctx) {
  const t = today();
  const now = nowTime();
  const user = session.user || {};
  const screen = h("main", { class: "screen stack" });

  const [mini, dash, suggestions, nudge, challenges, insights] = await Promise.all([
    api("/dashboard/mini", { query: { today: t, now } }),
    api("/dashboard", { query: { month: t.slice(0, 7), today: t } }),
    api("/dashboard/suggestions", { query: { today: t, now } }).catch(() => []),
    api("/dashboard/nudge", { query: { today: t, now } }).catch(() => ({ show: false })),
    api("/challenges", { query: { today: t } }).catch(() => null),
    api("/challenges/insights", { query: { today: t } }).catch(() => null)
  ]).catch((error) => {
    screen.append(h("div", { class: "card empty" }, icon("wifi-off"), error.message,
      h("button", { class: "btn small", type: "button", onclick: () => ctx.refresh() }, tr("Thử lại"))));
    return [];
  });
  if (!mini) return screen;

  const name = displayName(user);
  const showPet = getPref("pet") === "on";
  const pin = h("button", { class: "icon-btn", type: "button", "aria-label": tr("Ghim Mini-View nổi") }, icon("picture-in-picture-2"));
  pin.addEventListener("click", async () => {
    const m = await import("../flows/mini.js");
    m.openFloatingMini();
  });

  screen.append(
    h("header", { class: "hello" },
      h("a", { class: "avatar", href: "#/me", "aria-label": tr("Tài khoản") }, user.is_demo ? icon("sparkles", 22) : (name[0] || "?").toUpperCase()),
      h("div", { class: "grow" },
        h("span", { class: "faint" }, greeting(now)),
        h("h1", null, name),
        // Tắt thú cưng thì chuỗi ngày ghi chép chuyển lên đây
        showPet ? null : h("span", { class: `badge ${mini.streak?.current_streak ? "warn" : ""}` }, icon("flame", 13), tr`${mini.streak?.current_streak || 0} ngày liền`)),
      pin,
      settingsButton()),
    ...(showPet ? [petCard(mini)] : []),
    moneyCard(ctx, mini));

  if (nudge && nudge.show) screen.append(nudgeCard(ctx, nudge));
  screen.append(quickActions(ctx));
  const chips = suggestionChips(ctx, suggestions || []);
  if (chips) screen.append(chips);
  const strip = challengeStrip(ctx, challenges);
  if (strip) screen.append(strip);
  const actions = actionsCard(ctx, insights, { compact: true });
  if (actions) screen.append(actions);
  screen.append(recentList(ctx, dash.recent_transactions || [], t));
  celebrate(challenges);
  screen.cleanup = startTicker(screen);
  return screen;
}
