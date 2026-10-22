/**
 * @file debt.routes.js
 * @description Sổ nợ và chia tiền nhóm. Bạn bè chỉ là tên trong sổ của người dùng, không cần tài khoản.
 *
 *   GET    /api/debts                     Tổng theo từng người + các khoản chưa trả (+ đã trả gần đây nếu history=1)
 *   GET    /api/debts/people              Tên đã từng ghi (gợi ý khi gõ tên)
 *   POST   /api/debts                     Ghi nợ tay: {person_name, direction, amount, note}
 *                                         direction: owed_to_me (cho mượn) | i_owe (mượn)
 *   POST   /api/debts/:id/settle          Đánh dấu đã trả một khoản
 *   POST   /api/debts/settle-person       {person_name}: người đó trả hết / mình trả hết cho người đó
 *   DELETE /api/debts/:id                 Xóa khoản ghi tay bị nhầm (khoản từ chia tiền thì xóa cả lần chia)
 *
 *   GET    /api/debts/splits              Các lần chia tiền gần đây
 *   POST   /api/debts/splits              {title, total_amount, people[], category_id, transaction_date,
 *                                          transaction_time, i_paid, payer_name}
 *   DELETE /api/debts/splits/:id          Xóa cả lần chia (nợ + khoản chi phần của mình)
 */

const express = require("express");
const db = require("../config/db");
const { HttpError, asyncRoute } = require("../lib/http");
const v = require("../lib/validate");
const { authenticateToken } = require("../middlewares/auth.middleware");

const router = express.Router();
router.use(authenticateToken);

const DIRECTIONS = new Set(["owed_to_me", "i_owe"]);
const MAX_PEOPLE = 49;

function requireName(value) {
  const name = v.cleanText(value, 50).replace(/\s+/g, " ");
  if (!name) throw new HttpError(400, "INVALID_PERSON", "Nhập tên người nợ / cho nợ.");
  return name;
}

const DEBT_COLUMNS = `
  d.id, d.person_name, d.direction, d.amount, d.note, d.split_id,
  CONVERT(VARCHAR(19), d.created_at, 126) AS created_at,
  CONVERT(VARCHAR(19), d.settled_at, 126) AS settled_at`;

router.get("/", asyncRoute(async (req, res) => {
  const userId = req.user.id;
  const withHistory = req.query.history === "1";

  const [people, open, history] = await Promise.all([
    db.execRows("dbo.sp_get_debt_summary", { user_id: userId }),
    db.query(`SELECT ${DEBT_COLUMNS} FROM dbo.debts AS d
              WHERE d.user_id = @user_id AND d.settled_at IS NULL
              ORDER BY d.created_at DESC, d.id DESC`, { user_id: userId }),
    withHistory
      ? db.query(`SELECT TOP (50) ${DEBT_COLUMNS} FROM dbo.debts AS d
                  WHERE d.user_id = @user_id AND d.settled_at IS NOT NULL
                  ORDER BY d.settled_at DESC, d.id DESC`, { user_id: userId })
      : Promise.resolve(undefined)
  ]);

  const total = (direction) => open.filter((d) => d.direction === direction).reduce((sum, d) => sum + d.amount, 0);
  res.json({
    owed_to_me: total("owed_to_me"),
    i_owe: total("i_owe"),
    people,
    open,
    ...(history ? { history } : {})
  });
}));

router.get("/people", asyncRoute(async (req, res) => {
  const rows = await db.query(`
    SELECT TOP (30) person_name
    FROM dbo.debts
    WHERE user_id = @user_id
    GROUP BY person_name
    ORDER BY MAX(created_at) DESC`, { user_id: req.user.id });
  res.json(rows.map((r) => r.person_name));
}));

router.post("/", asyncRoute(async (req, res) => {
  const body = req.body || {};
  const direction = String(body.direction || "");
  if (!DIRECTIONS.has(direction)) {
    throw new HttpError(400, "INVALID_DIRECTION", "Chọn \"cho mượn\" hoặc \"mượn\".");
  }
  const rows = await db.query(`
    INSERT INTO dbo.debts (user_id, person_name, direction, amount, note)
    OUTPUT INSERTED.id
    VALUES (@user_id, @person_name, @direction, @amount, @note)`, {
    user_id: req.user.id,
    person_name: requireName(body.person_name),
    direction,
    amount: v.requireAmount(body.amount),
    note: v.cleanText(body.note, 200) || null
  });
  const created = await db.query(`SELECT ${DEBT_COLUMNS} FROM dbo.debts AS d WHERE d.id = @id`, { id: rows[0].id });
  res.status(201).json(created[0]);
}));

