/**
 * @file add.js
 * @description Các cách ghi một khoản: nói, up ảnh (nhiều ảnh một lượt), dán tin nhắn ngân hàng,
 * tự nhập, một chạm theo thói quen và sửa/xóa khoản đã ghi.
 * Mọi khoản đọc tự động đều phải qua bước "Có xác nhận X cho Y không?" trước khi ghi.
 */

import { tr } from "../i18n.js";
import { api, session, today, nowTime } from "../api.js";
import {
  h, icon, money, moneyShort, parseMoneyInput, dateLabel, haptic, toast, confetti,
  openSheet, confirmSheet, slideToConfirm, field, busy, categoryBadge
} from "../ui.js";

const MAX_PHOTOS = 10;
const MAX_BATCH = 20;
/** Định dạng backend nhận; ảnh khác (webp, heic...) được đổi sang JPEG trước khi gửi */
const SERVER_TYPES = ["image/jpeg", "image/png", "image/bmp", "image/gif", "image/tiff"];
const RESIZE_OVER_BYTES = 3 * 1024 * 1024;
const MAX_SIDE = 2400;

const DOC_KINDS = {
  receipt: tr("Hóa đơn"),
  transfer: tr("Ảnh chuyển khoản"),
  bank_notification: tr("Thông báo ngân hàng"),
  unknown: tr("Chưa rõ loại ảnh")
};

const MATCH_KINDS = {
  same_file: tr("Ảnh này đã up rồi"),
  same_content: tr("Trùng nội dung với lần up trước"),
  similar_image: tr("Ảnh rất giống một ảnh đã up")
};

const numberFormat = new Intl.NumberFormat("vi-VN");

/* ---------------------------------------------------------------------------
   Danh mục và khoản nháp
   ------------------------------------------------------------------------ */
let categoriesCache = null;
// Đổi danh mục ở màn Cài đặt (ẩn, sắp xếp, thêm) thì lần mở sau tải lại
window.addEventListener("sochi:categories", () => {
  categoriesCache = null;
});

/**
 * Lấy cả danh mục đã ẩn để sửa khoản cũ vẫn thấy đúng danh mục của nó;
 * ô chọn chỉ hiện danh mục đang dùng (xem pickable).
 */
function loadCategories() {
  if (!categoriesCache) {
    categoriesCache = api("/categories", { query: { include_hidden: 1 } }).catch((error) => {
      categoriesCache = null;
      throw error;
    });
  }
  return categoriesCache;
}

const catById = (cats, id) => cats.find((c) => c.id === Number(id));

/** Danh mục được hiện trong ô chọn: đúng loại, chưa ẩn (trừ danh mục khoản đang sửa đang dùng). */
function pickable(cats, type, keepId) {
  return cats.filter((c) => c.type === type && (!c.is_hidden || c.id === keepId));
}

function fallbackCategory(cats, type) {
  const list = pickable(cats, type);
  return list.find((c) => /khác/i.test(c.name)) || list[0];
}

/** Khoản nháp luôn có danh mục đúng loại thu/chi. Khoản mới không rơi vào danh mục đã ẩn. */
function makeDraft(cats, src, source) {
  let cat = catById(cats, src.category_id);
  const type = src.type === "income" || src.type === "expense" ? src.type : cat ? cat.type : "expense";
  if (!cat || cat.type !== type || (cat.is_hidden && !src.id)) cat = fallbackCategory(cats, type);
  return {
    type,
    amount: Number(src.amount) > 0 ? Number(src.amount) : null,
    note: src.note || "",
    category_id: cat ? cat.id : null,
    transaction_date: src.transaction_date ? String(src.transaction_date).slice(0, 10) : today(),
    transaction_time: src.transaction_time ? String(src.transaction_time).slice(0, 5) : "",
    source,
    scan_id: src.scan_id || null,
    checked: true
  };
}

function itemTitle(item, cats) {
  const note = String(item.note || "").trim();
  if (note) return note;
  const cat = catById(cats, item.category_id);
  return cat ? cat.name : tr("khoản này");
}

/**
 * Ghi vào tháng khác tháng này (hóa đơn cũ, ảnh chụp từ năm trước) thì nói rõ tháng nào,
 * vì Lịch sử mở ở tháng hiện tại và người dùng sẽ tưởng khoản đó bị mất.
 */
function otherMonthHint(items) {
  const thisMonth = today().slice(0, 7);
  const other = [...new Set(items.map((item) => String(item.transaction_date || "").slice(0, 7)))]
    .filter((month) => month && month !== thisMonth);
  if (!other.length) return "";
  if (other.length > 1) return tr`. Có khoản nằm ở tháng khác, xem ở Lịch sử (bấm vào tên tháng để chọn).`;
  const [y, m] = other[0].split("-").map(Number);
  return tr`, vào tháng ${m}/${y}. Xem ở Lịch sử (bấm vào tên tháng để chọn).`;
}

function signedMoney(item) {
  return `${item.type === "income" ? "+" : ""}${money(item.amount)}`;
}

