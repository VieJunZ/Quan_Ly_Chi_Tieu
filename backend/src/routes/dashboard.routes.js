/**
 * @file dashboard.routes.js
 * @description Tuyến API cung cấp dữ liệu tổng quan cho trang chủ (Dashboard).
 * Tính toán tổng thu, tổng chi trong tháng hiện tại, số dư và lấy danh sách giao dịch gần nhất.
 * Endpoint: GET /api/dashboard
 */

const express = require("express");
const storage = require("../services/storage");
const { authenticateToken } = require("../middlewares/auth.middleware");

const router = express.Router();

/**
 * @route   GET /api/dashboard
 * @desc    Lấy số liệu tài chính tổng quan và danh sách giao dịch gần nhất của người dùng
 * @access  Private (Cần Bearer Token trong header)
 * @header  {string} Authorization - Bearer <token>
 * @returns {object} { total_income, total_expense, balance, recent_transactions }
 */
router.get("/", authenticateToken, async (req, res, next) => {
  try {
    // Trích xuất user.id từ JWT token đã được giải mã bởi authenticateToken
    const dashboardData = await storage.getDashboard(req.user.id);
    res.json(dashboardData);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
