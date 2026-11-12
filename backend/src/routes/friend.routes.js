/**
 * @file friend.routes.js
 * @description Quản lý danh sách bạn bè 2 chiều có xác nhận:
 *   - Người A gửi lời mời kết bạn (trạng thái pending)
 *   - Người B nhận được lời mời: có thể bấm "Đồng ý" hoặc "Từ chối"
 *   - Người A có thể thu hồi lời mời đã gửi
 *   - Chỉ khi Người B "Đồng ý" thì hai bên mới chính thức là bạn bè (status = 'accepted')
 *   - Bạn bè chính thức được dùng để ghi nợ 2 chiều và chia tiền nhóm 1 chạm.
 *
 *   GET    /api/friends                      Lấy { friends, incoming_requests, outgoing_requests }
 *   POST   /api/friends                      Gửi lời mời kết bạn { target: "username" hoặc id }
 *   POST   /api/friends/:id/accept           Chấp nhận lời mời kết bạn (:id là senderId hoặc requestId)
 *   POST   /api/friends/:id/decline          Từ chối lời mời kết bạn (:id là senderId hoặc requestId)
 *   DELETE /api/friends/requests/:id         Thu hồi lời mời kết bạn đã gửi
 *   DELETE /api/friends/:id                  Hủy kết bạn
 */

const express = require("express");
const db = require("../config/db");
const { HttpError, asyncRoute } = require("../lib/http");
const { authenticateToken } = require("../middlewares/auth.middleware");

const router = express.Router();
router.use(authenticateToken);

// 1. Lấy danh sách bạn bè & các lời mời (đã nhận / đã gửi)
router.get("/", asyncRoute(async (req, res) => {
  const userId = req.user.id;
  const [friends, incoming, outgoing] = await Promise.all([
    // Bạn bè chính thức (hai bên đã đồng ý)
    db.query(`
      SELECT u.id, u.username, ISNULL(u.display_name, u.username) AS name,
             CONVERT(VARCHAR(19), f.created_at, 126) AS added_at
      FROM dbo.user_friends AS f
      INNER JOIN dbo.users AS u ON f.friend_id = u.id
      WHERE f.user_id = @user_id AND f.status = 'accepted'
      ORDER BY f.created_at DESC, u.username ASC`,
      { user_id: userId }
    ),
    // Lời mời kết bạn ĐÃ NHẬN (đang chờ mình xác nhận)
    db.query(`
      SELECT f.id AS request_id, u.id AS from_user_id, u.username,
             ISNULL(u.display_name, u.username) AS name,
             CONVERT(VARCHAR(19), f.created_at, 126) AS created_at
      FROM dbo.user_friends AS f
      INNER JOIN dbo.users AS u ON f.user_id = u.id
      WHERE f.friend_id = @user_id AND f.status = 'pending'
      ORDER BY f.created_at DESC`,
      { user_id: userId }
    ),
    // Lời mời kết bạn ĐÃ GỬI (đang chờ đối phương xác nhận)
    db.query(`
      SELECT f.id AS request_id, u.id AS to_user_id, u.username,
             ISNULL(u.display_name, u.username) AS name,
             CONVERT(VARCHAR(19), f.created_at, 126) AS created_at
      FROM dbo.user_friends AS f
      INNER JOIN dbo.users AS u ON f.friend_id = u.id
      WHERE f.user_id = @user_id AND f.status = 'pending'
      ORDER BY f.created_at DESC`,
      { user_id: userId }
    )
  ]);

  res.json({
    friends,
    incoming_requests: incoming,
    outgoing_requests: outgoing
  });
}));

// 2. Gửi lời mời kết bạn mới
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

  // 1. Kiểm tra đã là bạn bè chưa
  const acceptedCheck = await db.query(
    "SELECT 1 FROM dbo.user_friends WHERE user_id = @user_id AND friend_id = @friend_id AND status = 'accepted'",
    { user_id: userId, friend_id: targetUser.id }
  );
  if (acceptedCheck.length) {
    return res.json({
      status: "already_friends",
      message: `Bạn và @${targetUser.username} đã là bạn bè của nhau rồi.`,
      friend: targetUser
    });
  }

  // 2. Kiểm tra xem mình đã gửi lời mời cho họ chưa (đang chờ)
  const myPendingCheck = await db.query(
    "SELECT 1 FROM dbo.user_friends WHERE user_id = @user_id AND friend_id = @friend_id AND status = 'pending'",
    { user_id: userId, friend_id: targetUser.id }
  );
  if (myPendingCheck.length) {
    return res.json({
      status: "pending_outgoing",
      message: `Bạn đã gửi lời mời kết bạn tới @${targetUser.username} rồi. Vui lòng chờ đối phương xác nhận.`,
      friend: targetUser
    });
  }

  // 3. Nếu đối phương đã từng gửi lời mời kết bạn cho mình trước đó -> Tự động xác nhận 2 bên!
  const theirPendingCheck = await db.query(
    "SELECT id FROM dbo.user_friends WHERE user_id = @friend_id AND friend_id = @user_id AND status = 'pending'",
    { user_id: userId, friend_id: targetUser.id }
  );
  if (theirPendingCheck.length) {
    await db.query(`
      UPDATE dbo.user_friends SET status = 'accepted', updated_at = SYSDATETIME()
      WHERE user_id = @friend_id AND friend_id = @user_id;

      IF NOT EXISTS (SELECT 1 FROM dbo.user_friends WHERE user_id = @user_id AND friend_id = @friend_id)
        INSERT INTO dbo.user_friends (user_id, friend_id, status, updated_at) VALUES (@user_id, @friend_id, 'accepted', SYSDATETIME());
      ELSE
        UPDATE dbo.user_friends SET status = 'accepted', updated_at = SYSDATETIME()
        WHERE user_id = @user_id AND friend_id = @friend_id;
    `, { user_id: userId, friend_id: targetUser.id });

    return res.status(200).json({
      status: "accepted",
      message: `@${targetUser.username} cũng đã gửi lời mời cho bạn. Hai bạn đã chính thức trở thành bạn bè!`,
      friend: targetUser
    });
  }

  // 4. Tạo lời mời kết bạn mới (status = 'pending')
  await db.query(`
    IF EXISTS (SELECT 1 FROM dbo.user_friends WHERE user_id = @user_id AND friend_id = @friend_id)
      UPDATE dbo.user_friends SET status = 'pending', created_at = SYSDATETIME(), updated_at = NULL
      WHERE user_id = @user_id AND friend_id = @friend_id;
    ELSE
      INSERT INTO dbo.user_friends (user_id, friend_id, status) VALUES (@user_id, @friend_id, 'pending');
  `, { user_id: userId, friend_id: targetUser.id });

  res.status(201).json({
    status: "pending",
    message: `Đã gửi lời mời kết bạn tới @${targetUser.username}! Vui lòng chờ đối phương xác nhận.`,
    friend: targetUser
  });
}));

