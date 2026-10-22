/**
 * @file petShop.routes.js
 * @description API Tiệm đồ thú cưng (Pet Shop), Tủ đồ (Inventory), Trang bị phụ kiện và Lịch sử xu.
 *
 *   GET  /api/pet-shop/items      Lấy danh sách vật phẩm shop kèm số lượng sở hữu & trạng thái đang mặc
 *   POST /api/pet-shop/buy        Mua vật phẩm bằng xu tích lũy
 *   POST /api/pet-shop/equip      Mặc hoặc tháo phụ kiện linh thú
 *   POST /api/pet-shop/use        Sử dụng thức ăn hoặc vật phẩm tiêu hao
 *   GET  /api/pet-shop/pet        Lấy hồ sơ thú cưng đầy đủ (tâm trạng, cấp độ, số xu, độ no, phụ kiện đang mặc)
 *   GET  /api/pet-shop/history    Lịch sử nhận / chi tiêu xu
 */

const express = require("express");
const db = require("../config/db");
const { HttpError, asyncRoute } = require("../lib/http");
const v = require("../lib/validate");
const { authenticateToken } = require("../middlewares/auth.middleware");
const { streak, budgetStatus } = require("../services/budget.service");
const { petMood } = require("../services/pet.service");

const router = express.Router();
router.use(authenticateToken);

/** Giờ nhắc nhở buổi tối (mặc định 19h). */
function nudgeHour() {
  const h = Number(process.env.EVENING_NUDGE_HOUR);
  return Number.isFinite(h) && h >= 0 && h <= 23 ? h : 19;
}

/**
 * GET /api/pet-shop/items
 * Danh sách toàn bộ vật phẩm trong cửa hàng kèm thông tin số xu, độ no, số lượng đã mua và đang mặc
 */
router.get("/items", asyncRoute(async (req, res) => {
  const sets = await db.exec("dbo.sp_get_pet_shop_items", { user_id: req.user.id });
  const userStats = sets[0]?.[0] || { coins: 0, pet_fullness: 0 };
  const items = sets[1] || [];

  res.json({
    success: true,
    coins: userStats.coins,
    pet_fullness: userStats.pet_fullness,
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      slot: item.slot,
      price_coins: item.price_coins,
      rarity: item.rarity,
      required_level: item.required_level,
      description: item.description,
      effect_data: item.effect_data,
      owned_quantity: item.owned_quantity,
      is_equipped: Boolean(item.is_equipped)
    }))
  });
}));

/**
 * POST /api/pet-shop/buy
 * Mua vật phẩm từ cửa hàng bằng xu
 * Body: { item_id: string }
 */
router.post("/buy", asyncRoute(async (req, res) => {
  const itemId = typeof req.body?.item_id === "string" ? req.body.item_id.trim() : "";
  if (!itemId) {
    throw new HttpError(400, "INVALID_ITEM_ID", "Mã vật phẩm không hợp lệ.");
  }

  const rows = await db.execRows("dbo.sp_buy_pet_item", {
    user_id: req.user.id,
    item_id: itemId
  });

  const row = rows[0] || {};
  res.status(200).json({
    success: true,
    message: "Mua vật phẩm thành công!",
    coins: row.coins,
    item_id: row.item_id
  });
}));

/**
 * POST /api/pet-shop/equip
 * Mặc hoặc tháo phụ kiện linh thú
 * Body: { item_id: string, equip?: boolean }
 */
router.post("/equip", asyncRoute(async (req, res) => {
  const itemId = typeof req.body?.item_id === "string" ? req.body.item_id.trim() : "";
  if (!itemId) {
    throw new HttpError(400, "INVALID_ITEM_ID", "Mã vật phẩm không hợp lệ.");
  }

  const shouldEquip = req.body?.equip !== false && req.body?.equip !== 0 && req.body?.equip !== "false";
  const rows = await db.execRows("dbo.sp_equip_pet_item", {
    user_id: req.user.id,
    item_id: itemId,
    equip: shouldEquip ? 1 : 0
  });

  const row = rows[0] || {};
  res.status(200).json({
    success: true,
    message: row.is_equipped ? "Đã trang bị vật phẩm." : "Đã tháo vật phẩm.",
    item_id: row.item_id,
    is_equipped: Boolean(row.is_equipped)
  });
}));

/**
 * POST /api/pet-shop/use
 * Sử dụng thức ăn tăng độ no hoặc bùa hộ mệnh
 * Body: { item_id: string }
 */
router.post("/use", asyncRoute(async (req, res) => {
  const itemId = typeof req.body?.item_id === "string" ? req.body.item_id.trim() : "";
  if (!itemId) {
    throw new HttpError(400, "INVALID_ITEM_ID", "Mã vật phẩm không hợp lệ.");
  }

  const rows = await db.execRows("dbo.sp_use_pet_consumable", {
    user_id: req.user.id,
    item_id: itemId
  });

  const row = rows[0] || {};
  res.status(200).json({
    success: true,
    message: "Sử dụng vật phẩm thành công!",
    item_id: row.item_id,
    remaining_qty: row.remaining_qty,
    pet_fullness: row.pet_fullness
  });
}));

/**
 * GET /api/pet-shop/pet
 * Hồ sơ trạng thái thú cưng: tâm trạng, cấp độ, chuỗi ngày, xu, độ no và danh sách trang bị theo slot
 */
router.get("/pet", asyncRoute(async (req, res) => {
  const today = v.clientDate(req.query.today);
  const now = v.clientTime(req.query.now);
  const userId = req.user.id;

  const [userRows, streakRow, budget, equippedRows] = await Promise.all([
    db.query("SELECT coins, pet_fullness FROM dbo.users WHERE id = @user_id", { user_id: userId }),
    streak(userId, today),
    budgetStatus(userId, today),
    db.query(`
      SELECT s.slot, s.id AS item_id, s.name, s.rarity
      FROM dbo.user_inventory AS i
      JOIN dbo.pet_shop_items AS s ON s.id = i.item_id
      WHERE i.user_id = @user_id AND i.is_equipped = 1`, { user_id: userId })
  ]);

  const user = userRows[0] || { coins: 100, pet_fullness: 80 };
  const moodData = petMood({ today, now, nudgeHour: nudgeHour(), streak: streakRow, budget });

  const equipped = {};
  for (const item of equippedRows) {
    equipped[item.slot] = {
      id: item.item_id,
      name: item.name,
      rarity: item.rarity
    };
  }

  res.json({
    success: true,
    pet: {
      ...moodData,
      coins: user.coins,
      pet_fullness: user.pet_fullness,
      equipped
    }
  });
}));

/**
 * GET /api/pet-shop/history
 * Lịch sử biến động xu của thú cưng
 */
router.get("/history", asyncRoute(async (req, res) => {
  const rows = await db.query(`
    SELECT TOP 50 id, amount, balance_after, reason, item_id,
           CONVERT(VARCHAR(19), created_at, 120) AS created_at
    FROM dbo.pet_coin_history
    WHERE user_id = @user_id
    ORDER BY id DESC`, { user_id: req.user.id });

  res.json({
    success: true,
    history: rows
  });
}));

module.exports = router;
