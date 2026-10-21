/**
 * @file auth.service.js
 * @description Nghiệp vụ tài khoản: quy tắc mật khẩu, mã khôi phục, khóa tạm khi sai nhiều lần,
 * phiên đăng nhập (mỗi thiết bị một phiên, thu hồi được).
 */

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const hasher = require("./hash.service");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { HttpError } = require("../lib/http");

const BCRYPT_ROUNDS = 10;
const SESSION_DAYS = 30;
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 5;

// Hash giả để so sánh khi tên đăng nhập không tồn tại: thời gian phản hồi giống hệt
// trường hợp sai mật khẩu, kẻ dò tài khoản không phân biệt được.
const DUMMY_HASH = bcrypt.hashSync("khong-co-tai-khoan-nay", BCRYPT_ROUNDS);

const COMMON_PASSWORDS = new Set([
  "12345678", "123456789", "1234567890", "password", "password1", "matkhau123", "abc12345",
  "qwerty123", "11111111", "88888888", "iloveyou", "anhyeuem", "admin123", "12345678a", "a12345678"
]);

const USERNAME_RE = /^[a-zA-Z0-9_.]{3,30}$/;

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("Thiếu JWT_SECRET (ít nhất 32 ký tự) trong file .env");
  return secret;
}

/* ---------------------------------------------------------------------------
   Kiểm tra tên đăng nhập và mật khẩu
   --------------------------------------------------------------------------- */

function validateUsername(username) {
  const clean = String(username || "").trim();
  if (!USERNAME_RE.test(clean)) {
    throw new HttpError(400, "INVALID_USERNAME",
      "Tên đăng nhập 3-30 ký tự, chỉ gồm chữ không dấu, số, dấu chấm và gạch dưới.", { field: "username" });
  }
  if (/^khach_/i.test(clean)) {
    throw new HttpError(400, "INVALID_USERNAME", "Tên bắt đầu bằng \"khach_\" được dành cho chế độ dùng thử.", { field: "username" });
  }
  return clean;
}

/**
 * Quy tắc mật khẩu: 8-128 ký tự, có cả chữ và số, không chứa tên đăng nhập,
 * không nằm trong danh sách mật khẩu phổ biến, nhập lại phải khớp.
 */
function validateNewPassword(password, confirmPassword, username) {
  const value = String(password || "");
  const field = { field: "password" };
  if (value.length < 8) throw new HttpError(400, "WEAK_PASSWORD", "Mật khẩu cần ít nhất 8 ký tự.", field);
  if (value.length > 128) throw new HttpError(400, "PASSWORD_TOO_LONG", "Mật khẩu không được vượt quá 128 ký tự.", field);
  if (!/[A-Za-zÀ-ỹ]/.test(value) || !/\d/.test(value)) {
    throw new HttpError(400, "WEAK_PASSWORD", "Mật khẩu cần có cả chữ và số.", field);
  }
  if (COMMON_PASSWORDS.has(value.toLowerCase())) {
    throw new HttpError(400, "WEAK_PASSWORD", "Mật khẩu này quá phổ biến, dễ bị đoán.", field);
  }
  if (username && value.toLowerCase().includes(String(username).toLowerCase())) {
    throw new HttpError(400, "WEAK_PASSWORD", "Mật khẩu không được chứa tên đăng nhập.", field);
  }
  if (confirmPassword === undefined || String(confirmPassword) !== value) {
    throw new HttpError(400, "PASSWORD_MISMATCH", "Mật khẩu nhập lại không khớp.", { field: "confirm_password" });
  }
  return value;
}

function hashPassword(password) {
  return hasher.hash(password, BCRYPT_ROUNDS);
}

/* ---------------------------------------------------------------------------
   Mã khôi phục: 12 ký tự dạng XXXX-XXXX-XXXX, bỏ các ký tự dễ nhầm (0/O, 1/I/L)
   --------------------------------------------------------------------------- */

const RECOVERY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateRecoveryCode() {
  const bytes = crypto.randomBytes(12);
  let code = "";
  for (let i = 0; i < 12; i++) {
    code += RECOVERY_ALPHABET[bytes[i] % RECOVERY_ALPHABET.length];
    if (i === 3 || i === 7) code += "-";
  }
  return code;
}

