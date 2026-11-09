/**
 * @file group.routes.js
 * @description Quản lý Quỹ Nhóm / Chi tiêu chung cho phòng trọ, du lịch, nhóm bạn.
 *
 *   GET    /api/groups                  Danh sách nhóm người dùng tham gia
 *   POST   /api/groups                  Tạo nhóm mới (tự sinh mã mời 6 ký tự)
 *   POST   /api/groups/join             Tham gia nhóm bằng mã mời
 *   GET    /api/groups/:id              Chi tiết nhóm, lịch sử chi tiêu và bảng tính ai nợ ai
 *   POST   /api/groups/:id/expenses     Thêm khoản chi tiêu chung
 *   DELETE /api/groups/:id/expenses/:eid Xóa khoản chi tiêu
 *   POST   /api/groups/:id/leave        Rời nhóm
 */

const express = require("express");
const crypto = require("crypto");
const db = require("../config/db");
const { HttpError, asyncRoute } = require("../lib/http");
const v = require("../lib/validate");
const { authenticateToken } = require("../middlewares/auth.middleware");

const router = express.Router();
router.use(authenticateToken);

/** Sinh mã mời 6 ký tự chữ hoa dễ đọc */
function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Thuật toán tính toán tối ưu nợ nhóm: Ai cần chuyển khoản cho ai bao nhiêu tiền
 * @param {Array} members Danh sách thành viên { user_id, full_name, paid }
 * @param {number} totalSpent Tổng tiền cả nhóm đã chi
 */
