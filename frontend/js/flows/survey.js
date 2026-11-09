/**
 * @file survey.js
 * @description Khảo sát ngắn hiện ra sau 1 ngày dùng (tài khoản thật). Mỗi chức năng chỉ cần chạm
 * Thích / Chưa thích / Chưa dùng. Chỉ khi muốn thêm chức năng mới thì mới phải viết.
 * Ngoài lần tự hiện, người dùng mở lại bất cứ lúc nào ở Tôi > Góp ý cho app để sửa câu trả lời
 * và xem mọi người nghĩ gì.
 */

import { tr } from "../i18n.js";
import { api } from "../api.js";
import { h, icon, haptic, toast, confetti, openSheet, busy } from "../ui.js";

const CHOICES = [
  { value: "like", label: tr("Thích"), icon: "thumbs-up" },
  { value: "dislike", label: tr("Chưa thích"), icon: "thumbs-down" },
  { value: "unused", label: tr("Chưa dùng"), icon: "circle-dashed" }
];

let shownThisVisit = false;

export async function maybeShowSurvey(ctx) {
  if (shownThisVisit || !ctx.user || ctx.user.is_demo) return;
  let status;
  try {
    status = await api("/survey/status");
  } catch {
    return;
  }
  if (!status.due) return;
  shownThisVisit = true;
  // Đợi người dùng nhìn thấy trang chủ rồi mới hỏi
  setTimeout(() => openSurvey(status.features), 1500);
}

/** Lối vào từ màn Tôi: tài khoản thật thì mở khảo sát (có sẵn câu trả lời cũ), dùng thử thì mời tạo tài khoản. */
export async function openFeedback(ctx) {
  if (ctx.user.is_demo) {
    toast(tr("Tạo tài khoản (giữ nguyên dữ liệu) rồi góp ý được ngay nhé."), "info", 4000);
    ctx.openUpgrade();
    return;
  }
  let status;
  try {
    status = await api("/survey/status", { fresh: true });
  } catch (error) {
    toast(error.message, "error");
    return;
  }
  openSurvey(status.features, { mine: status.mine, manual: true });
}

/** Kết quả chung: mỗi chức năng bao nhiêu % người dùng thích. */
export async function openSurveyResults() {
  let data;
  try {
    data = await api("/survey/summary", { fresh: true });
  } catch (error) {
    toast(error.message, "error");
    return;
  }
  const rated = data.features
    .map((f) => ({ ...f, voted: f.like + f.dislike }))
    .sort((a, b) => (b.voted ? b.like / b.voted : -1) - (a.voted ? a.like / a.voted : -1));
  const rows = rated.map((f) => {
    const pct = f.voted ? Math.round((f.like / f.voted) * 100) : 0;
    return h("div", { class: "survey-result" },
      h("div", { class: "row", style: { justifyContent: "space-between" } },
        h("strong", null, f.label),
        h("span", { class: f.voted ? "" : "faint" }, f.voted ? tr`${pct}% thích` : tr("Chưa ai chấm"))),
      h("div", { class: "goal-bar", "aria-hidden": "true" }, h("i", { style: { width: `${pct}%` } })),
      h("span", { class: "faint fine-print" }, tr`${f.like} thích · ${f.dislike} chưa thích · ${f.unused} chưa dùng`));
  });
  const suggestions = data.suggestions && data.suggestions.length
    ? h("div", { class: "stack" }, h("strong", null, tr("Đề xuất mới nhất (chỉ nhóm làm app thấy)")),
      ...data.suggestions.slice(0, 30).map((s) => h("p", { class: "survey-quote mt-0" }, s.suggestion)))
    : null;
  openSheet({
    title: tr("Mọi người nghĩ gì"),
    content: h("div", { class: "stack" },
      h("p", { class: "muted mt-0" },
        data.responses ? tr`${data.responses} người đã góp ý, ${data.wants_new_feature} người đề xuất chức năng mới.` : tr("Chưa có ai góp ý. Bạn là người đầu tiên nhé!")),
      ...rows, suggestions)
  });
}

