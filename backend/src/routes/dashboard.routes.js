/**
 * @file dashboard.routes.js
 * @description Số liệu tổng quan.
 *
 *   GET /api/dashboard?month=YYYY-MM&today=YYYY-MM-DD
 *       Tổng thu/chi của tháng, số dư toàn bộ, chi theo danh mục, giao dịch gần nhất, hôm nay
 *   GET /api/dashboard/day?date=YYYY-MM-DD
 *       Tổng một ngày (Mini-View "Đã chi hôm nay", lời nhắc buổi tối)
 *   GET /api/dashboard/suggestions?today=YYYY-MM-DD&now=HH:mm
 *       Gợi ý 1 chạm: khoản hay ghi vào khoảng giờ này mà hôm nay chưa ghi
 *   GET /api/dashboard/nudge?today=YYYY-MM-DD&now=HH:mm
 *       Có nên hỏi "Hôm nay bạn có tiêu gì không?" (sau NUDGE_HOUR giờ, mặc định 20h, chưa ghi gì, chưa đánh dấu)
 *   PUT    /api/dashboard/no-spend {date}  Đánh dấu "hôm nay không tiêu gì"
 *   DELETE /api/dashboard/no-spend?date=   Bỏ đánh dấu
 *   GET /api/dashboard/mini?today=YYYY-MM-DD&now=HH:mm
 *       Mini-View: đã chi hôm nay, còn được tiêu hôm nay (theo ngân sách), chuỗi ngày, thú cưng ví tiền
 *   GET /api/dashboard/calendar?month=YYYY-MM
 *       Lịch nhiệt: chi từng ngày trong tháng kèm mức màu 0-4
 *   GET /api/dashboard/streak?today=YYYY-MM-DD
 *       Chuỗi ngày ghi chép liên tiếp (ngày "không tiêu gì" cũng được tính)
 */

const express = require("express");
const db = require("../config/db");
const { HttpError, asyncRoute } = require("../lib/http");
const v = require("../lib/validate");
const { authenticateToken } = require("../middlewares/auth.middleware");
const { budgetStatus, streak } = require("../services/budget.service");
const { petMood } = require("../services/pet.service");

const router = express.Router();
router.use(authenticateToken);

router.get("/", asyncRoute(async (req, res) => {
  const today = v.clientDate(req.query.today);
  const month = req.query.month || today.slice(0, 7);
  const range = v.monthRange(month);
  if (!range) throw new HttpError(400, "INVALID_MONTH", "Tháng không đúng định dạng YYYY-MM.");
  const userId = req.user.id;

  // Gộp 5 truy vấn vào một lần gửi (trang chủ được mở nhiều nhất, mỗi lượt đi về CSDL đều tốn thời gian)
  const [monthSummary, allTime, recent, todaySummary, byCategory] = await db.queryMulti(`
    EXEC dbo.sp_get_summary_by_user @user_id = @user_id, @from_date = @from_date, @to_date = @to_date;
    EXEC dbo.sp_get_summary_by_user @user_id = @user_id;
    EXEC dbo.sp_get_transactions_ex @user_id = @user_id, @limit = 10;
    EXEC dbo.sp_get_day_summary @user_id = @user_id, @day = @day;
    SELECT c.id AS category_id, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
           c.type, CAST(SUM(t.amount) AS DECIMAL(15, 2)) AS total, COUNT(*) AS transaction_count
    FROM dbo.transactions AS t
    JOIN dbo.categories   AS c ON c.id = t.category_id
    WHERE t.user_id = @user_id AND t.transaction_date BETWEEN @from_date AND @to_date
    GROUP BY c.id, c.name, c.icon, c.color, c.type
    ORDER BY total DESC;`, { user_id: userId, from_date: range.from, to_date: range.to, day: today });

  const m = monthSummary[0];
  res.json({
    month,
    total_income: m.total_income,
    total_expense: m.total_expense,
    month_balance: m.balance,
    balance: allTime[0].balance,
    transaction_count: m.transaction_count,
    by_category: byCategory,
    recent_transactions: recent,
    today: { ...todaySummary[0], marked_no_spend: Boolean(todaySummary[0].marked_no_spend) }
  });
}));

router.get("/day", asyncRoute(async (req, res) => {
  const day = v.clientDate(req.query.date);
  const rows = await db.execRows("dbo.sp_get_day_summary", { user_id: req.user.id, day });
  res.json({ ...rows[0], marked_no_spend: Boolean(rows[0].marked_no_spend) });
}));

router.get("/suggestions", asyncRoute(async (req, res) => {
  const rows = await db.execRows("dbo.sp_get_habit_suggestions", {
    user_id: req.user.id,
    today: v.clientDate(req.query.today),
    now_time: v.clientTime(req.query.now)
  });
  res.json(rows);
}));

function nudgeHour() {
  const hour = Number(process.env.NUDGE_HOUR);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 20;
}

router.get("/nudge", asyncRoute(async (req, res) => {
  const today = v.clientDate(req.query.today);
  const now = v.clientTime(req.query.now);
  const rows = await db.execRows("dbo.sp_get_day_summary", { user_id: req.user.id, day: today });
  const day = rows[0];
  const lateEnough = Number(now.slice(0, 2)) >= nudgeHour();
  res.json({
    show: lateEnough && day.transaction_count === 0 && !day.marked_no_spend,
    date: today,
    from_hour: nudgeHour(),
    message: "Hôm nay bạn có tiêu gì không?"
  });
}));

