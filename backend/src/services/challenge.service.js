/**
 * @file challenge.service.js
 * @description Thử thách tiết kiệm, huy hiệu và gợi ý "nên làm gì tiếp theo".
 *
 * Ý tưởng: không bắt người dùng tự đặt mục tiêu từ con số 0 mà soi 30 ngày gần nhất,
 * tìm thói quen tốn tiền (cà phê, trà sữa, Grab, Shopee...) rồi đề xuất thử thách vừa sức
 * theo 3 mức Nhẹ / Vừa / Gắt. Tiến độ được tính lại mỗi lần mở app từ chính các giao dịch đã ghi,
 * vượt hạn mức thì thua ngay, giữ được tới ngày cuối thì thắng và nhận huy hiệu.
 */

const db = require("../config/db");
const { HttpError } = require("../lib/http");

const MAX_ACTIVE = 5;
const DURATIONS = [7, 14, 30];
const LEVELS = { light: 0.2, medium: 0.4, hard: 0.6 };
const LEVEL_LABEL = { light: "Nhẹ", medium: "Vừa", hard: "Gắt" };

/* ---------- Ngày tháng (chuỗi YYYY-MM-DD, tính theo UTC để không lệch múi giờ) ---------- */

function toUtc(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function addDays(iso, days) {
  return new Date(toUtc(iso) + days * 86400000).toISOString().slice(0, 10);
}

function daysBetween(from, to) {
  return Math.round((toUtc(to) - toUtc(from)) / 86400000);
}

function isWeekend(iso) {
  const day = new Date(toUtc(iso)).getUTCDay();
  return day === 0 || day === 6;
}

/* ---------- Nhận diện thói quen qua ghi chú ---------- */

/** Bỏ dấu, chữ thường: "Cà Phê Highlands" -> "ca phe highlands". */
function fold(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Nhóm thói quen hay "rò rỉ" tiền của sinh viên. Thứ tự là độ ưu tiên khi một ghi chú khớp nhiều nhóm
 * ("grab food" là đặt đồ ăn chứ không phải đi xe).
 * - tip: cách cắt giảm cụ thể, save(stats) ước tính tiền giữ lại được mỗi tháng nếu làm theo.
 */
const GROUPS = [
  {
    key: "delivery", label: "đặt đồ ăn", title: "Đặt đồ ăn", icon: "utensils", countable: true,
    words: ["grabfood", "grab food", "shopeefood", "shopee food", "baemin", "gofood", "be food", "befood", "dat do an", "ship do an"],
    tip: (s) => ({
      title: "Tự nấu hoặc ăn quán gần thay vì gọi app",
      detail: `Bạn gọi ${s.count} đơn/tháng. Mỗi đơn mất thêm ~20k phí ship và phí dịch vụ, bớt một nửa số đơn là giữ lại được tiền phí.`,
      save: Math.round(s.count / 2) * 20000
    })
  },
  {
    key: "milk_tea", label: "trà sữa", title: "Trà sữa", icon: "cup-soda", countable: true,
    words: ["tra sua", "tocotoco", "gong cha", "mixue", "ding tea", "koi the", "bobapop", "phe la", "tra chanh", "tra dao", "hong tra"],
    tip: (s) => ({
      title: s.count > 4 ? "Giữ trà sữa ở mức 1 ly mỗi tuần" : "Đổi size L sang size M, bỏ topping",
      detail: s.count > 4
        ? `${s.count} ly/tháng, trung bình ${short(s.avg)}/ly. Chỉ giữ 4 ly cho những lúc thật sự thèm.`
        : `${s.count} ly/tháng. Size M không topping rẻ hơn khoảng 10k mỗi ly.`,
      save: s.count > 4 ? (s.count - 4) * s.avg : s.count * 10000
    })
  },
  {
    key: "coffee", label: "cà phê", title: "Cà phê", icon: "coffee", countable: true,
    words: ["cafe", "ca phe", "caphe", "coffee", "cf", "highlands", "highland", "phuc long", "starbucks", "katinat",
      "cong ca phe", "trung nguyen", "bac xiu", "the coffee house", "tch", "cafe muoi", "ca phe muoi"],
    tip: (s) => {
      const cups = Math.min(s.count, 12);
      return {
        title: "Pha cà phê ở nhà 3 buổi mỗi tuần",
        detail: `Bạn uống ${s.count} ly/tháng, trung bình ${short(s.avg)}/ly. Gói cà phê phin pha ở nhà chỉ ~7k/ly, thay ${cups} ly là giữ lại được phần chênh.`,
        save: Math.max(0, cups * (s.avg - 7000))
      };
    }
  },
  {
    key: "ride", label: "xe công nghệ", title: "Grab / Be", icon: "car", countable: true,
    words: ["grab", "grabbike", "grabcar", "bebike", "be bike", "becar", "be car", "xe be", "xanh sm", "gojek", "taxi", "xe om", "uber"],
    tip: (s) => ({
      title: "Quãng dưới 2 km thì đi bộ hoặc xe buýt",
      detail: `${s.count} chuyến/tháng, trung bình ${short(s.avg)}/chuyến. Đổi 4 trên 10 chuyến sang xe buýt (7k) hoặc đi bộ.`,
      save: Math.round(s.count * 0.4) * Math.max(0, s.avg - 7000)
    })
  },
  {
    key: "shopping", label: "mua online", title: "Mua online", icon: "shopping-bag", countable: true,
    words: ["shopee", "lazada", "tiki", "tiktok shop", "tiktokshop", "sendo", "taobao"],
    tip: (s) => ({
      title: "Để món hàng trong giỏ 48 giờ rồi mới bấm mua",
      detail: `${s.count} đơn, ${short(s.total)}/tháng. Phần lớn món mua vì "đang sale" sẽ hết muốn sau 2 ngày.`,
      save: Math.round(s.total * 0.3)
    })
  },
  {
    key: "beer", label: "nhậu", title: "Nhậu / bia", icon: "hop", countable: true,
    words: ["bia", "nhau", "beer", "ruou", "quan nhau", "lai rai"],
    tip: (s) => ({
      title: "Tụ tập tối đa 1 lần mỗi tuần, chia tiền ngay tại bàn",
      detail: `${s.count} lần, ${short(s.total)}/tháng. Rủ bạn ăn trưa hoặc đi dạo thay một buổi nhậu là vẫn vui.`,
      save: s.count > 4 ? Math.round(s.total * (s.count - 4) / s.count) : Math.round(s.total * 0.25)
    })
  },
  {
    key: "game", label: "nạp game", title: "Nạp game", icon: "gamepad-2", countable: true,
    words: ["nap game", "game", "steam", "garena", "nap the", "lien quan", "robux", "skin", "pubg", "valorant", "genshin"],
    tip: (s) => ({
      title: "Đặt hạn mức nạp game mỗi tháng",
      detail: `Tháng qua nạp ${short(s.total)}. Chỉ nạp khi có sự kiện thật sự muốn, còn lại chơi bản miễn phí.`,
      save: Math.round(s.total * 0.5)
    })
  },
  {
    key: "convenience", label: "cửa hàng tiện lợi", title: "Cửa hàng tiện lợi", icon: "zap", countable: true,
    words: ["circle k", "circlek", "gs25", "familymart", "family mart", "ministop", "7-eleven", "7 eleven", "winmart", "bach hoa xanh"],
    tip: (s) => ({
      title: "Mang bình nước và đồ ăn nhẹ từ nhà",
      detail: `${s.count} lần ghé, ${short(s.total)}/tháng. Đồ ở cửa hàng tiện lợi đắt hơn tạp hóa khoảng 30-50%.`,
      save: Math.round(s.total * 0.4)
    })
  },
  {
    key: "snack", label: "ăn vặt", title: "Ăn vặt", icon: "pizza", countable: true,
    words: ["an vat", "banh trang", "xien", "snack", "che", "an kem", "banh trang tron", "ga ran", "khoai tay chien", "nem chua ran"],
    tip: (s) => ({
      title: "Ăn vặt theo kế hoạch, không theo cơn thèm",
      detail: `${s.count} lần, ${short(s.total)}/tháng. Chọn sẵn 2 buổi ăn vặt mỗi tuần, các buổi khác uống nước trước khi mua.`,
      save: Math.round(s.total * 0.4)
    })
  },
  {
    key: "smoking", label: "thuốc lá", title: "Thuốc lá / vape", icon: "leaf", countable: true,
    words: ["thuoc la", "vape", "pod vape", "tinh dau vape"],
    tip: (s) => ({
      title: "Giảm dần mỗi tuần một ít",
      detail: `Tháng qua ${short(s.total)}. Mỗi tuần bớt 20% là vừa đỡ tiền vừa đỡ cho phổi.`,
      save: Math.round(s.total * 0.2)
    })
  }
];
const GROUP_BY_KEY = new Map(GROUPS.map((g) => [g.key, g]));

function escapeRe(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
for (const g of GROUPS) {
  g.re = new RegExp(`(^|[^a-z0-9])(${g.words.map(escapeRe).join("|")})(?=$|[^a-z0-9])`);
}

/** Ghi chú này thuộc nhóm thói quen nào (hoặc null). */
function groupOf(note) {
  const text = fold(note);
  if (!text) return null;
  for (const g of GROUPS) if (g.re.test(text)) return g.key;
  return null;
}

/** Danh mục chi đáng đặt trần (bỏ tiền nhà, hóa đơn, học, y tế vì khó cắt). */
const CAP_CATEGORIES = { 1: "Ăn uống", 3: "Di chuyển", 4: "Mua sắm", 7: "Giải trí & Bạn bè", 9: "Khác" };
/** Hạn mức mỗi ngày / cuối tuần chỉ tính các khoản linh hoạt, không tính tiền trọ, hóa đơn, học phí, thuốc men. */
const isFlexible = (e) => Boolean(CAP_CATEGORIES[e.category_id]);

/* ---------- Huy hiệu ---------- */

const BADGES = [
  { key: "first_win", name: "Phát súng đầu tiên", desc: "Thắng thử thách đầu tiên", icon: "trophy", tier: "bronze" },
  { key: "coffee", name: "Tỉnh không cần cà phê", desc: "Thắng một thử thách cà phê", icon: "coffee", tier: "silver" },
  { key: "milk_tea", name: "Cai trà sữa", desc: "Thắng một thử thách trà sữa", icon: "cup-soda", tier: "silver" },
  { key: "ride", name: "Đôi chân vàng", desc: "Thắng một thử thách Grab / Be", icon: "car", tier: "silver" },
  { key: "shopping", name: "Giỏ hàng trống", desc: "Thắng một thử thách mua online", icon: "shopping-bag", tier: "silver" },
  { key: "delivery", name: "Đầu bếp tại gia", desc: "Thắng một thử thách đặt đồ ăn", icon: "utensils", tier: "silver" },
  { key: "beer", name: "Tỉnh táo", desc: "Thắng một thử thách nhậu", icon: "hop", tier: "silver" },
  { key: "game", name: "Game thủ tiết kiệm", desc: "Thắng một thử thách nạp game", icon: "gamepad-2", tier: "silver" },
  { key: "convenience", name: "Đi ngang Circle K", desc: "Thắng thử thách cửa hàng tiện lợi", icon: "zap", tier: "silver" },
  { key: "snack", name: "Miệng không buồn", desc: "Thắng một thử thách ăn vặt", icon: "pizza", tier: "silver" },
  { key: "smoking", name: "Phổi xanh", desc: "Thắng một thử thách thuốc lá", icon: "leaf", tier: "gold" },
  { key: "category", name: "Kỷ luật thép", desc: "Giữ một danh mục dưới mức trần tới ngày cuối", icon: "target", tier: "silver" },
  { key: "daily_cap", name: "Ngày nào cũng trong hạn", desc: "Thắng thử thách hạn mức mỗi ngày", icon: "calendar-days", tier: "gold" },
  { key: "weekend", name: "Cuối tuần bình yên", desc: "Thắng thử thách chi tiêu cuối tuần", icon: "moon-star", tier: "silver" },
  { key: "no_spend", name: "Ngày không tiêu", desc: "Thắng thử thách ngày không tiêu", icon: "sprout", tier: "silver" },
  { key: "streak_7", name: "7 ngày ghi đều", desc: "Ghi chép đủ 7 ngày liền", icon: "flame", tier: "bronze" },
  { key: "streak_14", name: "Nửa tháng chăm chỉ", desc: "Ghi chép đủ 14 ngày liền", icon: "flame", tier: "silver" },
  { key: "streak_30", name: "Tháng trọn vẹn", desc: "Ghi chép đủ 30 ngày liền", icon: "flame", tier: "gold" },
  { key: "multi_task", name: "Đa nhiệm", desc: "Chạy 3 thử thách cùng lúc", icon: "sparkles", tier: "bronze" },
  { key: "hard_mode", name: "Chế độ Gắt", desc: "Thắng một thử thách ở mức Gắt", icon: "zap", tier: "gold" },
  { key: "marathon", name: "Bền bỉ 30 ngày", desc: "Thắng một thử thách dài 30 ngày", icon: "hourglass", tier: "gold" },
  { key: "triple_win", name: "Hat-trick", desc: "Thắng tổng cộng 3 thử thách", icon: "star", tier: "silver" },
  { key: "comeback", name: "Đứng dậy", desc: "Thua một lần rồi thắng ở thử thách sau", icon: "rotate-ccw", tier: "silver" },
  { key: "saver_500k", name: "Nửa triệu giữ lại", desc: "Tiết kiệm được 500k nhờ thử thách", icon: "piggy-bank", tier: "silver" },
  { key: "saver_1m", name: "Triệu phú tiết kiệm", desc: "Tiết kiệm được 1 triệu nhờ thử thách", icon: "landmark", tier: "gold" }
];

/* ---------- Định dạng ---------- */

/** 300000 -> "300k", 1500000 -> "1,5tr". */
function short(amount) {
  const n = Math.round(Number(amount) || 0);
  if (n >= 1000000) return `${(Math.round(n / 100000) / 10).toString().replace(".", ",")}tr`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return `${n}đ`;
}

/** Làm tròn về bội số 5.000đ cho dễ nhớ. */
function roundMoney(amount) {
  return Math.max(0, Math.round(amount / 5000) * 5000);
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* ---------- Đọc dữ liệu ---------- */

async function loadData(userId, from, to) {
  const [txs, marks, first] = await db.queryMulti(`
    SELECT t.category_id, t.amount, t.note, c.type,
           CONVERT(CHAR(10), t.transaction_date, 23) AS d
    FROM dbo.transactions AS t
    JOIN dbo.categories AS c ON c.id = t.category_id
    WHERE t.user_id = @user_id AND t.transaction_date BETWEEN @from AND @to;
    SELECT CONVERT(CHAR(10), mark_date, 23) AS d
    FROM dbo.day_marks
    WHERE user_id = @user_id AND kind = 'no_spend' AND mark_date BETWEEN @from AND @to;
    SELECT CONVERT(CHAR(10), MIN(transaction_date), 23) AS first_date
    FROM dbo.transactions WHERE user_id = @user_id;`, { user_id: userId, from, to });

  const expenses = [];
  const recordedDays = new Set();
  for (const t of txs) {
    recordedDays.add(t.d);
    if (t.type !== "expense") continue;
    expenses.push({ d: t.d, amount: Number(t.amount), category_id: t.category_id, note: t.note || "", group: groupOf(t.note) });
  }
  const noSpendMarks = new Set(marks.map((m) => m.d));
  for (const d of noSpendMarks) recordedDays.add(d);
  return { expenses, recordedDays, noSpendMarks, firstDate: first[0] && first[0].first_date };
}

/* ---------- Phân tích 30 ngày gần nhất ---------- */

function analyse(data, today) {
  const from = addDays(today, -29);
  // Người mới dùng vài ngày thì tính theo số ngày đã dùng (ít nhất 7 để số liệu không bị phóng đại)
  const used = data.firstDate ? daysBetween(data.firstDate, today) + 1 : 0;
  const observed = Math.max(7, Math.min(30, used || 30));
  const scale = 30 / observed;

  const groups = new Map();
  const categories = new Map();
  const byDay = new Map();
  let total = 0;
  let flexTotal = 0;
  let weekendTotal = 0;
  for (const e of data.expenses) {
    if (e.d < from || e.d > today) continue;
    total += e.amount;
    byDay.set(e.d, (byDay.get(e.d) || 0) + e.amount);
    if (isFlexible(e)) {
      flexTotal += e.amount;
      if (isWeekend(e.d)) weekendTotal += e.amount;
    }
    const c = categories.get(e.category_id) || { total: 0, count: 0 };
    c.total += e.amount;
    c.count += 1;
    categories.set(e.category_id, c);
    if (e.group) {
      const g = groups.get(e.group) || { total: 0, count: 0 };
      g.total += e.amount;
      g.count += 1;
      groups.set(e.group, g);
    }
  }

  // Quy về "mỗi 30 ngày" để so sánh được giữa người mới và người dùng lâu
  const per30 = (s) => ({
    total: Math.round(s.total * scale),
    count: Math.max(1, Math.round(s.count * scale)),
    avg: Math.round(s.total / s.count),
    raw_total: s.total,
    raw_count: s.count
  });
  let weekendDays = 0;
  for (let i = 0; i < observed; i++) if (isWeekend(addDays(today, -i))) weekendDays += 1;

  return {
    observed,
    total,
    daily: flexTotal / observed,
    weekendPerDay: weekendDays ? weekendTotal / weekendDays : 0,
    weekdayPerDay: observed > weekendDays ? (flexTotal - weekendTotal) / (observed - weekendDays) : 0,
    groups: new Map([...groups].map(([k, s]) => [k, per30(s)])),
    categories: new Map([...categories].map(([k, s]) => [k, per30(s)])),
    byDay
  };
}

function periodText(a) {
  return a.observed >= 30 ? "30 ngày qua" : `${a.observed} ngày qua`;
}

/* ---------- Mẫu thử thách ---------- */

/**
 * Mỗi mẫu biết: tiêu đề theo mục tiêu, cách tính mục tiêu theo mức độ và số ngày, huy hiệu khi thắng.
 * rate: tiền (hoặc số lần) trung bình mỗi ngày theo thói quen cũ.
 */
function buildTemplates(a) {
  const list = [];

  for (const [key, s] of a.groups) {
    const g = GROUP_BY_KEY.get(key);
    if (s.raw_count < 2 || s.raw_total < 30000) continue;
    const rate = s.total / 30;
    list.push({
      key: `cap_keyword:${key}`, kind: "cap_keyword", group: key, icon: g.icon, badge: key, unit: "money", rate,
      name: `Cắt giảm ${g.label}`,
      reason: `${capitalize(periodText(a))} bạn chi ${short(s.raw_total)} cho ${g.label} (${s.raw_count} lần).`,
      title: (target, days) => `${g.title} không quá ${short(target)} trong ${days} ngày`
    });
    if (g.countable && s.raw_count >= 3) {
      list.push({
        key: `max_count:${key}`, kind: "max_count", group: key, icon: g.icon, badge: key, unit: "count", rate: s.count / 30,
        name: `Bớt số lần ${g.label}`,
        reason: `Trung bình ${Math.max(1, Math.round((s.count / 30) * 7))} lần mỗi tuần, ${short(s.avg)} mỗi lần.`,
        title: (target, days) => (target === 0 ? `${days} ngày không ${g.label}` : `${g.title} tối đa ${target} lần trong ${days} ngày`)
      });
    }
  }

  for (const [id, s] of a.categories) {
    const name = CAP_CATEGORIES[id];
    if (!name || s.raw_total < 100000) continue;
    list.push({
      key: `cap_category:${id}`, kind: "cap_category", category_id: Number(id), icon: "target", badge: "category", unit: "money", rate: s.total / 30,
      name: `Đặt trần cho ${name}`,
      reason: `${capitalize(periodText(a))} danh mục ${name} tốn ${short(s.raw_total)}.`,
      title: (target, days) => `${name} không quá ${short(target)} trong ${days} ngày`
    });
  }

  if (a.daily >= 20000) {
    list.push({
      key: "daily_cap", kind: "daily_cap", icon: "calendar-days", badge: "daily_cap", unit: "money_daily", rate: a.daily,
      name: "Hạn mức mỗi ngày",
      reason: `Không tính tiền trọ, hóa đơn, học phí, mỗi ngày bạn tiêu khoảng ${short(a.daily)}. Ngày nào cũng giữ dưới mức trần là thắng.`,
      title: (target, days) => `Mỗi ngày tiêu không quá ${short(target)} (${days} ngày)`
    });
  }
  if (a.weekendPerDay >= 30000 && a.weekendPerDay >= a.weekdayPerDay * 1.1) {
    list.push({
      key: "weekend_cap", kind: "weekend_cap", icon: "moon-star", badge: "weekend", unit: "money_weekend", rate: a.weekendPerDay,
      name: "Cuối tuần nhẹ ví",
      reason: `Thứ 7, Chủ nhật bạn tiêu khoảng ${short(a.weekendPerDay)}/ngày, ngày thường chỉ ${short(a.weekdayPerDay)}.`,
      title: (target, days) => `Tiền cuối tuần không quá ${short(target)} trong ${days} ngày`
    });
  }

  list.push({
    key: "no_spend_days", kind: "no_spend_days", icon: "sprout", badge: "no_spend", unit: "days", rate: 0,
    name: "Ngày không tiêu",
    reason: "Tối về bấm \"Hôm nay không tiêu gì\" để đánh dấu. Mỗi ngày như vậy là một ngày ví được nghỉ.",
    title: (target, days) => `${target} ngày không tiêu trong ${days} ngày`
  });
  list.push({
    key: "log_streak", kind: "log_streak", icon: "flame", badge: null, unit: "streak", rate: 0,
    name: "Ghi chép đều tay",
    reason: "Ngày nào cũng ghi ít nhất một khoản (hoặc đánh dấu không tiêu). Ghi đều là bước đầu để biết tiền đi đâu.",
    title: (target, days) => `Ghi chép đủ ${days} ngày liền`
  });
  return list;
}

const NO_SPEND_TARGET = { 7: { light: 1, medium: 2, hard: 3 }, 14: { light: 2, medium: 4, hard: 6 }, 30: { light: 4, medium: 8, hard: 12 } };

/** Mục tiêu theo mức độ và số ngày: {target_amount} hoặc {target_count}, kèm baseline (thói quen cũ). */
function targetFor(t, level, days, from) {
  const cut = LEVELS[level];
  switch (t.unit) {
    case "money": {
      const baseline = t.rate * days;
      return { target_amount: roundMoney(baseline * (1 - cut)), baseline_amount: Math.round(baseline) };
    }
    case "money_daily":
      return { target_amount: roundMoney(t.rate * (1 - cut)), baseline_amount: Math.round(t.rate * days) };
    case "money_weekend": {
      let weekendDays = 0;
      for (let i = 0; i < days; i++) if (isWeekend(addDays(from, i))) weekendDays += 1;
      const baseline = t.rate * Math.max(1, weekendDays);
      return { target_amount: roundMoney(baseline * (1 - cut)), baseline_amount: Math.round(baseline) };
    }
    case "count":
      return { target_count: Math.max(0, Math.floor(t.rate * days * (1 - cut))), baseline_amount: null };
    case "days":
      return { target_count: NO_SPEND_TARGET[days][level], baseline_amount: null };
    default:
      return { target_count: days, baseline_amount: null };
  }
}

/* ---------- Tính tiến độ một thử thách ---------- */

/**
 * Trả về {status, value, target, unit, ...} trong đó status mới có thể khác status cũ
 * (thắng / thua vừa xảy ra). value: số tiền đã tiêu, số lần, số ngày đạt.
 */
function evaluate(ch, data, today) {
  const start = ch.start_date;
  const end = ch.end_date;
  const until = today < end ? today : end;
  const total = daysBetween(start, end) + 1;
  const daysLeft = today > end ? 0 : daysBetween(today < start ? start : today, end) + 1;
  const inRange = (d) => d >= start && d <= until;
  const [kindSubject, subject] = ch.template_key.split(":");
  const matches = (e) => {
    if (kindSubject === "cap_keyword" || kindSubject === "max_count") return e.group === subject;
    if (kindSubject === "cap_category") return String(e.category_id) === subject;
    if (kindSubject === "weekend_cap") return isWeekend(e.d) && isFlexible(e);
    return true;
  };
  const over = today > end;
  const out = { days_total: total, days_left: daysLeft, status: "active" };

  switch (ch.kind) {
    case "cap_keyword":
    case "cap_category":
    case "weekend_cap": {
      let spent = 0;
      for (const e of data.expenses) if (inRange(e.d) && matches(e)) spent += e.amount;
      const target = Number(ch.target_amount);
      Object.assign(out, { unit: "money", value: spent, target, left: Math.max(0, target - spent) });
      if (spent > target) out.status = "lost";
      else if (over) out.status = "won";
      if (out.status === "active" && daysLeft > 0) out.per_day = Math.floor(out.left / daysLeft);
      break;
    }
    case "max_count": {
      let count = 0;
      for (const e of data.expenses) if (inRange(e.d) && matches(e)) count += 1;
      const target = ch.target_count;
      Object.assign(out, { unit: "count", value: count, target, left: Math.max(0, target - count) });
      if (count > target) out.status = "lost";
      else if (over) out.status = "won";
      break;
    }
    case "daily_cap": {
      const cap = Number(ch.target_amount);
      const byDay = new Map();
      for (const e of data.expenses) if (inRange(e.d) && isFlexible(e)) byDay.set(e.d, (byDay.get(e.d) || 0) + e.amount);
      const worst = Math.max(0, ...byDay.values());
      const spentToday = byDay.get(today) || 0;
      Object.assign(out, { unit: "money_daily", value: spentToday, target: cap, worst, left: Math.max(0, cap - spentToday) });
      if (worst > cap) out.status = "lost";
      else if (over) out.status = "won";
      break;
    }
    case "no_spend_days": {
      let good = 0;
      for (let d = start; d <= until; d = addDays(d, 1)) {
        const spent = data.expenses.some((e) => e.d === d);
        if (!spent && data.noSpendMarks.has(d)) good += 1;
      }
      const target = ch.target_count;
      // Số ngày còn có thể thành "ngày không tiêu": các ngày sau hôm nay, cộng hôm nay nếu chưa tiêu và chưa đánh dấu
      let remaining = 0;
      if (!over) {
        remaining = daysBetween(today, end);
        const todayOpen = !data.noSpendMarks.has(today) && !data.expenses.some((e) => e.d === today);
        if (todayOpen) remaining += 1;
      }
      Object.assign(out, { unit: "days", value: good, target, left: Math.max(0, target - good) });
      if (good >= target) out.status = "won";
      else if (good + remaining < target) out.status = "lost";
      break;
    }
    default: { // log_streak
      let done = 0;
      let missed = false;
      for (let d = start; d <= until; d = addDays(d, 1)) {
        if (data.recordedDays.has(d)) done += 1;
        else if (d < today) missed = true;
      }
      Object.assign(out, { unit: "streak", value: done, target: total, left: Math.max(0, total - done) });
      if (missed) out.status = "lost";
      else if (done >= total) out.status = "won";
      break;
    }
  }
  if (out.unit === "money" || out.unit === "money_daily") {
    out.spent_all = out.unit === "money_daily"
      ? data.expenses.filter((e) => inRange(e.d) && isFlexible(e)).reduce((s, e) => s + e.amount, 0)
      : out.value;
    if (out.status === "won") out.saved = savedOf(ch, out.spent_all);
  }
  return out;
}

/**
 * Tiền giữ lại được nhờ một thử thách đã thắng. Tính dè dặt: chỉ lấy phần dưới mức thói quen cũ
 * tới mức mục tiêu, để những ngày quên ghi chép không bị tính thành "tiết kiệm".
 */
function savedOf(ch, spent) {
  if (ch.baseline_amount === null || ch.baseline_amount === undefined || ch.target_amount === null) return 0;
  const days = daysBetween(ch.start_date, ch.end_date) + 1;
  const goal = ch.kind === "daily_cap" ? Number(ch.target_amount) * days : Number(ch.target_amount);
  return Math.max(0, Math.round(Number(ch.baseline_amount) - Math.max(Number(spent) || 0, goal)));
}

/* ---------- Huy hiệu khi thắng / khi bắt đầu ---------- */

async function award(userId, keys, challengeId) {
  const earned = [];
  for (const key of keys) {
    const rows = await db.query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.user_badges WHERE user_id = @user_id AND badge_key = @badge_key)
      BEGIN
          INSERT INTO dbo.user_badges (user_id, badge_key, challenge_id) VALUES (@user_id, @badge_key, @challenge_id);
          UPDATE dbo.users SET badge_points = ISNULL(badge_points, 0) + 1 WHERE id = @user_id;
          SELECT CAST(1 AS BIT) AS added;
      END
      ELSE SELECT CAST(0 AS BIT) AS added;`, { user_id: userId, badge_key: key, challenge_id: challengeId || null });
    if (rows[0] && rows[0].added) earned.push(key);
  }
  return earned;
}

function badgesForWin(ch, history) {
  const keys = ["first_win"];
  const [kind, subject] = ch.template_key.split(":");
  if (kind === "cap_keyword" || kind === "max_count") keys.push(subject);
  else if (kind === "cap_category") keys.push("category");
  else if (kind === "daily_cap") keys.push("daily_cap");
  else if (kind === "weekend_cap") keys.push("weekend");
  else if (kind === "no_spend_days") keys.push("no_spend");
  else if (kind === "log_streak") {
    const days = daysBetween(ch.start_date, ch.end_date) + 1;
    keys.push(days >= 30 ? "streak_30" : days >= 14 ? "streak_14" : "streak_7");
  }
  if (ch.level === "hard") keys.push("hard_mode");
  if (daysBetween(ch.start_date, ch.end_date) + 1 >= 30) keys.push("marathon");
  if (history.wins >= 3) keys.push("triple_win");
  if (history.comeback) keys.push("comeback");
  if (history.saved >= 500000) keys.push("saver_500k");
  if (history.saved >= 1000000) keys.push("saver_1m");
  return keys;
}

/* ---------- API dùng trong route ---------- */

function rowToChallenge(r) {
  return {
    id: r.id,
    template_key: r.template_key,
    kind: r.kind,
    title: r.title,
    level: r.level,
    level_label: r.level ? LEVEL_LABEL[r.level] : null,
    target_amount: r.target_amount === null ? null : Number(r.target_amount),
    target_count: r.target_count,
    baseline_amount: r.baseline_amount === null ? null : Number(r.baseline_amount),
    start_date: r.start_date,
    end_date: r.end_date,
    status: r.status,
    finished_at: r.finished_at
  };
}

function iconFor(templateKey) {
  const [kind, subject] = templateKey.split(":");
  if (subject && GROUP_BY_KEY.has(subject)) return GROUP_BY_KEY.get(subject).icon;
  return { cap_category: "target", daily_cap: "calendar-days", weekend_cap: "moon-star", no_spend_days: "sprout", log_streak: "flame" }[kind] || "trophy";
}

async function loadChallenges(userId) {
  return (await db.query(`
    SELECT id, template_key, kind, title, level, target_amount, target_count, baseline_amount,
           result_amount, result_count, status,
           CONVERT(CHAR(10), start_date, 23) AS start_date, CONVERT(CHAR(10), end_date, 23) AS end_date,
           CONVERT(VARCHAR(19), finished_at, 126) AS finished_at
    FROM dbo.user_challenges
    WHERE user_id = @user_id
    ORDER BY id DESC`, { user_id: userId })).map((r) => ({ ...rowToChallenge(r), result_amount: r.result_amount, result_count: r.result_count }));
}

/** Toàn bộ trang Thử thách: đang chạy (kèm tiến độ), đã xong, gợi ý mới, huy hiệu. */
async function overview(userId, today) {
  const all = await loadChallenges(userId);
  const active = all.filter((c) => c.status === "active");
  const from = [addDays(today, -29), ...active.map((c) => c.start_date)].sort()[0];
  const data = await loadData(userId, from, today);

  // Tính lại tiến độ, chốt thắng / thua mới xảy ra
  const finishedOld = all.filter((c) => c.status === "won" || c.status === "lost").sort((x, y) => (x.finished_at || "").localeCompare(y.finished_at || ""));
  let wins = finishedOld.filter((c) => c.status === "won").length;
  let saved = 0;
  for (const c of finishedOld) {
    if (c.status === "won" && c.result_amount !== null && c.result_amount !== undefined) saved += savedOf(c, c.result_amount);
  }
  // Ngày thua gần nhất: thử thách bắt đầu sau ngày đó mà thắng là "đứng dậy sau thất bại"
  const lastLost = finishedOld.filter((c) => c.status === "lost").map((c) => (c.finished_at || "").slice(0, 10)).sort().pop() || null;
  const newBadges = [];

  // Thử thách hết hạn sớm nhất được chốt trước
  for (const c of [...active].sort((x, y) => x.end_date.localeCompare(y.end_date))) {
    const p = evaluate(c, data, today);
    c.progress = p;
    if (p.status === "active") continue;
    const resultAmount = p.spent_all === undefined ? null : p.spent_all;
    await db.query(`
      UPDATE dbo.user_challenges
      SET status = @status, finished_at = SYSDATETIME(), result_amount = @result_amount, result_count = @result_count
      WHERE id = @id AND user_id = @user_id AND status = 'active'`, {
      id: c.id, user_id: userId, status: p.status,
      result_amount: resultAmount === null ? null : { type: db.sql.Decimal(15, 2), value: resultAmount },
      result_count: p.unit === "money" || p.unit === "money_daily" ? null : p.value
    });
    c.status = p.status;
    c.finished_at = new Date().toISOString();
    c.result_amount = resultAmount;
    c.result_count = p.unit === "money" || p.unit === "money_daily" ? null : p.value;
    c.just_finished = true;
    if (p.status === "won") {
      wins += 1;
      saved += p.saved || 0;
      const comeback = Boolean(lastLost) && c.start_date >= lastLost;
      newBadges.push(...await award(userId, badgesForWin(c, { wins, saved, comeback }), c.id));
    }
  }

  const stillActive = active.filter((c) => c.status === "active");
  const analysis = analyse(data, today);
  const templates = buildTemplates(analysis);
  const activeKeys = new Set(stillActive.map((c) => c.template_key));
  const suggestions = templates
    .map((t) => {
      const targets = {};
      for (const days of DURATIONS) {
        targets[days] = {};
        for (const level of Object.keys(LEVELS)) {
          const goal = targetFor(t, level, days, today);
          targets[days][level] = { ...goal, title: t.title(goal.target_amount ?? goal.target_count, days) };
        }
      }
      const monthly = t.unit === "money" ? t.rate * 30 : t.unit === "money_daily" ? t.rate * 30 : t.unit === "money_weekend" ? t.rate * 8 : 0;
      return {
        key: t.key, kind: t.kind, name: t.name, icon: t.icon, reason: t.reason, unit: t.unit,
        badge: t.badge, running: activeKeys.has(t.key),
        monthly_spend: Math.round(monthly),
        targets
      };
    })
    .sort((x, y) => Number(x.running) - Number(y.running) || y.monthly_spend - x.monthly_spend);

  const earnedRows = await db.query(`
    SELECT badge_key, CONVERT(VARCHAR(19), earned_at, 126) AS earned_at
    FROM dbo.user_badges WHERE user_id = @user_id`, { user_id: userId });
  const earned = new Map(earnedRows.map((r) => [r.badge_key, r.earned_at]));
  const recent = all.filter((c) => c.status !== "active").slice(0, 12);

  return {
    max_active: MAX_ACTIVE,
    active: stillActive.map((c) => ({ ...c, icon: iconFor(c.template_key) })),
    finished: recent.map((c) => {
      const out = { ...c, icon: iconFor(c.template_key) };
      if (c.progress) out.progress = c.progress;
      return out;
    }),
    suggestions,
    badges: BADGES.map((b) => ({ ...b, earned: earned.has(b.key), earned_at: earned.get(b.key) || null, is_new: newBadges.includes(b.key) })),
    stats: {
      active: stillActive.length,
      won: wins,
      lost: all.filter((c) => c.status === "lost").length,
      saved: Math.round(saved),
      badges: earned.size,
      badges_total: BADGES.length
    }
  };
}

async function start(userId, { key, level, days, today }) {
  if (!DURATIONS.includes(days)) throw new HttpError(400, "INVALID_DAYS", "Chọn 7, 14 hoặc 30 ngày nhé.");
  const all = await loadChallenges(userId);
  const active = all.filter((c) => c.status === "active" && c.end_date >= today);
  if (active.some((c) => c.template_key === key)) {
    throw new HttpError(409, "CHALLENGE_RUNNING", "Thử thách này đang chạy rồi, cố lên!");
  }
  if (active.length >= MAX_ACTIVE) {
    throw new HttpError(409, "TOO_MANY_CHALLENGES", `Đang chạy ${MAX_ACTIVE} thử thách rồi. Hoàn thành bớt rồi nhận thêm nhé.`);
  }

  const data = await loadData(userId, addDays(today, -29), today);
  const template = buildTemplates(analyse(data, today)).find((t) => t.key === key);
  if (!template) throw new HttpError(400, "UNKNOWN_CHALLENGE", "Thử thách này chưa hợp với thói quen của bạn.");
  const lvl = template.kind === "log_streak" ? null : (LEVELS[level] !== undefined ? level : "medium");
  const goal = targetFor(template, lvl || "medium", days, today);
  const title = template.title(goal.target_amount ?? goal.target_count, days);
  const end = addDays(today, days - 1);

  const rows = await db.query(`
    INSERT INTO dbo.user_challenges
      (user_id, template_key, kind, title, level, target_amount, target_count, baseline_amount, start_date, end_date)
    OUTPUT INSERTED.id
    VALUES (@user_id, @template_key, @kind, @title, @level, @target_amount, @target_count, @baseline_amount, @start_date, @end_date)`, {
    user_id: userId, template_key: key, kind: template.kind, title, level: lvl,
    target_amount: goal.target_amount === undefined ? null : { type: db.sql.Decimal(15, 2), value: goal.target_amount },
    target_count: goal.target_count === undefined ? null : goal.target_count,
    baseline_amount: goal.baseline_amount === null || goal.baseline_amount === undefined ? null : { type: db.sql.Decimal(15, 2), value: goal.baseline_amount },
    start_date: today, end_date: end
  });
  const badges = active.length + 1 >= 3 ? await award(userId, ["multi_task"], rows[0].id) : [];
  return { id: rows[0].id, title, start_date: today, end_date: end, level: lvl, new_badges: badges };
}

async function abandon(userId, id) {
  const rows = await db.query(`
    UPDATE dbo.user_challenges SET status = 'abandoned', finished_at = SYSDATETIME()
    WHERE id = @id AND user_id = @user_id AND status = 'active';
    SELECT @@ROWCOUNT AS changed;`, { id, user_id: userId });
  if (!rows[0].changed) throw new HttpError(404, "CHALLENGE_NOT_FOUND", "Không tìm thấy thử thách đang chạy.");
}

/* ---------- Việc nên làm & tổng kết tuần ---------- */

/** Gợi ý hành động cụ thể kèm số tiền giữ lại được mỗi tháng, xếp theo tiền nhiều nhất. */
function actionsFrom(analysis, running) {
  const actions = [];
  for (const [key, s] of analysis.groups) {
    if (s.raw_count < 2 || s.raw_total < 30000) continue;
    const g = GROUP_BY_KEY.get(key);
    const tip = g.tip(s);
    const save = roundMoney(tip.save);
    if (save < 10000) continue;
    const challengeKey = `cap_keyword:${key}`;
    actions.push({
      key, icon: g.icon, title: tip.title, detail: tip.detail, save_monthly: save,
      challenge: running.has(challengeKey) ? null : { key: challengeKey, level: "medium", days: 30 }
    });
  }
  // Không có thói quen nào nổi bật: gợi ý theo danh mục tốn nhất
  if (!actions.length) {
    const top = [...analysis.categories].filter(([id]) => CAP_CATEGORIES[id]).sort((x, y) => y[1].total - x[1].total)[0];
    if (top && top[1].raw_total >= 100000) {
      const [id, s] = top;
      const challengeKey = `cap_category:${id}`;
      actions.push({
        key: `category_${id}`, icon: "target",
        title: `Đặt trần cho ${CAP_CATEGORIES[id]}`,
        detail: `${CAP_CATEGORIES[id]} là khoản tốn nhất (${short(s.total)}/tháng). Đặt trần thấp hơn 20% để thấy rõ mỗi lần chi.`,
        save_monthly: roundMoney(s.total * 0.2),
        challenge: running.has(challengeKey) ? null : { key: challengeKey, level: "light", days: 30 }
      });
    }
  }
  return actions.sort((x, y) => y.save_monthly - x.save_monthly).slice(0, 4);
}

/**
 * Tổng kết 7 ngày qua so với 7 ngày trước đó. Điểm tích cực đứng trước để người dùng không né mở app;
 * tổng tiền vẫn có nhưng frontend chỉ hiện khi người dùng chủ động chạm xem.
 */
function weekReview(data, today) {
  const start = addDays(today, -6);
  const prevStart = addDays(today, -13);
  const prevEnd = addDays(today, -7);
  let total = 0;
  let prevTotal = 0;
  const cat = new Map();
  const prevCat = new Map();
  const spentDays = new Set();
  let biggest = null;
  for (const e of data.expenses) {
    if (e.d >= start && e.d <= today) {
      total += e.amount;
      spentDays.add(e.d);
      cat.set(e.category_id, (cat.get(e.category_id) || 0) + e.amount);
      if (!biggest || e.amount > biggest.amount) biggest = { amount: e.amount, note: e.note, date: e.d };
    } else if (e.d >= prevStart && e.d <= prevEnd) {
      prevTotal += e.amount;
      prevCat.set(e.category_id, (prevCat.get(e.category_id) || 0) + e.amount);
    }
  }
  let logged = 0;
  let noSpend = 0;
  for (let d = start; d <= today; d = addDays(d, 1)) {
    if (data.recordedDays.has(d)) logged += 1;
    if (!spentDays.has(d) && data.noSpendMarks.has(d)) noSpend += 1;
  }

  const positives = [];
  if (logged >= 5) positives.push({ icon: "flame", text: `Bạn ghi chép ${logged}/7 ngày, đủ để biết tiền đi đâu.` });
  else if (logged > 0) positives.push({ icon: "sprout", text: `Tuần này bạn đã ghi ${logged} ngày. Mỗi lần ghi là một lần biết rõ tiền đi đâu.` });
  if (noSpend > 0) positives.push({ icon: "leaf", text: `${noSpend} ngày không tiêu đồng nào.` });
  if (prevTotal > 0 && total < prevTotal) {
    positives.push({ icon: "trending-up", text: `Tiêu ít hơn tuần trước ${Math.round((1 - total / prevTotal) * 100)}%. Giỏi lắm!` });
  }
  for (const [id, amount] of prevCat) {
    const now = cat.get(id) || 0;
    if (CAP_CATEGORIES[id] && amount >= 50000 && now < amount * 0.8) {
      positives.push({ icon: "check", text: `${CAP_CATEGORIES[id]} giảm ${short(amount - now)} so với tuần trước.` });
      break;
    }
  }
  if (!positives.length) positives.push({ icon: "sparkles", text: "Mở app xem lại đã là bước khó nhất. Tuần mới mình làm tốt hơn nhé." });

  let watch = null;
  for (const [id, amount] of cat) {
    const before = prevCat.get(id) || 0;
    if (CAP_CATEGORIES[id] && amount >= 100000 && amount > before * 1.3 && (!watch || amount - before > watch.diff)) {
      watch = { category: CAP_CATEGORIES[id], diff: amount - before, text: `${CAP_CATEGORIES[id]} tăng ${short(amount - before)} so với tuần trước.` };
    }
  }

  return {
    from: start, to: today,
    total: Math.round(total),
    prev_total: Math.round(prevTotal),
    change_pct: prevTotal > 0 ? Math.round((total / prevTotal - 1) * 100) : null,
    logged_days: logged,
    no_spend_days: noSpend,
    biggest,
    positives: positives.slice(0, 3),
    watch: watch ? watch.text : null
  };
}

async function insights(userId, today) {
  const data = await loadData(userId, addDays(today, -29), today);
  const running = new Set((await db.query(`
    SELECT template_key FROM dbo.user_challenges WHERE user_id = @user_id AND status = 'active'`, { user_id: userId }))
    .map((r) => r.template_key));
  const analysis = analyse(data, today);
  const actions = actionsFrom(analysis, running);
  return {
    actions,
    save_monthly_total: actions.reduce((s, a) => s + a.save_monthly, 0),
    week: weekReview(data, today)
  };
}

module.exports = { overview, start, abandon, insights, groupOf, fold, evaluate, analyse, BADGES, GROUPS };
