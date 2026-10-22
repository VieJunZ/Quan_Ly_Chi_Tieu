/**
 * @file validate.js
 * @description Kiểm tra dữ liệu đầu vào dùng chung cho các route.
 */

const { HttpError } = require("./http");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_AMOUNT = 999999999999; // DECIMAL(15,2) chứa được tối đa 13 chữ số phần nguyên

/** Ngày dạng YYYY-MM-DD và có thật trên lịch (chặn 2026-02-31). */
function isValidDate(value) {
  if (!DATE_RE.test(String(value || ""))) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function isValidTime(value) {
  return TIME_RE.test(String(value || ""));
}

/** Ngày hôm nay theo giờ máy chủ, dạng YYYY-MM-DD. */
function todayLocal(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function nowTimeLocal(now = new Date()) {
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/** Lấy ngày từ client (giờ điện thoại người dùng), không hợp lệ thì dùng giờ máy chủ. */
function clientDate(value) {
  return isValidDate(value) ? value : todayLocal();
}

function clientTime(value) {
  return isValidTime(value) ? value : nowTimeLocal();
}

function requireDate(value, field = "transaction_date") {
  const clean = String(value || "").slice(0, 10);
  if (!isValidDate(clean)) {
    throw new HttpError(400, "INVALID_DATE", "Ngày không đúng định dạng YYYY-MM-DD.", { field });
  }
  return clean;
}

function optionalTime(value) {
  if (value === undefined || value === null || value === "") return null;
  const clean = String(value).slice(0, 5);
  if (!isValidTime(clean)) throw new HttpError(400, "INVALID_TIME", "Giờ không đúng định dạng HH:mm.");
  return clean;
}

function requireAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpError(400, "INVALID_AMOUNT", "Số tiền phải lớn hơn 0.");
  }
  if (amount > MAX_AMOUNT) throw new HttpError(400, "INVALID_AMOUNT", "Số tiền quá lớn.");
  return Math.round(amount * 100) / 100;
}

function requireId(value, code = "INVALID_ID", message = "Mã không hợp lệ.") {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) throw new HttpError(400, code, message);
  return id;
}

function optionalId(value) {
  if (value === undefined || value === null || value === "") return null;
  return requireId(value);
}

/** Cắt chuỗi về độ dài tối đa của cột, bỏ khoảng trắng thừa và ký tự điều khiển. */
function cleanText(value, maxLength) {
  const text = String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  return text.slice(0, maxLength);
}

/** Khoảng ngày của tháng YYYY-MM. */
function monthRange(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month || ""))) return null;
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

module.exports = {
  isValidDate,
  isValidTime,
  todayLocal,
  nowTimeLocal,
  clientDate,
  clientTime,
  requireDate,
  optionalTime,
  requireAmount,
  requireId,
  optionalId,
  cleanText,
  monthRange,
  MAX_AMOUNT
};
