/**
 * @file error.middleware.js
 * @description Xử lý lỗi tập trung và 404. Mọi lỗi trả về cùng một dạng JSON:
 * { success: false, message, error_code, ...extra }
 */

const { fromSqlError } = require("../lib/http");

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  // JSON gửi lên bị lỗi cú pháp hoặc quá lớn
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Dữ liệu gửi lên không phải JSON hợp lệ.", error_code: "INVALID_JSON" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Dữ liệu gửi lên quá lớn.", error_code: "PAYLOAD_TOO_LARGE" });
  }
  // Lỗi tải file của multer (ảnh quá lớn, sai trường...)
  if (err.name === "MulterError") {
    const tooLarge = err.code === "LIMIT_FILE_SIZE";
    return res.status(tooLarge ? 413 : 400).json({
      success: false,
      message: tooLarge ? "Ảnh quá lớn (tối đa 8 MB)." : "Tải ảnh không thành công.",
      error_code: tooLarge ? "FILE_TOO_LARGE" : "UPLOAD_ERROR"
    });
  }

  const known = err.error_code ? err : fromSqlError(err);
  if (known) {
    return res.status(known.status).json({
      success: false,
      message: known.message,
      error_code: known.error_code,
      ...(known.extra || {})
    });
  }

  // Lỗi không lường trước: ghi log đầy đủ ở máy chủ, chỉ trả thông báo chung cho client
  console.error("[Lỗi máy chủ]", err.stack || err.message || err);
  res.status(500).json({
    success: false,
    message: "Đã xảy ra lỗi trên máy chủ. Vui lòng thử lại.",
    error_code: "INTERNAL_SERVER_ERROR"
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy endpoint: ${req.method} ${req.originalUrl}`,
    error_code: "NOT_FOUND"
  });
}

module.exports = { errorHandler, notFoundHandler };
