/**
 * @file challenges.js
 * @description Thử thách & huy hiệu: thử thách đang chạy (đồng hồ đếm ngược, thanh tiến độ), gợi ý thử thách
 * dựa trên thói quen 30 ngày qua (chọn mức Nhẹ / Vừa / Gắt và 7 / 14 / 30 ngày), bộ sưu tập huy hiệu.
 * Có thể chạy nhiều thử thách cùng lúc (tối đa 5).
 */

import { tr } from "../i18n.js";
import { api, today } from "../api.js";
import { h, icon, money, moneyShort, haptic, toast, confetti, openSheet, confirmSheet, busy, dateLabel } from "../ui.js";
import { countdown, startTicker, progressOf, goalBar, badgeTile, celebrate } from "../coach.js";

const LEVELS = [["light", tr("Nhẹ"), "-20%"], ["medium", tr("Vừa"), "-40%"], ["hard", tr("Gắt"), "-60%"]];
const DAYS = [7, 14, 30];
const STATUS = { won: ["ok", tr("Thắng")], lost: ["danger", tr("Chưa thành")], abandoned: ["", tr("Đã dừng")] };

function segmented(options, value, onPick) {
  const seg = h("div", { class: "segmented small" });
  const paint = (current) => seg.replaceChildren(...options.map(([key, label]) =>
    h("button", { type: "button", "aria-pressed": String(key === current), onclick: () => { haptic(5); paint(key); onPick(key); } }, label)));
  paint(value);
  return seg;
}

/** Bảng chọn mức độ + thời gian rồi bắt đầu. */
function openStartSheet(ctx, s, badges, preset = {}) {
  const hasLevel = s.unit !== "streak";
  let level = LEVELS.some(([k]) => k === preset.level) ? preset.level : "medium";
  let days = DAYS.includes(Number(preset.days)) ? Number(preset.days) : 7;
  const badge = badges.find((b) => b.key === s.badge);

  const preview = h("div", { class: "ch-preview" });
  const paint = () => {
    const goal = s.targets[days][hasLevel ? level : "medium"];
    const lines = [h("strong", { class: "ch-preview-title" }, goal.title)];
    if (goal.baseline_amount && goal.target_amount !== undefined) {
      // Hạn mức theo ngày thì nhân lên cả thử thách để so với thói quen cũ
      const cap = s.unit === "money_daily" ? goal.target_amount * days : goal.target_amount;
      lines.push(h("span", { class: "faint" },
        tr`Theo thói quen cũ bạn sẽ tiêu khoảng ${moneyShort(goal.baseline_amount)}. Giữ được mức này là giữ lại ít nhất `,
        h("strong", { style: { color: "var(--income)" } }, moneyShort(Math.max(0, goal.baseline_amount - cap))), "."));
    }
    if (s.unit === "money_daily") lines.push(h("span", { class: "faint" }, tr("Chỉ tính các khoản linh hoạt: ăn uống, đi lại, mua sắm, giải trí.")));
    if (s.unit === "days") lines.push(h("span", { class: "faint" }, tr("Tối về chạm \"Không tiêu gì\" ở trang chủ để đánh dấu ngày đó.")));
    lines.push(h("span", { class: "faint" }, icon("timer", 14), tr` Kết thúc ${dateLabel(addDaysIso(today(), days - 1), today())} lúc 23:59`));
    preview.replaceChildren(...lines);
  };
  paint();

  const startBtn = h("button", { class: "btn block", type: "button" }, icon("flag", 18), tr("Bắt đầu thử thách"));
  const sheet = openSheet({
    title: s.name,
    content: h("div", { class: "stack" },
      h("p", { class: "muted mt-0" }, s.reason),
      hasLevel ? h("div", { class: "stack", style: { gap: "6px" } }, h("span", { class: "faint" }, tr("Mức độ")),
        segmented(LEVELS.map(([k, label, cut]) => [k, `${label} ${s.unit === "days" ? "" : cut}`.trim()]), level, (v) => { level = v; paint(); })) : null,
      h("div", { class: "stack", style: { gap: "6px" } }, h("span", { class: "faint" }, tr("Thời gian")),
        segmented(DAYS.map((d) => [d, tr`${d} ngày`]), days, (v) => { days = v; paint(); })),
      preview,
      badge ? h("div", { class: "row" }, badgeTile(badge), h("span", { class: "muted" }, tr`Thắng để mở huy hiệu "${badge.name}"`)) : null,
      startBtn)
  });

  startBtn.addEventListener("click", async () => {
    const restore = busy(startBtn);
    try {
      const r = await api("/challenges", { method: "POST", body: { key: s.key, level: hasLevel ? level : undefined, days, today: today() } });
      haptic([10, 30, 10]);
      confetti({ count: 60 });
      toast(tr`Bắt đầu: ${r.challenge.title}. Cố lên!`, "ok");
      sheet.close("done");
      ctx.go("challenges");
    } catch (error) {
      toast(error.message, "error");
      restore();
    }
  });
}

