/**
 * @file challenge.routes.js
 * @description Thử thách tiết kiệm theo thói quen, huy hiệu và "việc nên làm tiếp theo".
 *
 *   GET  /api/challenges?today=          {active, finished, suggestions, badges, stats}
 *                                        Tiến độ tính lại mỗi lần gọi, thử thách hết hạn được chốt thắng / thua tại đây
 *   POST /api/challenges                 {key, level, days, today} - nhận một thử thách gợi ý (tối đa 5 cái cùng lúc)
 *   POST /api/challenges/:id/abandon     Bỏ cuộc
 *   GET  /api/challenges/insights?today= {actions[], save_monthly_total, week} - gợi ý cắt giảm cụ thể và tổng kết tuần
 */

const express = require("express");
const { HttpError, asyncRoute } = require("../lib/http");
const v = require("../lib/validate");
const { authenticateToken } = require("../middlewares/auth.middleware");
const challenges = require("../services/challenge.service");

const router = express.Router();
router.use(authenticateToken);

router.get("/", asyncRoute(async (req, res) => {
  const data = await challenges.overview(req.user.id, v.clientDate(req.query.today));
  res.json({ success: true, ...data });
}));

router.get("/insights", asyncRoute(async (req, res) => {
  const data = await challenges.insights(req.user.id, v.clientDate(req.query.today));
  res.json({ success: true, ...data });
}));

router.post("/", asyncRoute(async (req, res) => {
  const body = req.body || {};
  const key = typeof body.key === "string" ? body.key.trim() : "";
  if (!/^[a-z_]+(:[a-z0-9_]+)?$/.test(key) || key.length > 40) {
    throw new HttpError(400, "INVALID_CHALLENGE", "Thử thách không hợp lệ.");
  }
  const days = Number(body.days || 7);
  const level = typeof body.level === "string" ? body.level : "medium";
  const data = await challenges.start(req.user.id, { key, level, days, today: v.clientDate(body.today) });
  res.status(201).json({ success: true, message: "Bắt đầu thử thách! Cố lên nhé.", challenge: data });
}));

router.post("/:id/abandon", asyncRoute(async (req, res) => {
  await challenges.abandon(req.user.id, v.requireId(req.params.id));
  res.json({ success: true, message: "Đã dừng thử thách. Lần sau mình thử mức nhẹ hơn nhé." });
}));

module.exports = router;
