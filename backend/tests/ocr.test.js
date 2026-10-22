/**
 * Kiểm thử đọc ảnh thật (OCR + bóc tách) với ảnh mẫu trong tests/fixtures.
 * Cần dữ liệu ngôn ngữ trong backend/.cache/tessdata (tự tải khi máy chủ đọc ảnh lần đầu);
 * chưa có thì bỏ qua để `npm test` vẫn chạy được khi mất mạng.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const ocr = require("../src/services/ocr.service");
const { parseDocument } = require("../src/services/textParse.service");

const FIX = path.join(__dirname, "fixtures");
const CTX = { today: "2026-10-20", now: "08:41" };
const skip = ocr.languageDataReady() ? false : "chưa có dữ liệu ngôn ngữ OCR trong .cache/tessdata";

async function read(file) {
  const { text } = await ocr.analyzeImage(fs.readFileSync(path.join(FIX, file)));
  return parseDocument(text, CTX);
}

test.after(() => ocr.shutdown());

test("ảnh chụp hóa đơn bị bóng tối: đọc đủ tổng tiền, ngày giờ, danh mục", { skip, timeout: 120000 }, async () => {
  const r = await read("hoa_don_chup_bong.png");
  assert.equal(r.doc_kind, "receipt");
  assert.equal(r.amount, 225000);
  assert.equal(r.transaction_date, "2019-03-29");
  assert.equal(r.transaction_time, "23:59");
  assert.equal(r.category_id, 1);
});

test("ảnh chụp màn hình rõ nét vẫn đọc đúng như trước", { skip, timeout: 120000 }, async () => {
  assert.equal((await read("hoa_don.png")).amount, 75000);
  assert.equal((await read("chuyen_khoan.png")).amount, 250000);
  const income = await read("nhan_tien_nen_toi.png");
  assert.equal(income.amount, 1500000);
  assert.equal(income.direction, "income");
  assert.equal((await read("thong_bao_ngan_hang.png")).amount, 180000);
});