function validateItem(item) {
  if (!item.amount || item.amount <= 0) return tr("Số tiền chưa đúng.");
  if (!item.category_id) return tr("Chọn danh mục nhé.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.transaction_date || "")) return tr("Ngày chưa đúng.");
  return null;
}

function toPayload(item) {
  const body = {
    category_id: item.category_id,
    amount: item.amount,
    note: String(item.note || "").trim() || null,
    transaction_date: item.transaction_date,
    transaction_time: item.transaction_time || null,
    source: item.source
  };
  if (item.scan_id) body.scan_id = item.scan_id;
  return body;
}

function questionFor(item, cats) {
  return tr`Có xác nhận ${signedMoney(item)} cho "${itemTitle(item, cats)}" không?`;
}

function totalsText(items) {
  const sum = (type) => items.filter((i) => i.type === type).reduce((s, i) => s + i.amount, 0);
  const parts = [];
  if (sum("expense")) parts.push(`chi ${money(sum("expense"))}`);
  if (sum("income")) parts.push(`thu ${money(sum("income"))}`);
  return parts.join(tr(" và "));
}

/* ---------------------------------------------------------------------------
   Thành phần dùng chung
   ------------------------------------------------------------------------ */
function typeSwitch(value, onChange, { small = false } = {}) {
  const make = (type, label, iconName) => h("button", { type: "button", class: type, "aria-pressed": String(value === type) }, icon(iconName, 16), label);
  const expense = make("expense", tr("Chi"), "arrow-up-right");
  const income = make("income", tr("Thu"), "arrow-down-left");
  const wrap = h("div", { class: `segmented${small ? " small" : ""}`, role: "group", "aria-label": tr("Khoản chi hay khoản thu") }, expense, income);
  for (const [btn, type] of [[expense, "expense"], [income, "income"]]) {
    btn.addEventListener("click", () => {
      expense.setAttribute("aria-pressed", String(type === "expense"));
      income.setAttribute("aria-pressed", String(type === "income"));
      haptic(8);
      onChange(type);
    });
  }
  return wrap;
}

/** Ô sửa gọn cho từng khoản đọc được (ảnh, giọng nói, tin nhắn). */
function itemEditor(item, cats, onChange = () => {}) {
  const amount = h("input", {
    class: "mini-input amount", inputmode: "decimal", autocomplete: "off", placeholder: tr("Số tiền"), "aria-label": tr("Số tiền"),
    value: item.amount ? numberFormat.format(item.amount) : ""
  });
  amount.addEventListener("input", () => {
    item.amount = parseMoneyInput(amount.value);
    amount.classList.toggle("invalid", !item.amount);
    onChange();
  });
  if (!item.amount) amount.classList.add("invalid");

  const category = h("select", { class: "mini-input", "aria-label": tr("Danh mục") });
  const fillCategories = () => {
    category.replaceChildren(...pickable(cats, item.type, item.category_id).map((c) => h("option", { value: String(c.id) }, c.name)));
    category.value = String(item.category_id);
  };
  fillCategories();
  category.addEventListener("change", () => {
    item.category_id = Number(category.value);
    onChange();
  });

  const type = typeSwitch(item.type, (value) => {
    item.type = value;
    const cat = catById(cats, item.category_id);
    if (!cat || cat.type !== value) item.category_id = (fallbackCategory(cats, value) || {}).id || null;
    fillCategories();
    onChange();
  }, { small: true });

  const note = h("input", { class: "mini-input", maxlength: 500, placeholder: tr("Ghi chú"), "aria-label": tr("Ghi chú"), value: item.note || "" });
  note.addEventListener("input", () => {
    item.note = note.value;
    onChange();
  });
  const date = h("input", { class: "mini-input", type: "date", "aria-label": tr("Ngày"), value: item.transaction_date });
  date.addEventListener("change", () => {
    item.transaction_date = date.value;
    onChange();
  });
  const time = h("input", { class: "mini-input", type: "time", "aria-label": tr("Giờ"), value: item.transaction_time || "" });
  time.addEventListener("change", () => {
    item.transaction_time = time.value;
    onChange();
  });

  return h("div", { class: "mini-editor" },
    h("div", { class: "mini-row" }, type, amount),
    category,
    note,
    h("div", { class: "mini-row" }, date, time));
}

function summaryRow(item, cats) {
  const cat = catById(cats, item.category_id) || {};
  return h("div", { class: "sum-row" },
    categoryBadge(cat, 34),
    h("span", { class: "grow" },
      h("strong", null, itemTitle(item, cats)),
      h("small", null, [dateLabel(item.transaction_date, today()), item.transaction_time].filter(Boolean).join(" · "))),
    h("span", { class: `tx-amt ${item.type}` }, signedMoney(item)));
}

/**
 * Bảng xác nhận: câu hỏi "Có xác nhận X cho Y không?" + trượt để ghi.
 * @returns {Promise<boolean>} true khi đã ghi xong
 */
function askConfirm({ question, rows, onConfirm }) {
  return new Promise((resolve) => {
    let saved = false;
    const sheet = openSheet({
      title: tr("Xác nhận"),
      onClose: () => {
        if (!saved) resolve(false);
      }
    });
    const slide = slideToConfirm({
      label: tr("Trượt để ghi"),
      onConfirm: async () => {
        try {
          await onConfirm();
        } catch (error) {
          toast(error.message, "error", 5000);
          throw error;
        }
        saved = true;
        resolve(true);
        sheet.close("ok");
      }
    });
    const cancel = h("button", { class: "btn ghost block", type: "button" }, tr("Chưa, để mình sửa"));
    cancel.addEventListener("click", () => sheet.close("cancel"));
    sheet.setContent(h("div", { class: "stack" },
      h("p", { class: "confirm-question" }, question),
      rows && rows.length ? h("div", { class: "sum-list" }, rows) : null,
      slide,
      cancel));
  });
}

/** Sau khi ghi: rung, pháo giấy, thông báo kèm nút Hoàn tác, vẽ lại màn hình. */
function celebrate(ctx, created, message, onUndone) {
  haptic([10, 40, 10]);
  confetti({ count: created.length > 1 ? 160 : 110 });
  const ids = created.map((t) => t.id).filter(Boolean);
  toast(message, "ok", 6000, ids.length ? {
    label: tr("Hoàn tác"),
    onClick: async () => {
      try {
        for (const id of ids) await api(`/transactions/${id}`, { method: "DELETE" });
        toast(ids.length > 1 ? tr`Đã bỏ ${ids.length} khoản vừa ghi.` : tr("Đã bỏ khoản vừa ghi."), "info");
        if (onUndone) onUndone();
        ctx.refresh();
      } catch (error) {
        toast(error.message, "error");
      }
    }
  } : undefined);
  ctx.refresh();
}

/** Ghi một hoặc nhiều khoản sau khi người dùng xác nhận. */
async function confirmItems(ctx, cats, chosen, { label = "", onUndone } = {}) {
  if (!chosen.length) {
    toast(tr("Chọn ít nhất một khoản nhé."), "info");
    return false;
  }
  if (chosen.length > MAX_BATCH) {
    toast(tr`Mỗi lần ghi tối đa ${MAX_BATCH} khoản.`, "error");
    return false;
  }
  for (const [index, item] of chosen.entries()) {
    const problem = validateItem(item);
    if (problem) {
      toast(chosen.length > 1 ? tr`Khoản ${index + 1}: ${problem}` : problem, "error");
      return false;
    }
  }
  const question = chosen.length === 1
    ? questionFor(chosen[0], cats)
    : tr`Có xác nhận ghi ${chosen.length} khoản (${totalsText(chosen)}) không?`;
  return askConfirm({
    question,
    rows: chosen.map((item) => summaryRow(item, cats)),
    onConfirm: async () => {
      let created;
      if (chosen.length === 1) {
        created = [await api("/transactions", { method: "POST", body: toPayload(chosen[0]) })];
      } else {
        try {
          created = await api("/transactions/batch", { method: "POST", body: { items: chosen.map(toPayload) } });
        } catch (error) {
          if (Number.isInteger(error.data.index)) error.message = tr`Khoản ${error.data.index + 1}: ${error.message}`;
          throw error;
        }
      }
      const message = chosen.length === 1
        ? tr`Đã ghi ${signedMoney(chosen[0])} cho ${itemTitle(chosen[0], cats)}${label}`
        : tr`Đã ghi ${created.length} khoản${label}`;
      celebrate(ctx, created, message + otherMonthHint(chosen), onUndone);
      return created;
    }
  });
}

/** Cảnh báo đi kèm kết quả đọc ảnh/tin nhắn. */
function scanWarnings(result, extra = []) {
  const list = h("ul", { class: "warn-list" });
  const add = (kind, iconName, text) => list.append(h("li", { class: kind }, icon(iconName, 15), h("span", null, text)));

  for (const dup of result.duplicates || []) {
    const when = dup.transaction_date ? tr`đã ghi ${dateLabel(String(dup.transaction_date).slice(0, 10), today())}` : tr("đã up nhưng chưa ghi");
    add("danger", "copy", `${MATCH_KINDS[dup.match_kind] || tr("Có thể bị trùng")}: ${dup.amount ? money(dup.amount) : "?"}, ${when}.`);
  }
  for (const text of extra) add("danger", "copy", text);
  if (!result.amount) add("danger", "circle-help", tr("Không đọc được số tiền, bạn nhập giúp mình nhé."));
  else if (typeof result.confidence === "number" && result.confidence < 0.6) add("warn", "eye", tr("Mình chưa chắc số tiền lắm, kiểm tra lại giúp nha."));
  if (result.doc_kind === "unknown") add("warn", "circle-help", tr("Không chắc đây là hóa đơn hay chuyển khoản, xem lại Thu/Chi nhé."));
  const balances = (result.ignored_balance || []).map((b) => (typeof b === "object" ? b.amount ?? b.value : b)).filter((b) => Number(b) > 0);
  if (balances.length) add("info", "eye-off", tr`Đã bỏ qua số dư tài khoản: ${balances.map(money).join(", ")}.`);
  if (result.date_found === false) add("info", "calendar", tr("Không thấy ngày trên ảnh/tin nhắn, đang để hôm nay."));
  return list.childElementCount ? list : null;
}

function spinner() {
  return icon("loader-circle", 16, "spin");
}

/* ---------------------------------------------------------------------------
   Menu thêm khoản
   ------------------------------------------------------------------------ */
function openMenu(ctx) {
  const sheet = openSheet({ title: tr("Ghi khoản mới") });
  const item = (mode, iconName, title, sub) => {
    const btn = h("button", { class: "menu-item", type: "button" },
      h("span", { class: `mi-icon qa-${mode}` }, icon(iconName)),
      h("span", { class: "grow" }, title, h("small", null, sub)),
      icon("chevron-right"));
    btn.addEventListener("click", () => {
      sheet.close("pick");
      openAdd(ctx, mode);
    });
    return btn;
  };
  const chips = h("div", { class: "chips scroll" });
  const habit = h("div", { hidden: true }, h("p", { class: "faint mt-16" }, tr("Một chạm theo thói quen")), chips);
  sheet.setContent(
    h("div", { class: "menu" },
      item("voice", "mic", tr("Nói"), tr("Một câu ghi được nhiều khoản: \"phở 40k, gửi xe 5k\"")),
      item("scan", "image-up", tr("Up ảnh"), tr`Bill, ảnh chuyển khoản, thông báo ngân hàng (tối đa ${MAX_PHOTOS} ảnh)`),
      item("sms", "message-square-text", tr("Dán SMS"), tr("Dán tin nhắn biến động số dư, tự tách thu/chi")),
      item("manual", "pencil", tr("Tự nhập"), tr("Gõ số tiền, chọn danh mục"))),
    habit);

  api("/dashboard/suggestions", { query: { today: today(), now: nowTime() } }).then((list) => {
    if (!list || !list.length) return;
    for (const s of list) {
      const chip = h("button", { class: "chip", type: "button" }, categoryBadge(s, 22), s.note || s.category_name, h("span", { class: "amt" }, moneyShort(s.amount)));
      chip.addEventListener("click", () => {
        sheet.close("pick");
        openAdd(ctx, "quick", s);
      });
      chips.append(chip);
    }
    habit.hidden = false;
  }).catch(() => {});
}

/* ---------------------------------------------------------------------------
   Up ảnh: nhiều ảnh một lượt, đọc lần lượt, xác nhận từng khoản hoặc tất cả
   ------------------------------------------------------------------------ */

/** Lượt up ảnh đang làm dở: đóng bảng lỡ tay vẫn giữ lại ảnh đã đọc. */
let scanState = null;
window.addEventListener("sochi:signed-out", () => discardScanState());

function discardScanState() {
  if (!scanState) return;
  for (const card of scanState.cards) URL.revokeObjectURL(card.url);
  scanState = null;
}

/** Ảnh quá lớn hoặc định dạng backend không nhận (webp, heic) thì vẽ lại thành JPEG. */
async function prepareImage(file) {
  const supported = SERVER_TYPES.includes(file.type);
  if (supported && file.size <= RESIZE_OVER_BYTES) return file;
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (supported) return file;
    throw new Error(tr("Trình duyệt không mở được ảnh này. Ảnh HEIC thì chụp màn hình lại rồi up nhé."));
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const g = canvas.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

function readError(error) {
  if (error.status === 429) return tr("Up nhanh quá, đợi một phút rồi bấm Thử lại nhé.");
  if (error.code === "UNSUPPORTED_IMAGE") return tr("Định dạng ảnh này chưa đọc được (dùng JPG/PNG nhé).");
  return error.message || tr("Không đọc được ảnh này.");
}

async function openScan(ctx, cats) {
  const userId = session.user && session.user.id;
  if (scanState && scanState.userId !== userId) discardScanState();
  if (!scanState) scanState = { userId, cards: [], seq: 0, running: false };
  const state = scanState;
  let open = true;

  const input = h("input", { type: "file", accept: "image/*", multiple: true, class: "sr-only", "aria-label": tr("Chọn ảnh chi tiêu") });
  const counter = h("span", { class: "badge" });
  const drop = h("label", { class: "dropzone" },
    input,
    h("span", { class: "dz-icon" }, icon("image-up", 30)),
    h("strong", null, tr("Chọn ảnh chi tiêu")),
    h("span", { class: "faint" }, tr("Bill, ảnh chụp chuyển khoản, thông báo ngân hàng")),
    h("span", { class: "faint only-fine" }, tr("Kéo thả hoặc dán ảnh (Ctrl+V) cũng được")),
    counter);
  const queue = h("div", { class: "scan-queue" });
  const progress = h("span", { class: "faint" });
  const confirmAll = h("button", { class: "btn block", type: "button" }, icon("check-check", 18), tr("Xác nhận tất cả"));
  const footer = h("div", { class: "sheet-footer" }, progress, confirmAll);

  const sheet = openSheet({
    title: tr("Up ảnh chi tiêu"),
    onClose: () => {
      open = false;
      document.removeEventListener("paste", onPaste);
      const left = state.cards.filter((c) => c.status !== "saved");
      if (left.length && scanState === state) {
        toast(tr`Mình giữ lại ${left.length} ảnh chưa ghi, mở Up ảnh để làm tiếp nhé.`, "info", 4500);
      } else if (scanState === state) {
        discardScanState();
      }
    }
  });
  sheet.setContent(h("div", { class: "stack" },
    h("p", { class: "muted mt-0" }, tr`Chọn một lúc tối đa ${MAX_PHOTOS} ảnh. Mình đọc lần lượt từng ảnh, bạn xác nhận từng khoản hoặc xác nhận tất cả.`),
    drop, queue, footer));

  input.addEventListener("change", () => {
    addFiles(input.files);
    input.value = "";
  });
  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.classList.add("over");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("over");
    addFiles(e.dataTransfer.files);
  });
  function onPaste(e) {
    const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith("image/"));
    if (files.length) {
      e.preventDefault();
      addFiles(files);
    }
  }
  document.addEventListener("paste", onPaste);
  confirmAll.addEventListener("click", confirmSelected);

  for (const card of state.cards) queue.append(card.el);
  updateUI();
  pump();

  function addFiles(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (!files.length) {
      if (fileList.length) toast(tr("Chỉ nhận file ảnh thôi nha."), "error");
      return;
    }
    const room = MAX_PHOTOS - state.cards.length;
    if (room <= 0) {
      toast(tr`Mỗi lượt tối đa ${MAX_PHOTOS} ảnh. Ghi hoặc bỏ bớt ảnh rồi thêm tiếp nhé.`, "info");
      return;
    }
    if (files.length > room) toast(tr`Chỉ lấy ${room} ảnh đầu, mỗi lượt tối đa ${MAX_PHOTOS} ảnh.`, "info", 4500);
    for (const file of files.slice(0, room)) {
      const key = `${file.name}|${file.size}|${file.lastModified}`;
      if (state.cards.some((c) => c.key === key)) {
        toast(tr`"${file.name}" chọn hai lần, mình bỏ qua bản sau.`, "info");
        continue;
      }
      const card = { n: ++state.seq, key, file, url: URL.createObjectURL(file), status: "queued", checked: false, el: h("article") };
      state.cards.push(card);
      queue.append(card.el);
      renderCard(card);
    }
    haptic(10);
    updateUI();
    pump();
  }

  async function pump() {
    if (state.running) return;
    state.running = true;
    try {
      let card;
      while (scanState === state && (card = state.cards.find((c) => c.status === "queued"))) await readCard(card);
    } finally {
      state.running = false;
    }
    if (open) updateUI();
  }

  async function readCard(card) {
    card.status = "reading";
    renderCard(card);
    updateUI();
    try {
      const file = await prepareImage(card.file);
      const form = new FormData();
      form.append("today", today());
      form.append("now", nowTime());
      form.append("image", file, file.name);
      const result = await api("/scan/image", { method: "POST", form });
      card.result = result;
      card.item = makeDraft(cats, result, "bill");
      card.item.scan_id = result.scan_id;
      card.status = "done";
      card.localDup = findLocalDuplicate(card);
      card.checked = Boolean(card.item.amount) && !(result.duplicates || []).length && !card.localDup;
      if (open) haptic(8);
    } catch (error) {
      card.status = "error";
      card.error = readError(error);
    }
    if (state.cards.includes(card)) renderCard(card);
    if (open) updateUI();
  }

  /** Hai ảnh trong cùng lượt cùng số tiền, ngày, giờ (hoặc cùng mã giao dịch) thì báo trùng. */
  function findLocalDuplicate(card) {
    const a = card.item;
    const ref = card.result.reference_code;
    const other = state.cards.find((c) => c !== card && c.item && c.status !== "error" && (
      (ref && c.result.reference_code === ref) ||
      (a.amount && c.item.amount === a.amount && c.item.type === a.type &&
        c.item.transaction_date === a.transaction_date && c.item.transaction_time === a.transaction_time)));
    return other ? other.n : null;
  }

  function renderCard(card) {
    const thumb = h("button", { class: "thumb", type: "button", "aria-label": tr`Xem lớn ảnh ${card.n}` }, h("img", { src: card.url, alt: "" }));
    thumb.addEventListener("click", () => openSheet({ title: tr`Ảnh ${card.n}`, content: h("img", { class: "photo-full", src: card.url, alt: tr`Ảnh ${card.n}` }) }));
    const remove = h("button", { class: "icon-btn", type: "button", "aria-label": tr`Bỏ ảnh ${card.n}`, disabled: card.status === "reading" }, icon("x", 18));
    remove.addEventListener("click", () => removeCard(card));

    let status;
    let body = null;
    if (card.status === "queued") {
      status = h("span", { class: "faint" }, icon("clock", 14), tr(" Đang chờ đọc"));
    } else if (card.status === "reading") {
      status = h("span", { class: "faint" }, spinner(), tr(" Đang đọc ảnh..."));
    } else if (card.status === "error") {
      status = h("span", { class: "badge danger" }, tr("Chưa đọc được"));
      const retry = h("button", { class: "btn small soft", type: "button" }, icon("rotate-ccw", 16), tr("Thử lại"));
      retry.addEventListener("click", () => {
        card.status = "queued";
        renderCard(card);
        updateUI();
        pump();
      });
      body = h("div", { class: "stack" }, h("p", { class: "field-hint error" }, card.error), retry);
    } else if (card.status === "saved") {
      status = h("span", { class: "badge ok" }, icon("check", 13), tr("Đã ghi"));
      body = summaryRow(card.item, cats);
    } else {
      const r = card.result;
      status = h("span", { class: "faint" }, DOC_KINDS[r.doc_kind] || DOC_KINDS.unknown);
      const check = h("input", { type: "checkbox", checked: card.checked });
      check.addEventListener("change", () => {
        card.checked = check.checked;
        card.el.classList.toggle("picked", card.checked);
        updateUI();
      });
      const one = h("button", { class: "btn small", type: "button" }, icon("check", 16), tr("Xác nhận khoản này"));
      one.addEventListener("click", () => confirmOne(card));
      const dupText = card.localDup ? [tr`Giống ảnh ${card.localDup} trong lượt này.`] : [];
      body = h("div", { class: "stack" },
        scanWarnings(r, dupText),
        itemEditor(card.item, cats, () => updateUI()),
        h("div", { class: "row between" },
          h("label", { class: "check-chip" }, check, tr("Chọn để ghi")),
          one));
    }

    card.el.className = `card tight scan-card ${card.status}${card.status === "done" && card.checked ? " picked" : ""}`;
    card.el.replaceChildren(
      h("div", { class: "scan-head" }, thumb, h("div", { class: "grow" }, h("strong", null, tr`Ảnh ${card.n}`), status), remove),
      body);
  }

  function removeCard(card) {
    const index = state.cards.indexOf(card);
    if (index < 0 || card.status === "reading") return;
    state.cards.splice(index, 1);
    URL.revokeObjectURL(card.url);
    card.el.remove();
    updateUI();
  }

  function updateUI() {
    const cards = state.cards;
    counter.textContent = tr`${cards.length}/${MAX_PHOTOS} ảnh`;
    drop.classList.toggle("full", cards.length >= MAX_PHOTOS);
    input.disabled = cards.length >= MAX_PHOTOS;

    const waiting = cards.filter((c) => c.status === "queued" || c.status === "reading").length;
    const finished = cards.filter((c) => c.status !== "queued" && c.status !== "reading").length;
    const chosen = cards.filter((c) => c.status === "done" && c.checked);
    footer.hidden = !cards.some((c) => c.status !== "saved");
    progress.replaceChildren(waiting
      ? h("span", null, spinner(), tr` Đang đọc ${finished + 1}/${cards.length} ảnh...`)
      : chosen.length ? tr`Đã chọn ${chosen.length} khoản: ${totalsText(chosen.filter((c) => c.item.amount).map((c) => c.item)) || tr("chưa có số tiền")}` : tr("Tích \"Chọn để ghi\" ở các ảnh muốn ghi"));
    confirmAll.disabled = !chosen.length;
    confirmAll.replaceChildren(icon("check-check", 18), chosen.length ? tr`Xác nhận tất cả (${chosen.length})` : tr("Xác nhận tất cả"));
  }

  async function confirmOne(card) {
    const ok = await confirmItems(ctx, cats, [card.item], { label: tr(" từ ảnh"), onUndone: () => unmarkSaved([card]) });
    if (ok) markSaved([card]);
  }

  async function confirmSelected() {
    const chosen = state.cards.filter((c) => c.status === "done" && c.checked);
    for (const card of chosen) {
      const problem = validateItem(card.item);
      if (problem) {
        toast(tr`Ảnh ${card.n}: ${problem}`, "error");
        card.el.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
    const ok = await confirmItems(ctx, cats, chosen.map((c) => c.item), { label: tr(" từ ảnh"), onUndone: () => unmarkSaved(chosen) });
    if (ok) markSaved(chosen);
  }

  function markSaved(cards) {
    for (const card of cards) {
      card.status = "saved";
      card.checked = false;
      renderCard(card);
    }
    updateUI();
    if (state.cards.every((c) => c.status === "saved")) {
      discardScanState();
      setTimeout(() => sheet.close("done"), 700);
    }
  }

  /** Bấm Hoàn tác: thẻ quay lại trạng thái chờ ghi (nếu bảng vẫn còn). */
  function unmarkSaved(cards) {
    let changed = false;
    for (const card of cards) {
      if (!state.cards.includes(card) || card.status !== "saved") continue;
      card.status = "done";
      card.checked = true;
      renderCard(card);
      changed = true;
    }
    if (changed) updateUI();
  }
}

/* ---------------------------------------------------------------------------
   Danh sách khoản đọc được từ câu nói / tin nhắn
   ------------------------------------------------------------------------ */
function reviewList(items, cats, onChange) {
  const wrap = h("div", { class: "stack" });
  items.forEach((item, index) => {
    const check = h("input", { type: "checkbox", checked: item.checked });
    const card = h("div", { class: `card tight review-item${item.checked ? " picked" : ""}` });
    check.addEventListener("change", () => {
      item.checked = check.checked;
      card.classList.toggle("picked", item.checked);
      onChange();
    });
    card.append(
      h("div", { class: "row between" },
        h("label", { class: "check-chip" }, check, items.length > 1 ? tr`Khoản ${index + 1}` : tr("Ghi khoản này")),
        item.guessed ? h("span", { class: "badge warn" }, icon("circle-help", 13), tr("Số tiền đoán")) : null),
      itemEditor(item, cats, onChange));
    wrap.append(card);
  });
  return wrap;
}

function confirmButton(items, onClick) {
  const btn = h("button", { class: "btn block", type: "button" });
  const update = () => {
    const n = items.filter((i) => i.checked).length;
    btn.disabled = !n;
    btn.replaceChildren(icon("check", 18), n > 1 ? tr`Xác nhận ${n} khoản` : tr("Xác nhận"));
  };
  btn.addEventListener("click", onClick);
  update();
  return Object.assign(btn, { update });
}

/* ---------------------------------------------------------------------------
   Nói để ghi
   ------------------------------------------------------------------------ */
const VOICE_EXAMPLES = [tr("trà sữa 35k, gửi xe 5k"), tr("hôm qua đổ xăng 50 nghìn"), tr("mẹ cho 500k")];

function openVoice(ctx, cats) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const text = field({ label: tr("Câu bạn nói (sửa được)"), name: "voice", type: "textarea", maxlength: 500 });
  const mic = h("button", { class: "mic-btn", type: "button", "aria-label": tr("Bấm để nói") }, icon("mic", 40));
  const status = h("p", { class: "faint center mt-0" }, Recognition
    ? tr("Bấm micro rồi nói, mình nghe tiếng Việt.")
    : tr("Trình duyệt này chưa nghe được giọng nói, bạn gõ câu vào ô dưới nhé."));
  const examples = h("div", { class: "chips" }, VOICE_EXAMPLES.map((ex) => {
    const chip = h("button", { class: "chip", type: "button" }, `"${ex}"`);
    chip.addEventListener("click", () => {
      text.input.value = ex;
      parse();
    });
    return chip;
  }));
  const read = h("button", { class: "btn soft block", type: "button" }, icon("sparkles", 18), tr("Đọc khoản"));
  const results = h("div", { class: "stack" });

  let recognition = null;
  let listening = false;
  const sheet = openSheet({
    title: tr("Nói để ghi"),
    onClose: () => recognition && recognition.abort()
  });
  sheet.setContent(h("div", { class: "stack" },
    Recognition ? h("div", { class: "center" }, mic) : null,
    status, text.el, examples, read, results));

  mic.addEventListener("click", () => (listening ? recognition.stop() : listen()));
  read.addEventListener("click", parse);

  function listen() {
    recognition = new Recognition();
    recognition.lang = "vi-VN";
    recognition.interimResults = true;
    recognition.continuous = false;
    const before = text.input.value.trim();
    let heard = false;
    recognition.onresult = (e) => {
      let said = "";
      for (let i = 0; i < e.results.length; i++) said += e.results[i][0].transcript;
      heard = Boolean(said.trim());
      text.input.value = before ? `${before}, ${said}` : said;
    };
    recognition.onerror = (e) => {
      const messages = {
        "not-allowed": tr("Bạn chưa cho phép dùng micro. Bật quyền micro cho trang này hoặc gõ câu vào ô dưới nhé."),
        "no-speech": tr("Mình chưa nghe thấy gì, bấm micro và nói lại nhé."),
        network: tr("Nhận giọng nói cần có mạng. Bạn gõ câu vào ô dưới cũng được.")
      };
      status.textContent = messages[e.error] || tr("Micro gặp trục trặc, bạn gõ câu vào ô dưới nhé.");
    };
    recognition.onend = () => {
      listening = false;
      mic.classList.remove("listening");
      mic.setAttribute("aria-label", tr("Bấm để nói"));
      if (heard) parse();
    };
    try {
      recognition.start();
    } catch {
      return;
    }
    listening = true;
    mic.classList.add("listening");
    mic.setAttribute("aria-label", tr("Bấm để dừng"));
    status.textContent = tr("Đang nghe... nói xong mình tự đọc luôn.");
    haptic(15);
  }

  async function parse() {
    const said = text.input.value.trim();
    if (!said) {
      text.setHint(tr("Nói hoặc gõ một câu trước đã nhé."), "error");
      return;
    }
    text.setHint("");
    const restore = busy(read);
    try {
      const data = await api("/scan/voice", { method: "POST", body: { text: said, today: today(), now: nowTime() } });
      showItems(data);
    } catch (error) {
      text.setHint(error.message, "error");
    } finally {
      restore();
    }
  }

  function showItems(data) {
    const items = (data.items || []).map((it) => Object.assign(makeDraft(cats, it, "voice"), { guessed: Boolean(it.amount_guessed) }));
    if (!items.length) {
      results.replaceChildren(h("div", { class: "empty" }, icon("ear"),
        tr`Mình chưa thấy số tiền nào trong "${data.unparsed || data.text}". Thử nói kiểu "ăn sáng 25k" nhé.`));
      return;
    }
    const button = confirmButton(items, async () => {
      if (await confirmItems(ctx, cats, items.filter((i) => i.checked))) sheet.close("done");
    });
    results.replaceChildren(
      h("p", { class: "faint mt-0" }, items.length > 1 ? tr`Mình tách được ${items.length} khoản, sửa lại nếu sai nhé:` : tr("Mình hiểu thế này, sửa lại nếu sai nhé:")),
      reviewList(items, cats, () => button.update()),
      button);
    haptic(10);
  }
}

