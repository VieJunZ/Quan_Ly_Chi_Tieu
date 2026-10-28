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
 * Danh sách toàn bộ vật phẩm trong cửa hàng kèm thông tin số xu, huy hiệu, độ no, số lượng đã mua và đang mặc
 */
router.get("/items", asyncRoute(async (req, res) => {
  const sets = await db.exec("dbo.sp_get_pet_shop_items", { user_id: req.user.id });
  const userStats = sets[0]?.[0] || { coins: 0, pet_fullness: 0, badge_points: 3 };
  const items = sets[1] || [];

  res.json({
    success: true,
    coins: userStats.coins,
    pet_fullness: userStats.pet_fullness,
    badge_points: userStats.badge_points ?? 3,
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      slot: item.slot,
      price_coins: item.price_coins,
      price_badges: item.price_badges || 0,
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
    badge_points: row.badge_points,
    item_id: row.item_id
  });
}));

/**
 * POST /api/pet-shop/hatch-egg
 * Mua & Ấp mở trứng linh thú ngẫu nhiên bằng Huy hiệu hoặc Xu
 * Body: { egg_id: string, pay_with?: 'badges' | 'coins' }
 */
router.post("/hatch-egg", asyncRoute(async (req, res) => {
  const userId = req.user.id;
  const eggId = typeof req.body?.egg_id === "string" ? req.body.egg_id.trim() : "egg_elemental";
  const payWith = req.body?.pay_with === "coins" ? "coins" : "badges";

  // Lấy thông tin quả trứng
  const eggRows = await db.query(
    "SELECT id, name, slot, price_coins, price_badges, rarity, description, effect_data FROM dbo.pet_shop_items WHERE id = @id AND is_active = 1",
    { id: eggId }
  );
  const egg = eggRows[0];
  if (!egg || egg.slot !== "egg") {
    throw new HttpError(404, "EGG_NOT_FOUND", "Trứng linh thú không tồn tại.");
  }

  // Lấy thông tin tài khoản người dùng
  const userRows = await db.query(
    "SELECT coins, pet_fullness, ISNULL(badge_points, 3) AS badge_points FROM dbo.users WHERE id = @id",
    { id: userId }
  );
  const user = userRows[0] || { coins: 0, pet_fullness: 80, badge_points: 0 };

  let priceBadges = egg.price_badges || 1;
  let priceCoins = egg.price_coins || 80;

  if (payWith === "badges") {
    if (user.badge_points < priceBadges) {
      throw new HttpError(
        400,
        "NOT_ENOUGH_BADGES",
        `Bạn cần ${priceBadges} huy hiệu để mở trứng này (Hiện có: ${user.badge_points} huy hiệu). Hãy hoàn thành thêm thử thách nhé!`
      );
    }
  } else {
    if (user.coins < priceCoins) {
      throw new HttpError(
        400,
        "NOT_ENOUGH_COINS",
        `Bạn cần ${priceCoins} xu để mở trứng này (Hiện có: ${user.coins} xu).`
      );
    }
  }

  // Xử lý pool gacha
  let pool = [];
  try {
    const parsed = typeof egg.effect_data === "string" ? JSON.parse(egg.effect_data) : egg.effect_data;
    if (eggId === "egg_elemental") {
      // 80% ra ngũ hành thường, 20% ra thần thú jackpot
      const isJackpot = Math.random() < 0.20 && Array.isArray(parsed.bonus_pool) && parsed.bonus_pool.length > 0;
      pool = isJackpot ? parsed.bonus_pool : (parsed.pool || []);
    } else {
      pool = parsed.pool || [];
    }
  } catch {
    pool = ["pet_moc", "pet_hoa", "pet_tho", "pet_kim", "pet_thuy"];
  }

  if (!pool.length) {
    pool = ["pet_moc", "pet_hoa", "pet_tho", "pet_kim", "pet_thuy"];
  }

  // Chọn ngẫu nhiên linh thú nở ra
  const selectedPetId = pool[Math.floor(Math.random() * pool.length)];

  // Lấy thông tin chi tiết linh thú
  const petRows = await db.query(
    "SELECT id, name, slot, rarity, description, effect_data FROM dbo.pet_shop_items WHERE id = @id",
    { id: selectedPetId }
  );
  const hatchedPet = petRows[0];
  if (!hatchedPet) {
    throw new HttpError(500, "PET_ROLL_ERROR", "Lỗi khi nở linh thú. Vui lòng thử lại.");
  }

  // Kiểm tra người dùng đã sở hữu linh thú này chưa
  const invRows = await db.query(
    "SELECT quantity, is_equipped FROM dbo.user_inventory WHERE user_id = @user_id AND item_id = @item_id",
    { user_id: userId, item_id: selectedPetId }
  );
  const existingInv = invRows[0];
  const isNew = !existingInv || existingInv.quantity <= 0;

  // Kiểm tra xem người dùng hiện đã có linh thú nào đang đồng hành chưa
  const currentEquippedPet = await db.query(
    `SELECT i.item_id FROM dbo.user_inventory AS i
     JOIN dbo.pet_shop_items AS s ON s.id = i.item_id
     WHERE i.user_id = @user_id AND s.slot = 'pet' AND i.is_equipped = 1`,
    { user_id: userId }
  );
  const shouldAutoEquip = isNew && currentEquippedPet.length === 0;

  // Trừ chi phí mở trứng
  let newBadges = user.badge_points;
  let newCoins = user.coins;
  let newFullness = user.pet_fullness;
  let duplicateReward = null;

  if (payWith === "badges") {
    newBadges -= priceBadges;
  } else {
    newCoins -= priceCoins;
  }

  // Nếu mở trùng linh thú: tặng quà bù đắp (+40 xu và +25 độ no)
  if (!isNew) {
    newCoins += 40;
    newFullness = Math.min(100, newFullness + 25);
    duplicateReward = { coins: 40, fullness: 25 };
  }

  // Cập nhật CSDL
  await db.query(
    "UPDATE dbo.users SET coins = @coins, badge_points = @badge_points, pet_fullness = @pet_fullness WHERE id = @id",
    { id: userId, coins: newCoins, badge_points: newBadges, pet_fullness: newFullness }
  );

  if (isNew) {
    if (existingInv) {
      await db.query(
        "UPDATE dbo.user_inventory SET quantity = 1, is_equipped = @eq WHERE user_id = @user_id AND item_id = @item_id",
        { user_id: userId, item_id: selectedPetId, eq: shouldAutoEquip ? 1 : 0 }
      );
    } else {
      await db.query(
        "INSERT INTO dbo.user_inventory (user_id, item_id, quantity, is_equipped) VALUES (@user_id, @item_id, 1, @eq)",
        { user_id: userId, item_id: selectedPetId, eq: shouldAutoEquip ? 1 : 0 }
      );
    }

    // Tự động cấp 2 skin miễn phí cho linh thú mới nở
    await db.query(`
      INSERT INTO dbo.user_inventory (user_id, item_id, quantity, is_equipped)
      SELECT @user_id, s.id, 1, IIF(@eq = 1 AND s.id LIKE '%_default', 1, 0)
      FROM dbo.pet_shop_items AS s
      WHERE s.slot = 'skin'
        AND JSON_VALUE(s.effect_data, '$.pet_id') = @item_id
        AND JSON_VALUE(s.effect_data, '$.is_free_with_pet') = 'true'
        AND NOT EXISTS (
          SELECT 1 FROM dbo.user_inventory AS inv
          WHERE inv.user_id = @user_id AND inv.item_id = s.id
        )
    `, { user_id: userId, item_id: selectedPetId, eq: shouldAutoEquip ? 1 : 0 });
  }

  // Ghi nhật ký xu
  const coinDiff = (payWith === "coins" ? -priceCoins : 0) + (duplicateReward ? duplicateReward.coins : 0);
  if (coinDiff !== 0) {
    await db.query(
      `INSERT INTO dbo.pet_coin_history (user_id, amount, balance_after, reason, item_id)
       VALUES (@user_id, @amount, @balance_after, @reason, @item_id)`,
      {
        user_id: userId,
        amount: coinDiff,
        balance_after: newCoins,
        reason: isNew ? `Ấp trứng [${egg.name}] nở ra: ${hatchedPet.name}` : `Ấp trùng [${hatchedPet.name}], bù đắp xu`,
        item_id: eggId
      }
    );
  }

  res.status(200).json({
    success: true,
    message: isNew
      ? `Chúc mừng bạn! Quả trứng đã nở ra: ${hatchedPet.name}!`
      : `Bạn đã sở hữu ${hatchedPet.name}. Nhận được 40 xu và 25 điểm no bù đắp!`,
    is_new: isNew,
    egg: {
      id: egg.id,
      name: egg.name
    },
    pet: {
      id: hatchedPet.id,
      name: hatchedPet.name,
      slot: hatchedPet.slot,
      rarity: hatchedPet.rarity,
      description: hatchedPet.description,
      effect_data: hatchedPet.effect_data,
      is_new: isNew,
      is_equipped: shouldAutoEquip
    },
    duplicate_reward: duplicateReward,
    coins: newCoins,
    badge_points: newBadges,
    pet_fullness: newFullness
  });
}));

