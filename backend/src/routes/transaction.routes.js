/**
 * @file transaction.routes.js
 * @description Giao dịch thu/chi.
 *
 *   GET    /api/transactions             Lọc theo month=YYYY-MM | from,to; type; category_id; q; limit
 *   GET    /api/transactions/months      Các tháng có giao dịch (số khoản, tổng chi, tổng thu) cho bộ chọn tháng
 *   GET    /api/transactions/:id         Một giao dịch
 *   POST   /api/transactions             Thêm một giao dịch (có giờ và nguồn nhập)
 *   POST   /api/transactions/batch       Thêm nhiều giao dịch một lần (một câu nói có nhiều khoản)
 *   PUT    /api/transactions/:id         Sửa giao dịch
 *   DELETE /api/transactions/:id         Xóa giao dịch
 */

const express = require("express");
const db = require("../config/db");
const { HttpError, asyncRoute } = require("../lib/http");
const v = require("../lib/validate");
const { authenticateToken } = require("../middlewares/auth.middleware");

const router = express.Router();
router.use(authenticateToken);

// Nguồn nhập client được phép gửi; 'split', 'reconcile', 'demo' chỉ do máy chủ tạo
const CLIENT_SOURCES = new Set(["manual", "voice", "bill", "sms", "quick"]);
const MAX_BATCH = 20;

/** Kiểm tra và chuẩn hóa một giao dịch gửi lên. */
function readTransaction(body = {}) {
  const source = body.source === undefined ? "manual" : String(body.source);
  if (!CLIENT_SOURCES.has(source)) {
    throw new HttpError(400, "INVALID_SOURCE", "Nguồn nhập không hợp lệ.");
  }
  return {
    category_id: v.requireId(body.category_id, "INVALID_CATEGORY", "Vui lòng chọn danh mục."),
    amount: v.requireAmount(body.amount),
    note: v.cleanText(body.note, 500) || null,
    transaction_date: v.requireDate(body.transaction_date),
    transaction_time: v.optionalTime(body.transaction_time),
    source,
    scan_id: v.optionalId(body.scan_id)
  };
}

async function addTransaction(userId, item, scope) {
  const rows = await db.execRows("dbo.sp_add_transaction_ex", { user_id: userId, ...item }, scope);
  return rows[0];
}

router.get("/", asyncRoute(async (req, res) => {
  const { month, from, to, type, category_id: categoryId, q, limit } = req.query;
  let fromDate = null;
  let toDate = null;

  if (month) {
    const range = v.monthRange(month);
    if (!range) throw new HttpError(400, "INVALID_MONTH", "Tháng không đúng định dạng YYYY-MM.");
    fromDate = range.from;
    toDate = range.to;
  } else {
    if (from) fromDate = v.requireDate(from, "from");
    if (to) toDate = v.requireDate(to, "to");
  }
  if (type && type !== "income" && type !== "expense") {
    throw new HttpError(400, "INVALID_TYPE", "Loại giao dịch phải là income hoặc expense.");
  }

  const rows = await db.execRows("dbo.sp_get_transactions_ex", {
    user_id: req.user.id,
    from_date: fromDate,
    to_date: toDate,
    type: type || null,
    category_id: v.optionalId(categoryId),
    keyword: v.cleanText(q, 100) || null,
    limit: Math.min(Math.max(Number.parseInt(limit, 10) || 200, 1), 1000)
  });
  res.json(rows);
}));

// Phải đứng trước "/:id". Người dùng ghi hóa đơn của năm trước thì nhìn vào đây biết dữ liệu nằm ở tháng nào.
router.get("/months", asyncRoute(async (req, res) => {
  const rows = await db.query(`
    SELECT CONVERT(CHAR(7), t.transaction_date, 120) AS month,
           COUNT(*) AS transaction_count,
           SUM(CASE WHEN c.type = 'expense' THEN t.amount ELSE 0 END) AS total_expense,
           SUM(CASE WHEN c.type = 'income'  THEN t.amount ELSE 0 END) AS total_income
    FROM dbo.transactions AS t
    JOIN dbo.categories   AS c ON c.id = t.category_id
    WHERE t.user_id = @user_id
    GROUP BY CONVERT(CHAR(7), t.transaction_date, 120)
    ORDER BY month DESC`, { user_id: req.user.id });
  res.json(rows);
}));

router.get("/:id", asyncRoute(async (req, res) => {
  const rows = await db.execRows("dbo.sp_get_transaction_ex", { user_id: req.user.id, id: v.requireId(req.params.id) });
  if (!rows[0]) throw new HttpError(404, "TRANSACTION_NOT_FOUND", "Không tìm thấy giao dịch.");
  res.json(rows[0]);
}));

router.post("/", asyncRoute(async (req, res) => {
  const item = readTransaction(req.body);
  res.status(201).json(await addTransaction(req.user.id, item));
}));

router.post("/batch", asyncRoute(async (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError(400, "EMPTY_BATCH", "Không có khoản nào để ghi.");
  }
  if (items.length > MAX_BATCH) {
    throw new HttpError(400, "BATCH_TOO_LARGE", `Mỗi lần ghi tối đa ${MAX_BATCH} khoản.`);
  }

  // Kiểm tra hết trước khi ghi: một khoản sai thì báo rõ khoản thứ mấy, không ghi gì cả
  const clean = items.map((item, index) => {
    try {
      return readTransaction(item);
    } catch (error) {
      if (error instanceof HttpError) error.extra = { ...(error.extra || {}), index };
      throw error;
    }
  });

  const created = await db.withTransaction(async (tx) => {
    const result = [];
    for (const item of clean) result.push(await addTransaction(req.user.id, item, tx));
    return result;
  });
  res.status(201).json(created);
}));

router.put("/:id", asyncRoute(async (req, res) => {
  const id = v.requireId(req.params.id);
  const item = readTransaction({ ...req.body, source: "manual", scan_id: null });

  const rows = await db.query(`
    IF NOT EXISTS (SELECT 1 FROM dbo.categories WHERE id = @category_id AND (user_id IS NULL OR user_id = @user_id))
      THROW 50003, N'Danh mục không tồn tại hoặc không thuộc người dùng.', 1;

    UPDATE dbo.transactions
    SET category_id = @category_id, amount = @amount, note = @note,
        transaction_date = @transaction_date, transaction_time = @transaction_time
    WHERE id = @id AND user_id = @user_id;

    SELECT @@ROWCOUNT AS updated;`,
  {
    id,
    user_id: req.user.id,
    category_id: item.category_id,
    amount: item.amount,
    note: item.note,
    transaction_date: item.transaction_date,
    transaction_time: { type: db.sql.VarChar(8), value: item.transaction_time }
  });
  if (!rows[0] || !rows[0].updated) throw new HttpError(404, "TRANSACTION_NOT_FOUND", "Không tìm thấy giao dịch.");

  const updated = await db.execRows("dbo.sp_get_transaction_ex", { user_id: req.user.id, id });
  res.json(updated[0]);
}));

router.delete("/:id", asyncRoute(async (req, res) => {
  const rows = await db.execRows("dbo.sp_delete_transaction", { user_id: req.user.id, id: v.requireId(req.params.id) });
  res.json({ success: true, deleted_id: rows[0].deleted_id });
}));

module.exports = router;