/* ---------------------------------------------------------------------------
   Dán tin nhắn ngân hàng
   ------------------------------------------------------------------------ */
function openSms(ctx, cats) {
  const text = field({ label: tr("Tin nhắn / thông báo ngân hàng"), name: "sms", type: "textarea", maxlength: 2000 });
  const canPaste = Boolean(navigator.clipboard && navigator.clipboard.readText);
  const paste = h("button", { class: "btn soft", type: "button" }, icon("clipboard-paste", 18), tr("Dán từ bộ nhớ"));
  const read = h("button", { class: "btn", type: "button" }, icon("sparkles", 18), tr("Đọc tin nhắn"));
  const results = h("div", { class: "stack" });
  const sheet = openSheet({ title: tr("Dán SMS ngân hàng") });
  sheet.setContent(h("div", { class: "stack" },
    h("p", { class: "muted mt-0" }, tr("Dán tin nhắn biến động số dư hoặc thông báo app ngân hàng. Mình tự tách thu/chi và bỏ qua số dư.")),
    text.el,
    h("div", { class: "row" }, canPaste ? paste : null, h("span", { class: "grow" }), read),
    results));

  paste.addEventListener("click", async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (!clip.trim()) {
        toast(tr("Bộ nhớ tạm đang trống."), "info");
        return;
      }
      text.input.value = clip.slice(0, 2000);
      parse();
    } catch {
      toast(tr("Trình duyệt không cho đọc bộ nhớ tạm, bạn nhấn giữ ô trên rồi chọn Dán nhé."), "info", 4500);
    }
  });
  read.addEventListener("click", parse);

  async function parse() {
    const sms = text.input.value.trim();
    if (!sms) {
      text.setHint(tr("Dán tin nhắn vào đây trước đã nhé."), "error");
      return;
    }
    text.setHint("");
    const restore = busy(read);
    try {
      const r = await api("/scan/text", { method: "POST", body: { text: sms, today: today(), now: nowTime() } });
      show(r);
    } catch (error) {
      text.setHint(error.message, "error");
    } finally {
      restore();
    }
  }

  function show(r) {
    const suggested = r.suggested_items || [];
    let items;
    let intro;
    if (r.amount && (r.doc_kind !== "unknown" || !suggested.length)) {
      const item = makeDraft(cats, r, "sms");
      item.scan_id = r.scan_id;
      item.checked = !(r.duplicates || []).length;
      items = [item];
      intro = h("div", { class: "row" }, h("span", { class: "badge" }, icon("landmark", 13), DOC_KINDS[r.doc_kind] || DOC_KINDS.unknown));
    } else if (suggested.length) {
      items = suggested.map((it) => Object.assign(makeDraft(cats, it, "sms"), { guessed: Boolean(it.amount_guessed) }));
      intro = h("p", { class: "faint mt-0" }, tr`Cái này giống câu ghi chú hơn tin nhắn ngân hàng, mình tách được ${items.length} khoản:`);
    } else {
      const manual = h("button", { class: "btn small soft", type: "button" }, icon("pencil", 16), tr("Tự nhập"));
      manual.addEventListener("click", () => {
        sheet.close("manual");
        openManual(ctx, cats, { preset: { note: "" } });
      });
      results.replaceChildren(h("div", { class: "empty" }, icon("search-x"), tr("Chưa thấy số tiền trong tin nhắn này."), manual));
      return;
    }
    const button = confirmButton(items, async () => {
      if (await confirmItems(ctx, cats, items.filter((i) => i.checked))) sheet.close("done");
    });
    results.replaceChildren(intro, items[0].scan_id ? scanWarnings(r) : null, reviewList(items, cats, () => button.update()), button);
  }
}

