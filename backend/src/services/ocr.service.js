/**
 * @file ocr.service.js
 * @description Đọc chữ trong ảnh hóa đơn / ảnh chụp màn hình ngân hàng (tesseract.js, chạy ngay trên máy chủ)
 * và tạo "dấu vân tay" của ảnh để phát hiện người dùng tải lại cùng một ảnh.
 *
 *   - sha256 của file: trùng hệt từng byte.
 *   - dHash 64 bit: ảnh gần giống (chụp lại, nén lại, đổi kích thước) vẫn ra mã gần nhau.
 *
 * Dữ liệu ngôn ngữ (vie + eng, khoảng 15 MB) tải về một lần rồi lưu ở backend/.cache/tessdata.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Jimp = require("jimp");
const { createWorker } = require("tesseract.js");

const CACHE_DIR = path.resolve(__dirname, "..", "..", ".cache", "tessdata");
const LANGS = ["vie", "eng"];
const OCR_TIMEOUT_MS = Number(process.env.OCR_TIMEOUT_MS) || 60000;

let workerPromise = null;
let queue = Promise.resolve();

function getWorker() {
  if (!workerPromise) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    workerPromise = createWorker(LANGS, 1, {
      cachePath: CACHE_DIR,
      ...(process.env.TESSDATA_URL ? { langPath: process.env.TESSDATA_URL } : {})
    }).then(async (worker) => {
      // PSM 4: một cột chữ có nhiều cỡ. Mặc định (PSM 6, khối chữ đều cỡ) bỏ sót dòng số tiền chữ to
      // trên màn hình chuyển khoản. Giữ khoảng trắng để "Tổng cộng      75.000" còn trên cùng một dòng.
      await worker.setParameters({ tessedit_pageseg_mode: "4", preserve_interword_spaces: "1" });
      return worker;
    }).catch((error) => {
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

/** Đã có sẵn dữ liệu ngôn ngữ trong máy chưa (để trang tình trạng báo cho người dùng). */
function languageDataReady() {
  return LANGS.every((lang) => fs.existsSync(path.join(CACHE_DIR, `${lang}.traineddata`)));
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function averageBrightness(image) {
  const { data, width, height } = image.bitmap;
  let total = 0;
  // Lấy mẫu thưa cho nhanh
  const step = Math.max(1, Math.floor((width * height) / 20000)) * 4;
  let count = 0;
  for (let i = 0; i < data.length; i += step) {
    total += data[i];
    count++;
  }
  return count ? total / count : 255;
}

/**
 * dHash: thu nhỏ còn 9x8 ô xám, so sánh từng ô với ô bên phải -> 64 bit -> 16 ký tự hex.
 * Hai ảnh giống nhau sau khi nén / đổi cỡ chỉ lệch vài bit.
 */
async function differenceHash(image) {
  const small = image.clone().greyscale().resize(9, 8, Jimp.RESIZE_BILINEAR);
  let bits = "";
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const left = Jimp.intToRGBA(small.getPixelColor(x, y)).r;
      const right = Jimp.intToRGBA(small.getPixelColor(x + 1, y)).r;
      bits += left > right ? "1" : "0";
    }
  }
  let hex = "";
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

/**
 * Nhị phân hóa thích nghi: mỗi điểm ảnh so với độ sáng trung bình vùng quanh nó (tính nhanh bằng ảnh tích phân),
 * tối hơn trung bình một chút thì thành đen, còn lại thành trắng.
 * Dùng cho ảnh chụp hóa đơn bị bóng tối loang: ngưỡng chung cho cả ảnh làm mất nguyên phần bị tối,
 * còn ngưỡng theo vùng thì phần tối vẫn tách được chữ khỏi nền.
 */
function adaptiveThreshold(image, { radius, k = 0.1 }) {
  const { width: w, height: h, data } = image.bitmap;
  const stride = w + 1;
  const integral = new Float64Array(stride * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += data[(y * w + x) * 4];
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + rowSum;
    }
  }
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius), y1 = Math.min(h, y + radius + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - radius), x1 = Math.min(w, x + radius + 1);
      const sum = integral[y1 * stride + x1] - integral[y0 * stride + x1] - integral[y1 * stride + x0] + integral[y0 * stride + x0];
      const mean = sum / ((x1 - x0) * (y1 - y0));
      const i = (y * w + x) * 4;
      const v = data[i] < mean * (1 - k) ? 0 : 255;
      data[i] = data[i + 1] = data[i + 2] = v;
    }
  }
  return image;
}

/**
 * Làm ảnh dễ đọc hơn: xám, đủ lớn, tăng tương phản; ảnh nền tối (chế độ tối của app ngân hàng) thì đảo màu.
 * adaptive = true: thay bước tăng tương phản bằng nhị phân hóa thích nghi (cho ảnh chụp bị bóng).
 */
