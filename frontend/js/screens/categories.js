/**
 * @file categories.js
 * @description Màn "Danh mục thu chi" (Cài đặt > Danh mục): xem số khoản đã ghi ở từng mục,
 * ẩn / hiện, đưa lên / xuống, thêm và sửa danh mục của riêng mình.
 * Danh mục mặc định dùng chung cho mọi người nên chỉ ẩn được, không sửa tên.
 */

import { tr } from "../i18n.js";
import { api } from "../api.js";
import { h, icon, haptic, toast, openSheet, field, busy, categoryBadge, CATEGORY_COLOR_NAMES } from "../ui.js";

const ICON_CHOICES = [
  "utensils", "coffee", "cup-soda", "pizza", "beer", "shopping-bag", "shirt", "house",
  "car", "bike", "bus", "fuel", "plane", "book-open", "graduation-cap", "gamepad-2",
  "film", "music", "dumbbell", "heart-pulse", "pill", "baby", "dog", "gift",
  "smartphone", "wifi", "zap", "receipt", "wallet", "piggy-bank", "briefcase", "sparkles"
];

const TYPE_LABEL = { expense: tr("chi"), income: tr("thu") };

/** Báo cho bảng ghi khoản (add.js) tải lại danh mục ở lần mở sau. */
function announceChange() {
  window.dispatchEvent(new Event("sochi:categories"));
}

/* ---------------------------------------------------------------------------
   Bảng thêm / sửa danh mục riêng
   ------------------------------------------------------------------------ */
function openEditor({ type, cat, onSaved }) {
  const draft = { name: cat ? cat.name : "", icon: cat ? cat.icon : ICON_CHOICES[0], color: cat ? cat.color : "violet" };
  const preview = h("div", { class: "cat-preview" });
  const paintPreview = () => preview.replaceChildren(categoryBadge(draft, 52),
    h("strong", null, draft.name.trim() || (type === "income" ? tr("Mục thu mới") : tr("Mục chi mới"))));

  const name = field({ label: tr("Tên danh mục"), name: "category_name", maxlength: 100, value: draft.name, autocomplete: "off" });
  name.input.addEventListener("input", () => {
    draft.name = name.input.value;
    paintPreview();
  });

  const icons = h("div", { class: "icon-pick", role: "radiogroup", "aria-label": tr("Biểu tượng") });
  const paintIcons = () => icons.replaceChildren(...ICON_CHOICES.map((n) => {
    const btn = h("button", { type: "button", role: "radio", "aria-checked": String(draft.icon === n), "aria-label": n }, icon(n, 20));
    btn.addEventListener("click", () => {
      draft.icon = n;
      haptic(6);
      paintIcons();
      paintPreview();
    });
    return btn;
  }));

  const colors = h("div", { class: "color-pick", role: "radiogroup", "aria-label": tr("Màu") });
  const paintColors = () => colors.replaceChildren(...CATEGORY_COLOR_NAMES.map((c) => {
    const btn = h("button", { type: "button", role: "radio", "aria-checked": String(draft.color === c), "aria-label": c },
      categoryBadge({ color: c, icon: draft.color === c ? "check" : "circle-small" }, 34));
    btn.addEventListener("click", () => {
      draft.color = c;
      haptic(6);
      paintColors();
      paintPreview();
    });
    return btn;
  }));

  paintPreview();
  paintIcons();
  paintColors();

  const save = h("button", { class: "btn block", type: "submit" }, icon("check", 18), cat ? tr("Lưu thay đổi") : tr`Thêm mục ${TYPE_LABEL[type]}`);
  const form = h("form", { class: "stack", novalidate: true },
    preview, name.el,
    h("div", { class: "setting-label" }, tr("Biểu tượng")), icons,
    h("div", { class: "setting-label" }, tr("Màu")), colors,
    save);
  const sheet = openSheet({ title: cat ? tr("Sửa danh mục") : tr`Thêm danh mục ${TYPE_LABEL[type]}`, content: form });
  if (!cat) requestAnimationFrame(() => name.input.focus());

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const value = name.input.value.trim();
    if (!value) {
      name.setHint(tr("Đặt tên cho danh mục"), "error");
      name.input.focus();
      return;
    }
    const restore = busy(save);
    try {
      const body = { name: value, icon: draft.icon, color: draft.color };
      const saved = cat
        ? await api(`/categories/${cat.id}`, { method: "PUT", body })
        : await api("/categories", { method: "POST", body: { ...body, type } });
      haptic(15);
      toast(cat ? tr("Đã lưu danh mục.") : tr`Đã thêm "${saved.name}".`, "ok");
      announceChange();
      sheet.close("saved");
      onSaved();
    } catch (error) {
      restore();
      name.setHint(error.message, "error");
      name.input.focus();
    }
  });
}