router.post("/settle-person", asyncRoute(async (req, res) => {
  const rows = await db.query(`
    UPDATE dbo.debts SET settled_at = SYSDATETIME()
    WHERE user_id = @user_id AND person_name = @person_name AND settled_at IS NULL;
    SELECT @@ROWCOUNT AS settled;`, { user_id: req.user.id, person_name: requireName(req.body?.person_name) });
  if (!rows[0].settled) throw new HttpError(404, "DEBT_NOT_FOUND", "Người này không còn khoản nợ nào.");
  res.json({ success: true, settled: rows[0].settled });
}));

router.post("/:id/settle", asyncRoute(async (req, res) => {
  const rows = await db.query(`
    UPDATE dbo.debts SET settled_at = SYSDATETIME()
    WHERE id = @id AND user_id = @user_id AND settled_at IS NULL;
    SELECT @@ROWCOUNT AS settled;`, { id: v.requireId(req.params.id), user_id: req.user.id });
  if (!rows[0].settled) throw new HttpError(404, "DEBT_NOT_FOUND", "Không tìm thấy khoản nợ chưa trả này.");
  res.json({ success: true });
}));

router.delete("/:id", asyncRoute(async (req, res) => {
  const id = v.requireId(req.params.id);
  const found = await db.query("SELECT split_id FROM dbo.debts WHERE id = @id AND user_id = @user_id",
    { id, user_id: req.user.id });
  if (!found[0]) throw new HttpError(404, "DEBT_NOT_FOUND", "Không tìm thấy khoản nợ.");
  if (found[0].split_id) {
    throw new HttpError(409, "DEBT_FROM_SPLIT", "Khoản này sinh ra từ một lần chia tiền. Hãy xóa cả lần chia đó.",
      { split_id: found[0].split_id });
  }
  await db.query("DELETE FROM dbo.debts WHERE id = @id AND user_id = @user_id", { id, user_id: req.user.id });
  res.json({ success: true, deleted_id: id });
}));

/* ---------------------------- Chia tiền nhóm ---------------------------- */

router.get("/splits", asyncRoute(async (req, res) => {
  const rows = await db.query(`
    SELECT TOP (30) s.id, s.title, s.total_amount, s.people_count, s.my_share, s.transaction_id,
           CONVERT(VARCHAR(19), s.created_at, 126) AS created_at,
           (SELECT COUNT(*) FROM dbo.debts AS d WHERE d.split_id = s.id AND d.settled_at IS NULL) AS open_debts
    FROM dbo.split_bills AS s
    WHERE s.user_id = @user_id
    ORDER BY s.created_at DESC, s.id DESC`, { user_id: req.user.id });
  res.json(rows);
}));

router.post("/splits", asyncRoute(async (req, res) => {
  const body = req.body || {};
  if (!Array.isArray(body.people)) throw new HttpError(400, "INVALID_PEOPLE", "Thêm tên những người cùng chia.");
  const people = [...new Set(body.people.map((p) => v.cleanText(p, 50).replace(/\s+/g, " ")).filter(Boolean))];
  if (people.length === 0) throw new HttpError(400, "INVALID_PEOPLE", "Cần ít nhất 1 người để chia.");
  if (people.length > MAX_PEOPLE) throw new HttpError(400, "INVALID_PEOPLE", "Chia tối đa 50 người.");

  const iPaid = body.i_paid === undefined ? true : Boolean(body.i_paid);
  const rows = await db.execRows("dbo.sp_create_split_bill", {
    user_id: req.user.id,
    title: v.cleanText(body.title, 200) || "Chia tiền",
    total_amount: v.requireAmount(body.total_amount),
    people_json: JSON.stringify(people),
    category_id: v.requireId(body.category_id, "INVALID_CATEGORY", "Vui lòng chọn danh mục."),
    transaction_date: v.requireDate(body.transaction_date),
    transaction_time: v.optionalTime(body.transaction_time),
    i_paid: iPaid,
    payer_name: iPaid ? null : (v.cleanText(body.payer_name, 50).replace(/\s+/g, " ") || null)
  });
  res.status(201).json({ ...rows[0], people });
}));

router.delete("/splits/:id", asyncRoute(async (req, res) => {
  const rows = await db.execRows("dbo.sp_delete_split_bill", { user_id: req.user.id, id: v.requireId(req.params.id) });
  res.json({ success: true, ...rows[0] });
}));

module.exports = router;