// 3. Chấp nhận lời mời kết bạn
router.post(["/:id/accept", "/requests/:id/accept"], asyncRoute(async (req, res) => {
  const userId = req.user.id;
  const targetId = parseInt(req.params.id, 10);
  if (!targetId) throw new HttpError(400, "INVALID_ID", "ID không hợp lệ.");

  // Tìm lời mời pending gửi đến mình (theo request_id hoặc theo user_id người gửi)
  const reqRows = await db.query(`
    SELECT f.id, f.user_id, u.username, ISNULL(u.display_name, u.username) AS name
    FROM dbo.user_friends AS f
    INNER JOIN dbo.users AS u ON f.user_id = u.id
    WHERE (f.id = @targetId OR f.user_id = @targetId) AND f.friend_id = @user_id AND f.status = 'pending'`,
    { targetId, user_id: userId }
  );

  if (!reqRows.length) {
    throw new HttpError(404, "REQUEST_NOT_FOUND", "Không tìm thấy lời mời kết bạn cần xác nhận.");
  }

  const senderId = reqRows[0].user_id;
  const senderUname = reqRows[0].username;

  // Cập nhật quan hệ 2 chiều thành accepted
  await db.query(`
    UPDATE dbo.user_friends SET status = 'accepted', updated_at = SYSDATETIME()
    WHERE user_id = @senderId AND friend_id = @user_id;

    IF NOT EXISTS (SELECT 1 FROM dbo.user_friends WHERE user_id = @user_id AND friend_id = @senderId)
      INSERT INTO dbo.user_friends (user_id, friend_id, status, updated_at) VALUES (@user_id, @senderId, 'accepted', SYSDATETIME());
    ELSE
      UPDATE dbo.user_friends SET status = 'accepted', updated_at = SYSDATETIME()
      WHERE user_id = @user_id AND friend_id = @senderId;
  `, { user_id: userId, senderId });

  res.json({
    success: true,
    message: `Đã đồng ý kết bạn với @${senderUname}!`,
    friend: { id: senderId, username: senderUname, name: reqRows[0].name }
  });
}));

// 4. Từ chối lời mời kết bạn
router.post(["/:id/decline", "/requests/:id/decline"], asyncRoute(async (req, res) => {
  const userId = req.user.id;
  const targetId = parseInt(req.params.id, 10);
  if (!targetId) throw new HttpError(400, "INVALID_ID", "ID không hợp lệ.");

  await db.query(`
    DELETE FROM dbo.user_friends
    WHERE (id = @targetId OR user_id = @targetId) AND friend_id = @user_id AND status = 'pending'`,
    { targetId, user_id: userId }
  );

  res.json({ success: true, message: "Đã từ chối lời mời kết bạn." });
}));

// 5. Thu hồi lời mời kết bạn đã gửi
router.delete("/requests/:id", asyncRoute(async (req, res) => {
  const userId = req.user.id;
  const reqId = parseInt(req.params.id, 10);
  if (!reqId) throw new HttpError(400, "INVALID_ID", "ID không hợp lệ.");

  await db.query(`
    DELETE FROM dbo.user_friends
    WHERE (id = @reqId OR friend_id = @reqId) AND user_id = @user_id AND status = 'pending'`,
    { reqId, user_id: userId }
  );

  res.json({ success: true, message: "Đã thu hồi lời mời kết bạn." });
}));

// 6. Hủy kết bạn (xóa cả 2 chiều)
router.delete("/:id", asyncRoute(async (req, res) => {
  const userId = req.user.id;
  const friendId = parseInt(req.params.id, 10);
  if (!friendId) throw new HttpError(400, "INVALID_ID", "ID không hợp lệ.");

  await db.query(`
    DELETE FROM dbo.user_friends 
    WHERE (user_id = @uid AND friend_id = @fid)
       OR (user_id = @fid AND friend_id = @uid)`,
    { uid: userId, fid: friendId }
  );

  res.json({ message: "Đã xóa khỏi danh sách bạn bè." });
}));

module.exports = router;
