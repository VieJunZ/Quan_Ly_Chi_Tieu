/**
 * @file wallet.js
 * @description "Tiền bốc hơi": người dùng đếm tiền thật (tiền mặt + tài khoản), app so với số lẽ ra phải có
 * và chỉ ra bao nhiêu tiền đã "bốc hơi" mà chưa ghi. Có thể ghi luôn phần chênh lệch cho sổ khớp lại.
 */

import { tr } from "../i18n.js";
import { api, today, nowTime } from "../api.js";
import { h, icon, money, dateLabel, haptic, toast, confetti, busy, parseMoneyInput } from "../ui.js";

const NOTES = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000];

/** Bộ đếm tờ tiền mặt: bấm +/- theo từng mệnh giá, khỏi phải cộng nhẩm. */
function cashCounter(onChange) {
  const counts = new Map(NOTES.map((n) => [n, 0]));
  const total = () => NOTES.reduce((s, n) => s + n * counts.get(n), 0);
  const grid = h("div", { class: "stack", style: { gap: "6px" } });
  for (const note of NOTES) {
    const value = h("strong", { style: { minWidth: "28px", textAlign: "center" } }, "0");
    const set = (next) => {
      counts.set(note, Math.max(0, Math.min(999, next)));
      value.textContent = String(counts.get(note));
      haptic(5);
      onChange(total());
    };
    grid.append(h("div", { class: "row" },
      h("span", { class: "grow" }, money(note)),
      h("button", { class: "icon-btn", type: "button", "aria-label": tr`Bớt một tờ ${money(note)}`, onclick: () => set(counts.get(note) - 1) }, icon("minus", 18)),
      value,
      h("button", { class: "icon-btn", type: "button", "aria-label": tr`Thêm một tờ ${money(note)}`, onclick: () => set(counts.get(note) + 1) }, icon("plus", 18))));
  }
  return grid;
}