/**
 * POST /api/pet-shop/equip
 * Mặc hoặc tháo phụ kiện linh thú hoặc chọn Linh Thú đồng hành
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
    message: row.is_equipped ? "Đã trang bị / chọn đồng hành." : "Đã tháo trang bị.",
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
 * Hồ sơ trạng thái thú cưng: tâm trạng, cấp độ, chuỗi ngày, xu, huy hiệu, độ no và danh sách trang bị theo slot
 */
router.get("/pet", asyncRoute(async (req, res) => {
  const today = v.clientDate(req.query.today);
  const now = v.clientTime(req.query.now);
  const userId = req.user.id;

  const [userRows, streakRow, budget, equippedRows] = await Promise.all([
    db.query("SELECT coins, pet_fullness, ISNULL(badge_points, 3) AS badge_points FROM dbo.users WHERE id = @user_id", { user_id: userId }),
    streak(userId, today),
    budgetStatus(userId, today),
    db.query(`
      SELECT s.slot, s.id AS item_id, s.name, s.rarity, s.effect_data
      FROM dbo.user_inventory AS i
      JOIN dbo.pet_shop_items AS s ON s.id = i.item_id
      WHERE i.user_id = @user_id AND i.is_equipped = 1`, { user_id: userId })
  ]);

  const user = userRows[0] || { coins: 100, pet_fullness: 80, badge_points: 3 };
  const moodData = petMood({ today, now, nudgeHour: nudgeHour(), streak: streakRow, budget });

  const equipped = {};
  for (const item of equippedRows) {
    equipped[item.slot] = {
      id: item.item_id,
      name: item.name,
      rarity: item.rarity,
      effect_data: item.effect_data
    };
  }

  res.json({
    success: true,
    pet: {
      ...moodData,
      coins: user.coins,
      pet_fullness: user.pet_fullness,
      badge_points: user.badge_points ?? 3,
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
