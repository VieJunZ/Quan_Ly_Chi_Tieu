/**
 * @file auth.routes.js
 * @description Tài khoản và phiên đăng nhập.
 *
 *   POST   /api/auth/register          Đăng ký (có nhập lại mật khẩu), trả mã khôi phục 1 lần duy nhất
 *   POST   /api/auth/login             Đăng nhập, sai 5 lần khóa 5 phút
 *   POST   /api/auth/recover           Quên mật khẩu: đặt lại bằng mã khôi phục
 *   POST   /api/auth/demo              Dùng thử không cần đăng ký (24 giờ, có dữ liệu mẫu)
 *   POST   /api/auth/upgrade-demo      Lưu tài khoản dùng thử thành tài khoản thật, giữ dữ liệu
 *   GET    /api/auth/me                Thông tin tài khoản hiện tại
 *   PUT    /api/auth/profile           Đổi tên hiển thị {display_name} (để trống = bỏ tên, app gọi theo tên đăng nhập)
 *   POST   /api/auth/logout            Đăng xuất thiết bị này
 *   GET    /api/auth/sessions          Danh sách thiết bị đang đăng nhập
 *   DELETE /api/auth/sessions/:id      Đăng xuất một thiết bị
 *   POST   /api/auth/sessions/revoke-others  Đăng xuất mọi thiết bị khác
 *   POST   /api/auth/change-password   Đổi mật khẩu (các thiết bị khác bị đăng xuất)
 *   POST   /api/auth/recovery-code     Tạo mã khôi phục mới (mã cũ hết hiệu lực)
 */

const express = require("express");
const bcrypt = require("../services/hash.service");
const db = require("../config/db");
const auth = require("../services/auth.service");
const demo = require("../services/demo.service");
const { HttpError, asyncRoute } = require("../lib/http");
const { cleanText } = require("../lib/validate");
const { authenticateToken, requireRealAccount } = require("../middlewares/auth.middleware");
const { createRateLimiter } = require("../middlewares/rateLimit.middleware");

const router = express.Router();

const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: "Bạn thao tác đăng nhập/đăng ký quá nhanh. Vui lòng thử lại sau 1 phút."
});
const demoLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Đã tạo quá nhiều tài khoản dùng thử từ thiết bị này. Thử lại sau 1 giờ."
});

function sessionResponse(user, session, extra = {}) {
  return {
    token: session.token,
    user_id: user.id,
    user: auth.publicUser(user),
    ...extra
  };
}

/* ---------------------------------------------------------------------------
   Đăng ký
   --------------------------------------------------------------------------- */
router.post("/register", authLimiter, asyncRoute(async (req, res) => {
  const { username, password, confirm_password: confirmPassword } = req.body || {};
  const cleanUsername = auth.validateUsername(username);
  const cleanPassword = auth.validateNewPassword(password, confirmPassword, cleanUsername);

  if (await auth.findUserByUsername(cleanUsername)) {
    throw new HttpError(409, "USER_ALREADY_EXISTS", "Tên đăng nhập đã có người dùng.", { field: "username" });
  }

  const passwordHash = await auth.hashPassword(cleanPassword);
  const result = await db.withTransaction(async (tx) => {
    const rows = await db.query(`
      INSERT INTO dbo.users (username, password_hash, password_changed_at)
      OUTPUT inserted.id
      VALUES (@username, @hash, SYSDATETIME())`, { username: cleanUsername, hash: passwordHash }, tx);
    const userId = rows[0].id;
    const recoveryCode = await auth.issueRecoveryCode(userId, tx);
    const session = await auth.createSession({ id: userId }, req, tx);
    return { userId, recoveryCode, session };
  });

  const user = await auth.findUserById(result.userId);
  res.status(201).json(sessionResponse(user, result.session, { recovery_code: result.recoveryCode }));
}));

/* ---------------------------------------------------------------------------
   Đăng nhập
   --------------------------------------------------------------------------- */
router.post("/login", authLimiter, asyncRoute(async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  if (!username || !password) {
    throw new HttpError(400, "MISSING_CREDENTIALS", "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
  }
  if (username.length > 30 || password.length > 128) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Tên đăng nhập hoặc mật khẩu không chính xác.");
  }

  const user = await auth.findUserByUsername(username);
  auth.assertNotLocked(user);

  const ok = await bcrypt.compare(password, user ? user.password_hash : auth.DUMMY_HASH);
  if (!user || !ok || user.is_demo) {
    const attemptsLeft = user && !user.is_demo ? await auth.registerFailure(user.id) : undefined;
    throw new HttpError(401, "INVALID_CREDENTIALS", "Tên đăng nhập hoặc mật khẩu không chính xác.",
      attemptsLeft !== undefined && attemptsLeft <= 3 ? { attempts_left: attemptsLeft } : undefined);
  }

  await auth.clearFailures(user.id);
  const session = await auth.createSession(user, req);
  res.json(sessionResponse(user, session, { has_recovery_code: Boolean(user.has_recovery_code) }));
}));

