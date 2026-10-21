/**
 * @file wallet.routes.js
 * @description Đối soát ví "tiền bốc hơi": người dùng đếm tiền thật đang có, so với số lẽ ra phải có.
 *
 *   GET  /api/wallet          Số dư trên sổ, nợ chưa thu/chưa trả, số lẽ ra phải có, lần đối soát gần nhất
 *                             (frontend tự tính chênh lệch ngay khi người dùng gõ số tiền thật)
 *   POST /api/wallet/check    {actual_balance, record, transaction_date, transaction_time}
 *                             record = true: ghi khoản chênh lệch ("Chi không nhớ" / "Tiền dư chưa ghi")
 */

const express = require("express");
const db = require("../config/db");
const { HttpError, asyncRoute } = require("../lib/http");
const v = require("../lib/validate");
const { authenticateToken } = require("../middlewares/auth.middleware");

const router = express.Router();
router.use(authenticateToken);

router.get("/", asyncRoute(async (req, res) => {
  const userId = req.user.id;
  const [balances, last] = await Promise.all([
    db.query(`
      SELECT
        CAST((SELECT COALESCE(SUM(CASE WHEN c.type = 'income' THEN t.amount ELSE -t.amount END), 0)
              FROM dbo.transactions AS t JOIN dbo.categories AS c ON c.id = t.category_id
              WHERE t.user_id = @user_id) AS DECIMAL(15, 2)) AS ledger_balance,
        CAST((SELECT COALESCE(SUM(amount), 0) FROM dbo.debts
              WHERE user_id = @user_id AND settled_at IS NULL AND direction = 'owed_to_me') AS DECIMAL(15, 2)) AS owed_to_me,
        CAST((SELECT COALESCE(SUM(amount), 0) FROM dbo.debts
              WHERE user_id = @user_id AND settled_at IS NULL AND direction = 'i_owe') AS DECIMAL(15, 2)) AS i_owe`,
    { user_id: userId }),
    db.query(`
      SELECT TOP (1) id, actual_balance, book_balance, difference, transaction_id,
             CONVERT(VARCHAR(19), created_at, 126) AS created_at
      FROM dbo.wallet_checks
      WHERE user_id = @user_id
      ORDER BY created_at DESC, id DESC`, { user_id: userId })
  ]);

  const b = balances[0];
  res.json({
    ...b,
    expected_balance: b.ledger_balance - b.owed_to_me + b.i_owe,
    last_check: last[0] || null
  });
}));

router.post("/check", asyncRoute(async (req, res) => {
  const body = req.body || {};
  const actual = Number(body.actual_balance);
  if (!Number.isFinite(actual) || actual < 0 || actual > v.MAX_AMOUNT) {
    throw new HttpError(400, "INVALID_BALANCE", "Nhập số tiền bạn đang thực sự có (từ 0 trở lên).");
  }
  const rows = await db.execRows("dbo.sp_wallet_check", {
    user_id: req.user.id,
    actual_balance: { type: db.sql.Decimal(15, 2), value: Math.round(actual * 100) / 100 },
    record: Boolean(body.record),
    transaction_date: v.clientDate(body.transaction_date),
    transaction_time: v.clientTime(body.transaction_time)
  });
  const r = rows[0];
  res.status(201).json({
    check_id: r.check_id,
    ledger_balance: r.ledger_balance,
    owed_to_me: r.owed_to_me,
    i_owe: r.i_owe,
    expected_balance: r.book_balance,
    actual_balance: r.actual_balance,
    difference: r.difference,
    transaction_id: r.transaction_id
  });
}));

module.exports = router;
