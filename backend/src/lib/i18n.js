/**
 * @file i18n.js
 * @description Trả lời API bằng tiếng Anh khi app gửi kèm header "X-Lang: en".
 * Các route vẫn viết câu tiếng Việt như cũ; middleware này bọc res.json, duyệt cả object trả về
 * và thay câu tiếng Việt bằng bản dịch trong lang/en.js:
 *   - khớp nguyên câu: "Đã ẩn danh mục." -> "Category hidden."
 *   - khớp theo mẫu có {0}, {1}...: "Cắt giảm Trà sữa" khớp "Cắt giảm {0}" -> "Cut down on Bubble tea"
 *     (phần {0} cũng được dịch tiếp nếu có trong bảng).
 * Chữ người dùng tự gõ (ghi chú, tên người, tên danh mục tự tạo...) giữ nguyên.
 */

const en = require("../lang/en");

const VI_CHAR = /[À-ỹđĐ]/u;

// Trường chứa chữ người dùng tự gõ: không dịch
const USER_TEXT_KEYS = new Set([
  "person_name", "payer_name", "people", "username", "display_name",
  "raw_text", "keyword", "answer", "other_feature", "suggestion"
]);

// Ghi chú do hệ thống tự tạo (đối soát ví, chia tiền) thì dịch, ghi chú người dùng thì không
const SYSTEM_NOTES = new Set(["Chi không nhớ (đối soát ví)", "Tiền dư chưa ghi (đối soát ví)"]);
const SYSTEM_NOTE_TEMPLATES = ["{0} (phần của mình, chia {1} người)"];

const exact = new Map();
const templates = [];

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compile(key, value) {
  const order = [];
  const pattern = key
    .split(/(\{\d+\})/)
    .map((part) => {
      const m = part.match(/^\{(\d+)\}$/);
      if (!m) return escapeRegex(part);
      order.push(Number(m[1]));
      return "(.+?)";
    })
    .join("");
  return { key, regex: new RegExp(`^${pattern}$`, "su"), order, value, literal: key.replace(/\{\d+\}/g, "").length };
}

for (const [key, value] of Object.entries(en)) {
  if (/\{\d+\}/.test(key)) templates.push(compile(key, value));
  else exact.set(key, value);
}
// Mẫu nhiều chữ cố định thử trước, tránh mẫu ngắn như "{0} ngày qua" nuốt mất câu dài hơn
templates.sort((a, b) => b.literal - a.literal);
const noteTemplates = templates.filter((t) => SYSTEM_NOTE_TEMPLATES.includes(t.key));

function fill(tpl, match, translatePart) {
  const values = [];
  tpl.order.forEach((index, i) => {
    values[index] = translatePart(match[i + 1]);
  });
  return tpl.value.replace(/\{(\d+)\}/g, (_, i) => values[Number(i)] ?? "");
}

// Kết quả dịch được nhớ lại, câu lặp lại nhiều (tên danh mục, nhãn) không phải dò mẫu lần nữa
const cache = new Map();
const CACHE_LIMIT = 5000;

function translateText(text, depth = 0) {
  if (!VI_CHAR.test(text)) return text;
  const hit = exact.get(text);
  if (hit !== undefined) return hit;
  if (depth > 3) return text;
  if (depth === 0 && cache.has(text)) return cache.get(text);

  let result = text;
  for (const tpl of templates) {
    const match = tpl.regex.exec(text);
    if (match) {
      result = fill(tpl, match, (part) => translateText(part, depth + 1));
      break;
    }
  }
  if (depth === 0) {
    if (cache.size >= CACHE_LIMIT) cache.clear();
    cache.set(text, result);
  }
  return result;
}

function translateNote(text) {
  if (SYSTEM_NOTES.has(text)) return exact.get(text) || text;
  for (const tpl of noteTemplates) {
    const match = tpl.regex.exec(text);
    // Phần {0} là tên lần chia người dùng tự đặt nên giữ nguyên
    if (match) return fill(tpl, match, (part) => part);
  }
  return text;
}

/** Duyệt toàn bộ dữ liệu trả về, dịch các chuỗi tiếng Việt. */
function translate(value, key) {
  if (typeof value === "string") {
    if (key && USER_TEXT_KEYS.has(key)) return value;
    if (key === "note") return translateNote(value);
    return translateText(value);
  }
  if (Array.isArray(value)) return value.map((item) => translate(item, key));
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    // Danh mục người dùng tự tạo giữ nguyên tên; lần chia tiền giữ nguyên tiêu đề người dùng đặt;
    // "text" chỉ là câu hệ thống khi đi kèm icon / diff (tổng kết tuần), còn lại là câu người dùng gõ / đọc ảnh
    const keepName = value.is_default === false;
    const keepTitle = "people" in value || "people_json" in value || "payer_name" in value;
    const keepText = !("icon" in value || "diff" in value);
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if ((k === "name" && keepName) || (k === "title" && keepTitle) || (k === "text" && keepText)) out[k] = v;
      else out[k] = translate(v, k);
    }
    return out;
  }
  return value;
}

/** Đọc ngôn ngữ từ header X-Lang (mặc định tiếng Việt). Tiếng Anh thì bọc res.json để dịch. */
function langMiddleware(req, res, next) {
  const header = String(req.get("X-Lang") || "").toLowerCase();
  req.lang = header.startsWith("en") ? "en" : "vi";
  if (req.lang === "en") {
    const json = res.json.bind(res);
    res.json = (body) => json(translate(body));
  }
  next();
}

module.exports = { langMiddleware, translate, translateText };
