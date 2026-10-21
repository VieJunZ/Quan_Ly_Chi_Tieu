/**
 * @file me.js
 * @description Màn "Tôi": ngân sách tháng và lối vào các công cụ (thử thách, ví, sổ nợ, lịch sử).
 * Giao diện, danh mục, bảo mật, thiết bị, góp ý và đăng xuất nằm ở màn Cài đặt (nút bánh răng góc phải).
 */

import { tr } from "../i18n.js";
import { api, today } from "../api.js";
import {
  h, icon, money, moneyShort, haptic, toast, confirmSheet, field, busy, parseMoneyInput, menuItem, settingsButton, displayName
} from "../ui.js";

/* ---------------------------------------------------------------------------
   Ngân sách tháng
   ------------------------------------------------------------------------ */
async function budgetCard(ctx, focus) {
  const t = today();
  const month = t.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const prevMonth = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
  const [b, prev] = await Promise.all([
    api("/budget", { query: { today: t } }),
    api("/dashboard", { query: { month: prevMonth, today: t } }).catch(() => null)
  ]);

  const card = h("section", { class: "card stack", id: "budget" });
  card.append(h("div", { class: "card-title", style: { marginBottom: 0 } }, icon("target", 20), tr("Ngân sách tháng này")));

  if (b.has_budget) {
    const pct = b.budget > 0 ? Math.min(100, (b.spent_month / b.budget) * 100) : 0;
    card.append(
      h("div", { class: "row" },
        h("div", { class: "grow" },
          h("div", { class: "faint" }, tr`Mỗi ngày được tiêu${b.is_inherited ? tr(" (theo tháng trước)") : ""}`),
          h("div", { class: "money-mid" }, money(Math.max(0, b.daily_allowance)))),
        h("div", { style: { textAlign: "right" } },
          h("div", { class: "faint" }, tr("Còn trong tháng")),
          h("strong", { style: { color: b.remaining_month < 0 ? "var(--expense)" : "inherit" } }, money(b.remaining_month)))),
      h("div", { class: `progress ${b.remaining_month < 0 ? "over" : ""}` }, h("span", { style: { width: `${pct}%` } })),
      h("div", { class: "row faint", style: { justifyContent: "space-between" } },
        h("span", null, tr`Đã chi ${moneyShort(b.spent_month)} / ${moneyShort(b.budget)}`),
        h("span", null, tr`còn ${b.days_left} ngày`)),
      h("p", { class: "faint mt-0" }, tr("Hôm nay tiêu ít thì mức các ngày còn lại tự tăng, tiêu lố thì tự giảm. Không cần tính nhẩm.")));
  } else {
    card.append(h("p", { class: "muted mt-0" }, tr("Đặt một con số cho cả tháng, app chia ra mỗi ngày được tiêu bao nhiêu và tự cân lại mỗi ngày.")));
  }

  // Gợi ý từ tháng trước
  const chips = h("div", { class: "chips" });
  const amount = field({ label: tr("Số tiền cả tháng"), name: "budget", inputmode: "decimal", autocomplete: "off", value: b.has_budget && !b.is_inherited ? new Intl.NumberFormat("vi-VN").format(b.budget) : "", hint: tr("Gõ 3tr, 2tr5... đều được") });
  const pick = (value) => {
    amount.input.value = new Intl.NumberFormat("vi-VN").format(value);
    amount.input.dispatchEvent(new Event("input"));
    haptic(8);
  };
  const lastSpent = prev ? Number(prev.total_expense) || 0 : 0;
  if (lastSpent > 0) {
    const round = (v) => Math.max(100000, Math.round(v / 100000) * 100000);
    chips.append(
      h("button", { class: "chip", type: "button", onclick: () => pick(round(lastSpent)) }, tr`Như tháng trước · ${moneyShort(round(lastSpent))}`),
      h("button", { class: "chip", type: "button", onclick: () => pick(round(lastSpent * 0.9)) }, icon("piggy-bank", 14), tr`Tiết kiệm 10% · ${moneyShort(round(lastSpent * 0.9))}`));
  }
  for (const v of [2000000, 3000000, 4000000]) {
    chips.append(h("button", { class: "chip", type: "button", onclick: () => pick(v) }, moneyShort(v)));
  }
  amount.input.addEventListener("input", () => {
    const v = parseMoneyInput(amount.input.value);
    if (!amount.input.value) amount.setHint(tr("Gõ 3tr, 2tr5... đều được"));
    else if (!v) amount.setHint(tr("Số tiền chưa đúng"), "error");
    else amount.setHint(tr`= ${money(v)} · khoảng ${money(Math.floor(v / b.days_in_month))}/ngày`, "ok");
  });

  const save = h("button", { class: "btn block", type: "button" }, icon("check", 18), b.has_budget && !b.is_inherited ? tr("Cập nhật ngân sách") : tr("Đặt ngân sách"));
  save.addEventListener("click", async () => {
    const v = parseMoneyInput(amount.input.value);
    if (!v) {
      amount.setHint(tr("Nhập số tiền cả tháng"), "error");
      amount.input.focus();
      return;
    }
    const restore = busy(save);
    try {
      const r = await api("/budget", { method: "PUT", body: { amount: v, month, today: t } });
      haptic(15);
      toast(r.remaining_month < 0
        ? tr`Đã đặt ${money(v)}, nhưng tháng này bạn đã chi lố ${money(-r.remaining_month)} rồi.`
        : tr`Đã đặt ${money(v)}. Hôm nay bạn được tiêu ${money(Math.max(0, r.left_today))}.`, r.remaining_month < 0 ? "info" : "ok", 4500);
      ctx.refresh();
    } catch (error) {
      toast(error.message, "error");
      restore();
    }
  });
  if (lastSpent > 0) card.append(h("p", { class: "faint mt-0" }, tr`Tháng trước bạn chi ${money(lastSpent)}.`));
  card.append(chips, amount.el, save);

  if (b.has_budget && !b.is_inherited) {
    const remove = h("button", { class: "btn ghost small", type: "button" }, tr("Bỏ ngân sách tháng này"));
    remove.addEventListener("click", async () => {
      const ok = await confirmSheet({ title: tr("Bỏ ngân sách tháng này?"), message: tr("Trang chủ sẽ không còn hạn mức mỗi ngày."), okText: tr("Bỏ"), danger: true });
      if (!ok) return;
      try {
        await api("/budget", { method: "DELETE", query: { month, today: t } });
        toast(tr("Đã bỏ ngân sách."), "ok");
        ctx.refresh();
      } catch (error) {
        toast(error.message, "error");
      }
    });
    card.append(remove);
  }

  if (focus) {
    requestAnimationFrame(() => {
      card.scrollIntoView({ behavior: "smooth", block: "start" });
      if (!b.has_budget) amount.input.focus();
    });
  }
  return card;
}