/* ---------------------------------------------------------------------------
   Quên mật khẩu: tên đăng nhập + mã khôi phục -> mật khẩu mới.
   Dùng chung bộ đếm sai với đăng nhập nên không dò mã được.
   --------------------------------------------------------------------------- */
router.post("/recover", authLimiter, asyncRoute(async (req, res) => {
  const { username, recovery_code: recoveryCode, new_password: newPassword, confirm_password: confirmPassword } = req.body || {};
  const user = await auth.findUserByUsername(String(username || "").trim());
  auth.assertNotLocked(user);

  const code = auth.normalizeRecoveryCode(recoveryCode);
  let valid = false;
  if (user && code && !user.is_demo) {
    const rows = await db.query("SELECT recovery_code_hash FROM dbo.users WHERE id = @id", { id: user.id });
    valid = Boolean(rows[0]?.recovery_code_hash) && await bcrypt.compare(code, rows[0].recovery_code_hash);
  } else {
    await bcrypt.compare("x", auth.DUMMY_HASH);
  }
  if (!valid) {
    const attemptsLeft = user && !user.is_demo ? await auth.registerFailure(user.id) : undefined;
    throw new HttpError(400, "INVALID_RECOVERY_CODE", "Tên đăng nhập hoặc mã khôi phục không đúng.",
      attemptsLeft !== undefined ? { attempts_left: attemptsLeft } : undefined);
  }

  const cleanPassword = auth.validateNewPassword(newPassword, confirmPassword, user.username);
  const passwordHash = await auth.hashPassword(cleanPassword);

  const result = await db.withTransaction(async (tx) => {
    await db.query(`
      UPDATE dbo.users
      SET password_hash = @hash, password_changed_at = SYSDATETIME(), failed_login_count = 0, locked_until = NULL
      WHERE id = @id`, { hash: passwordHash, id: user.id }, tx);
    await auth.revokeSessions(user.id, {}, tx);
    // Mã khôi phục chỉ dùng được 1 lần: cấp mã mới ngay
    const newCode = await auth.issueRecoveryCode(user.id, tx);
    const session = await auth.createSession(user, req, tx);
    return { newCode, session };
  });

  res.json(sessionResponse(user, result.session, { recovery_code: result.newCode }));
}));

/* ---------------------------------------------------------------------------
   Dùng thử
   --------------------------------------------------------------------------- */
router.post("/demo", demoLimiter, asyncRoute(async (req, res) => {
  const created = await demo.createDemoUser(req.body?.today, req.body?.now);
  const user = await auth.findUserById(created.id);
  const session = await auth.createSession(user, req);
  res.status(201).json(sessionResponse(user, session));
}));

router.post("/upgrade-demo", authLimiter, authenticateToken, asyncRoute(async (req, res) => {
  if (!req.user.is_demo) throw new HttpError(400, "NOT_DEMO", "Tài khoản này đã là tài khoản thật.");

  const { username, password, confirm_password: confirmPassword, keep_sample: keepSample } = req.body || {};
  const cleanUsername = auth.validateUsername(username);
  const cleanPassword = auth.validateNewPassword(password, confirmPassword, cleanUsername);
  if (await auth.findUserByUsername(cleanUsername)) {
    throw new HttpError(409, "USER_ALREADY_EXISTS", "Tên đăng nhập đã có người dùng.", { field: "username" });
  }
  const passwordHash = await auth.hashPassword(cleanPassword);

  const result = await db.withTransaction(async (tx) => {
    await db.query(`
      UPDATE dbo.users
      SET username = @username, password_hash = @hash, password_changed_at = SYSDATETIME(),
          is_demo = 0, demo_expires_at = NULL, created_at = SYSDATETIME()
      WHERE id = @id AND is_demo = 1`, { username: cleanUsername, hash: passwordHash, id: req.user.id }, tx);
    if (keepSample === false) await demo.removeSampleData(req.user.id, tx);
    // Phiên cũ gắn với hạn dùng thử: thay bằng phiên 30 ngày
    await auth.revokeSessions(req.user.id, {}, tx);
    const recoveryCode = await auth.issueRecoveryCode(req.user.id, tx);
    const session = await auth.createSession({ id: req.user.id }, req, tx);
    return { recoveryCode, session };
  });

  const user = await auth.findUserById(req.user.id);
  res.json(sessionResponse(user, result.session, { recovery_code: result.recoveryCode }));
}));