/** Chuẩn hóa mã người dùng gõ: bỏ dấu cách/gạch, viết hoa, rồi chèn lại gạch. */
function normalizeRecoveryCode(input) {
  const raw = String(input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (raw.length !== 12) return null;
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
}

async function issueRecoveryCode(userId, scope) {
  const code = generateRecoveryCode();
  const hash = await hasher.hash(code, BCRYPT_ROUNDS);
  await db.query("UPDATE dbo.users SET recovery_code_hash = @hash WHERE id = @id", { hash, id: userId }, scope);
  return code;
}

/* ---------------------------------------------------------------------------
   Người dùng
   --------------------------------------------------------------------------- */

const USER_COLUMNS = `
  u.id, u.username, u.display_name, u.password_hash, u.is_demo,
  CONVERT(VARCHAR(19), u.demo_expires_at, 126) AS demo_expires_at,
  CONVERT(VARCHAR(19), u.created_at, 126) AS created_at,
  u.failed_login_count,
  DATEDIFF(SECOND, SYSDATETIME(), u.locked_until) AS locked_seconds,
  CAST(CASE WHEN u.recovery_code_hash IS NULL THEN 0 ELSE 1 END AS BIT) AS has_recovery_code`;

async function findUserByUsername(username) {
  const rows = await db.query(`SELECT ${USER_COLUMNS} FROM dbo.users AS u WHERE u.username = @username`, { username });
  return rows[0] || null;
}

async function findUserById(id) {
  const rows = await db.query(`SELECT ${USER_COLUMNS} FROM dbo.users AS u WHERE u.id = @id`, { id });
  return rows[0] || null;
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name || null,
    is_demo: Boolean(user.is_demo),
    demo_expires_at: user.demo_expires_at || null,
    created_at: user.created_at
  };
}

/* ---------------------------------------------------------------------------
   Khóa tạm khi sai nhiều lần (dùng chung cho đăng nhập và khôi phục mật khẩu)
   --------------------------------------------------------------------------- */

function assertNotLocked(user) {
  if (user && user.locked_seconds > 0) {
    const minutes = Math.ceil(user.locked_seconds / 60);
    throw new HttpError(423, "ACCOUNT_LOCKED",
      `Sai quá ${MAX_FAILED_LOGINS} lần. Tài khoản tạm khóa, thử lại sau ${minutes} phút.`,
      { retry_after_seconds: user.locked_seconds });
  }
}

/** Ghi nhận một lần sai. Đủ 5 lần thì khóa 5 phút và đếm lại từ đầu. Trả về số lần còn lại. */
async function registerFailure(userId) {
  const rows = await db.query(`
    UPDATE dbo.users
    SET failed_login_count = CASE WHEN failed_login_count + 1 >= @max THEN 0 ELSE failed_login_count + 1 END,
        locked_until       = CASE WHEN failed_login_count + 1 >= @max
                                  THEN DATEADD(MINUTE, @minutes, SYSDATETIME()) ELSE locked_until END
    OUTPUT inserted.failed_login_count, DATEDIFF(SECOND, SYSDATETIME(), inserted.locked_until) AS locked_seconds
    WHERE id = @id`, { id: userId, max: MAX_FAILED_LOGINS, minutes: LOCK_MINUTES });
  const row = rows[0];
  if (row && row.locked_seconds > 0) {
    throw new HttpError(423, "ACCOUNT_LOCKED",
      `Sai ${MAX_FAILED_LOGINS} lần liên tiếp. Tài khoản tạm khóa ${LOCK_MINUTES} phút.`,
      { retry_after_seconds: row.locked_seconds });
  }
  return MAX_FAILED_LOGINS - (row ? row.failed_login_count : 0);
}

async function clearFailures(userId) {
  await db.query("UPDATE dbo.users SET failed_login_count = 0, locked_until = NULL WHERE id = @id", { id: userId });
}

/* ---------------------------------------------------------------------------
   Phiên đăng nhập
   --------------------------------------------------------------------------- */

function clientInfo(req) {
  return {
    userAgent: String(req.headers["user-agent"] || "").slice(0, 300) || null,
    ip: String(req.ip || req.socket?.remoteAddress || "").replace(/^::ffff:/, "").slice(0, 45) || null
  };
}

/**
 * Tạo phiên mới và ký JWT chứa mã phiên. Tài khoản dùng thử: phiên hết hạn cùng tài khoản.
 */
async function createSession(user, req, scope) {
  const { userAgent, ip } = clientInfo(req);
  const rows = await db.query(`
    INSERT INTO dbo.sessions (user_id, user_agent, ip_address, expires_at)
    OUTPUT CONVERT(VARCHAR(36), inserted.id) AS id,
           DATEDIFF(SECOND, SYSDATETIME(), inserted.expires_at) AS ttl_seconds
    SELECT @user_id, @user_agent, @ip,
           CASE WHEN u.is_demo = 1 THEN u.demo_expires_at ELSE DATEADD(DAY, @days, SYSDATETIME()) END
    FROM dbo.users AS u WHERE u.id = @user_id`,
  { user_id: user.id, user_agent: userAgent, ip, days: SESSION_DAYS }, scope);

  const session = rows[0];
  const token = jwt.sign({ sid: session.id, uid: user.id }, jwtSecret(), {
    expiresIn: Math.max(60, session.ttl_seconds)
  });
  return { token, session_id: session.id };
}

