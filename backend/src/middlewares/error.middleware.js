// backend/src/middlewares/error.middleware.js

function errorHandler(err, req, res, next) {
  console.error(" [Error]", err.stack || err.message || err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || "Đã xảy ra lỗi trên máy chủ.";
  const errorCode = err.error_code || err.code || "INTERNAL_SERVER_ERROR";

  res.status(statusCode).json({
    success: false,
    message,
    error_code: errorCode
  });
}

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
