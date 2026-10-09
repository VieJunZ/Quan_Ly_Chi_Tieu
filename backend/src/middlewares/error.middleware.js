/**
 * @file error.middleware.js
 * @description Middleware tập trung xử lý lỗi (Centralized Error Handling) và định tuyến 404 Not Found.
 * Đảm bảo mọi phản hồi lỗi trả về cho Frontend luôn đồng nhất theo định dạng JSON.
 */

/**
 * Middleware bắt lỗi toàn cục cho ứng dụng Express.
 * Khi bất kỳ route nào gọi next(error), hàm này sẽ được kích hoạt.
 *
 * @param {Error} err - Đối tượng lỗi phát sinh
 * @param {import('express').Request} req - Express Request object
 * @param {import('express').Response} res - Express Response object
 * @param {import('express').NextFunction} next - Express Next function
 */
function errorHandler(err, req, res, next) {
  // Ghi log lỗi ra console để lập trình viên Backend theo dõi dấu vết (Stack trace)
  console.error(" [Lỗi Máy Chủ]", err.stack || err.message || err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || "Đã xảy ra lỗi nội bộ trên máy chủ.";
  const errorCode = err.error_code || err.code || "INTERNAL_SERVER_ERROR";

  // Định dạng JSON trả về chuẩn cho client
  res.status(statusCode).json({
    success: false,
    message,
    error_code: errorCode
  });
}

/**
 * Middleware bắt các yêu cầu gửi đến đường dẫn không tồn tại (404 Not Found).
 *
 * @param {import('express').Request} req - Express Request object
 * @param {import('express').Response} res - Express Response object
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy endpoint: ${req.method} ${req.originalUrl}`,
    error_code: "NOT_FOUND"
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
