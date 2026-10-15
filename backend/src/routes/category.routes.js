/**
 * @file category.routes.js
 * @description Tuyến API quản lý danh mục thu/chi (Categories).
 * Endpoint: GET /api/categories
 */

const express = require("express");
const storage = require("../services/storage");

const router = express.Router();

/**
 * @route   GET /api/categories
 * @desc    Lấy danh sách các danh mục thu nhập và chi tiêu
 * @access  Public
 * @query   {string} [type] - Tùy chọn lọc theo loại: 'income' (thu) hoặc 'expense' (chi)
 */
router.get("/", async (req, res, next) => {
  try {
    const { type } = req.query;
    const categories = await storage.getCategories(type);
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
