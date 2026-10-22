/**
 * @file category.routes.js
 * @description Danh mục thu/chi.
 *
 *   GET  /api/categories?type=expense   Danh mục mặc định + danh mục riêng (nếu đã đăng nhập)
 *                                       Đã đăng nhập: theo thứ tự người dùng sắp, bỏ danh mục đã ẩn;
 *                                       thêm &include_hidden=1 để lấy cả danh mục ẩn (màn Cài đặt)
 *   POST /api/categories                Tạo danh mục riêng
 *   PUT  /api/categories/order          Lưu thứ tự {type, ids: [id theo thứ tự mới]}
 *   PUT  /api/categories/:id            Sửa danh mục riêng {name, icon, color}
 *   PUT  /api/categories/:id/hidden     Ẩn/hiện danh mục {hidden: true|false}
 */

const express = require("express");
const db = require("../config/db");
const { HttpError, asyncRoute } = require("../lib/http");
const { cleanText, requireId } = require("../lib/validate");
const { authenticateToken, optionalAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

function readType(value, required) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new HttpError(400, "INVALID_TYPE", "Loại danh mục phải là income hoặc expense.");
    return null;
  }
  if (value !== "income" && value !== "expense") {
    throw new HttpError(400, "INVALID_TYPE", "Loại danh mục phải là income hoặc expense.");
  }
  return value;
}

function readIcon(value) {
  return /^[a-z0-9-]{1,50}$/.test(String(value || "")) ? value : null;
}

function readColor(value) {
  return /^[a-z]{1,30}$/.test(String(value || "")) ? value : null;
}

router.get("/", optionalAuth, asyncRoute(async (req, res) => {
  const type = readType(req.query.type, false);
  if (!req.user) {
    const rows = await db.execRows("dbo.sp_get_categories_for_user", { user_id: null, type });
    return res.json(rows.map((row) => ({ ...row, is_default: Boolean(row.is_default) })));
  }
  const rows = await db.execRows("dbo.sp_get_categories_view", {
    user_id: req.user.id,
    type,
    include_hidden: req.query.include_hidden === "1" || req.query.include_hidden === "true"
  });
  res.json(rows.map((row) => ({ ...row, is_default: Boolean(row.is_default), is_hidden: Boolean(row.is_hidden) })));
}));

router.post("/", authenticateToken, asyncRoute(async (req, res) => {
  const name = cleanText(req.body?.name, 100);
  if (!name) throw new HttpError(400, "INVALID_CATEGORY_NAME", "Tên danh mục không được để trống.");
  const icon = readIcon(req.body?.icon);
  const color = readColor(req.body?.color);

  const rows = await db.execRows("dbo.sp_add_category", {
    user_id: req.user.id,
    name,
    type: readType(req.body?.type, true),
    icon,
    color
  });
  res.status(201).json({ ...rows[0], is_default: false });
}));

// Đặt trước "/:id" để "order" không bị hiểu nhầm là id
router.put("/order", authenticateToken, asyncRoute(async (req, res) => {
  const type = readType(req.body?.type, true);
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || ids.length > 200 || !ids.every((id) => Number.isInteger(id) && id > 0)) {
    throw new HttpError(400, "INVALID_CATEGORY_ORDER", "Thứ tự danh mục không hợp lệ.");
  }
  await db.execRows("dbo.sp_save_category_order", {
    user_id: req.user.id,
    type,
    ids_json: JSON.stringify(ids)
  });
  res.json({ success: true, message: "Đã lưu thứ tự danh mục." });
}));

router.put("/:id", authenticateToken, asyncRoute(async (req, res) => {
  const name = cleanText(req.body?.name, 100);
  if (!name) throw new HttpError(400, "INVALID_CATEGORY_NAME", "Tên danh mục không được để trống.");
  const rows = await db.execRows("dbo.sp_update_category", {
    user_id: req.user.id,
    category_id: requireId(req.params.id, "INVALID_CATEGORY", "Danh mục không hợp lệ."),
    name,
    icon: readIcon(req.body?.icon),
    color: readColor(req.body?.color)
  });
  res.json({ ...rows[0], is_default: false });
}));

router.put("/:id/hidden", authenticateToken, asyncRoute(async (req, res) => {
  if (typeof req.body?.hidden !== "boolean") {
    throw new HttpError(400, "INVALID_HIDDEN", "Trường hidden phải là true hoặc false.");
  }
  await db.execRows("dbo.sp_set_category_hidden", {
    user_id: req.user.id,
    category_id: requireId(req.params.id, "INVALID_CATEGORY", "Danh mục không hợp lệ."),
    hidden: req.body.hidden
  });
  res.json({ success: true, hidden: req.body.hidden, message: req.body.hidden ? "Đã ẩn danh mục." : "Đã hiện lại danh mục." });
}));

module.exports = router;
