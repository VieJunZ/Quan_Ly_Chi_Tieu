/**
 * @file rateLimit.middleware.js
 * @description Middleware giới hạn tần suất yêu cầu (Rate Limiting) để chống tấn công Brute-force và DoS.
 * Giúp bảo vệ các endpoint nhạy cảm như Đăng nhập (/api/auth/login) và Đăng ký (/api/auth/register).
 */

const ipRequests = new Map();

/**
 * Tạo middleware Rate Limiter dựa trên địa chỉ IP.
 * @param {object} options
 * @param {number} options.windowMs - Khoảng thời gian tính toán (milliseconds), mặc định 1 phút
 * @param {number} options.max - Số lượng request tối đa trong khoảng thời gian, mặc định 30
 * @param {string} [options.message] - Thông báo khi bị chặn
 */
function createRateLimiter({ windowMs = 60 * 1000, max = 30, message = "Quá nhiều yêu cầu từ IP của bạn. Vui lòng thử lại sau ít phút." } = {}) {
  // Dọn dẹp các IP đã hết hạn định kỳ mỗi 5 phút để tránh rò rỉ bộ nhớ (Memory Leak)
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipRequests.entries()) {
      if (now > record.resetTime) {
        ipRequests.delete(ip);
      }
    }
  }, 5 * 60 * 1000).unref();

  return function rateLimiter(req, res, next) {
    // Không áp dụng rate limit khi chạy test tự động
    if (process.env.NODE_ENV === "test") {
      return next();
    }

    const ip = req.ip || req.connection.remoteAddress || "unknown_ip";
    const now = Date.now();

    let record = ipRequests.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      ipRequests.set(ip, record);
      return next();
    }

    record.count++;
    if (record.count > max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({
        success: false,
        message,
        error_code: "RATE_LIMIT_EXCEEDED",
        retry_after_seconds: retryAfter
      });
    }

    next();
  };
}

module.exports = {
  createRateLimiter
};
