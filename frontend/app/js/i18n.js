/**
 * @file i18n.js
 * @description Đổi ngôn ngữ giao diện (Tiếng Việt / English).
 * Câu gốc trong code là tiếng Việt và cũng là khóa tra từ điển:
 *   tr("Đã lưu.")                 -> câu thường
 *   tr`Còn ${n} ngày`             -> câu có chỗ chèn, khóa là "Còn {0} ngày"
 * Chọn tiếng Anh thì tải thêm lang/en.js trước khi app chạy; câu nào chưa dịch thì giữ tiếng Việt.
 */

import { getPref, setPref } from "./prefs.js";

export const lang = getPref("lang");
document.documentElement.lang = lang;

const dict = lang === "en" ? (await import("./lang/en.js")).default : null;

function fill(text, values) {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(values[Number(i)] ?? ""));
}

export function tr(textOrParts, ...values) {
  if (typeof textOrParts === "string") return (dict && dict[textOrParts]) || textOrParts;
  // Gọi kiểu tr`...`: ghép khóa có {0}, {1}... rồi chèn giá trị vào câu đã dịch
  const parts = textOrParts;
  const key = parts.map((s, i) => (i ? `{${i - 1}}` : "") + s).join("");
  if (dict && dict[key]) return fill(dict[key], values);
  return parts.reduce((out, s, i) => out + (i ? String(values[i - 1] ?? "") : "") + s, "");
}

/** Đổi ngôn ngữ: lưu lựa chọn, xóa số liệu đệm (tên danh mục đổi theo ngôn ngữ) rồi tải lại app. */
export function setLang(value) {
  if (value === lang) return;
  setPref("lang", value);
  try {
    localStorage.removeItem("thuchi.cache");
  } catch {
    // Bỏ qua
  }
  location.reload();
}
