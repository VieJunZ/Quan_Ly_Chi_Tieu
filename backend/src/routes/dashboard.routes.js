// backend/src/routes/dashboard.routes.js
const express = require("express");
const storage = require("../services/storage");
const { authenticateToken } = require("../middlewares/auth.middleware");

const router = express.Router();

// Lấy thông tin Dashboard tổng quan (Yêu cầu đăng nhập)
router.get("/", authenticateToken, async (req, res, next) => {
  try {
    const dashboardData = await storage.getDashboard(req.user.id);
    res.json(dashboardData);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
