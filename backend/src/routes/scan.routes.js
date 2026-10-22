/**
 * @file scan.routes.js
 * @description Nhập nhanh không cần gõ tay. Các API này CHỈ đọc và đề xuất, chưa ghi giao dịch:
 * người dùng xác nhận ("Có xác nhận 75.000 ₫ cho Phúc Long không?") rồi frontend mới gọi
 * POST /api/transactions với source = bill/sms/voice và scan_id.
 *
 *   POST /api/scan/image  (multipart: image, today, now)  Ảnh hóa đơn / chụp màn hình ngân hàng
 *   POST /api/scan/text   {text, today, now}              Dán tin nhắn biến động số dư
 *   POST /api/scan/voice  {text, today, now}              Câu nói đã chuyển thành chữ, có thể nhiều khoản
 *
 * Kết quả quét ảnh/tin nhắn kèm danh sách "duplicates": những lần đã ghi trước đó trùng file,
 * trùng nội dung (cùng mã giao dịch hoặc cùng số tiền + thời điểm) hoặc ảnh gần giống cùng số tiền.
 */

const express = require("express");
const multer = require("multer");
const db = require("../config/db");
const { HttpError, asyncRoute } = require("../lib/http");
const v = require("../lib/validate");
const { authenticateToken } = require("../middlewares/auth.middleware");
const { createRateLimiter } = require("../middlewares/rateLimit.middleware");
const ocr = require("../services/ocr.service");
const { parseDocument, parseVoice } = require("../services/textParse.service");

const router = express.Router();
router.use(authenticateToken);

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
// Jimp đọc được các định dạng này. Ảnh HEIC của iPhone được Safari tự đổi sang JPEG khi tải lên.
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/bmp", "image/gif", "image/tiff"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 10 },
  fileFilter(req, file, cb) {
    if (IMAGE_TYPES.has(file.mimetype)) return cb(null, true);
    cb(new HttpError(415, "UNSUPPORTED_IMAGE", "Chỉ nhận ảnh JPG, PNG, BMP, GIF hoặc TIFF."));
  }
});

const ocrLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: "Bạn quét ảnh quá nhanh. Đợi một chút rồi thử lại nhé."
});

function clientContext(source) {
  return { today: v.clientDate(source.today), now: v.clientTime(source.now) };
}

function requireText(value, maxLength, code) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new HttpError(400, code, "Chưa có nội dung để đọc.");
  if (text.length > maxLength) throw new HttpError(400, code, `Nội dung quá dài (tối đa ${maxLength} ký tự).`);
  return text;
}

function occurredAt(parsed) {
  return parsed.date_found ? `${parsed.transaction_date} ${parsed.transaction_time}:00` : null;
}

/** Tìm các lần đã ghi trùng rồi lưu lần quét này (chưa gắn giao dịch). */
async function saveScan(userId, inputKind, parsed, rawText, fingerprint = {}) {
  const contentKey = ocr.contentKey(parsed);
  const duplicates = await db.execRows("dbo.sp_find_duplicate_scans", {
    user_id: userId,
    file_sha256: fingerprint.file_sha256 || null,
    image_dhash: fingerprint.image_dhash || null,
    content_key: contentKey,
    amount: parsed.amount
  });

  const rows = await db.query(`
    INSERT INTO dbo.receipt_scans
        (user_id, input_kind, file_sha256, image_dhash, content_key, doc_kind, direction, amount, occurred_at, reference_code, raw_text)
    OUTPUT INSERTED.id
    VALUES (@user_id, @input_kind, @file_sha256, @image_dhash, @content_key, @doc_kind, @direction, @amount,
            @occurred_at, @reference_code, @raw_text)`, {
    user_id: userId,
    input_kind: inputKind,
    file_sha256: fingerprint.file_sha256 || null,
    image_dhash: fingerprint.image_dhash || null,
    content_key: contentKey,
    doc_kind: parsed.doc_kind,
    direction: parsed.direction,
    amount: parsed.amount,
    occurred_at: occurredAt(parsed),
    reference_code: parsed.reference_code,
    raw_text: rawText.slice(0, 4000)
  });

  return { scan_id: rows[0].id, duplicates };
}

function scanResponse(saved, parsed, rawText, extra = {}) {
  return {
    scan_id: saved.scan_id,
    doc_kind: parsed.doc_kind,
    type: parsed.direction,
    amount: parsed.amount,
    note: parsed.note,
    category_id: parsed.category_id,
    transaction_date: parsed.transaction_date,
    transaction_time: parsed.transaction_time,
    date_found: parsed.date_found,
    reference_code: parsed.reference_code,
    confidence: parsed.confidence,
    ignored_balance: parsed.ignored_balance,
    duplicates: saved.duplicates,
    raw_text: rawText,
    ...extra
  };
}

router.post("/image", ocrLimiter, (req, res, next) => {
  upload.single("image")(req, res, (error) => (error ? next(error) : next()));
}, asyncRoute(async (req, res) => {
  if (!req.file) throw new HttpError(400, "IMAGE_REQUIRED", "Chưa chọn ảnh.");
  const context = clientContext(req.body || {});

  let analysis;
  try {
    analysis = await ocr.analyzeImage(req.file.buffer);
  } catch (error) {
    if (error.code === "INVALID_IMAGE") throw new HttpError(400, "INVALID_IMAGE", "File không phải ảnh hoặc ảnh bị hỏng.");
    if (error.code === "OCR_TIMEOUT") throw new HttpError(503, "OCR_TIMEOUT", "Đọc ảnh lâu quá. Thử ảnh rõ hơn hoặc nhỏ hơn nhé.");
    throw new HttpError(503, "OCR_UNAVAILABLE", "Chưa đọc được ảnh lúc này (có thể máy chủ chưa tải xong dữ liệu tiếng Việt).");
  }

  const parsed = parseDocument(analysis.text, context);
  const saved = await saveScan(req.user.id, "image", parsed, analysis.text, analysis);
  res.status(201).json(scanResponse(saved, parsed, analysis.text, { ocr_confidence: analysis.ocr_confidence }));
}));

router.post("/text", asyncRoute(async (req, res) => {
  const text = requireText(req.body?.text, 2000, "INVALID_TEXT");
  const context = clientContext(req.body);
  const parsed = parseDocument(text, context);

  // Dán nhầm câu thường ("ăn phở 40k") vào ô tin nhắn ngân hàng: gợi ý luôn các khoản đọc được
  const voiceItems = parsed.doc_kind === "unknown" ? parseVoice(text, context).items : [];
  const saved = await saveScan(req.user.id, "text", parsed, text);
  res.status(201).json(scanResponse(saved, parsed, text, { suggested_items: voiceItems }));
}));

router.post("/voice", asyncRoute(async (req, res) => {
  const text = requireText(req.body?.text, 500, "INVALID_TEXT");
  const result = parseVoice(text, clientContext(req.body));
  res.json({ text, ...result });
}));

module.exports = router;
