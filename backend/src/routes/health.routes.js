/**
 * @file health.routes.js
 * @description Tuyến API kiểm tra sức khỏe và tình trạng kết nối của Server & Database.
 * Endpoint: GET /api/health
 */

const express = require("express");
const router = express.Router();
const storage = require("../services/storage");

/**
 * @route   GET /api/health
 * @desc    Kiểm tra trạng thái hoạt động của server và chế độ lưu trữ dữ liệu
 * @access  Public
 */
router.get("/health", async (req, res, next) => {
  try {
    const status = await storage.getHealthStatus();
    res.json(status);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
