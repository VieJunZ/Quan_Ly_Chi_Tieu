/**
 * @file transaction.routes.js
 * @description Tuyến API ghi chép giao dịch thu/chi cá nhân (Transactions).
 * Yêu cầu xác thực tài khoản qua middleware authenticateToken.
 * Endpoint: POST /api/transactions
 */

const express = require("express");
const storage = require("../services/storage");
const { authenticateToken } = require("../middlewares/auth.middleware");

const router = express.Router();

/**
 * @route   POST /api/transactions
 * @desc    Tạo mới một khoản giao dịch thu hoặc chi
 * @access  Private (Cần Bearer Token trong header)
 * @header  {string} Authorization - Bearer <token>
 * @body    {number} category_id - ID danh mục chi tiêu/thu nhập
 * @body    {number} amount - Số tiền giao dịch (phải > 0)
 * @body    {string} [note] - Ghi chú diễn giải
 * @body    {string} transaction_date - Ngày diễn ra giao dịch (định dạng YYYY-MM-DD)
 */
router.post("/", authenticateToken, async (req, res, next) => {
  try {
    const { category_id, amount, note, transaction_date } = req.body || {};

    // 1. Kiểm tra số tiền giao dịch
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Số tiền giao dịch phải lớn hơn 0.",
        error_code: "INVALID_AMOUNT"
      });
    }

    // 2. Kiểm tra danh mục
    const numCategoryId = Number(category_id);
    if (!numCategoryId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn danh mục hợp lệ.",
        error_code: "INVALID_CATEGORY"
      });
    }

    // 3. Kiểm tra danh mục có tồn tại trong hệ thống hay không
    const category = await storage.getCategoryById(numCategoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục được chọn.",
        error_code: "CATEGORY_NOT_FOUND"
      });
    }

    // 4. Kiểm tra định dạng ngày tháng YYYY-MM-DD
    const dateStr = String(transaction_date || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({
        success: false,
        message: "Ngày giao dịch không đúng định dạng (YYYY-MM-DD).",
        error_code: "INVALID_DATE"
      });
    }

    // 5. Lưu giao dịch gắn với user_id được trích xuất từ JWT token
    const result = await storage.createTransaction({
      user_id: req.user.id,
      category_id: numCategoryId,
      amount: numAmount,
      note: String(note || "").trim(),
      transaction_date: dateStr
    });

    // 6. Trả về kết quả thành công HTTP 201 Created
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
