// backend/src/routes/transaction.routes.js
const express = require("express");
const storage = require("../services/storage");
const { authenticateToken } = require("../middlewares/auth.middleware");

const router = express.Router();

// Tạo giao dịch mới (Yêu cầu đăng nhập)
router.post("/", authenticateToken, async (req, res, next) => {
  try {
    const { category_id, amount, note, transaction_date } = req.body || {};

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Số tiền giao dịch phải lớn hơn 0.",
        error_code: "INVALID_AMOUNT"
      });
    }

    const numCategoryId = Number(category_id);
    if (!numCategoryId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn danh mục hợp lệ.",
        error_code: "INVALID_CATEGORY"
      });
    }

    const category = await storage.getCategoryById(numCategoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục được chọn.",
        error_code: "CATEGORY_NOT_FOUND"
      });
    }

    const dateStr = String(transaction_date || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({
        success: false,
        message: "Ngày giao dịch không đúng định dạng (YYYY-MM-DD).",
        error_code: "INVALID_DATE"
      });
    }

    const result = await storage.createTransaction({
      user_id: req.user.id,
      category_id: numCategoryId,
      amount: numAmount,
      note: String(note || "").trim(),
      transaction_date: dateStr
    });

    res.status(201).json({
      transaction_id: result.transaction_id,
      amount: result.amount,
      message: "Tạo giao dịch thành công"
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