async function prepareForOcr(image, { adaptive = false } = {}) {
  const prepared = image.clone().greyscale();
  const { width } = prepared.bitmap;
  // Tesseract đọc tốt nhất khi chữ cao khoảng 20-60 px; phóng to quá thì bỏ sót dòng số tiền chữ to
  if (width > 2000) prepared.resize(2000, Jimp.AUTO);
  else if (width < 500) prepared.resize(width * 2, Jimp.AUTO);
  if (averageBrightness(prepared) < 110) prepared.invert();
  prepared.normalize();
  if (adaptive) adaptiveThreshold(prepared, { radius: Math.max(8, Math.round(prepared.bitmap.width / 50)) });
  else prepared.contrast(0.25);
  return prepared.getBufferAsync(Jimp.MIME_PNG);
}

/** Lượt đọc dưới mức này thì đọc lại lần nữa bằng nhị phân hóa thích nghi (ảnh chụp màn hình thường > 90). */
const RETRY_BELOW_CONFIDENCE = 90;

/** Điểm của một lượt đọc: độ tin cậy x số ký tự chữ/số. Lượt bỏ sót nửa hóa đơn sẽ thua lượt đọc đủ. */
function ocrScore(data) {
  const chars = String(data.text || "").replace(/[^\p{L}\p{N}]/gu, "").length;
  return (data.confidence || 0) * chars;
}

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error("OCR quá thời gian"), { code: "OCR_TIMEOUT" })), ms);
    })
  ]).finally(() => clearTimeout(timer));
}

/**
 * Đọc ảnh: trả về chữ, mã vân tay và kích thước.
 * Các yêu cầu được xếp hàng lần lượt vì một worker chỉ xử lý được một ảnh một lúc.
 * @param {Buffer} buffer - nội dung file ảnh
 */
async function analyzeImage(buffer) {
  let image;
  try {
    image = await Jimp.read(buffer);
  } catch {
    throw Object.assign(new Error("Không đọc được file ảnh"), { code: "INVALID_IMAGE" });
  }

  const fingerprint = { file_sha256: sha256(buffer), image_dhash: await differenceHash(image) };
  const prepared = await prepareForOcr(image);

  const run = queue.then(async () => {
    const worker = await getWorker();
    const { data } = await worker.recognize(prepared);
    if ((data.confidence || 0) >= RETRY_BELOW_CONFIDENCE) return data;
    // Đọc chưa chắc (thường là ảnh chụp thật, có bóng / nghiêng): đọc lại bằng cách khác rồi lấy lượt tốt hơn.
    // Không dùng cách này cho mọi ảnh vì nó làm mất chữ trắng trên nền màu (banner số tiền của app ngân hàng).
    const retry = (await worker.recognize(await prepareForOcr(image, { adaptive: true }))).data;
    return ocrScore(retry) > ocrScore(data) ? retry : data;
  });
  queue = run.catch(() => {});
  const data = await withTimeout(run, OCR_TIMEOUT_MS);

  return {
    ...fingerprint,
    text: String(data.text || "").replace(/[ \t]+\n/g, "\n").trim(),
    ocr_confidence: Math.round(data.confidence || 0) / 100,
    width: image.bitmap.width,
    height: image.bitmap.height
  };
}

/** Số bit khác nhau giữa hai dHash (0 = giống hệt). */
function hammingDistance(hexA, hexB) {
  let distance = 0;
  for (let i = 0; i < 16; i++) {
    let x = parseInt(hexA[i], 16) ^ parseInt(hexB[i], 16);
    while (x) { distance += x & 1; x >>= 1; }
  }
  return distance;
}

/**
 * Khóa nội dung: hai lần đưa vào cùng một giao dịch (ảnh khác nhau hoặc dán lại tin nhắn)
 * vẫn ra cùng khóa. Có mã giao dịch thì dùng mã, không thì dùng số tiền + ngày giờ.
 */
function contentKey({ doc_kind, direction, amount, transaction_date, transaction_time, reference_code, date_found }) {
  if (!amount) return null;
  if (reference_code) return sha256(`ref|${reference_code}`);
  if (!date_found) return null; // không có ngày giờ trên chứng từ thì không đủ căn cứ để nói là trùng
  return sha256(`${doc_kind}|${direction}|${amount}|${transaction_date}|${transaction_time}`);
}

async function shutdown() {
  if (!workerPromise) return;
  const worker = await workerPromise.catch(() => null);
  workerPromise = null;
  if (worker) await worker.terminate();
}

module.exports = {
  analyzeImage,
  differenceHash,
  hammingDistance,
  contentKey,
  sha256,
  getWorker,
  languageDataReady,
  shutdown,
  CACHE_DIR
};