router.put("/no-spend", asyncRoute(async (req, res) => {
  const date = v.requireDate(req.body?.date, "date");
  if (date > v.todayLocal(new Date(Date.now() + 24 * 3600 * 1000))) {
    throw new HttpError(400, "INVALID_DATE", "Không đánh dấu trước cho ngày chưa tới.");
  }
  await db.query(`
    IF NOT EXISTS (SELECT 1 FROM dbo.day_marks WHERE user_id = @user_id AND mark_date = @date AND kind = 'no_spend')
      INSERT INTO dbo.day_marks (user_id, mark_date, kind) VALUES (@user_id, @date, 'no_spend');`,
  { user_id: req.user.id, date });
  res.json({ success: true, date, marked_no_spend: true });
}));

router.delete("/no-spend", asyncRoute(async (req, res) => {
  const date = v.requireDate(req.query.date, "date");
  await db.query("DELETE FROM dbo.day_marks WHERE user_id = @user_id AND mark_date = @date AND kind = 'no_spend'",
    { user_id: req.user.id, date });
  res.json({ success: true, date, marked_no_spend: false });
}));

router.get("/mini", asyncRoute(async (req, res) => {
  const today = v.clientDate(req.query.today);
  const now = v.clientTime(req.query.now);
  const userId = req.user.id;
  const [dayRows, budget, streakRow, userRows, equippedRows] = await Promise.all([
    db.execRows("dbo.sp_get_day_summary", { user_id: userId, day: today }),
    budgetStatus(userId, today),
    streak(userId, today),
    db.query("SELECT coins, pet_fullness, ISNULL(badge_points, 3) AS badge_points FROM dbo.users WHERE id = @user_id", { user_id: userId }),
    db.query(`
      SELECT s.slot, s.id AS item_id, s.name, s.rarity
      FROM dbo.user_inventory AS i
      JOIN dbo.pet_shop_items AS s ON s.id = i.item_id
      WHERE i.user_id = @user_id AND i.is_equipped = 1`, { user_id: userId })
  ]);
  const day = dayRows[0];
  const petStats = petMood({ today, now, nudgeHour: nudgeHour(), streak: streakRow, budget });
  const user = userRows[0] || { coins: 100, pet_fullness: 80, badge_points: 3 };
  const equipped = {};
  for (const item of equippedRows) {
    equipped[item.slot] = { id: item.item_id, name: item.name, rarity: item.rarity };
  }

  res.json({
    date: today,
    spent_today: day.spent,
    received_today: day.received,
    transaction_count: day.transaction_count,
    marked_no_spend: Boolean(day.marked_no_spend),
    budget: budget.has_budget
      ? {
        amount: budget.budget,
        is_inherited: budget.is_inherited,
        spent_month: budget.spent_month,
        remaining_month: budget.remaining_month,
        days_left: budget.days_left,
        daily_allowance: budget.daily_allowance,
        left_today: budget.left_today
      }
      : null,
    streak: streakRow,
    pet: {
      ...petStats,
      coins: user.coins,
      pet_fullness: user.pet_fullness,
      badge_points: user.badge_points ?? 3,
      equipped
    }
  });
}));

router.get("/streak", asyncRoute(async (req, res) => {
  res.json(await streak(req.user.id, v.clientDate(req.query.today)));
}));

/**
 * Mức màu lịch nhiệt: có ngân sách thì so với mức chi dự kiến mỗi ngày
 * (<= 50%, <= 100%, <= 150%, > 150%), chưa có thì so với ngày chi nhiều nhất trong tháng.
 */
function heatLevel(spent, reference) {
  if (!spent || spent <= 0) return 0;
  if (!reference || reference <= 0) return 4;
  const ratio = spent / reference;
  if (ratio <= 0.5) return 1;
  if (ratio <= 1) return 2;
  if (ratio <= 1.5) return 3;
  return 4;
}

router.get("/calendar", asyncRoute(async (req, res) => {
  const month = req.query.month || v.clientDate(req.query.today).slice(0, 7);
  const range = v.monthRange(month);
  if (!range) throw new HttpError(400, "INVALID_MONTH", "Tháng không đúng định dạng YYYY-MM.");
  const userId = req.user.id;

  const [days, budget] = await Promise.all([
    db.execRows("dbo.sp_get_month_calendar", { user_id: userId, month_start: range.from }),
    budgetStatus(userId, range.from)
  ]);
  const maxSpent = days.reduce((max, d) => Math.max(max, d.spent), 0);
  const planned = budget.has_budget ? budget.planned_daily : null;
  // Không có ngân sách: lấy 2/3 ngày chi nhiều nhất làm mốc để ngày nhiều nhất luôn là mức 4
  const reference = planned || (maxSpent * 2) / 3;

  res.json({
    month,
    planned_daily: planned,
    max_spent: maxSpent,
    total_spent: days.reduce((sum, d) => sum + d.spent, 0),
    total_received: days.reduce((sum, d) => sum + d.received, 0),
    days: days.map((d) => ({ ...d, no_spend: Boolean(d.no_spend), level: heatLevel(d.spent, reference) }))
  });
}));

module.exports = router;
