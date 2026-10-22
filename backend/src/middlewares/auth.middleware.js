/**
 * @file auth.middleware.js
 * @description Xác thực bằng JWT + phiên lưu trong CSDL.
 * Token chỉ chứa mã phiên (sid); mỗi request đều kiểm tra phiên còn hiệu lực,
 * nên "đăng xuất thiết bị khác" hay đổi mật khẩu có tác dụng ngay lập tức.
 */

const jwt = require("jsonwebtoken");
const authService = require("../services/auth.service");

const TOUCH_AFTER_SECONDS = 300;

function readToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : null;
}

function reject(res, status, code, message) {
  return res.status(status).json({ success: false, message, error_code: code });
}

async function resolveUser(token) {
  let payload;
  try {
    payload = jwt.verify(token, authService.jwtSecret());
  } catch {
    return { error: ["TOKEN_INVALID", "Phiên đăng nhập đã hết hạn hoặc không hợp lệ."] };
  }
  if (!payload || typeof payload.sid !== "string" || !Number.isInteger(payload.uid)) {
    return { error: ["TOKEN_INVALID", "Phiên đăng nhập không hợp lệ."] };
  }

  const session = await authService.findActiveSession(payload.sid, payload.uid);
  if (!session) {
    return { error: ["SESSION_REVOKED", "Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại."] };
  }

  // Cập nhật "lần cuối hoạt động" tối đa 5 phút một lần để đỡ ghi CSDL
  if (session.idle_seconds > TOUCH_AFTER_SECONDS) {
    authService.touchSession(payload.sid).catch(() => {});
  }

  return {
    user: {
      id: session.user_id,
      username: session.username,
      is_demo: Boolean(session.is_demo),
      demo_expires_at: session.demo_expires_at,
      sid: payload.sid
    }
  };
}

/** Bắt buộc đăng nhập (kể cả tài khoản dùng thử). */
async function authenticateToken(req, res, next) {
  try {
    const token = readToken(req);
    if (!token) return reject(res, 401, "UNAUTHORIZED", "Vui lòng đăng nhập để thực hiện thao tác này.");
    const { user, error } = await resolveUser(token);
    if (error) return reject(res, 401, error[0], error[1]);
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/** Không bắt buộc đăng nhập: có token hợp lệ thì gắn req.user. */
async function optionalAuth(req, res, next) {
  try {
    const token = readToken(req);
    if (token) {
      const { user } = await resolveUser(token);
      if (user) req.user = user;
    }
    next();
  } catch (error) {
    next(error);
  }
}

/** Chặn tài khoản dùng thử với các thao tác chỉ dành cho tài khoản thật. */
function requireRealAccount(req, res, next) {
  if (req.user && req.user.is_demo) {
    return reject(res, 403, "DEMO_NOT_ALLOWED", "Chức năng này cần tài khoản thật. Hãy lưu tài khoản dùng thử trước.");
  }
  next();
}

module.exports = { authenticateToken, optionalAuth, requireRealAccount };
