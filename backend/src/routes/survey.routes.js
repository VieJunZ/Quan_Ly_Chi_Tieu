/**
 * @file survey.routes.js
 * @description Khảo sát ngắn sau 1 ngày dùng: mỗi chức năng chỉ cần chạm "Thích / Chưa thích / Chưa dùng".
 * Chỉ khi người dùng muốn thêm chức năng mới thì mới phải viết.
 *
 *   GET  /api/survey/status    {due, answered, features[], mine} - frontend gọi khi mở app để biết có hiện khảo sát không,
 *                              mine là câu trả lời cũ để người dùng sửa lại
 *   POST /api/survey           {answers: {voice: "like", ...}, wants_new_feature, suggestion}
 *                              Gửi lần đầu trả 201, gửi lại thì cập nhật câu trả lời cũ và trả 200
 *   POST /api/survey/snooze    "Để sau": hỏi lại sau SURVEY_SNOOZE_HOURS giờ (mặc định 24)
 *   GET  /api/survey/summary   Thống kê thích / chưa thích theo chức năng
 *                              (đề xuất của người dùng chỉ hiện cho tài khoản trong SURVEY_ADMINS)
 */

const express = require("express");
const db = require("../config/db");
const { HttpError, asyncRoute } = require("../lib/http");
const v = require("../lib/validate");
const { authenticateToken } = require("../middlewares/auth.middleware");

const router = express.Router();
router.use(authenticateToken);

const FEATURES = [
  { key: "voice", label: "Nói để ghi chi tiêu" },
  { key: "bill_scan", label: "Up ảnh bill / ảnh chuyển khoản" },
  { key: "sms_paste", label: "Dán tin nhắn ngân hàng" },
  { key: "quick_habit", label: "Gợi ý 1 chạm theo thói quen" },
  { key: "mini_view", label: "Màn hình \"Đã chi hôm nay\"" },
  { key: "split_debt", label: "Chia tiền nhóm & sổ nợ" },
  { key: "wallet_check", label: "Đối soát ví \"tiền bốc hơi\"" },
  { key: "evening_nudge", label: "Nhắc ghi chi tiêu buổi tối" },
  { key: "challenges", label: "Thử thách & huy hiệu" },
  { key: "weekly_review", label: "Tổng kết tuần & việc nên làm" }
];
const FEATURE_KEYS = new Set(FEATURES.map((f) => f.key));
const ANSWERS = new Set(["like", "dislike", "unused"]);

function hoursFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

router.get("/status", asyncRoute(async (req, res) => {
  const rows = await db.query(`
    SELECT u.is_demo,
           CAST(CASE WHEN r.id IS NULL THEN 0 ELSE 1 END AS BIT) AS answered,
           r.answers, r.wants_new_feature, r.suggestion,
           DATEDIFF(MINUTE, u.created_at, SYSDATETIME()) AS minutes_since_signup,
           CAST(CASE WHEN u.survey_snoozed_until > SYSDATETIME() THEN 1 ELSE 0 END AS BIT) AS snoozed
    FROM dbo.users AS u
    LEFT JOIN dbo.survey_responses AS r ON r.user_id = u.id
    WHERE u.id = @user_id`, { user_id: req.user.id });
  const u = rows[0];
  if (!u) throw new HttpError(404, "USER_NOT_FOUND", "Không tìm thấy người dùng.");

  const delayMinutes = hoursFromEnv("SURVEY_DELAY_HOURS", 24) * 60;
  const due = !u.is_demo && !u.answered && !u.snoozed && u.minutes_since_signup >= delayMinutes;
  let mine = null;
  if (u.answered) {
    let answers = {};
    try { answers = JSON.parse(u.answers) || {}; } catch { /* dữ liệu cũ hỏng thì coi như chưa chọn */ }
    mine = { answers, wants_new_feature: Boolean(u.wants_new_feature), suggestion: u.suggestion || "" };
  }
  res.json({ due, answered: Boolean(u.answered), is_demo: Boolean(u.is_demo), features: FEATURES, mine });
}));

