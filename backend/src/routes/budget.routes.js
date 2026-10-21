/**
 * @file budget.routes.js
 * @description Ngân sách tháng. Từ ngân sách suy ra mức được tiêu mỗi ngày:
 * hôm nay tiêu ít thì ngày mai được tiêu nhiều hơn.
 *
 *   GET    /api/budget?today=YYYY-MM-DD     Ngân sách tháng này, đã chi, mức mỗi ngày, "còn được tiêu hôm nay"
 *   PUT    /api/budget {amount, month}      Đặt ngân sách (month dạng YYYY-MM, mặc định tháng hiện tại)
 *   DELETE /api/budget?month=YYYY-MM        Bỏ ngân sách của tháng đó
 */

const express = require("express");
const db = require("../config/db");
const { HttpError, asyncRoute } = require("../lib/http");
const v = require("../lib/validate");
const { authenticateToken } = require("../middlewares/auth.middleware");
const { budgetStatus } = require("../services/budget.service");

const router = express.Router();
router.use(authenticateToken);

function monthStart(value, today) {
  const month = value === undefined || value === null || value === "" ? today.slice(0, 7) : String(value);
  if (!v.monthRange(month)) throw new HttpError(400, "INVALID_MONTH", "Tháng không đúng định dạng YYYY-MM.");
  return `${month}-01`;
}

router.get("/", asyncRoute(async (req, res) => {
  res.json(await budgetStatus(req.user.id, v.clientDate(req.query.today)));
}));

router.put("/", asyncRoute(async (req, res) => {
  const body = req.body || {};
  const today = v.clientDate(body.today);
  const start = monthStart(body.month, today);
  const amount = v.requireAmount(body.amount);
  await db.query(`
    UPDATE dbo.budgets SET amount = @amount, updated_at = SYSDATETIME()
    WHERE user_id = @user_id AND month_start = @month_start;
    IF @@ROWCOUNT = 0
      INSERT INTO dbo.budgets (user_id, month_start, amount) VALUES (@user_id, @month_start, @amount);`,
  { user_id: req.user.id, month_start: start, amount: { type: db.sql.Decimal(15, 2), value: amount } });

  // Trả về trạng thái của tháng vừa đặt (nếu là tháng khác thì tính theo ngày đầu tháng đó)
  const statusDay = start.slice(0, 7) === today.slice(0, 7) ? today : start;
  res.json(await budgetStatus(req.user.id, statusDay));
}));

router.delete("/", asyncRoute(async (req, res) => {
  const start = monthStart(req.query.month, v.clientDate(req.query.today));
  const rows = await db.query(`
    DELETE FROM dbo.budgets WHERE user_id = @user_id AND month_start = @month_start;
    SELECT @@ROWCOUNT AS deleted;`, { user_id: req.user.id, month_start: start });
  if (!rows[0].deleted) throw new HttpError(404, "BUDGET_NOT_FOUND", "Tháng này chưa đặt ngân sách.");
  res.json({ success: true, month: start.slice(0, 7) });
}));

module.exports = router;