/** Kiểm tra phiên còn hiệu lực (chưa thu hồi, chưa hết hạn, tài khoản dùng thử chưa hết hạn). */
async function findActiveSession(sessionId, userId) {
  const rows = await db.query(`
    SELECT s.user_id, u.username, u.is_demo,
           CONVERT(VARCHAR(19), u.demo_expires_at, 126) AS demo_expires_at,
           DATEDIFF(SECOND, s.last_seen_at, SYSDATETIME()) AS idle_seconds
    FROM dbo.sessions AS s
    JOIN dbo.users    AS u ON u.id = s.user_id
    WHERE s.id = @sid AND s.user_id = @uid
      AND s.revoked_at IS NULL
      AND s.expires_at > SYSDATETIME()
      AND (u.is_demo = 0 OR u.demo_expires_at > SYSDATETIME())`,
  { sid: { type: db.sql.UniqueIdentifier, value: sessionId }, uid: userId });
  return rows[0] || null;
}

function touchSession(sessionId) {
  return db.query("UPDATE dbo.sessions SET last_seen_at = SYSDATETIME() WHERE id = @sid",
    { sid: { type: db.sql.UniqueIdentifier, value: sessionId } });
}

/** Đoán tên thiết bị từ User-Agent để người dùng nhận ra phiên nào là của mình. */
function describeDevice(userAgent) {
  const ua = String(userAgent || "");
  if (!ua) return "Thiết bị không rõ";
  const browser = /Edg\//.test(ua) ? "Edge"
    : /OPR\//.test(ua) ? "Opera"
      : /CocCoc/i.test(ua) ? "Cốc Cốc"
        : /Firefox\//.test(ua) ? "Firefox"
          : /Chrome\//.test(ua) ? "Chrome"
            : /Safari\//.test(ua) ? "Safari"
              : /node|curl|PowerShell/i.test(ua) ? "Công cụ dòng lệnh" : "Trình duyệt";
  const os = /iPhone/.test(ua) ? "iPhone"
    : /iPad/.test(ua) ? "iPad"
      : /Android/.test(ua) ? "Android"
        : /Windows/.test(ua) ? "Windows"
          : /Mac OS X/.test(ua) ? "macOS"
            : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} trên ${os}` : browser;
}

async function listSessions(userId, currentSessionId) {
  const rows = await db.query(`
    SELECT CONVERT(VARCHAR(36), id) AS id, user_agent, ip_address,
           CONVERT(VARCHAR(19), created_at, 126) AS created_at,
           CONVERT(VARCHAR(19), last_seen_at, 126) AS last_seen_at,
           CONVERT(VARCHAR(19), expires_at, 126) AS expires_at
    FROM dbo.sessions
    WHERE user_id = @uid AND revoked_at IS NULL AND expires_at > SYSDATETIME()
    ORDER BY last_seen_at DESC`, { uid: userId });
  return rows.map((row) => ({
    ...row,
    device: describeDevice(row.user_agent),
    is_current: row.id.toLowerCase() === String(currentSessionId).toLowerCase()
  }));
}

/** Thu hồi phiên. exceptSessionId: giữ lại phiên hiện tại khi "đăng xuất thiết bị khác". */
async function revokeSessions(userId, { sessionId, exceptSessionId } = {}, scope) {
  const rows = await db.query(`
    UPDATE dbo.sessions SET revoked_at = SYSDATETIME()
    OUTPUT inserted.id
    WHERE user_id = @uid AND revoked_at IS NULL
      AND (@sid IS NULL OR id = @sid)
      AND (@except IS NULL OR id <> @except)`,
  {
    uid: userId,
    sid: { type: db.sql.UniqueIdentifier, value: sessionId || null },
    except: { type: db.sql.UniqueIdentifier, value: exceptSessionId || null }
  }, scope);
  return rows.length;
}

module.exports = {
  DUMMY_HASH,
  MAX_FAILED_LOGINS,
  jwtSecret,
  validateUsername,
  validateNewPassword,
  hashPassword,
  generateRecoveryCode,
  normalizeRecoveryCode,
  issueRecoveryCode,
  findUserByUsername,
  findUserById,
  publicUser,
  assertNotLocked,
  registerFailure,
  clearFailures,
  createSession,
  findActiveSession,
  touchSession,
  listSessions,
  revokeSessions,
  describeDevice
};
