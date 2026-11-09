/**
 * @file history.js
 * @description Lịch sử: chuỗi ngày ghi chép, lịch nhiệt chi tiêu theo tháng (bấm một ngày để xem riêng ngày đó),
 * chi theo danh mục, vài nhận xét nhanh và danh sách giao dịch theo ngày có lọc / tìm kiếm.
 */

import { tr } from "../i18n.js";
import { api, today } from "../api.js";
import { h, icon, money, moneyShort, dateLabel, haptic, toast, txRow, categoryBadge, categoryColor, settingsButton, openSheet } from "../ui.js";
import { actionsCard, weekCard } from "../coach.js";

const DOW_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const DOW_LONG = [tr("Chủ nhật"), tr("Thứ 2"), tr("Thứ 3"), tr("Thứ 4"), tr("Thứ 5"), tr("Thứ 6"), tr("Thứ 7")];

function shiftMonth(month, delta) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month) {
  const [y, m] = month.split("-").map(Number);
  return tr`Tháng ${m}/${y}`;
}

/**
 * Bảng chọn tháng: lật theo năm, tháng nào có ghi chép thì hiện tổng chi, kèm lối tắt tới các tháng có dữ liệu.
 * Để người ghi hóa đơn của năm trước không phải bấm lùi từng tháng mà vẫn không biết khoản đó nằm đâu.
 */
function openMonthPicker(current, todayIso, onPick) {
  const thisMonth = todayIso.slice(0, 7);
  const sheet = openSheet({ title: tr("Chọn tháng"), content: h("p", { class: "faint center" }, tr("Đang tải...")) });
  const pick = (month) => {
    haptic(8);
    sheet.close("pick");
    if (month !== current) onPick(month);
  };
  let year = Number(current.slice(0, 4));
  let byMonth = new Map();

  const draw = () => {
    const prevYear = h("button", { class: "icon-btn sm", type: "button", "aria-label": tr("Năm trước"), onclick: () => { year--; draw(); } }, icon("chevron-left", 18));
    const nextYear = h("button", { class: "icon-btn sm", type: "button", "aria-label": tr("Năm sau"), disabled: year >= Number(thisMonth.slice(0, 4)), onclick: () => { year++; draw(); } }, icon("chevron-right", 18));
    const grid = h("div", { class: "month-grid" });
    for (let m = 1; m <= 12; m++) {
      const key = `${year}-${String(m).padStart(2, "0")}`;
      const info = byMonth.get(key);
      const sub = !info ? "" : info.total_expense ? moneyShort(info.total_expense) : `+${moneyShort(info.total_income)}`;
      grid.append(h("button", {
        type: "button",
        class: ["month-cell", info ? "has" : "", key === thisMonth ? "now" : ""].filter(Boolean).join(" "),
        "aria-pressed": String(key === current),
        "aria-label": info ? tr`Tháng ${m}/${year}: ${info.transaction_count} khoản` : tr`Tháng ${m}/${year}`,
        disabled: key > thisMonth,
        onclick: () => pick(key)
      }, h("strong", null, tr`Tháng ${m}`), h("small", null, sub)));
    }
    const withData = [...byMonth.values()].slice(0, 12);
    sheet.setContent(h("div", { class: "stack" },
      h("div", { class: "row between" }, prevYear, h("strong", { style: { fontSize: "18px" } }, String(year)), nextYear),
      grid,
      withData.length ? h("div", null,
        h("div", { class: "faint", style: { fontSize: "13px", marginBottom: "8px" } }, tr("Các tháng có ghi chép")),
        h("div", { class: "chips" }, withData.map((x) => h("button", {
          type: "button", class: "chip", "aria-pressed": String(x.month === current), onclick: () => pick(x.month)
        }, monthLabel(x.month), h("span", { class: "amt" }, tr`${x.transaction_count} khoản`))))) : null,
      current !== thisMonth ? h("button", { class: "btn soft block", type: "button", onclick: () => pick(thisMonth) }, icon("undo-2", 16), tr("Về tháng này")) : null));
  };

  api("/transactions/months")
    .then((rows) => { byMonth = new Map(rows.map((x) => [x.month, x])); })
    .catch(() => { /* vẫn chọn tháng được, chỉ thiếu đánh dấu */ })
    .finally(draw);
}