/* ---------------------------------------------------------------------------
   Tự nhập / sửa khoản đã ghi
   ------------------------------------------------------------------------ */
const QUICK_AMOUNTS = [10000, 20000, 30000, 50000, 100000, 200000, 500000];

function categoryGrid(cats, item) {
  const grid = h("div", { class: "cat-grid", role: "radiogroup", "aria-label": tr("Danh mục") });
  const fill = () => {
    grid.replaceChildren(...pickable(cats, item.type, item.category_id).map((c) => {
      const btn = h("button", { type: "button", class: "cat-btn", role: "radio", "aria-checked": String(c.id === item.category_id) },
        categoryBadge(c, 40), h("span", null, c.name));
      btn.addEventListener("click", () => {
        item.category_id = c.id;
        haptic(8);
        fill();
      });
      return btn;
    }));
  };
  fill();
  return Object.assign(grid, { fill });
}

function openManual(ctx, cats, { tx, preset } = {}) {
  const editing = Boolean(tx);
  const base = tx || preset || {};
  const item = makeDraft(cats, {
    ...base,
    transaction_time: base.transaction_time || (editing ? "" : nowTime())
  }, "manual");
  item.scan_id = null;

  const amount = h("input", {
    class: "amount-input", inputmode: "decimal", autocomplete: "off", placeholder: "0", "aria-label": tr("Số tiền"),
    value: item.amount ? numberFormat.format(item.amount) : ""
  });
  const preview = h("p", { class: "amount-preview" });
  const showPreview = () => {
    const raw = amount.value.trim();
    preview.classList.toggle("error", Boolean(raw) && !item.amount);
    preview.textContent = !raw ? tr("Gõ 35k, 1tr2 hay 150.000 đều được") : item.amount ? `= ${money(item.amount)}` : tr("Số tiền chưa đúng");
  };
  amount.addEventListener("input", () => {
    item.amount = parseMoneyInput(amount.value);
    showPreview();
  });
  showPreview();

  const quick = h("div", { class: "chips scroll" }, QUICK_AMOUNTS.map((v) => {
    const chip = h("button", { class: "chip", type: "button" }, moneyShort(v));
    chip.addEventListener("click", () => {
      item.amount = v;
      amount.value = numberFormat.format(v);
      haptic(8);
      showPreview();
    });
    return chip;
  }));

  const grid = categoryGrid(cats, item);
  const type = typeSwitch(item.type, (value) => {
    item.type = value;
    const cat = catById(cats, item.category_id);
    if (!cat || cat.type !== value) item.category_id = (fallbackCategory(cats, value) || {}).id || null;
    grid.fill();
  });

  const note = field({ label: tr("Ghi chú (không bắt buộc)"), name: "note", value: item.note, maxlength: 500 });
  const date = field({ label: tr("Ngày"), name: "date", type: "date", value: item.transaction_date });
  const time = field({ label: tr("Giờ"), name: "time", type: "time", value: item.transaction_time });
  const save = h("button", { class: "btn block", type: "submit" }, icon("check", 18), editing ? tr("Lưu thay đổi") : tr("Lưu khoản"));
  const remove = editing ? h("button", { class: "btn ghost block danger-text", type: "button" }, icon("trash-2", 18), tr("Xóa khoản này")) : null;

  const form = h("form", { class: "stack", novalidate: true },
    type,
    h("div", { class: "amount-box" }, amount, h("span", { class: "amount-unit" }, "đ")),
    preview,
    quick,
    h("p", { class: "faint mt-0" }, tr("Danh mục")),
    grid,
    note.el,
    h("div", { class: "two-col" }, date.el, time.el),
    editing && ["split", "reconcile"].includes(tx.source)
      ? h("p", { class: "form-error warn" }, tr("Khoản này được tạo tự động (chia tiền / đối chiếu ví). Sửa ở đây không đổi sổ nợ hay số dư ví."))
      : null,
    save,
    remove);

  const sheet = openSheet({ title: editing ? tr("Sửa khoản") : preset && preset.amount ? tr("Sửa trước khi ghi") : tr("Tự nhập"), content: form });
  if (!editing) requestAnimationFrame(() => amount.focus());

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    item.note = note.input.value;
    item.transaction_date = date.input.value;
    item.transaction_time = time.input.value;
    const problem = validateItem(item);
    if (problem) {
      toast(problem, "error");
      if (!item.amount) amount.focus();
      return;
    }
    const restore = busy(save);
    try {
      if (editing) {
        await api(`/transactions/${tx.id}`, { method: "PUT", body: toPayload(item) });
        haptic(15);
        toast(tr("Đã lưu thay đổi."), "ok");
        ctx.refresh();
      } else {
        const created = await api("/transactions", { method: "POST", body: toPayload(item) });
        celebrate(ctx, [created], tr`Đã ghi ${signedMoney(item)} cho ${itemTitle(item, cats)}` + otherMonthHint([item]));
      }
      sheet.close("saved");
    } catch (error) {
      toast(error.message, "error");
      restore();
    }
  });

  if (remove) {
    remove.addEventListener("click", async () => {
      const original = makeDraft(cats, tx, "manual");
      const ok = await confirmSheet({
        title: tr("Xóa khoản này?"),
        message: `${signedMoney(original)} · ${itemTitle(original, cats)} · ${dateLabel(original.transaction_date, today())}`,
        okText: tr("Xóa"),
        danger: true
      });
      if (!ok) return;
      try {
        await api(`/transactions/${tx.id}`, { method: "DELETE" });
        sheet.close("deleted");
        haptic(20);
        toast(tr("Đã xóa khoản."), "ok", 6000, {
          label: tr("Hoàn tác"),
          onClick: async () => {
            try {
              await api("/transactions", { method: "POST", body: toPayload(original) });
              toast(tr("Đã khôi phục."), "ok");
              ctx.refresh();
            } catch (error) {
              toast(error.message, "error");
            }
          }
        });
        ctx.refresh();
      } catch (error) {
        toast(error.message, "error");
      }
    });
  }
}