export function openSurvey(features, { mine = null, manual = false } = {}) {
  const answers = { ...(mine ? mine.answers : {}) };
  let wantsNew = Boolean(mine && mine.wants_new_feature);
  let sent = false;

  const rows = features.map((f) => {
    const group = h("div", { class: "survey-choices", role: "radiogroup", "aria-label": f.label });
    const paint = () => group.replaceChildren(...CHOICES.map((c) => {
      const b = h("button", {
        class: `survey-choice ${c.value}`, type: "button", role: "radio",
        "aria-checked": String(answers[f.key] === c.value), title: c.label
      }, icon(c.icon, 16), h("span", null, c.label));
      b.addEventListener("click", () => {
        if (answers[f.key] === c.value) delete answers[f.key];
        else answers[f.key] = c.value;
        haptic(6);
        paint();
        updateSend();
      });
      return b;
    }));
    paint();
    return h("div", { class: "survey-row" }, h("strong", null, f.label), group);
  });

  const suggestion = h("textarea", {
    class: "mini-input", rows: 3, maxlength: 1000, hidden: !wantsNew,
    placeholder: tr("Bạn muốn app có thêm gì? Ví dụ: nhắc đóng tiền trọ ngày 5 hằng tháng"),
    style: { minHeight: "84px", padding: "10px 12px", resize: "vertical" }, "aria-label": tr("Chức năng bạn muốn thêm")
  });
  if (mine && mine.suggestion) suggestion.value = mine.suggestion;
  const wantBox = h("input", { type: "checkbox", checked: wantsNew });
  wantBox.addEventListener("change", () => {
    wantsNew = wantBox.checked;
    suggestion.hidden = !wantsNew;
    if (wantsNew) suggestion.focus();
    updateSend();
  });
  suggestion.addEventListener("input", updateSend);

  const send = h("button", { class: "btn block", type: "button", disabled: true }, icon("send", 18), mine ? tr("Cập nhật góp ý") : tr("Gửi góp ý"));
  const later = h("button", { class: "btn ghost block", type: "button", hidden: manual }, tr("Để sau"));
  const counter = h("span", { class: "faint" }, "");

  function updateSend() {
    const n = Object.keys(answers).length;
    counter.textContent = tr`${n}/${features.length} đã chọn`;
    send.disabled = (n === 0 && !wantsNew) || (wantsNew && !suggestion.value.trim());
  }
  updateSend();

  const sheet = openSheet({
    title: manual ? tr("Góp ý cho app") : tr("Sau 1 ngày, bạn thấy sao?"),
    content: h("div", { class: "stack" },
      h("p", { class: "muted mt-0" }, mine
        ? tr("Bạn đã góp ý rồi, đổi ý thì chạm lại rồi bấm cập nhật. Chức năng mới (thử thách, tổng kết tuần) cũng chấm được nhé.")
        : tr("Chạm nhanh vài cái thôi, không cần trả lời hết. Góp ý của bạn quyết định app làm gì tiếp theo.")),
      h("div", { class: "survey-list" }, rows),
      h("label", { class: "switch" }, wantBox, h("span", null, tr("Mình muốn thêm chức năng mới"))),
      suggestion,
      h("div", { class: "row", style: { justifyContent: "space-between" } }, counter),
      send, later),
    onClose: (reason) => {
      // Đóng mà chưa gửi thì coi như "để sau" để không làm phiền lại ngay
      if (!sent && !manual && reason !== "later" && reason !== "navigate") api("/survey/snooze", { method: "POST" }).catch(() => {});
    }
  });

  send.addEventListener("click", async () => {
    const restore = busy(send);
    try {
      const r = await api("/survey", {
        method: "POST",
        body: { answers, wants_new_feature: wantsNew, suggestion: wantsNew ? suggestion.value : null }
      });
      sent = true;
      haptic([10, 40, 10]);
      if (!r.updated) confetti({ count: 90 });
      toast(r.updated ? tr("Đã cập nhật góp ý. Cảm ơn bạn!") : tr("Cảm ơn bạn! Góp ý đã tới tay nhóm làm app."), "ok", 4000);
      sheet.close("sent");
    } catch (error) {
      toast(error.message, "error");
      restore();
    }
  });
  later.addEventListener("click", async () => {
    try {
      await api("/survey/snooze", { method: "POST" });
    } catch {
      // Không gửi được thì lần sau mở app sẽ hỏi lại
    }
    toast(tr("Ok, mai mình hỏi lại nhé."), "info");
    sheet.close("later");
  });
  return sheet;
}