/** Thứ trong tuần, tính từ Thứ 2 = 0. */
function weekdayIndex(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

function streakCard(streak) {
  const current = streak.current_streak || 0;
  const best = streak.best_streak || 0;
  const line = current === 0
    ? tr("Ghi một khoản hôm nay để bắt đầu chuỗi mới.")
    : streak.recorded_today
      ? tr`Kỷ lục của bạn: ${best} ngày. Mai ghi tiếp nhé!`
      : tr("Hôm nay chưa ghi gì, ghi một khoản để giữ chuỗi.");
  return h("section", { class: "card streak-row" },
    h("div", { class: `flame ${current ? "" : "off"}` }, icon("flame")),
    h("div", { class: "grow" },
      h("strong", { style: { fontSize: "20px" } }, tr`${current} ngày liền`),
      h("div", { class: "faint" }, line)),
    best > current ? h("span", { class: "badge" }, icon("trophy", 13), `${best}`) : null);
}

function heatCalendar(cal, todayIso, selected, onPick, monthNav) {
  const grid = h("div", { class: "heatmap", role: "grid", "aria-label": tr`Lịch chi tiêu ${monthLabel(cal.month)}` },
    DOW_SHORT.map((d) => h("span", { class: "dow" }, d)));
  const days = cal.days || [];
  if (days.length) {
    for (let i = 0; i < weekdayIndex(days[0].day); i++) grid.append(h("span", { class: "heat blank", "aria-hidden": "true" }));
  }
  days.forEach((d, i) => {
    const future = d.day > todayIso;
    const cls = ["heat", `l${d.level || 0}`];
    if (d.no_spend && !d.spent) cls.push("nospend");
    if (future) cls.push("future");
    if (d.day === todayIso) cls.push("today");
    if (d.day === selected) cls.push("selected");
    const label = `${dateLabel(d.day)}: ${d.spent ? `chi ${money(d.spent)}` : d.no_spend ? tr("ngày không tiêu") : tr("chưa ghi")}${d.received ? `, thu ${money(d.received)}` : ""}`;
    const cell = h("button", { class: cls.join(" "), type: "button", style: { "--i": i }, "aria-label": label, title: label, disabled: future },
      Number(d.day.slice(8)));
    cell.addEventListener("click", () => {
      haptic(8);
      onPick(d.day === selected ? null : d.day);
    });
    grid.append(cell);
  });

  const legend = h("div", { class: "legend" },
    tr("Ít"), h("i", { class: "heat l1" }), h("i", { class: "heat l2" }), h("i", { class: "heat l3" }), h("i", { class: "heat l4" }), tr("Nhiều"),
    h("span", { style: { marginLeft: "auto" } }), h("i", { class: "heat nospend" }), tr("Không tiêu"));
  const note = cal.planned_daily
    ? tr`So với mức dự kiến ${moneyShort(cal.planned_daily)}/ngày theo ngân sách`
    : tr("So với ngày chi nhiều nhất trong tháng");
  return h("section", { class: "card" },
    h("div", { class: "card-title" }, icon("calendar-days", 20), tr("Lịch chi tiêu")),
    monthNav, grid, legend, h("p", { class: "faint mt-8", style: { marginBottom: 0 } }, note));
}

/** Vài nhận xét tính ngay trên máy từ lịch tháng. */
function insights(cal, todayIso) {
  const past = (cal.days || []).filter((d) => d.day <= todayIso);
  const spentDays = past.filter((d) => d.spent > 0);
  if (spentDays.length < 3) return null;

  const items = [];
  const top = spentDays.reduce((a, b) => (b.spent > a.spent ? b : a));
  items.push([icon("trending-up", 16), tr`Chi nhiều nhất ${dateLabel(top.day, todayIso)}: ${money(top.spent)}.`]);

  const byDow = Array.from({ length: 7 }, () => ({ total: 0, count: 0 }));
  for (const d of past) {
    const w = weekdayIndex(d.day);
    byDow[w].total += d.spent;
    byDow[w].count += 1;
  }
  const avg = byDow.map((x) => (x.count ? x.total / x.count : 0));
  const worst = avg.indexOf(Math.max(...avg));
  if (avg[worst] > 0) items.push([icon("calendar-clock", 16), tr`${DOW_LONG[(worst + 1) % 7]} là ngày bạn hay "vung tay" nhất (trung bình ${moneyShort(avg[worst])}).`]);

  const noSpend = past.filter((d) => d.no_spend && !d.spent).length;
  if (noSpend) items.push([icon("leaf", 16), tr`${noSpend} ngày không tiêu đồng nào. Đỉnh!`]);

  const avgDay = cal.total_spent / Math.max(1, past.length);
  items.push([icon("divide", 16), tr`Trung bình ${moneyShort(avgDay)}/ngày trong tháng này.`]);

  return h("section", { class: "card" },
    h("div", { class: "card-title" }, icon("sparkles", 20), tr("Soi nhanh tháng này")),
    h("ul", { class: "warn-list" }, items.map(([ic, text]) => h("li", null, ic, h("span", null, text)))));
}

function categoryBreakdown(dash) {
  const expenses = (dash.by_category || []).filter((c) => c.type === "expense");
  if (!expenses.length) return null;
  const total = expenses.reduce((s, c) => s + c.total, 0);
  const list = h("div", { class: "stack", style: { gap: "10px" } });
  for (const c of expenses.slice(0, 6)) {
    const pct = total ? (c.total / total) * 100 : 0;
    const bar = h("span", { style: { background: categoryColor(c.category_color) } });
    requestAnimationFrame(() => requestAnimationFrame(() => (bar.style.width = `${pct}%`)));
    list.append(h("div", { class: "row" },
      categoryBadge(c, 34),
      h("div", { class: "grow" },
        h("div", { class: "row between" },
          h("strong", { style: { fontSize: "14px" } }, c.category_name),
          h("span", { style: { fontWeight: 700 } }, money(c.total))),
        h("div", { class: "progress mt-8" }, bar),
        h("small", { class: "faint" }, tr`${Math.round(pct)}% · ${c.transaction_count} khoản`))));
  }
  return h("section", { class: "card" },
    h("div", { class: "card-title" }, icon("chart-pie", 20), tr("Chi theo danh mục")),
    list);
}

function groupByDay(items) {
  const groups = new Map();
  for (const tx of items) {
    if (!groups.has(tx.transaction_date)) groups.set(tx.transaction_date, []);
    groups.get(tx.transaction_date).push(tx);
  }
  return groups;
}

export async function historyScreen(ctx, params) {
  const todayIso = today();
  const month = /^\d{4}-\d{2}$/.test(params.get("month") || "") ? params.get("month") : todayIso.slice(0, 7);
  const state = { type: params.get("type") || "", q: params.get("q") || "", day: params.get("day") || null };

  const screen = h("main", { class: "screen stack" });
  const go = (patch) => {
    const next = { month, type: state.type, q: state.q, day: state.day, ...patch };
    const query = {};
    for (const [k, val] of Object.entries(next)) if (val) query[k] = val;
    ctx.go("history", query);
  };

  const prev = h("button", { class: "icon-btn", type: "button", "aria-label": tr("Tháng trước"), onclick: () => go({ month: shiftMonth(month, -1), day: null }) }, icon("chevron-left"));
  const nextMonth = shiftMonth(month, 1);
  const next = h("button", { class: "icon-btn", type: "button", "aria-label": tr("Tháng sau"), disabled: nextMonth > todayIso.slice(0, 7), onclick: () => go({ month: nextMonth, day: null }) }, icon("chevron-right"));
  const thisMonth = month === todayIso.slice(0, 7);
  // Bấm vào tên tháng để nhảy thẳng tới tháng / năm bất kỳ
  const monthBtn = h("button", { class: "sub month-btn", type: "button", "aria-label": tr`${monthLabel(month)}, chọn tháng khác`,
    onclick: () => openMonthPicker(month, todayIso, (picked) => go({ month: picked, day: null })) },
  monthLabel(month), icon("chevron-down", 14));
  const backNow = thisMonth ? null
    : h("button", { class: "link", type: "button", onclick: () => go({ month: todayIso.slice(0, 7), day: null }) }, tr("Về tháng này"));
  // Thanh chọn tháng ngay trong thẻ lịch: người dùng nhìn lịch là thấy chỗ đổi tháng, không cần biết link
  const pickMonth = () => openMonthPicker(month, todayIso, (picked) => go({ month: picked, day: null }));
  const calNav = h("div", { class: "cal-nav" },
    h("button", { class: "icon-btn sm", type: "button", "aria-label": tr("Tháng trước"), onclick: () => go({ month: shiftMonth(month, -1), day: null }) }, icon("chevron-left", 18)),
    h("button", { class: "cal-nav-month", type: "button", "aria-label": tr`${monthLabel(month)}, chọn tháng khác`, onclick: pickMonth },
      icon("calendar-days", 16), h("span", null, monthLabel(month)), icon("chevron-down", 16)),
    h("button", { class: "icon-btn sm", type: "button", "aria-label": tr("Tháng sau"), disabled: nextMonth > todayIso.slice(0, 7), onclick: () => go({ month: nextMonth, day: null }) }, icon("chevron-right", 18)),
    thisMonth ? null : h("button", { class: "link cal-nav-now", type: "button", onclick: () => go({ month: todayIso.slice(0, 7), day: null }) }, icon("undo-2", 14), tr("Về tháng này")));
  screen.append(h("header", { class: "screen-head" },
    h("div", { class: "grow" }, h("h1", null, tr("Lịch sử")), h("div", { class: "row", style: { gap: "10px" } }, monthBtn, backNow)),
    prev, next, settingsButton()));

  let cal;
  let streak;
  let dash;
  let txs;
  let coach;
  try {
    [cal, streak, dash, txs, coach] = await Promise.all([
      api("/dashboard/calendar", { query: { month, today: todayIso } }),
      api("/dashboard/streak", { query: { today: todayIso } }),
      api("/dashboard", { query: { month, today: todayIso } }),
      // Có từ khóa thì tìm ở mọi tháng: người dùng nhớ "khách sạn" chứ không nhớ đã ghi vào tháng nào
      api("/transactions", { query: { month: state.q ? undefined : month, type: state.type || undefined, q: state.q || undefined, limit: 1000 } }),
      thisMonth ? api("/challenges/insights", { query: { today: todayIso } }).catch(() => null) : null
    ]);
  } catch (error) {
    screen.append(h("div", { class: "card empty" }, icon("wifi-off"), error.message,
      h("button", { class: "btn small", type: "button", onclick: () => ctx.refresh() }, tr("Thử lại"))));
    return screen;
  }

  // Tổng tháng
  screen.append(h("section", { class: "today-grid" },
    h("div", { class: "card" }, h("span", { class: "faint" }, tr("Đã chi")), h("div", { class: "money-mid" }, money(dash.total_expense))),
    h("div", { class: "card" }, h("span", { class: "faint" }, tr("Đã thu")), h("div", { class: "money-mid", style: { color: "var(--income)" } }, money(dash.total_income)))));

  if (thisMonth) {
    // Nói điều tốt trước, rồi mới tới việc nên làm tiếp theo
    const week = weekCard(coach);
    if (week) screen.append(week);
    const actions = actionsCard(ctx, coach);
    if (actions) screen.append(actions);
    screen.append(streakCard(streak));
  }
  screen.append(heatCalendar(cal, todayIso, state.day, (day) => go({ day }), calNav));
  const tips = insights(cal, todayIso);
  if (tips) screen.append(tips);
  const breakdown = categoryBreakdown(dash);
  if (breakdown) screen.append(breakdown);

  // Bộ lọc
  const typeBtn = (value, label) => h("button", {
    type: "button", class: value || "all", "aria-pressed": String(state.type === value),
    onclick: () => go({ type: value })
  }, label);
  const search = h("input", { class: "mini-input", type: "search", placeholder: tr("Tìm theo ghi chú, danh mục..."), value: state.q, "aria-label": tr("Tìm giao dịch") });
  let timer;
  search.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => go({ q: search.value.trim() }), 450);
  });
  screen.cleanup = () => clearTimeout(timer);

  const listCard = h("section", { class: "card" });
  listCard.append(
    h("div", { class: "card-title" }, icon("list", 20),
      state.day ? dateLabel(state.day, todayIso) : state.q ? tr("Kết quả tìm ở mọi tháng") : tr("Các khoản trong tháng"),
      state.day ? h("button", { class: "more", type: "button", onclick: () => go({ day: null }) }, tr("Cả tháng")) : null),
    h("div", { class: "stack", style: { gap: "10px" } },
      h("div", { class: "segmented small" }, typeBtn("", tr("Tất cả")), typeBtn("expense", tr("Chi")), typeBtn("income", tr("Thu"))),
      search));

  const shown = state.day ? txs.filter((t) => t.transaction_date === state.day) : txs;
  const list = h("div", { class: "tx-list mt-8" });
  if (!shown.length) {
    const dayInfo = state.day && (cal.days || []).find((d) => d.day === state.day);
    const empty = h("div", { class: "empty" }, icon(state.q ? "search-x" : "sprout"),
      state.q ? tr`Không có khoản nào khớp "${state.q}".` : state.day ? tr("Ngày này chưa có khoản nào.") : tr("Tháng này chưa có khoản nào."));
    if (dayInfo && !state.q && !state.type) {
      const mark = h("button", { class: `btn small ${dayInfo.no_spend ? "soft" : "mint"}`, type: "button" },
        icon(dayInfo.no_spend ? "undo-2" : "check", 16), dayInfo.no_spend ? tr("Bỏ đánh dấu không tiêu") : tr("Đánh dấu ngày không tiêu"));
      mark.addEventListener("click", async () => {
        try {
          if (dayInfo.no_spend) await api("/dashboard/no-spend", { method: "DELETE", query: { date: state.day } });
          else await api("/dashboard/no-spend", { method: "PUT", body: { date: state.day } });
          haptic(15);
          toast(dayInfo.no_spend ? tr("Đã bỏ đánh dấu.") : tr("Đã ghi nhận ngày không tiêu ✦"), "ok");
          ctx.refresh();
        } catch (error) {
          toast(error.message, "error");
        }
      });
      const add = h("button", { class: "btn small soft", type: "button", onclick: () => ctx.openAdd("manual", { transaction_date: state.day }) }, icon("plus", 16), tr("Ghi cho ngày này"));
      empty.append(h("div", { class: "row" }, mark, add));
    }
    list.append(empty);
  }
  for (const [day, items] of groupByDay(shown)) {
    const spent = items.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const received = items.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    list.append(h("div", { class: "day-head" },
      h("span", null, dateLabel(day, todayIso)),
      h("span", null, [spent ? `-${moneyShort(spent)}` : "", received ? `+${moneyShort(received)}` : ""].filter(Boolean).join(" · "))));
    for (const tx of items) list.append(txRow(tx, () => ctx.openAdd("edit", tx)));
  }
  if (txs.length >= 1000) list.append(h("p", { class: "faint center" }, tr("Chỉ hiện 1000 khoản gần nhất, dùng ô tìm kiếm để lọc thêm.")));
  listCard.append(list);
  screen.append(listCard);
  return screen;
}
