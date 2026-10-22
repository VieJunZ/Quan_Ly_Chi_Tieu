/**
 * @file textParse.service.js
 * @description Hiểu tiếng Việt trong 3 kiểu dữ liệu đầu vào, không cần mạng hay dịch vụ ngoài:
 *   1. Câu nói (giọng nói đã chuyển thành chữ): "hôm nay ăn phở 40k rồi đổ xăng 50 nghìn"
 *      -> nhiều khoản, mỗi khoản có số tiền, ghi chú, danh mục đoán, ngày giờ.
 *   2. Tin nhắn / thông báo biến động số dư của ngân hàng (dán vào hoặc chụp màn hình).
 *   3. Chữ đọc được từ ảnh hóa đơn (OCR).
 * Số dư tài khoản (SD, Số dư khả dụng...) luôn bị bỏ qua, không bị nhầm thành số tiền giao dịch.
 */

/* ===========================================================================
   Tiện ích chuỗi
   =========================================================================== */

/** Bỏ dấu tiếng Việt, đ -> d, chữ thường. Giữ nguyên độ dài chuỗi NFC để đối chiếu vị trí. */
function fold(text) {
  return String(text || "")
    .normalize("NFC")
    .split("")
    .map((ch) => ch.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D") || ch)
    .join("")
    .toLowerCase();
}

function capitalize(text) {
  const clean = String(text || "").trim();
  return clean ? clean[0].toUpperCase() + clean.slice(1) : clean;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function shiftDate(isoDate, days) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function makeDate(y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/* ===========================================================================
   Danh mục: đoán từ từ khóa (id theo danh mục mặc định trong seed_categories.sql)
   =========================================================================== */

const CATEGORY_KEYWORDS = [
  // Thu
  { id: 10, type: "income", words: ["luong", "lam them", "part time", "parttime", "tien cong", "ban hang"] },
  { id: 11, type: "income", words: ["thuong", "li xi", "lixi", "mung tuoi"] },
  { id: 12, type: "income", words: ["hoc bong", "tro cap", "bo me gui", "ba me gui", "me gui", "bo gui", "ba gui", "ma gui",
    "bo me cho", "ba me cho", "me cho", "bo cho", "gia dinh gui", "tien thang"] },
  // Chi: đặt cụm dài/đặc trưng trước cụm ngắn
  { id: 5, type: "expense", words: ["tien dien", "tien nuoc", "dien nuoc", "wifi", "internet", "tien mang", "cuoc 4g", "goi 4g",
    "nap dien thoai", "nap the", "nap tien dien thoai", "hoa don dien", "hoa don nuoc", "evn", "gas", "tien rac"] },
  { id: 3, type: "expense", words: ["gui xe", "giu xe", "do xang", "xang", "grab bike", "grabbike", "xe om", "taxi", "xe buyt",
    "xe bus", "ve xe", "sua xe", "rua xe", "thay nhot", "be bike", "xanh sm", "gojek", "ve tau", "ve may bay", "grab car", "grabcar", "be car", "xanh sm taxi"] },
  { id: 2, type: "expense", words: ["tien tro", "phong tro", "tien phong", "tien nha", "thue nha", "nha tro", "dien tich"] },
  { id: 6, type: "expense", words: ["hoc phi", "giao trinh", "sach", "photo", "in tai lieu", "tai lieu", "but", "vo ", "khoa hoc",
    "ielts", "toeic", "hoc them", "le phi thi"] },
  { id: 8, type: "expense", words: ["thuoc", "kham benh", "benh vien", "nha khoa", "vitamin", "khau trang", "phong kham", "tiem"] },
  { id: 7, type: "expense", words: ["xem phim", "phim", "game", "karaoke", "du lich", "netflix", "spotify", "youtube premium",
    "di choi", "sinh nhat", "qua tang", "nhau", "bida", "concert", "ve xem", "cgv", "lotte cinema"] },
  { id: 4, type: "expense", words: ["ao", "quan ao", "quan jean", "quan short", "giay", "dep", "my pham", "son ", "shopee", "lazada", "tiki", "tiktok shop",
    "tui xach", "kinh", "op lung", "tai nghe", "sac", "do dung", "sieu thi", "dau goi", "sua rua mat", "kem danh rang"] },
  { id: 1, type: "expense", words: ["an", "uong", "com", "pho", "bun", "banh", "tra sua", "ca phe", "cafe", "cf", "coffee", "tra da",
    "nuoc mia", "nuoc ngot", "mi ", "lau", "nuong", "bia", "ga ", "pizza", "kfc", "lotteria", "highlands", "phuc long", "trung nguyen",
    "do an", "an vat", "sua", "trai cay", "hoa qua", "grabfood", "grab food", "shopeefood", "shopee food", "befood", "be food", "baemin", "bua", "xoi", "chao", "che", "kem",
    "snack", "an sang", "an trua", "an toi", "gong cha", "tocotoco", "mixue", "circle k", "family mart", "gs25", "7-eleven",
    // Hóa đơn quán: tên quán và tên đồ uống in trên bill
    "nha hang", "quan an", "restaurant", "res", "coca", "pepsi", "sprite", "fanta", "7up", "soda", "tonic", "sting",
    "redbull", "red bull", "nuoc suoi", "lavie", "aquafina", "heineken", "tiger"] }
];

const DEFAULT_CATEGORY = { expense: 9, income: 13 };

function hasWord(folded, word) {
  const w = word.trim();
  const re = new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`);
  return re.test(folded);
}

/** Đoán danh mục từ nội dung. Trả về id danh mục mặc định. */
function guessCategory(text, type = "expense") {
  const folded = ` ${fold(text)} `;
  // Đếm số từ khóa khớp của từng danh mục, lấy danh mục khớp nhiều nhất (hòa thì lấy danh mục đứng trước).
  // Đếm thay vì lấy cái khớp đầu tiên vì hóa đơn có cả địa chỉ ("Quận 5" bỏ dấu thành "quan").
  let best = { id: DEFAULT_CATEGORY[type], hits: 0 };
  for (const group of CATEGORY_KEYWORDS) {
    if (group.type !== type) continue;
    const hits = group.words.filter((word) => hasWord(folded, word)).length;
    if (hits > best.hits) best = { id: group.id, hits };
  }
  return best.id;
}

/* ===========================================================================
   Thu hay chi
   =========================================================================== */

const INCOME_RE = new RegExp([
  "\\bnhan( duoc)?( tien| luong| thuong| hoc bong| tro cap)?\\b",
  "\\bduoc (cho|tang|thuong|tra|li xi|lixi|bo|me)\\b",
  "\\b(luong|thuong|hoc bong|tro cap|li xi|lixi|hoan tien|mung tuoi)\\b",
  "\\b(bo me|ba me|bo|me|ba|ma|anh|chi|ong|ba ngoai|ong ngoai|ba noi|ong noi)\\s*(gui|cho|chuyen)( cho)?( minh| toi| em| tao| to)?\\b",
  "\\bban (duoc|do|hang|lai|sach|quan ao)\\b",
  "\\b(tra no|tra lai tien) (cho )?(minh|toi|tao|to|em)\\b",
  "\\bthu (nhap|tien)\\b"
].join("|"));

function detectType(text) {
  return INCOME_RE.test(fold(text)) ? "income" : "expense";
}

/* ===========================================================================
   1. Câu nói -> danh sách khoản thu/chi
   =========================================================================== */

const DIGIT_WORDS = { khong: 0, mot: 1, hai: 2, ba: 3, bon: 4, nam: 5, sau: 6, bay: 7, tam: 8, chin: 9 };
// Các từ chỉ là số khi đứng sau "mươi": "hai mươi tư", "ba mươi lăm", "hai mươi mốt"
const AFTER_TENS_WORDS = { tu: 4, lam: 5, mot: 1 };

const THOUSAND_UNITS = new Set(["k", "nghin", "ngan", "ng", "ngin", "nghan"]);
const MILLION_UNITS = new Set(["trieu", "tr", "cu", "m"]);
const BILLION_UNITS = new Set(["ty", "ti"]);
const CURRENCY_UNITS = new Set(["d", "dong", "vnd", "vnđ"]);
// Số đứng trước/sau các từ này là giờ, ngày, số lượng... không phải tiền
const NOT_MONEY_NEXT = new Set(["h", "gio", "g", "phut", "p", ":", "/", "-", "thang", "ngay", "nam", "tuoi", "ly", "coc", "cai",
  "chiec", "hop", "goi", "kg", "kilo", "lit", "l", "nguoi", "lan", "buoi", "tuan", "qua", "trai", "phan", "suat", "to", "bat", "dia",
  "ve", "cuon", "quyen", "doi", "bo", "chai", "lon", "lo", "thanh", "mieng", "cay", "km", "met", "m2", "tang", "tieng", "x"]);
const NOT_MONEY_PREV = new Set(["luc", "h", "gio", ":", "/", "-", "ngay", "thang", "thu", "phong", "so", "lop", "tang", "ban", "x"]);
const SPLIT_WORDS = new Set(["va", "voi", "roi", "xong", "them", "cong", "kem", "sau do", "tiep", "con nua"]);
// Bỏ dấu thì nhiều từ trùng nhau ("kèm"/"kem", "trả"/"trà", "đã"/"đá", "chợ"/"cho"):
// các từ này chỉ được coi là từ nối / từ đệm khi viết đúng một trong các dạng dưới đây
const SPLIT_EXACT = { kem: ["kèm"], cong: ["cộng"], them: ["thêm", "them"], voi: ["với", "voi"], roi: ["rồi", "roi"], va: ["và", "va"] };
const FILLER_EXACT = {
  tra: ["trả", "tra"], da: ["đã", "da"], cho: ["cho"], mat: ["mất", "mat"], ton: ["tốn", "ton"], dong: ["đồng", "dong"],
  o: ["ở", "o"], to: ["tớ"], gia: ["giá", "gia"], tam: ["tầm", "tam"], la: ["là", "la"], qua: ["qua"], co: ["có", "co"],
  thi: ["thì"], di: ["đi", "di"], nha: ["nha"], toi: ["tôi", "toi"], chi: ["chị", "chi"], a: ["à", "a"], em: ["em"],
  het: ["hết", "het"], tien: ["tiền", "tien"], moi: ["mới", "moi"], nay: ["nay"], kia: ["kia"]
};
const FILLER_WORDS = new Set(["hom", "nay", "qua", "kia", "toi", "luc", "minh", "tao", "to", "em",
  "anh", "chi", "mua", "het", "mat", "ton", "tra", "la", "co", "da", "vua", "moi", "thi", "duoc", "dc", "di", "cho", "cai",
  "nua", "tien", "voi", "va", "roi", "xong", "them", "khoang", "tam", "gia", "o", "ngay", "dong", "vnd", "nhe", "nha", "a", "ak",
  "oi", "hic", "uh", "u", "ghi", "chi", "tieu", "khoan"]);
// Từ đệm chỉ bỏ ở đầu câu (giữ lại "ăn", "uống" vì là nội dung)
const LEADING_ONLY = new Set(["cho", "tien", "chi", "tra"]);

const PART_OF_DAY = { sang: "07:30", trua: "12:00", chieu: "15:30", toi: "19:30", dem: "22:00" };

function tokenize(text) {
  const tokens = [];
  const re = /\d+(?:[.,]\d+)*|[\p{L}\p{M}]+|[^\s\p{L}\p{M}\d]/gu;
  let match;
  while ((match = re.exec(text))) {
    tokens.push({ raw: match[0], f: fold(match[0]), start: match.index, end: match.index + match[0].length });
  }
  return tokens;
}

/** Đổi các cụm chữ số tiếng Việt thành token số: "hai mươi lăm" -> 25. */
function mergeNumberWords(tokens) {
  const out = [];
  let i = 0;
  while (i < tokens.length) {
    const run = [];
    let j = i;
    while (j < tokens.length) {
      const f = tokens[j].f;
      const prev = run.length ? run[run.length - 1].f : null;
      const isDigit = f in DIGIT_WORDS && f !== "khong";
      // Cụm số phải mở đầu bằng chữ số ("hai", "năm") hoặc "mười"; "2 trăm" (chữ số + trăm) để findAmounts xử lý
      if (!run.length && !(isDigit || (f === "muoi" && !/^\d/.test(tokens[j - 1]?.raw || "")))) break;
      const isAfterTens = prev === "muoi" && f in AFTER_TENS_WORDS;
      const isLinh = (f === "linh" || f === "le") && prev === "tram";
      const isAfterLinh = (prev === "linh" || prev === "le") && isDigit;
      if (f === "muoi" || f === "tram" || isDigit || isAfterTens || isLinh || isAfterLinh) {
        run.push(tokens[j]);
        j++;
      } else {
        break;
      }
    }

    const next = tokens[j] ? tokens[j].f : null;
    const unitFollows = next && (THOUSAND_UNITS.has(next) || MILLION_UNITS.has(next) || BILLION_UNITS.has(next)
      || CURRENCY_UNITS.has(next) || next === "chuc" || next === "ruoi");
    const structured = run.some((t) => t.f === "muoi" || t.f === "tram");

    if (run.length && (unitFollows || (structured && run.length > 1))) {
      let hundreds = 0;
      let tens = 0;
      let pending = null;
      for (const t of run) {
        if (t.f === "tram") { hundreds = pending ?? 1; pending = null; }
        else if (t.f === "muoi") { tens = pending ?? 1; pending = null; }
        else if (t.f === "linh" || t.f === "le") { /* "một trăm linh năm" */ }
        else pending = t.f in DIGIT_WORDS ? DIGIT_WORDS[t.f] : AFTER_TENS_WORDS[t.f];
      }
      const value = hundreds * 100 + tens * 10 + (pending ?? 0);
      // "hai trăm" (không có nghìn phía sau) giữ dạng "2 trăm" để bước sau hiểu là 200 nghìn
      if (run[run.length - 1].f === "tram" && tens === 0 && pending === null && !unitFollows) {
        out.push({ raw: String(hundreds), f: String(hundreds), num: hundreds, start: run[0].start, end: run[run.length - 2]?.end ?? run[0].end, words: true });
        out.push(run[run.length - 1]);
      } else {
        out.push({ raw: String(value), f: String(value), num: value, start: run[0].start, end: run[run.length - 1].end, words: true });
      }
      i = j;
    } else {
      out.push(tokens[i]);
      i++;
    }
  }
  return out;
}

/** "30.000" -> 30000, "1,5" -> 1.5, "1.200.000" -> 1200000 */
function parseNumberToken(raw) {
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(raw)) return { value: Number(raw.replace(/[.,]/g, "")), grouped: true };
  if (/^\d+[.,]\d{1,2}$/.test(raw)) return { value: Number(raw.replace(",", ".")), decimal: true };
  if (/^\d+$/.test(raw)) return { value: Number(raw) };
  return null;
}

function isNumberToken(token) {
  if (!token || token.f === "__used__") return false;
  return token.num !== undefined || /^\d/.test(token.raw);
}

function tokenValue(token) {
  if (token.num !== undefined) return { value: token.num };
  return parseNumberToken(token.raw);
}

/**
 * Tìm các số tiền trong dãy token. Trả về [{value, start, end, startIndex, endIndex, guessed}]
 * guessed = true khi người dùng nói số trống không ("trà sữa 30") và ta hiểu là 30 nghìn.
 */
function findAmounts(tokens, { allowBare = true } = {}) {
  const amounts = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!isNumberToken(tok)) continue;
    const parsed = tokenValue(tok);
    if (!parsed) continue;
    const N = parsed.value;
    const next = tokens[i + 1]?.f;
    const prev = tokens[i - 1]?.f;
    let value = null;
    let j = i + 1;
    let guessed = false;

    if (next && (MILLION_UNITS.has(next) || BILLION_UNITS.has(next))) {
      const scale = BILLION_UNITS.has(next) ? 1e9 : 1e6;
      value = N * scale;
      j = i + 2;
      const rest = tokens[j];
      if (rest && rest.f === "ruoi") {
        value += scale / 2;
        j++;
      } else if (rest && isNumberToken(rest) && !parsed.decimal) {
        const m = tokenValue(rest);
        const after = tokens[j + 1]?.f;
        if (m && after && THOUSAND_UNITS.has(after)) {
          value += m.value * 1000; j += 2;
        } else if (m && after === "tram") {
          value += m.value * 100000; j += 2;
        } else if (m && !(after && NOT_MONEY_NEXT.has(after))) {
          // "1tr2" = 1.200.000, "1 triệu 200" = 1.200.000, "2 triệu 50" = 2.050.000
          const digits = String(rest.raw).length;
          value += m.value < 10 && digits === 1 ? m.value * scale / 10 : m.value * scale / 1000;
          j++;
        }
      }
    } else if (next && THOUSAND_UNITS.has(next)) {
      value = N * 1000;
      j = i + 2;
      if (tokens[j]?.f === "ruoi") { value += 500; j++; }
    } else if (next === "tram") {
      // "2 trăm" / "2 trăm nghìn" đều là 200.000 trong văn nói; "2 trăm rưỡi" = 250.000
      value = N * 100000;
      j = i + 2;
      if (tokens[j] && THOUSAND_UNITS.has(tokens[j].f)) j++;
      else if (tokens[j]?.f === "ruoi") { value += 50000; j++; }
    } else if (next === "chuc") {
      value = N * 10000; // "5 chục" = 50.000
      j = i + 2;
    } else if (next && CURRENCY_UNITS.has(next)) {
      value = N;
      j = i + 2;
    } else if (tokens[i - 1]?.raw === "₫" || tokens[i + 1]?.raw === "₫") {
      value = N;
      if (tokens[i + 1]?.raw === "₫") j = i + 2;
    } else if (allowBare && !(next && NOT_MONEY_NEXT.has(next)) && !(prev && NOT_MONEY_PREV.has(prev))) {
      if (parsed.grouped || N >= 1000) value = N;
      else if (N >= 1 && N < 1000 && !parsed.decimal) { value = N * 1000; guessed = true; }
    }

    if (value !== null && value > 0) {
      amounts.push({
        value: Math.round(value),
        start: tok.start,
        end: tokens[j - 1].end,
        startIndex: i,
        endIndex: j - 1,
        guessed
      });
      i = j - 1;
    }
  }
  return amounts;
}

/** Ngày, giờ nói trong câu. Đánh dấu các token đã dùng để không bị hiểu nhầm thành tiền. */
function findDateTime(tokens, today, now) {
  const used = new Set();
  let dayOffset = null;
  let date = null;
  let time = null;
  let partOfDay = null;

  for (let i = 0; i < tokens.length; i++) {
    const f = tokens[i].f;
    const next = tokens[i + 1]?.f;

    if (f === "hom" && (next === "nay" || next === "qua" || next === "kia")) {
      dayOffset = next === "nay" ? 0 : next === "qua" ? -1 : -2;
      used.add(i); used.add(i + 1);
    } else if (f === "bua" && (next === "qua" || next === "kia")) {
      dayOffset = next === "qua" ? -1 : -2;
      used.add(i); used.add(i + 1);
    } else if (PART_OF_DAY[f] && (next === "nay" || next === "qua")) {
      partOfDay = f;
      dayOffset = next === "nay" ? 0 : -1;
      used.add(i); used.add(i + 1);
    } else if (f === "luc" || /^\d{1,2}$/.test(f)) {
      // 7h30, 7 giờ 30, lúc 7h, 19:30
      const k = f === "luc" ? i + 1 : i;
      const hourTok = tokens[k];
      const sep = tokens[k + 1]?.f;
      if (hourTok && /^\d{1,2}$/.test(hourTok.f) && (sep === "h" || sep === "gio" || sep === ":" || sep === "g")) {
        let hour = Number(hourTok.f);
        let minute = 0;
        let end = k + 1;
        const minTok = tokens[k + 2];
        if (minTok && /^\d{1,2}$/.test(minTok.f) && Number(minTok.f) < 60) {
          minute = Number(minTok.f);
          end = k + 2;
          if (tokens[end + 1]?.f === "phut" || tokens[end + 1]?.f === "p") end++;
        } else if (minTok?.f === "ruoi") {
          minute = 30;
          end = k + 2;
        }
        const after = tokens[end + 1]?.f;
        if ((after === "chieu" || after === "toi" || after === "dem") && hour < 12) { hour += 12; end++; }
        else if (after === "sang" || after === "trua") end++;
        if (hour < 24) {
          time = `${pad2(hour)}:${pad2(minute)}`;
          for (let x = i; x <= end; x++) used.add(x);
        }
      }
    }

    // ngày 12, ngày 12/10, 12/10
    if (f === "ngay" && /^\d{1,2}$/.test(next || "")) {
      const d = Number(next);
      let m = Number(today.slice(5, 7));
      let y = Number(today.slice(0, 4));
      let end = i + 1;
      if ((tokens[i + 2]?.f === "/" || tokens[i + 2]?.f === "thang") && /^\d{1,2}$/.test(tokens[i + 3]?.f || "")) {
        m = Number(tokens[i + 3].f);
        end = i + 3;
      }
      let candidate = makeDate(y, m, d);
      if (candidate && candidate > today) candidate = end === i + 1 ? makeDate(m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1, d) : makeDate(y - 1, m, d);
      if (candidate) { date = candidate; for (let x = i; x <= end; x++) used.add(x); }
    } else if (/^\d{1,2}$/.test(f) && tokens[i + 1]?.f === "/" && /^\d{1,2}$/.test(tokens[i + 2]?.f || "") && !used.has(i)) {
      const y = Number(today.slice(0, 4));
      let candidate = makeDate(y, Number(tokens[i + 2].f), Number(f));
      if (candidate && candidate > today) candidate = makeDate(y - 1, Number(tokens[i + 2].f), Number(f));
      if (candidate) { date = candidate; used.add(i); used.add(i + 1); used.add(i + 2); }
    }
  }

  if (!date && dayOffset !== null) date = shiftDate(today, dayOffset);
  if (!time && partOfDay) {
    // "sáng nay ăn phở" nói lúc 20h -> ghi 07:30; nói ngay buổi sáng -> ghi giờ hiện tại
    const nowHour = Number(now.slice(0, 2));
    const currentPart = nowHour < 11 ? "sang" : nowHour < 13 ? "trua" : nowHour < 18 ? "chieu" : nowHour < 22 ? "toi" : "dem";
    if (currentPart !== partOfDay || dayOffset !== 0) time = PART_OF_DAY[partOfDay];
  }
  return { used, date, time };
}

/** Bỏ từ đệm ở hai đầu, giữ phần nội dung ở giữa. */
function cleanNote(tokens) {
  let start = 0;
  let end = tokens.length - 1;
  const isFiller = (tok, leading) => {
    if (!tok) return false;
    if (/^[^\p{L}\d]+$/u.test(tok.raw)) return true;
    if (!leading && LEADING_ONLY.has(tok.f)) return false;
    if (FILLER_EXACT[tok.f] && !FILLER_EXACT[tok.f].includes(tok.raw.toLowerCase())) return false;
    return FILLER_WORDS.has(tok.f);
  };
  while (start <= end && isFiller(tokens[start], true)) start++;
  while (end >= start && isFiller(tokens[end], false)) end--;
  return tokens.slice(start, end + 1);
}

function joinTokens(text, tokens) {
  if (!tokens.length) return "";
  // Lấy nguyên văn đoạn gốc (giữ dấu cách, dấu câu ở giữa), bỏ phần đã bị loại
  let out = "";
  for (let i = 0; i < tokens.length; i++) {
    out += tokens[i].raw;
    if (i < tokens.length - 1) out += text.slice(tokens[i].end, tokens[i + 1].start).replace(/\s+/g, " ");
  }
  return out.replace(/\s+/g, " ").replace(/\s+([,.!?])/g, "$1").trim();
}

/**
 * Phân tích câu nói thành các khoản.
 * @param {string} text - Câu đã chuyển từ giọng nói
 * @param {{today: string, now: string}} context - Ngày giờ trên máy người dùng lúc nói
 * @returns {{items: object[], unparsed: string|null}}
 */
function parseVoice(text, { today, now }) {
  const clean = String(text || "").normalize("NFC").slice(0, 1000);
  const tokens = mergeNumberWords(tokenize(clean));
  if (!tokens.length) return { items: [], unparsed: null };

  // Tách thành các đoạn theo dấu phẩy, "và", "rồi", "xong"...
  const segments = [];
  let current = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const twoWords = `${tok.f} ${tokens[i + 1]?.f || ""}`;
    const splitWord = SPLIT_WORDS.has(tok.f) && (!SPLIT_EXACT[tok.f] || SPLIT_EXACT[tok.f].includes(tok.raw.toLowerCase()));
    if ([",", ";", ".", "+", "\n"].includes(tok.raw) || splitWord || SPLIT_WORDS.has(twoWords)) {
      if (SPLIT_WORDS.has(twoWords)) i++;
      if (current.length) segments.push(current);
      current = [];
      continue;
    }
    current.push(tok);
  }
  if (current.length) segments.push(current);

  // Ngày giờ: đoạn nào nói ngày thì áp dụng cho đoạn đó và các đoạn sau
  let carryDate = today;
  let carryTime = null;
  const analyzed = segments.map((seg) => {
    const dt = findDateTime(seg, today, now);
    if (dt.date) { carryDate = dt.date; carryTime = null; }
    if (dt.time) carryTime = dt.time;
    const usable = seg.map((tok, idx) => (dt.used.has(idx) ? { ...tok, f: "__used__", raw: tok.raw } : tok));
    const amounts = findAmounts(usable);
    return { seg, usable, used: dt.used, amounts, date: carryDate, time: dt.time || carryTime };
  });

  // Đoạn không có số tiền thì gộp vào đoạn sau ("trà sữa và bánh tráng 50k")
  const merged = [];
  let pendingSegments = [];
  for (const part of analyzed) {
    if (!part.amounts.length) {
      pendingSegments.push(part);
      continue;
    }
    if (pendingSegments.length) {
      part.prefix = pendingSegments;
      pendingSegments = [];
    }
    merged.push(part);
  }
  if (pendingSegments.length && merged.length) merged[merged.length - 1].suffix = pendingSegments;

  const items = [];
  for (const part of merged) {
    const { usable, amounts } = part;
    // Một đoạn có nhiều số tiền: "phở 40k trà đá 5k" -> 2 khoản
    const startsWithAmount = amounts[0].startIndex === 0;
    const pieces = amounts.map((amount, k) => {
      let from;
      let to;
      if (startsWithAmount) {
        from = amount.startIndex;
        to = k + 1 < amounts.length ? amounts[k + 1].startIndex - 1 : usable.length - 1;
      } else {
        from = k === 0 ? 0 : amounts[k - 1].endIndex + 1;
        to = k + 1 < amounts.length ? amount.endIndex : usable.length - 1;
      }
      return { amount, from, to };
    });

    for (const [index, piece] of pieces.entries()) {
      let noteTokens = usable
        .slice(piece.from, piece.to + 1)
        .filter((tok, idx) => {
          const absolute = piece.from + idx;
          return !(absolute >= piece.amount.startIndex && absolute <= piece.amount.endIndex) && tok.f !== "__used__";
        });
      if (index === 0 && part.prefix) {
        const prefixTokens = part.prefix.flatMap((p) => p.usable.filter((t) => t.f !== "__used__"));
        noteTokens = [...prefixTokens, ...noteTokens];
      }
      if (index === pieces.length - 1 && part.suffix) {
        noteTokens = [...noteTokens, ...part.suffix.flatMap((p) => p.usable.filter((t) => t.f !== "__used__"))];
      }
      // Số khác trong cùng mẩu (VD số lượng "2 ly") vẫn giữ trong ghi chú
      const note = capitalize(joinTokens(clean, cleanNote(noteTokens)));
      const contextText = `${part.prefix ? part.prefix.map((p) => joinTokens(clean, p.seg)).join(" ") : ""} ${joinTokens(clean, part.seg)}`;
      const type = detectType(note ? `${contextText}` : contextText);
      const categoryId = guessCategory(note || contextText, type);
      items.push({
        type,
        amount: piece.amount.value,
        note: note || null,
        category_id: categoryId,
        transaction_date: part.date,
        transaction_time: part.time || now,
        amount_guessed: piece.amount.guessed
      });
    }
  }

  return { items, unparsed: items.length ? null : clean };
}

/* ===========================================================================
   2 + 3. Thông báo ngân hàng, ảnh chuyển khoản, hóa đơn
   =========================================================================== */

const BALANCE_RE = /(so du|\bsd\b|\bs\.d\b|balance|kha dung|du cuoi|du dau|so tien con lai|available)/;
const BALANCE_PREFIX_RE = /(so du|\bsd\b|\bs\.d\b|balance|kha dung|du cuoi|du dau|con lai|available)[^0-9+\-]{0,25}$/;

const KIND_SIGNALS = {
  bank_notification: [
    /\b(so du|sd|tk|stk)\b/, /bien dong/, /\bghi (no|co)\b/, /\b(gd|ps)\s*[:]/, /[+\-]\s?\d{1,3}([.,]\d{3})+\s*(vnd|d\b)/,
    /\b(vietcombank|vcb|techcombank|tcb|mb ?bank|mbbank|bidv|vietinbank|agribank|tpbank|acb|vpbank|sacombank|ocb|hdbank|momo|zalopay|vib|shb|seabank|cake|timo)\b/,
    /\bnd\s*[:]/, /tai khoan/, /\bref\b/
  ],
  transfer: [
    /(chuyen (tien|khoan)|giao dich) thanh cong/, /nguoi nhan/, /tai khoan nhan/, /ngan hang (nhan|thu huong)/,
    /ma giao dich/, /phi giao dich/, /mien phi/, /nhan tien (tu|thanh cong)/, /da (chuyen|nhan)/, /thu huong/, /noi dung/,
    /\bnguoi chuyen\b/, /\bthanh cong\b/
  ],
  receipt: [
    /hoa don/, /tong cong/, /thanh tien/, /tam tinh/, /don gia/, /\bsl\b/, /thu ngan/, /cam on quy khach/, /\btotal\b/,
    /\bvat\b/, /phieu (thanh toan|tinh tien)/, /\bmst\b/, /\bban\s*(so)?\s*\d/, /khach (hang|phai tra|can tra)/,
    /tien khach dua/, /tien thua/, /so luong/, /\bqty\b/, /hotline/, /dia chi/, /\bbill\b/, /tong tien/
  ]
};

function classifyDocument(folded) {
  const scores = {};
  for (const [kind, signals] of Object.entries(KIND_SIGNALS)) {
    scores[kind] = signals.reduce((sum, re) => sum + (re.test(folded) ? 1 : 0), 0);
  }
  // Ảnh chuyển khoản thường có cả từ khóa ngân hàng: ưu tiên "transfer" khi có dấu hiệu thành công
  if (scores.transfer >= 2 && /(thanh cong|nguoi nhan|tai khoan nhan|nhan tien tu)/.test(folded)) {
    scores.transfer += 2;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return { kind: best[1] >= 2 ? best[0] : "unknown", scores };
}

/** Che các chuỗi số không phải tiền (ngày, giờ, số tài khoản, điện thoại) bằng dấu cách. */
function maskNonMoney(line) {
  const blank = (m) => " ".repeat(m.length);
  return line
    .replace(/\b\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}\b/g, blank)
    .replace(/\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/g, blank)
    .replace(/\b\d{1,2}[\/\-]\d{1,2}\b(?![.,]\d)/g, blank)
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, blank)
    .replace(/\b[\dx*]*[x*]{2,}[\dx*]*\b/gi, blank)
    .replace(/\b\d{9,}\b/g, blank)
    .replace(/\b0\d{2,3}[ .]?\d{3}[ .]?\d{3,4}\b/g, (m) => (/[.]\d{3}[.]\d{3}$/.test(m) ? m : blank(m)));
}

// Không bắt số dính liền chữ cái (mã giao dịch "FT26288123456", "MBVCB.123")
const MONEY_RE = /(?<![A-Za-z0-9.,])([+\-−–]\s?)?(\d{1,3}(?:[.,]\d{3})+|\d{4,12})(?:[.,](\d{1,2}))?(?!\d)\s*(vnd|vnđ|đ|₫|d\b|dong)?/gi;

// Ảnh chụp mờ hay làm OCR mất dấu "/" và ":": "Ngày in 29032019 Giờ in 235900".
// Sau nhãn có thể có "in" hoặc vài chữ OCR đọc nhầm dính liền ("Ngảym" = "Ngày in", "Giờm:" = "Giờ in:").
const DATE_TIME_LABEL_RE = /(ngay|gio|thoi gian|time|date)(?: ?[a-z]{1,3})?[^a-z0-9]{0,4}$/;

/** Số trơn liền 8 chữ số có dạng ngày ddmmyyyy hợp lệ (29032019). */
function looksLikeCompactDate(digits) {
  const m = /^(\d{2})(\d{2})((?:19|20)\d{2})$/.exec(digits);
  return Boolean(m && makeDate(Number(m[3]), Number(m[2]), Number(m[1])));
}

function findMoneyCandidates(lines) {
  const candidates = [];
  lines.forEach((line, lineIndex) => {
    const masked = maskNonMoney(line);
    const folded = fold(masked);
    let m;
    MONEY_RE.lastIndex = 0;
    while ((m = MONEY_RE.exec(masked))) {
      const digits = m[2];
      const value = Number(digits.replace(/[.,]/g, ""));
      if (!value) continue;
      const grouped = /[.,]/.test(digits);
      const currency = Boolean(m[4]);
      // Số trơn 4 chữ số không có đơn vị: nhiều khả năng là năm, mã, số lượng
      if (!grouped && !currency && digits.length < 5) continue;
      const before = folded.slice(0, m.index);
      // Ngày / giờ bị mất dấu phân cách thì không phải tiền
      if (!grouped && !currency && !m[1] && (DATE_TIME_LABEL_RE.test(before) || looksLikeCompactDate(digits))) continue;
      candidates.push({
        value,
        sign: m[1] ? (m[1].trim() === "+" ? "+" : "-") : null,
        currency,
        grouped,
        lineIndex,
        index: m.index,
        before,
        lineFolded: fold(line)
      });
    }
  });
  return candidates;
}

/** Một số có phải là số dư tài khoản không (cùng dòng ngay sau chữ "Số dư", hoặc dòng trên là nhãn "Số dư"). */
function isBalanceCandidate(candidate, foldedLines) {
  // Số có dấu +/- là tiền biến động; số dư không bao giờ có dấu ("Số dư TK VCB ... +2,000,000 VND")
  if (candidate.sign) return false;
  if (BALANCE_PREFIX_RE.test(candidate.before)) return true;
  if (candidate.before.trim() === "" || /^[^a-z]*$/.test(candidate.before)) {
    for (let k = candidate.lineIndex - 1; k >= 0 && k >= candidate.lineIndex - 2; k--) {
      const prevLine = foldedLines[k].trim();
      if (!prevLine) continue;
      return BALANCE_RE.test(prevLine) && !/\d{1,3}([.,]\d{3})+/.test(prevLine);
    }
  }
  return false;
}

function findDocDate(text) {
  const folded = fold(text);
  let m = folded.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const date = makeDate(y, Number(m[2]), Number(m[1]));
    if (date) return date;
  }
  m = folded.match(/\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/);
  if (m) {
    const date = makeDate(Number(m[1]), Number(m[2]), Number(m[3]));
    if (date) return date;
  }
  m = folded.match(/ngay\s*(\d{1,2})\s*thang\s*(\d{1,2})\s*nam\s*(\d{4})/);
  if (m) return makeDate(Number(m[3]), Number(m[2]), Number(m[1]));
  // OCR mất dấu "/": "Ngày in 29032019"
  m = folded.match(/ngay(?: ?[a-z]{1,3})?[^a-z0-9]{0,4}(\d{2})(\d{2})((?:19|20)\d{2})\b/);
  if (m) return makeDate(Number(m[3]), Number(m[2]), Number(m[1]));
  return null;
}

function findDocTime(text) {
  const folded = fold(text);
  let m = folded.match(/\b([01]?\d|2[0-3])[:h]([0-5]\d)(?::[0-5]\d)?\b/);
  if (m) return `${pad2(m[1])}:${m[2]}`;
  // OCR mất dấu ":": "Giờ in 235900", "Giờ in 23 59 00", "Giờ 2359"
  m = folded.match(/(?:gio|thoi gian|time)(?: ?[a-z]{1,3})?[^a-z0-9]{0,4}([01]\d|2[0-3])\s?([0-5]\d)(?:\s?[0-5]\d)?\b/);
  return m ? `${m[1]}:${m[2]}` : null;
}

function findReference(text) {
  const folded = fold(text);
  const m = folded.match(/(?:ma gd|ma giao dich|so gd|so giao dich|ma tham chieu|so tham chieu|so ct|so chung tu|\bref|trace|\bmgd)\s*(?:no\.?|so)?\s*[:.#]?\s*([a-z0-9]{6,30})/)
    || folded.match(/\b(ft\d{8,}[a-z0-9]*)\b/);
  return m ? m[1].toUpperCase().slice(0, 40) : null;
}

function findBankNote(lines) {
  for (const line of lines) {
    const m = line.match(/(?:^|\s|\|)(?:ND|Nội dung|Noi dung|N\/D|Nội dung chuyển khoản|Lời nhắn|Loi nhan|Mô tả|Mo ta|Description)\s*[:：]\s*(.+)$/i);
    if (m) return m[1].replace(/\s+/g, " ").trim().slice(0, 200);
  }
  for (const line of lines) {
    const m = line.match(/(?:Người nhận|Nguoi nhan|Tên người nhận|Ten nguoi nhan|Đến|Tới|Chuyển đến)\s*[:：]?\s*([^\d|]{3,60})$/i);
    if (m) return `Chuyển cho ${m[1].trim()}`;
  }
  for (const line of lines) {
    const m = line.match(/(?:Người chuyển|Nguoi chuyen|Từ|Nhận từ|Nhan tu)\s*[:：]?\s*([^\d|]{3,60})$/i);
    if (m) return `Nhận từ ${m[1].trim()}`;
  }
  return null;
}

const TOTAL_LABELS = [
  /(tong thanh toan|khach can tra|khach phai tra|can thanh toan|tong tien thanh toan|grand total|so tien thanh toan)/,
  // "T.Cộng" là cách viết tắt của máy in hóa đơn; OCR hay đọc "ộ" thành "é" nên chấp nhận một chữ bất kỳ ở giữa
  /(tong cong|tong tien|tong so tien|\btotal\b|thanh toan|\bt\s?\.\s?c[a-z]ng\b)/,
  /(\btong\b|thanh tien)/
];
const NOT_TOTAL_RE = /(tam tinh|tien khach dua|khach dua|tien mat|cash|tien thua|tra lai|change|giam gia|chiet khau|khuyen mai|discount|vat|thue|phi dich vu|service|subtotal)/;
// Tiêu đề "HÓA ĐƠN THANH TOÁN" / "PHIẾU THANH TOÁN" có chữ "thanh toán" nhưng không phải dòng tổng.
// "bon" vì OCR hay đọc "ĐƠN" thành "BON".
const RECEIPT_TITLE_RE = /^[^0-9]*(hoa\s*[db]on|phieu|bill)\s*thanh toan[^0-9]*$/;

function pickReceiptAmount(candidates, foldedLines) {
  for (const labelRe of TOTAL_LABELS) {
    for (let k = foldedLines.length - 1; k >= 0; k--) {
      const line = foldedLines[k];
      if (!labelRe.test(line) || NOT_TOTAL_RE.test(line.replace(labelRe, "")) || RECEIPT_TITLE_RE.test(line)) continue;
      const sameLine = candidates.filter((c) => c.lineIndex === k);
      if (sameLine.length) return { candidate: sameLine[sameLine.length - 1], confidence: 0.9 };
      const below = candidates.find((c) => c.lineIndex === k + 1 || c.lineIndex === k + 2);
      if (below) return { candidate: below, confidence: 0.8 };
    }
  }
  const usable = candidates.filter((c) => !NOT_TOTAL_RE.test(foldedLines[c.lineIndex]));
  const pool = usable.length ? usable : candidates;
  if (!pool.length) return null;
  return { candidate: pool.reduce((a, b) => (b.value > a.value ? b : a)), confidence: 0.5 };
}

function pickBankAmount(candidates, foldedLines) {
  const usable = candidates.filter((c) => !isBalanceCandidate(c, foldedLines)
    && !/(phi|fee)[^0-9]{0,15}$/.test(c.before));
  if (!usable.length) return null;
  const signed = usable.find((c) => c.sign);
  if (signed) return { candidate: signed, confidence: 0.95 };
  const labeled = usable.find((c) => /(so tien|\bgd\b|\bps\b|giao dich|phat sinh|amount|chuyen|nhan|tru|cong)[^0-9]{0,20}$/.test(c.before));
  if (labeled) return { candidate: labeled, confidence: 0.85 };
  const withCurrency = usable.filter((c) => c.currency);
  const pool = withCurrency.length ? withCurrency : usable;
  return { candidate: pool[0], confidence: 0.6 };
}

function detectDocDirection(kind, candidate, folded) {
  if (kind === "receipt") return "expense";
  if (candidate && candidate.sign) return candidate.sign === "+" ? "income" : "expense";
  if (/(ghi co|nhan tien|da nhan|tien vao|\bcredit\b|nguoi chuyen|nhan tu|duoc cong|\+\s?\d)/.test(folded)) return "income";
  if (/(ghi no|chuyen (tien|khoan) thanh cong|da chuyen|\btru\b|thanh toan|\bdebit\b|nguoi nhan|tai khoan nhan|thu huong)/.test(folded)) return "expense";
  return "expense";
}

function findMerchant(lines) {
  for (const line of lines.slice(0, 6)) {
    const clean = line.replace(/[^\p{L}\p{N}\s&'.-]/gu, " ").replace(/\s+/g, " ").trim();
    const folded = fold(clean);
    if (clean.replace(/[^\p{L}]/gu, "").length < 3) continue;
    if (/^(hoa don|phieu|bill|receipt|so:|ngay|thu ngan|ban|dia chi|dc|dt|sdt|hotline|mst)/.test(folded)) continue;
    return clean.slice(0, 80);
  }
  return null;
}

/**
 * OCR hay đọc dấu "|" ngăn cách trong tin nhắn ngân hàng thành chữ I / l / 1:
 * "VNDIND: tien dien" -> "VND|ND: tien dien", "ISD: 1,020,000" -> "|SD: 1,020,000".
 */
function fixOcrSeparators(text) {
  return text
    .replace(/([A-Za-z0-9])[|Il1](SD|ND|GD|TK|PS)(?=\s*:)/g, "$1|$2")
    .replace(/(^|\s)[|Il1](SD|ND|GD|TK|PS)(?=\s*:)/gm, "$1|$2");
}

/**
 * Phân tích chữ của tin nhắn ngân hàng, ảnh chuyển khoản hoặc hóa đơn.
 * @returns {{doc_kind, direction, amount, transaction_date, transaction_time, date_found,
 *            reference_code, note, category_id, confidence, ignored_balance}}
 */
function parseDocument(text, { today, now }) {
  const clean = fixOcrSeparators(String(text || "").normalize("NFC").replace(/\r/g, "").slice(0, 8000));
  // Tách dòng: xuống dòng, dấu |, hoặc dấu chấm kết thúc câu trong tin nhắn liền một dòng
  const lines = clean
    .split(/\n|\|/)
    .flatMap((line) => line.split(/(?<=[^\d\s])\.\s+(?=\p{Lu}|\p{L}{2})/u))
    .map((line) => line.trim())
    .filter(Boolean);
  const foldedLines = lines.map(fold);
  const folded = foldedLines.join("\n");
  const { kind } = classifyDocument(folded);

  const candidates = findMoneyCandidates(lines);
  const picked = kind === "receipt"
    ? pickReceiptAmount(candidates, foldedLines)
    // Không tìm được số tiền giao dịch thì thà để trống cho người dùng nhập còn hơn lấy nhầm số dư
    : pickBankAmount(candidates, foldedLines)
      || pickReceiptAmount(candidates.filter((c) => !isBalanceCandidate(c, foldedLines)), foldedLines);

  const direction = detectDocDirection(kind, picked && picked.candidate, folded);
  const date = findDocDate(clean);
  const time = findDocTime(clean);
  const note = kind === "receipt"
    ? findMerchant(lines)
    : findBankNote(lines);
  const ignoredBalance = candidates.filter((c) => isBalanceCandidate(c, foldedLines)).map((c) => c.value);

  let confidence = picked ? picked.confidence : 0;
  if (kind === "unknown") confidence = Math.min(confidence, 0.4);

  return {
    doc_kind: kind,
    direction,
    amount: picked ? picked.candidate.value : null,
    transaction_date: date && date <= today ? date : today,
    transaction_time: date && date <= today ? (time || now) : now,
    date_found: Boolean(date && date <= today),
    reference_code: kind === "receipt" ? null : findReference(clean),
    note: note || (kind === "receipt" ? "Hóa đơn" : direction === "income" ? "Tiền vào tài khoản" : "Chuyển khoản"),
    category_id: guessCategory(`${note || ""} ${kind === "receipt" ? clean : ""}`, direction),
    confidence,
    ignored_balance: ignoredBalance
  };
}

module.exports = {
  fold,
  tokenize,
  mergeNumberWords,
  findAmounts,
  parseVoice,
  parseDocument,
  classifyDocument,
  guessCategory,
  detectType
};
