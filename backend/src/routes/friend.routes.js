/**
 * @file friend.routes.js
 * @description Quản lý danh sách bạn bè: kết bạn theo username hoặc ID, lấy danh sách bạn bè,
 * gợi ý kết bạn khi ghi nợ hoặc chia tiền nhóm.
 *
 *   GET    /api/friends             Lấy danh sách bạn bè
 *   POST   /api/friends             Kết bạn { target: "username" hoặc id }
 *   DELETE /api/friends/:id         Hủy kết bạn
 */

const express = require("express");
const db = require("../config/db");
const { HttpError, asyncRoute } = require("../lib/http");
const { authenticateToken } = require("../middlewares/auth.middleware");

const router = express.Router();
router.use(authenticateToken);

// 1. Lấy danh sách bạn bè
router.get("/", asyncRoute(async (req, res) => {
  const userId = req.user.id;
  const friends = await db.query(`
    SELECT u.id, u.username, ISNULL(u.display_name, u.username) AS name,
           CONVERT(VARCHAR(19), f.created_at, 126) AS added_at
    FROM dbo.user_friends AS f
    INNER JOIN dbo.users AS u ON f.friend_id = u.id
    WHERE f.user_id = @user_id
    ORDER BY f.created_at DESC, u.username ASC`,
    { user_id: userId }
  );
  res.json({ friends });
}));

// 2. Thêm bạn bè (bằng ID hoặc Username)
router.post("/", asyncRoute(async (req, res) => {
  const userId = req.user.id;
  const rawTarget = String(req.body?.target || req.body?.friend_id || "").trim();
  const cleanTarget = rawTarget.replace(/^[#@]/, "").trim();

  if (!cleanTarget) {
    throw new HttpError(400, "MISSING_TARGET", "Vui lòng nhập ID hoặc tên đăng nhập của người muốn kết bạn.");
  }

  // Tìm người dùng mục tiêu
  let targetUser = null;
  if (/^\d+$/.test(cleanTarget)) {
    const targetId = parseInt(cleanTarget, 10);
    const rows = await db.query(
      `SELECT id, username, ISNULL(display_name, username) AS name
       FROM dbo.users
       WHERE id = @targetId AND (is_demo IS NULL OR is_demo = 0)`,
      { targetId }
    );
    targetUser = rows[0] || null;
  } else {
    const rows = await db.query(
      `SELECT id, username, ISNULL(display_name, username) AS name
       FROM dbo.users
       WHERE username = @cleanTarget AND (is_demo IS NULL OR is_demo = 0)`,
      { cleanTarget }
    );
    targetUser = rows[0] || null;
  }

  if (!targetUser) {
    throw new HttpError(404, "USER_NOT_FOUND", "Không tìm thấy người dùng này trên hệ thống.");
  }

  if (targetUser.id === userId) {
    throw new HttpError(400, "CANNOT_FRIEND_SELF", "Bạn không thể tự kết bạn với chính mình.");
  }

  // Kiểm tra đã là bạn bè chưa
  const existing = await db.query(
    "SELECT 1 FROM dbo.user_friends WHERE user_id = @user_id AND friend_id = @friend_id",
    { user_id: userId, friend_id: targetUser.id }
  );

  if (!existing.length) {
    // Thêm quan hệ bạn bè 2 chiều
    await db.query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.user_friends WHERE user_id = @uid AND friend_id = @fid)
        INSERT INTO dbo.user_friends (user_id, friend_id) VALUES (@uid, @fid);
      IF NOT EXISTS (SELECT 1 FROM dbo.user_friends WHERE user_id = @fid AND friend_id = @uid)
        INSERT INTO dbo.user_friends (user_id, friend_id) VALUES (@fid, @uid);
    `, { uid: userId, fid: targetUser.id });
  }

  res.status(201).json({
    message: `Đã kết bạn thành công với @${targetUser.username}!`,
    friend: targetUser
  });
}));

// 3. Hủy kết bạn
router.delete("/:id", asyncRoute(async (req, res) => {
  const userId = req.user.id;
  const friendId = parseInt(req.params.id, 10);

  if (!friendId) throw new HttpError(400, "INVALID_ID", "ID không hợp lệ.");

  await db.query(`
    DELETE FROM dbo.user_friends 
    WHERE (user_id = @uid AND friend_id = @fid)
       OR (user_id = @fid AND friend_id = @uid)
  `, { uid: userId, fid: friendId });

  res.json({ message: "Đã xóa khỏi danh sách bạn bè." });
}));

module.exports = router;
