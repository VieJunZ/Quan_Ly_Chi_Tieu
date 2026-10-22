/**
 * @file http.js
 * @description Lỗi nghiệp vụ có mã HTTP và hàm bọc route async để lỗi luôn tới errorHandler.
 */

class HttpError extends Error {
  /**
   * @param {number} status - Mã HTTP trả về
   * @param {string} errorCode - Mã lỗi để frontend xử lý (VD: INVALID_AMOUNT)
   * @param {string} message - Thông báo tiếng Việt hiển thị cho người dùng
   * @param {object} [extra] - Dữ liệu kèm theo (VD: số giây còn bị khóa)
   */
  constructor(status, errorCode, message, extra) {
    super(message);
    this.status = status;
    this.error_code = errorCode;
    this.extra = extra;
  }
}

/** Bọc route async: lỗi ném ra được chuyển tới middleware xử lý lỗi. */
function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

/**
 * Mã lỗi THROW trong stored procedure -> mã HTTP và mã lỗi cho frontend.
 * Thông báo lấy nguyên văn tiếng Việt từ CSDL.
 */
const SQL_ERRORS = {
  50001: [404, "USER_NOT_FOUND"],
  50002: [400, "INVALID_AMOUNT"],
  50003: [400, "INVALID_CATEGORY"],
  50004: [400, "INVALID_DATE"],
  50005: [400, "INVALID_TYPE"],
  50006: [400, "INVALID_CATEGORY_NAME"],
  50007: [409, "CATEGORY_EXISTS"],
  50008: [400, "INVALID_DATE_RANGE"],
  50020: [409, "SCAN_ALREADY_USED"],
  50021: [404, "TRANSACTION_NOT_FOUND"],
  50030: [400, "INVALID_PEOPLE"],
  50031: [400, "INVALID_PEOPLE"],
  50032: [400, "INVALID_PAYER"],
  50033: [404, "SPLIT_NOT_FOUND"],
  50040: [400, "INVALID_BALANCE"],
  50050: [400, "DEFAULT_CATEGORY_LOCKED"],
  50051: [400, "LAST_VISIBLE_CATEGORY"],
  50052: [400, "INVALID_CATEGORY_ORDER"]
};

/** Chuyển lỗi SQL Server thành HttpError (nếu nhận ra), ngược lại trả null. */
function fromSqlError(error) {
  const number = error && error.number;
  if (!number) return null;
  const message = String(error.message || "").replace(/^(\[[^\]]+\])+/, "").trim();

  if (SQL_ERRORS[number]) {
    const [status, code] = SQL_ERRORS[number];
    return new HttpError(status, code, message);
  }
  if (number === 547) return new HttpError(400, "CONSTRAINT_VIOLATION", "Dữ liệu không hợp lệ.");
  if (number === 2627 || number === 2601) return new HttpError(409, "DUPLICATE", "Dữ liệu đã tồn tại.");
  return null;
}

module.exports = { HttpError, asyncRoute, fromSqlError };