/* ---------------------------------------------------------------------------
   Màn hình
   ------------------------------------------------------------------------ */
export async function categoriesScreen(ctx, params) {
  let type = params.get("type") === "income" ? "income" : "expense";
  const screen = h("main", { class: "screen stack" });
  const back = h("button", { class: "icon-btn", type: "button", "aria-label": tr("Quay lại"), onclick: () => (history.length > 1 ? history.back() : ctx.go("settings")) }, icon("arrow-left"));
  screen.append(h("header", { class: "screen-head" }, back,
    h("div", { class: "grow" }, h("h1", null, tr("Danh mục")), h("span", { class: "sub" }, tr("Ẩn bớt, sắp xếp, thêm mục của riêng bạn")))));

  let all = await api("/categories", { query: { include_hidden: 1 }, fresh: true });

  const tabs = h("div", { class: "segmented" });
  const body = h("div", { class: "stack" });
  screen.append(tabs, body,
    h("p", { class: "faint center" }, tr("Danh mục mặc định dùng chung nên chỉ ẩn được. Ẩn đi thì các khoản cũ vẫn giữ nguyên, chỉ không hiện khi ghi khoản mới.")));

  const reload = async () => {
    all = await api("/categories", { query: { include_hidden: 1 }, fresh: true });
    paint();
  };

  // Đưa lên / xuống: đổi chỗ ngay trên màn hình, gom lại lưu một lần sau 600 ms
  let saveTimer = null;
  let pendingType = null;
  const flushOrder = async () => {
    clearTimeout(saveTimer);
    saveTimer = null;
    const saveType = pendingType;
    pendingType = null;
    if (!saveType) return;
    const ids = all.filter((c) => c.type === saveType && !c.is_hidden).map((c) => c.id);
    try {
      await api("/categories/order", { method: "PUT", body: { type: saveType, ids } });
      announceChange();
    } catch (error) {
      toast(error.message, "error");
      if (screen.isConnected) reload();
    }
  };
  const saveOrder = () => {
    if (pendingType && pendingType !== type) flushOrder();
    pendingType = type;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushOrder, 600);
  };

  const move = (cat, step) => {
    const visible = all.filter((c) => c.type === type && !c.is_hidden);
    const i = visible.indexOf(cat);
    const j = i + step;
    if (j < 0 || j >= visible.length) return;
    const a = all.indexOf(visible[i]);
    const b = all.indexOf(visible[j]);
    [all[a], all[b]] = [all[b], all[a]];
    haptic(6);
    paint(cat.id);
    saveOrder();
  };

  const setHidden = async (cat, hidden, btn) => {
    const restore = busy(btn);
    try {
      await api(`/categories/${cat.id}/hidden`, { method: "PUT", body: { hidden } });
      cat.is_hidden = hidden;
      // Hiện lại thì đưa xuống cuối nhóm đang dùng
      if (!hidden) {
        all.splice(all.indexOf(cat), 1);
        all.push(cat);
      }
      haptic(10);
      toast(hidden ? tr`Đã ẩn "${cat.name}".` : tr`Đã hiện lại "${cat.name}".`, "ok");
      announceChange();
      paint();
    } catch (error) {
      restore();
      toast(error.message, "error", 4500);
    }
  };

  const row = (cat, index, total, flashId) => {
    const meta = [cat.used_count ? tr`${cat.used_count} khoản` : tr("Chưa dùng"), cat.is_default ? tr("Mặc định") : tr("Của bạn")].join(" · ");
    const actions = h("span", { class: "cat-actions" });
    if (!cat.is_hidden) {
      actions.append(
        h("button", { class: "icon-btn sm", type: "button", "aria-label": tr`Đưa ${cat.name} lên`, disabled: index === 0, onclick: () => move(cat, -1) }, icon("chevron-up", 18)),
        h("button", { class: "icon-btn sm", type: "button", "aria-label": tr`Đưa ${cat.name} xuống`, disabled: index === total - 1, onclick: () => move(cat, 1) }, icon("chevron-down", 18)));
    }
    const eye = h("button", { class: "icon-btn sm", type: "button", "aria-label": cat.is_hidden ? tr`Hiện lại ${cat.name}` : tr`Ẩn ${cat.name}` },
      icon(cat.is_hidden ? "eye" : "eye-off", 18));
    eye.addEventListener("click", () => setHidden(cat, !cat.is_hidden, eye));
    actions.append(eye);

    const main = h(cat.is_default ? "span" : "button", { class: "cat-main", type: cat.is_default ? undefined : "button" },
      categoryBadge(cat, 40),
      h("span", { class: "tx-main" }, h("strong", null, cat.name, cat.is_default ? null : icon("pencil", 13)), h("small", null, meta)));
    if (!cat.is_default) main.addEventListener("click", () => openEditor({ type, cat, onSaved: reload }));
    return h("div", { class: `cat-row${cat.is_hidden ? " hidden" : ""}${flashId === cat.id ? " moved" : ""}` }, main, actions);
  };

  function paint(flashId) {
    tabs.replaceChildren(...[["expense", tr("Khoản chi")], ["income", tr("Khoản thu")]].map(([value, label]) =>
      h("button", {
        type: "button", class: value, "aria-pressed": String(type === value),
        onclick: () => {
          if (type === value) return;
          type = value;
          history.replaceState(null, "", `#/categories?type=${value}`);
          haptic(6);
          paint();
        }
      }, label)));

    const mine = all.filter((c) => c.type === type);
    const visible = mine.filter((c) => !c.is_hidden);
    const hidden = mine.filter((c) => c.is_hidden);

    const add = h("button", { class: "btn soft block", type: "button" }, icon("plus", 18), tr`Thêm mục ${TYPE_LABEL[type]} của riêng bạn`);
    add.addEventListener("click", () => openEditor({ type, onSaved: reload }));

    body.replaceChildren(...[
      h("section", { class: "card" },
        h("div", { class: "card-title" }, icon("list-ordered", 20), tr("Đang dùng"), h("span", { class: "badge" }, String(visible.length))),
        h("p", { class: "faint mt-0" }, tr("Thứ tự ở đây là thứ tự hiện khi ghi khoản. Mục hay dùng nên để lên đầu.")),
        h("div", { class: "cat-list" }, visible.map((c, i) => row(c, i, visible.length, flashId))),
        add),
      hidden.length
        ? h("section", { class: "card" },
          h("div", { class: "card-title" }, icon("eye-off", 20), tr("Đang ẩn"), h("span", { class: "badge" }, String(hidden.length))),
          h("div", { class: "cat-list" }, hidden.map((c, i) => row(c, i, hidden.length))))
        : null
    ].filter(Boolean));
  }

  paint();
  // Rời màn hình khi chưa kịp lưu thứ tự thì lưu luôn
  screen.cleanup = () => flushOrder();
  return screen;
}
