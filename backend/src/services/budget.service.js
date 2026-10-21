/**
 * @file budget.service.js
 * @description Đọc trạng thái ngân sách và chuỗi ngày ghi chép (dùng chung cho /api/budget và /api/dashboard).
 */

const db = require("../config/db");

async function budgetStatus(userId, today) {
  const rows = await db.execRows("dbo.sp_get_budget_status", { user_id: userId, today });
  const r = rows[0];
  return { ...r, is_inherited: Boolean(r.is_inherited), has_budget: r.budget !== null };
}

async function streak(userId, today) {
  const rows = await db.execRows("dbo.sp_get_streak", { user_id: userId, today });
  return { ...rows[0], recorded_today: Boolean(rows[0].recorded_today) };
}

module.exports = { budgetStatus, streak };