export async function walletScreen(ctx) {
  const screen = h("main", { class: "screen stack" });
  const back = h("button", { class: "icon-btn", type: "button", "aria-label": tr("Quay lại"), onclick: () => history.length > 1 ? history.back() : ctx.go("me") }, icon("arrow-left"));
  screen.append(h("header", { class: "screen-head" }, back,
    h("div", { class: "grow" }, h("h1", null, tr("Tiền bốc hơi")), h("span", { class: "sub" }, tr("Đếm tiền thật, xem sổ có khớp không")))));

  let w;
  try {
    w = await api("/wallet");
  } catch (error) {
    screen.append(h("div", { class: "card empty" }, icon("wifi-off"), error.message,
      h("button", { class: "btn small", type: "button", onclick: () => ctx.refresh() }, tr("Thử lại"))));
    return screen;
  }

  // Lẽ ra phải có bao nhiêu
  screen.append(h("section", { class: "card" },
    h("div", { class: "card-title" }, icon("scale", 20), tr("Theo sổ, lẽ ra bạn đang có")),
    h("div", { class: "money-mid" }, money(w.expected_balance)),
    h("div", { class: "stack mt-8", style: { gap: "4px" } },
      h("div", { class: "row faint" }, h("span", { class: "grow" }, tr("Tổng thu trừ tổng chi")), h("span", null, money(w.ledger_balance))),
      w.owed_to_me ? h("div", { class: "row faint" }, h("span", { class: "grow" }, tr("Trừ tiền đang cho mượn")), h("span", null, `−${money(w.owed_to_me)}`)) : null,
      w.i_owe ? h("div", { class: "row faint" }, h("span", { class: "grow" }, tr("Cộng tiền đang mượn")), h("span", null, `+${money(w.i_owe)}`)) : null)));

  // Nhập tiền thật
  const cash = h("input", { class: "mini-input amount", inputmode: "decimal", placeholder: "0", "aria-label": tr("Tiền mặt trong ví"), autocomplete: "off" });
  const bank = h("input", { class: "mini-input amount", inputmode: "decimal", placeholder: "0", "aria-label": tr("Tiền trong tài khoản, ví điện tử"), autocomplete: "off" });
  const counterBox = h("div", { hidden: true });
  const counterToggle = h("button", { class: "more", type: "button" }, tr("Đếm từng tờ"));
  counterToggle.addEventListener("click", () => {
    if (!counterBox.firstChild) {
      counterBox.append(cashCounter((sum) => {
        cash.value = sum ? new Intl.NumberFormat("vi-VN").format(sum) : "";
        update();
      }));
    }
    counterBox.hidden = !counterBox.hidden;
    counterToggle.textContent = counterBox.hidden ? tr("Đếm từng tờ") : tr("Ẩn bộ đếm");
  });

  const resultBox = h("div", { class: "card tight center", style: { background: "var(--glass-strong)" } });
  const record = h("input", { type: "checkbox", checked: true });
  const recordRow = h("label", { class: "switch" }, record, h("span", null, tr("Ghi luôn phần chênh lệch để sổ khớp lại")));
  const save = h("button", { class: "btn block", type: "button" }, icon("check", 18), tr("Lưu lần đối soát"));

  let actual = null;
  function update() {
    const c = parseMoneyInput(cash.value);
    const b = parseMoneyInput(bank.value);
    const hasValue = cash.value.trim() || bank.value.trim();
    actual = hasValue ? (c || 0) + (b || 0) : null;
    if (actual === null) {
      resultBox.replaceChildren(h("span", { class: "faint" }, tr("Gõ số tiền bạn đang thực sự có, kết quả hiện ngay.")));
      recordRow.hidden = true;
      save.disabled = true;
      return;
    }
    const diff = Math.round(actual - w.expected_balance);
    save.disabled = false;
    if (Math.abs(diff) < 1000) {
      recordRow.hidden = true;
      resultBox.replaceChildren(icon("party-popper", 30),
        h("div", { class: "money-mid", style: { color: "var(--income)" } }, tr("Khớp!")),
        h("div", { class: "faint" }, tr`Bạn có ${money(actual)}, sổ ghi chuẩn từng đồng. Quá đỉnh!`));
      return;
    }
    recordRow.hidden = false;
    if (diff < 0) {
      resultBox.replaceChildren(icon("ghost", 30),
        h("div", { class: "faint" }, tr("Đã bốc hơi")),
        h("div", { class: "money-mid", style: { color: "var(--expense)" } }, money(-diff)),
        h("div", { class: "faint" }, tr("Có khoản chi bạn quên ghi. Lần sau mua gì nhớ bấm nút + ngay nhé.")));
      recordRow.lastChild.textContent = tr`Ghi ${money(-diff)} vào "Chi không nhớ" để sổ khớp`;
    } else {
      resultBox.replaceChildren(icon("piggy-bank", 30),
        h("div", { class: "faint" }, tr("Dư ra")),
        h("div", { class: "money-mid", style: { color: "var(--income)" } }, money(diff)),
        h("div", { class: "faint" }, tr("Có khoản thu chưa ghi (lì xì, hoàn tiền...)?")));
      recordRow.lastChild.textContent = tr`Ghi ${money(diff)} vào "Tiền dư chưa ghi" để sổ khớp`;
    }
  }
  cash.addEventListener("input", update);
  bank.addEventListener("input", update);
  update();

  save.addEventListener("click", async () => {
    if (actual === null) return;
    const restore = busy(save);
    try {
      const r = await api("/wallet/check", {
        method: "POST",
        body: { actual_balance: actual, record: !recordRow.hidden && record.checked, transaction_date: today(), transaction_time: nowTime() }
      });
      haptic([10, 40, 10]);
      if (Math.abs(r.difference) < 1000) {
        confetti({ count: 100 });
        toast(tr("Sổ khớp ví. Giữ phong độ nhé!"), "ok");
      } else {
        toast(r.transaction_id ? tr("Đã lưu và ghi phần chênh lệch. Sổ giờ khớp ví.") : tr("Đã lưu lần đối soát."), "ok");
      }
      ctx.refresh();
    } catch (error) {
      toast(error.message, "error");
      restore();
    }
  });

  screen.append(h("section", { class: "card stack" },
    h("div", { class: "card-title", style: { marginBottom: 0 } }, icon("wallet", 20), tr("Bạn đang thực sự có")),
    h("div", { class: "row" }, h("span", { class: "grow" }, icon("banknote", 18), tr(" Tiền mặt")), counterToggle),
    cash, counterBox,
    h("span", null, icon("landmark", 18), tr(" Tài khoản, ví điện tử (mở app ngân hàng xem số dư)")),
    bank, resultBox, recordRow, save));

  // Lần trước
  if (w.last_check) {
    const lc = w.last_check;
    // difference = sổ - thực tế: dương là tiền bốc hơi, âm là dư ra
    const d = -Number(lc.difference);
    screen.append(h("section", { class: "card" },
      h("div", { class: "card-title" }, icon("history", 20), tr("Lần đối soát trước")),
      h("div", { class: "row" },
        h("span", { class: "grow faint" }, tr`${dateLabel(lc.created_at.slice(0, 10), today())} · có ${money(lc.actual_balance)}`),
        Math.abs(d) < 1000
          ? h("span", { class: "badge ok" }, icon("check", 12), tr("Khớp"))
          : h("span", { class: `badge ${d < 0 ? "danger" : "warn"}` }, d < 0 ? tr`Bốc hơi ${money(-d)}` : tr`Dư ${money(d)}`))));
  }

  screen.append(h("p", { class: "faint center" }, tr("Mẹo: đối soát mỗi Chủ nhật, tiền bốc hơi sẽ ít dần.")));
  return screen;
}
