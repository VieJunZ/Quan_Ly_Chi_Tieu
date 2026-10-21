/**
 * @file rateLimit.middleware.js
 * @description Giới hạn số request theo IP trong một khoảng thời gian (chống dò mật khẩu, spam).
 * Mỗi limiter có bộ đếm riêng, nên giới hạn đăng nhập không ảnh hưởng giới hạn quét bill.
 */

function createRateLimiter({
  windowMs = 60 * 1000,
  max = 30,
  message = "Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút."
} = {}) {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits) {
      if (now > record.resetTime) hits.delete(key);
    }
  }, 5 * 60 * 1000).unref();

  return function rateLimiter(req, res, next) {
    if (process.env.NODE_ENV === "test") return next();

    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    let record = hits.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
      hits.set(key, record);
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

module.exports = { createRateLimiter };