/* ---------------------------------------------------------------------------
   Một chạm theo thói quen
   ------------------------------------------------------------------------ */
function openQuick(ctx, cats, suggestion) {
  const item = makeDraft(cats, { ...suggestion, transaction_date: today(), transaction_time: nowTime() }, "quick");
  const sheet = openSheet({ title: tr("Ghi một chạm") });
  const slide = slideToConfirm({
    label: tr("Trượt để ghi"),
    onConfirm: async () => {
      try {
        const created = await api("/transactions", { method: "POST", body: toPayload(item) });
        celebrate(ctx, [created], tr`Đã ghi ${signedMoney(item)} cho ${itemTitle(item, cats)}` + otherMonthHint([item]));
        sheet.close("saved");
      } catch (error) {
        toast(error.message, "error");
        throw error;
      }
    }
  });
  const edit = h("button", { class: "btn ghost block", type: "button" }, icon("pencil", 18), tr("Sửa trước khi ghi"));
  edit.addEventListener("click", () => {
    sheet.close("edit");
    openManual(ctx, cats, { preset: item });
  });
  sheet.setContent(h("div", { class: "stack" },
    h("div", { class: "sum-list" }, summaryRow(item, cats)),
    suggestion.usual_time ? h("p", { class: "faint mt-0" }, tr`Bạn hay ghi khoản này vào khoảng ${suggestion.usual_time}.`) : null,
    h("p", { class: "confirm-question" }, questionFor(item, cats)),
    slide,
    edit));
}

/* ---------------------------------------------------------------------------
   Cửa vào
   ------------------------------------------------------------------------ */
/**
 * @param {object} ctx - ngữ cảnh ứng dụng (refresh, go...)
 * @param {"menu"|"voice"|"scan"|"sms"|"manual"|"quick"|"edit"} mode
 * @param {object} [preset] - gợi ý thói quen (quick) hoặc giao dịch cần sửa (edit)
 */
export async function openAdd(ctx, mode = "menu", preset) {
  if (mode === "menu") {
    openMenu(ctx);
    return;
  }
  let cats;
  try {
    cats = await loadCategories();
  } catch (error) {
    toast(error.message, "error");
    return;
  }
  if (mode === "voice") openVoice(ctx, cats);
  else if (mode === "scan") openScan(ctx, cats);
  else if (mode === "sms") openSms(ctx, cats);
  else if (mode === "quick" && preset) openQuick(ctx, cats, preset);
  else if (mode === "edit" && preset) openManual(ctx, cats, { tx: preset });
  else openManual(ctx, cats, { preset });
}