/* ---------------------------------------------------------------------------
   Màn hình
   ------------------------------------------------------------------------ */
export async function meScreen(ctx, params) {
  const user = ctx.user;
  const screen = h("main", { class: "screen stack" });
  screen.append(h("header", { class: "screen-head" },
    h("div", { class: "grow" }, h("h1", null, user.is_demo ? tr("Tôi") : displayName(user)), h("span", { class: "sub" }, user.is_demo ? tr("Đang dùng thử") : `@${user.username}`)),
    settingsButton()));

  if (user.is_demo) {
    const up = h("button", { class: "btn block", type: "button" }, icon("user-plus", 18), tr("Tạo tài khoản, giữ dữ liệu"));
    up.addEventListener("click", () => ctx.openUpgrade());
    screen.append(h("section", { class: "card stack" },
      h("div", { class: "row" }, icon("sparkles", 22), h("strong", null, tr("Bạn đang ở chế độ dùng thử"))),
      h("p", { class: "muted mt-0" }, tr("Dữ liệu dùng thử sẽ tự xóa khi hết hạn. Tạo tài khoản để giữ lại những gì bạn đã ghi.")),
      up));
  }

  try {
    screen.append(await budgetCard(ctx, params.get("budget") === "1"));
  } catch (error) {
    screen.append(h("div", { class: "card empty" }, icon("wifi-off"), error.message));
  }

  screen.append(h("section", { class: "card" },
    h("div", { class: "card-title" }, icon("wrench", 20), tr("Công cụ")),
    h("div", { class: "menu" },
      menuItem("trophy", tr("Thử thách & huy hiệu"), tr("Cắt thói quen tốn tiền, nhận huy hiệu"), null, { href: "#/challenges" }),
      menuItem("ghost", tr("Tiền bốc hơi"), tr("Đếm tiền thật, xem sổ có khớp không"), null, { href: "#/wallet" }),
      menuItem("hand-coins", tr("Sổ nợ và chia tiền"), tr("Ai nợ mình, mình nợ ai"), null, { href: "#/debts" }),
      menuItem("calendar-days", tr("Lịch sử chi tiêu"), tr("Lịch nhiệt, tìm kiếm, soi tháng"), null, { href: "#/history" }))));

  screen.append(h("section", { class: "card" },
    h("div", { class: "menu" },
      menuItem("settings", tr("Cài đặt"), tr("Giao diện, ngôn ngữ, danh mục, mật khẩu, đăng xuất"), null, { href: "#/settings" }))));
  return screen;
}