/* ---------------------------------------------------------------------------
   Thông tin tài khoản và phiên
   --------------------------------------------------------------------------- */
router.get("/me", authenticateToken, asyncRoute(async (req, res) => {
  const user = await auth.findUserById(req.user.id);
  if (!user) throw new HttpError(401, "SESSION_REVOKED", "Tài khoản không còn tồn tại.");
  res.json({ ...auth.publicUser(user), has_recovery_code: Boolean(user.has_recovery_code) });
}));

router.put("/profile", authenticateToken, asyncRoute(async (req, res) => {
  const raw = req.body?.display_name;
  if (raw !== null && raw !== undefined && typeof raw !== "string") {
    throw new HttpError(400, "INVALID_DISPLAY_NAME", "Tên hiển thị không hợp lệ.", { field: "display_name" });
  }
  const name = cleanText(raw, 40) || null;
  if (name && !/\p{L}/u.test(name)) {
    throw new HttpError(400, "INVALID_DISPLAY_NAME", "Tên hiển thị cần có ít nhất một chữ cái.", { field: "display_name" });
  }
  await db.query("UPDATE dbo.users SET display_name = @name WHERE id = @id", { name, id: req.user.id });
  const user = await auth.findUserById(req.user.id);
  res.json({
    success: true,
    message: name ? "Đã đổi tên hiển thị." : "Đã bỏ tên hiển thị.",
    user: { ...auth.publicUser(user), has_recovery_code: Boolean(user.has_recovery_code) }
  });
}));

router.post("/logout", authenticateToken, asyncRoute(async (req, res) => {
  await auth.revokeSessions(req.user.id, { sessionId: req.user.sid });
  res.json({ success: true });
}));

router.get("/sessions", authenticateToken, asyncRoute(async (req, res) => {
  res.json(await auth.listSessions(req.user.id, req.user.sid));
}));

router.post("/sessions/revoke-others", authenticateToken, asyncRoute(async (req, res) => {
  const revoked = await auth.revokeSessions(req.user.id, { exceptSessionId: req.user.sid });
  res.json({ success: true, revoked });
}));

router.delete("/sessions/:id", authenticateToken, asyncRoute(async (req, res) => {
  const id = String(req.params.id || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new HttpError(400, "INVALID_ID", "Mã phiên không hợp lệ.");
  }
  const revoked = await auth.revokeSessions(req.user.id, { sessionId: id });
  if (!revoked) throw new HttpError(404, "SESSION_NOT_FOUND", "Không tìm thấy phiên đăng nhập này.");
  res.json({ success: true, revoked, was_current: id.toLowerCase() === req.user.sid.toLowerCase() });
}));

router.post("/change-password", authLimiter, authenticateToken, requireRealAccount, asyncRoute(async (req, res) => {
  const { current_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword } = req.body || {};
  const user = await auth.findUserById(req.user.id);
  auth.assertNotLocked(user);

  if (!(await bcrypt.compare(String(currentPassword || ""), user.password_hash))) {
    const attemptsLeft = await auth.registerFailure(user.id);
    throw new HttpError(400, "WRONG_PASSWORD", "Mật khẩu hiện tại không đúng.", { attempts_left: attemptsLeft, field: "current_password" });
  }
  const cleanPassword = auth.validateNewPassword(newPassword, confirmPassword, user.username);
  if (await bcrypt.compare(cleanPassword, user.password_hash)) {
    throw new HttpError(400, "SAME_PASSWORD", "Mật khẩu mới phải khác mật khẩu hiện tại.", { field: "password" });
  }

  const passwordHash = await auth.hashPassword(cleanPassword);
  const revoked = await db.withTransaction(async (tx) => {
    await db.query(`
      UPDATE dbo.users SET password_hash = @hash, password_changed_at = SYSDATETIME(), failed_login_count = 0
      WHERE id = @id`, { hash: passwordHash, id: user.id }, tx);
    return auth.revokeSessions(user.id, { exceptSessionId: req.user.sid }, tx);
  });
  res.json({ success: true, revoked_other_sessions: revoked });
}));

router.post("/recovery-code", authLimiter, authenticateToken, requireRealAccount, asyncRoute(async (req, res) => {
  const user = await auth.findUserById(req.user.id);
  auth.assertNotLocked(user);
  if (!(await bcrypt.compare(String(req.body?.password || ""), user.password_hash))) {
    const attemptsLeft = await auth.registerFailure(user.id);
    throw new HttpError(400, "WRONG_PASSWORD", "Mật khẩu không đúng.", { attempts_left: attemptsLeft, field: "password" });
  }
  res.json({ recovery_code: await auth.issueRecoveryCode(user.id) });
}));

module.exports = router;