router.post("/", asyncRoute(async (req, res) => {
  if (req.user.is_demo) {
    throw new HttpError(403, "DEMO_ACCOUNT", "Tài khoản dùng thử không tham gia khảo sát. Đăng ký để góp ý nhé!");
  }
  const body = req.body || {};
  const raw = body.answers && typeof body.answers === "object" && !Array.isArray(body.answers) ? body.answers : {};

  const answers = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!FEATURE_KEYS.has(key)) continue;
    if (!ANSWERS.has(value)) throw new HttpError(400, "INVALID_ANSWER", "Câu trả lời không hợp lệ.", { feature: key });
    answers[key] = value;
  }

  const wantsNew = Boolean(body.wants_new_feature);
  const suggestion = v.cleanText(body.suggestion, 1000) || null;
  if (wantsNew && !suggestion) {
    throw new HttpError(400, "SUGGESTION_REQUIRED", "Bạn muốn thêm chức năng gì? Viết vài chữ giúp mình nhé.");
  }
  if (Object.keys(answers).length === 0 && !wantsNew) {
    throw new HttpError(400, "EMPTY_SURVEY", "Chạm chọn ít nhất một chức năng nhé.");
  }

  // Mỗi người một bản góp ý: có rồi thì sửa, chưa có thì thêm (UNIQUE(user_id) vẫn giữ để chặn trùng)
  const inputs = {
    user_id: req.user.id,
    answers: JSON.stringify(answers),
    wants_new_feature: wantsNew,
    suggestion: wantsNew ? suggestion : null
  };
  const save = () => db.query(`
    UPDATE dbo.survey_responses
    SET answers = @answers, wants_new_feature = @wants_new_feature, suggestion = @suggestion, updated_at = SYSDATETIME()
    WHERE user_id = @user_id;
    IF @@ROWCOUNT = 0
    BEGIN
        INSERT INTO dbo.survey_responses (user_id, answers, wants_new_feature, suggestion)
        VALUES (@user_id, @answers, @wants_new_feature, @suggestion);
        SELECT CAST(1 AS BIT) AS created;
    END
    ELSE
        SELECT CAST(0 AS BIT) AS created;`, inputs);

  let rows;
  try {
    rows = await save();
  } catch (error) {
    // Hai lần gửi cùng lúc: lần sau đụng UNIQUE thì chạy lại để thành cập nhật
    if (error.number !== 2627 && error.number !== 2601) throw error;
    rows = await save();
  }
  const created = Boolean(rows[0] && rows[0].created);
  res.status(created ? 201 : 200).json({
    success: true,
    updated: !created,
    message: created ? "Cảm ơn bạn đã góp ý!" : "Đã cập nhật góp ý của bạn."
  });
}));

router.post("/snooze", asyncRoute(async (req, res) => {
  const hours = hoursFromEnv("SURVEY_SNOOZE_HOURS", 24);
  await db.query(`UPDATE dbo.users SET survey_snoozed_until = DATEADD(MINUTE, @minutes, SYSDATETIME()) WHERE id = @user_id`,
    { user_id: req.user.id, minutes: Math.round(hours * 60) });
  res.json({ success: true, snoozed_hours: hours });
}));

router.get("/summary", asyncRoute(async (req, res) => {
  const admins = String(process.env.SURVEY_ADMINS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const isAdmin = admins.includes(String(req.user.username).toLowerCase());

  const [counts, total, suggestions] = await Promise.all([
    db.query("SELECT feature, like_count, dislike_count, unused_count FROM dbo.vw_survey_summary"),
    db.query("SELECT COUNT(*) AS responses, SUM(CAST(wants_new_feature AS INT)) AS wants_new FROM dbo.survey_responses"),
    isAdmin
      ? db.query(`SELECT TOP (100) suggestion, CONVERT(VARCHAR(19), created_at, 126) AS created_at
                  FROM dbo.survey_responses WHERE wants_new_feature = 1 ORDER BY created_at DESC`)
      : Promise.resolve(undefined)
  ]);

  const byKey = new Map(counts.map((c) => [c.feature, c]));
  res.json({
    responses: total[0].responses,
    wants_new_feature: total[0].wants_new || 0,
    features: FEATURES.map((f) => ({
      ...f,
      like: byKey.get(f.key)?.like_count || 0,
      dislike: byKey.get(f.key)?.dislike_count || 0,
      unused: byKey.get(f.key)?.unused_count || 0
    })),
    ...(suggestions ? { suggestions } : {})
  });
}));

module.exports = router;