function calculateSettlements(members, totalSpent) {
  if (!members || members.length <= 1 || totalSpent <= 0) return [];

  const fairShare = totalSpent / members.length;
  // Tính số dư (balance) của từng người: > 0 là trả dư (cần nhận lại), < 0 là trả thiếu (cần trả thêm)
  const debtors = [];  // Cần trả tiền
  const creditors = []; // Cần nhận tiền

  for (const m of members) {
    const balance = m.paid - fairShare;
    if (balance < -100) {
      debtors.push({ ...m, amount: Math.abs(balance) });
    } else if (balance > 100) {
      creditors.push({ ...m, amount: balance });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount >= 1000) {
      transfers.push({
        from_id: debtor.user_id,
        from_name: debtor.full_name || debtor.username,
        to_id: creditor.user_id,
        to_name: creditor.full_name || creditor.username,
        amount: Math.round(settleAmount)
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount < 100) i++;
    if (creditor.amount < 100) j++;
  }

  return transfers;
}

// 1. Lấy danh sách nhóm của tôi
router.get("/", asyncRoute(async (req, res) => {
  const userId = req.user.id;

  const groups = await db.query(
    `SELECT g.id, g.name, g.invite_code, g.created_by,
            CONVERT(VARCHAR(19), g.created_at, 126) AS created_at,
            gm.role,
            (SELECT COUNT(*) FROM dbo.group_members WHERE group_id = g.id) AS member_count,
            ISNULL((SELECT SUM(amount) FROM dbo.group_expenses WHERE group_id = g.id), 0) AS total_spent
     FROM dbo.expense_groups AS g
     INNER JOIN dbo.group_members AS gm ON g.id = gm.group_id
     WHERE gm.user_id = @user_id
     ORDER BY g.created_at DESC`,
    { user_id: userId }
  );

  res.json({ groups });
}));

// 2. Tạo nhóm mới
router.post("/", asyncRoute(async (req, res) => {
  const userId = req.user.id;
  const name = v.cleanText(req.body.name, 100);
  if (!name) throw new HttpError(400, "INVALID_NAME", "Vui lòng nhập tên nhóm (ví dụ: Phòng 302, Đi Đà Lạt).");

  let inviteCode = generateInviteCode();
  // Đảm bảo mã không trùng
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await db.query("SELECT id FROM dbo.expense_groups WHERE invite_code = @code", { code: inviteCode });
    if (!existing.length) break;
    inviteCode = generateInviteCode();
  }

  const result = await db.query(
    `INSERT INTO dbo.expense_groups (name, invite_code, created_by)
     OUTPUT INSERTED.id, INSERTED.name, INSERTED.invite_code, CONVERT(VARCHAR(19), INSERTED.created_at, 126) AS created_at
     VALUES (@name, @code, @user_id)`,
    { name, code: inviteCode, user_id: userId }
  );

  const group = result[0];

  // Thêm người tạo làm owner
  await db.query(
    `INSERT INTO dbo.group_members (group_id, user_id, role)
     VALUES (@group_id, @user_id, 'owner')`,
    { group_id: group.id, user_id: userId }
  );

  res.status(201).json({ group: { ...group, member_count: 1, total_spent: 0, role: "owner" } });
}));

// 3. Tham gia nhóm bằng mã mời
router.post("/join", asyncRoute(async (req, res) => {
  const userId = req.user.id;
  const code = (req.body.invite_code || "").trim().toUpperCase();
  if (!code) throw new HttpError(400, "INVALID_CODE", "Vui lòng nhập mã mời của nhóm.");

  const groups = await db.query(
    "SELECT id, name, invite_code FROM dbo.expense_groups WHERE invite_code = @code",
    { code }
  );
  if (!groups.length) throw new HttpError(404, "NOT_FOUND", "Không tìm thấy nhóm với mã mời này.");

  const group = groups[0];

  const existing = await db.query(
    "SELECT 1 FROM dbo.group_members WHERE group_id = @group_id AND user_id = @user_id",
    { group_id: group.id, user_id: userId }
  );
  if (existing.length) throw new HttpError(409, "ALREADY_MEMBER", "Bạn đã là thành viên của nhóm này rồi.");

  await db.query(
    "INSERT INTO dbo.group_members (group_id, user_id, role) VALUES (@group_id, @user_id, 'member')",
    { group_id: group.id, user_id: userId }
  );

  res.json({ message: `Đã tham gia nhóm '${group.name}'!`, group_id: group.id });
}));

// 4. Chi tiết nhóm: Thành viên, chi tiêu và tính toán chuyển khoản
router.get("/:id", asyncRoute(async (req, res) => {
  const userId = req.user.id;
  const groupId = parseInt(req.params.id, 10);
  if (!groupId) throw new HttpError(400, "INVALID_ID", "ID nhóm không hợp lệ.");

  // Kiểm tra quyền thành viên
  const memCheck = await db.query(
    "SELECT role FROM dbo.group_members WHERE group_id = @group_id AND user_id = @user_id",
    { group_id: groupId, user_id: userId }
  );
  if (!memCheck.length) throw new HttpError(403, "FORBIDDEN", "Bạn không phải là thành viên nhóm này.");

  const [groupRows, members, expenses] = await Promise.all([
    db.query(
      `SELECT g.id, g.name, g.invite_code, g.created_by,
              CONVERT(VARCHAR(19), g.created_at, 126) AS created_at
       FROM dbo.expense_groups AS g WHERE g.id = @group_id`,
      { group_id: groupId }
    ),
    db.query(
      `SELECT gm.user_id, gm.role,
              u.username, ISNULL(u.display_name, u.username) AS full_name,
              ISNULL(SUM(ge.amount), 0) AS paid
       FROM dbo.group_members AS gm
       INNER JOIN dbo.users AS u ON gm.user_id = u.id
       LEFT JOIN dbo.group_expenses AS ge ON ge.group_id = gm.group_id AND ge.payer_id = gm.user_id
       WHERE gm.group_id = @group_id
       GROUP BY gm.user_id, gm.role, u.username, u.display_name`,
      { group_id: groupId }
    ),
    db.query(
      `SELECT ge.id, ge.amount, ge.category_name, ge.note, ge.payer_id,
              ISNULL(u.display_name, u.username) AS payer_name,
              CONVERT(VARCHAR(19), ge.created_at, 126) AS created_at
       FROM dbo.group_expenses AS ge
       INNER JOIN dbo.users AS u ON ge.payer_id = u.id
       WHERE ge.group_id = @group_id
       ORDER BY ge.created_at DESC, ge.id DESC`,
      { group_id: groupId }
    )
  ]);

  if (!groupRows.length) throw new HttpError(404, "NOT_FOUND", "Không tìm thấy nhóm.");
  const group = groupRows[0];

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const fairShare = members.length > 0 ? Math.round(totalSpent / members.length) : 0;
  const settlements = calculateSettlements(members, totalSpent);

  res.json({
    group,
    my_role: memCheck[0].role,
    total_spent: totalSpent,
    fair_share: fairShare,
    members,
    expenses,
    settlements
  });
}));

// 5. Thêm khoản chi tiêu chung cho nhóm
router.post("/:id/expenses", asyncRoute(async (req, res) => {
  const userId = req.user.id;
  const groupId = parseInt(req.params.id, 10);
  const amount = Number(req.body.amount);
  const categoryName = v.cleanText(req.body.category_name, 50) || "Chi tiêu chung";
  const note = v.cleanText(req.body.note, 250);

  if (!amount || amount <= 0) throw new HttpError(400, "INVALID_AMOUNT", "Số tiền phải lớn hơn 0.");

  // Kiểm tra thành viên
  const mem = await db.query(
    "SELECT 1 FROM dbo.group_members WHERE group_id = @group_id AND user_id = @user_id",
    { group_id: groupId, user_id: userId }
  );
  if (!mem.length) throw new HttpError(403, "FORBIDDEN", "Bạn không thuộc nhóm này.");

  const result = await db.query(
    `INSERT INTO dbo.group_expenses (group_id, payer_id, amount, category_name, note)
     OUTPUT INSERTED.id, INSERTED.amount, INSERTED.category_name, INSERTED.note, INSERTED.payer_id,
            CONVERT(VARCHAR(19), INSERTED.created_at, 126) AS created_at
     VALUES (@group_id, @user_id, @amount, @cat, @note)`,
    { group_id: groupId, user_id: userId, amount, cat: categoryName, note }
  );

  res.status(201).json({ expense: result[0] });
}));

// 6. Xóa khoản chi tiêu
router.delete("/:id/expenses/:expenseId", asyncRoute(async (req, res) => {
  const userId = req.user.id;
  const groupId = parseInt(req.params.id, 10);
  const expenseId = parseInt(req.params.expenseId, 10);

  const check = await db.query(
    `SELECT ge.payer_id, gm.role
     FROM dbo.group_expenses AS ge
     INNER JOIN dbo.group_members AS gm ON gm.group_id = ge.group_id AND gm.user_id = @user_id
     WHERE ge.id = @expense_id AND ge.group_id = @group_id`,
    { expense_id: expenseId, group_id: groupId, user_id: userId }
  );
  if (!check.length) throw new HttpError(404, "NOT_FOUND", "Không tìm thấy khoản chi hoặc bạn không có quyền.");

  if (check[0].payer_id !== userId && check[0].role !== "owner") {
    throw new HttpError(403, "FORBIDDEN", "Chỉ người trả hoặc trưởng nhóm mới được xóa.");
  }

  await db.query("DELETE FROM dbo.group_expenses WHERE id = @expense_id", { expense_id: expenseId });
  res.json({ message: "Đã xóa khoản chi." });
}));

// 7. Rời nhóm
router.post("/:id/leave", asyncRoute(async (req, res) => {
  const userId = req.user.id;
  const groupId = parseInt(req.params.id, 10);

  await db.query(
    "DELETE FROM dbo.group_members WHERE group_id = @group_id AND user_id = @user_id",
    { group_id: groupId, user_id: userId }
  );

  res.json({ message: "Đã rời nhóm." });
}));

module.exports = router;