/** Nhãn ngắn bên phải mỗi gợi ý (mức Vừa, 7 ngày). */
function pillText(unit, goal) {
  if (unit === "count") return tr`≤${goal.target_count} lần`;
  if (unit === "days") return tr`${goal.target_count} ngày 0đ`;
  if (unit === "streak") return tr("ghi mỗi ngày");
  if (unit === "money_daily") return tr`≤${moneyShort(goal.target_amount)}/ngày`;
  return `≤${moneyShort(goal.target_amount)}`;
}

function addDaysIso(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function activeCard(ctx, c) {
  const p = progressOf(c);
  const quit = h("button", { class: "btn small ghost", type: "button" }, tr("Bỏ cuộc"));
  quit.addEventListener("click", async () => {
    const ok = await confirmSheet({ title: tr("Dừng thử thách?"), message: tr`"${c.title}" sẽ dừng lại và không tính thắng thua.`, okText: tr("Dừng"), cancelText: tr("Cố tiếp"), danger: true });
    if (!ok) return;
    try {
      const r = await api(`/challenges/${c.id}/abandon`, { method: "POST" });
      toast(r.message, "info");
      ctx.refresh();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  const extra = [];
  if (c.kind === "no_spend_days") {
    const mark = h("button", { class: "btn small mint", type: "button" }, icon("check", 15), tr("Hôm nay không tiêu gì"));
    mark.addEventListener("click", async () => {
      try {
        await api("/dashboard/no-spend", { method: "PUT", body: { date: today() } });
        haptic(20);
        toast(tr("Đã đánh dấu ngày không tiêu!"), "ok");
        ctx.refresh();
      } catch (error) {
        toast(error.message, "error");
      }
    });
    extra.push(mark);
  }

  return h("article", { class: `card ch-card ${p.tone}` },
    h("div", { class: "row", style: { alignItems: "flex-start" } },
      h("span", { class: "ch-icon" }, icon(c.icon, 22)),
      h("div", { class: "grow" },
        h("strong", { class: "ch-title" }, c.title),
        h("div", { class: "row", style: { gap: "6px", marginTop: "4px", flexWrap: "wrap" } },
          c.level_label ? h("span", { class: `badge ${c.level === "hard" ? "danger" : c.level === "medium" ? "warn" : ""}` }, c.level_label) : null,
          h("span", { class: "badge" }, icon("timer", 12), countdown(c.end_date))))),
    goalBar(p.pct, p.tone),
    h("span", { class: "faint" }, p.text),
    h("div", { class: "row between" }, h("div", { class: "row", style: { gap: "6px" } }, ...extra), quit));
}

export async function challengesScreen(ctx, params) {
  const t = today();
  const screen = h("main", { class: "screen stack" });
  const back = h("button", { class: "icon-btn", type: "button", "aria-label": tr("Quay lại"), onclick: () => history.length > 1 ? history.back() : ctx.go("home") }, icon("arrow-left"));
  screen.append(h("header", { class: "screen-head" }, back,
    h("div", { class: "grow" }, h("h1", null, tr("Thử thách")), h("span", { class: "sub" }, tr("Bớt thói quen tốn tiền, nhận huy hiệu")))));

  let ov;
  try {
    ov = await api("/challenges", { query: { today: t } });
  } catch (error) {
    screen.append(h("div", { class: "card empty" }, icon("wifi-off"), error.message,
      h("button", { class: "btn small", type: "button", onclick: () => ctx.refresh() }, tr("Thử lại"))));
    return screen;
  }

  const st = ov.stats;
  screen.append(h("section", { class: "stat-strip" },
    h("div", null, h("strong", null, `${st.badges}/${st.badges_total}`), h("span", null, tr("huy hiệu"))),
    h("div", null, h("strong", null, String(st.won)), h("span", null, tr("lần thắng"))),
    h("div", null, h("strong", { style: { color: "var(--income)" } }, moneyShort(st.saved)), h("span", null, tr("đã giữ lại")))));

  // Đang chạy
  const activeHead = h("div", { class: "row between" },
    h("h2", { style: { fontSize: "17px" } }, tr("Đang chạy")),
    h("span", { class: "badge" }, `${ov.active.length}/${ov.max_active}`));
  screen.append(activeHead);
  if (!ov.active.length) {
    screen.append(h("div", { class: "card empty" }, icon("swords"),
      tr("Chưa có thử thách nào. Chọn một thử thách bên dưới, bắt đầu từ mức Nhẹ cũng được!")));
  }
  for (const c of ov.active) screen.append(activeCard(ctx, c));

  // Gợi ý theo thói quen
  const full = ov.active.length >= ov.max_active;
  screen.append(h("div", { class: "row between" },
    h("h2", { style: { fontSize: "17px" } }, tr("Gợi ý cho bạn")),
    h("span", { class: "faint" }, tr("theo 30 ngày qua"))));
  const list = h("div", { class: "card menu ch-suggest" });
  for (const s of ov.suggestions) {
    const goal = s.targets[7].medium;
    const row = h("button", { class: "menu-item", type: "button", disabled: s.running || (full && !s.running) },
      h("span", { class: "mi-icon" }, icon(s.icon)),
      h("span", { class: "grow" }, s.name, h("small", null, s.running ? tr("Đang chạy") : s.reason)),
      s.running ? h("span", { class: "badge ok" }, icon("check", 12)) : h("span", { class: "save-pill" }, pillText(s.unit, goal)),
      icon("chevron-right"));
    row.addEventListener("click", () => openStartSheet(ctx, s, ov.badges));
    list.append(row);
  }
  if (full) screen.append(h("p", { class: "faint mt-0" }, tr`Đang chạy đủ ${ov.max_active} thử thách. Hoàn thành bớt rồi nhận thêm nhé.`));
  screen.append(list);

  // Huy hiệu
  const earned = ov.badges.filter((b) => b.earned);
  screen.append(h("div", { class: "row between" },
    h("h2", { style: { fontSize: "17px" } }, tr("Bộ sưu tập huy hiệu")),
    h("span", { class: "faint" }, `${earned.length}/${ov.badges.length}`)));
  const order = { gold: 0, silver: 1, bronze: 2 };
  const sorted = [...ov.badges].sort((a, b) => Number(b.earned) - Number(a.earned) || order[a.tier] - order[b.tier]);
  screen.append(h("section", { class: "card" },
    h("div", { class: "medal-grid" }, ...sorted.map((b) => badgeTile(b, () => {
      haptic(5);
      toast(b.earned ? tr`${b.name}: ${b.desc}. Mở ngày ${dateLabel(b.earned_at.slice(0, 10), t).toLowerCase()}.` : tr`Chưa mở. ${b.desc} để nhận "${b.name}".`, b.earned ? "ok" : "info", 3600);
    })))));

  // Đã xong gần đây
  if (ov.finished.length) {
    const rows = ov.finished.map((c) => {
      const [tone, label] = STATUS[c.status] || ["", c.status];
      return h("div", { class: "row", style: { padding: "8px 0", borderBottom: "1px solid var(--stroke)" } },
        h("span", { class: "ch-icon small-icon" }, icon(c.icon, 16)),
        h("span", { class: "grow" }, c.title, h("small", { class: "faint", style: { display: "block" } }, `${dateLabel(c.start_date, t)} → ${dateLabel(c.end_date, t)}`)),
        h("span", { class: `badge ${tone}` }, label));
    });
    screen.append(h("section", { class: "card" },
      h("div", { class: "card-title" }, icon("history", 20), tr("Đã kết thúc")), ...rows));
  }

  screen.append(h("p", { class: "faint center" }, tr("Tiến độ tính từ chính các khoản bạn ghi. Ghi đủ thì kết quả mới chuẩn nhé.")));

  // Mở sẵn thử thách được gợi ý từ "Việc nên làm"
  const key = params.get("key");
  if (key) {
    const s = ov.suggestions.find((x) => x.key === key);
    history.replaceState(null, "", "#/challenges");
    if (s && !s.running && !full) setTimeout(() => openStartSheet(ctx, s, ov.badges, { level: params.get("level"), days: params.get("days") }), 250);
    else if (s && s.running) toast(tr("Thử thách này đang chạy rồi."), "info");
  }

  celebrate(ov);
  screen.cleanup = startTicker(screen);
  return screen;
}
