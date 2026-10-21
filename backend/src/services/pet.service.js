/**
 * @file pet.service.js
 * @description "Thú cưng ví tiền": tâm trạng của thú cưng phản ánh thói quen ghi chép và ngân sách.
 *
 *   sleeping - quên ghi (bỏ trống từ hôm qua trở về trước, hoặc đã tối mà hôm nay chưa ghi gì)
 *   crying   - vượt ngân sách cả tháng
 *   sad      - hôm nay tiêu lố mức cho phép
 *   worried  - hôm nay sắp hết mức cho phép (còn dưới 20%)
 *   party    - giữ chuỗi ghi chép từ 7 ngày trở lên và không lố ngân sách
 *   happy    - trong ngân sách
 *   chill    - chưa đặt ngân sách (vẫn vui nhưng nhắc đặt ngân sách)
 *
 * Thú cưng lớn dần theo số ngày đã ghi chép (mỗi 7 ngày lên 1 cấp, tối đa cấp 10).
 */

const WORRIED_RATIO = 0.2;
const PARTY_STREAK = 7;
const DAYS_PER_LEVEL = 7;
const MAX_LEVEL = 10;

function daysBetween(fromIso, toIso) {
  const [y1, m1, d1] = fromIso.split("-").map(Number);
  const [y2, m2, d2] = toIso.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

function money(value) {
  return `${Math.round(Math.abs(value)).toLocaleString("vi-VN")}đ`;
}

/**
 * @param {object} input
 * @param {string} input.today - YYYY-MM-DD
 * @param {string} input.now - HH:mm
 * @param {number} input.nudgeHour - giờ bắt đầu coi là "buổi tối"
 * @param {object} input.streak - kết quả sp_get_streak
 * @param {object} input.budget - kết quả sp_get_budget_status
 */
function petMood({ today, now, nudgeHour, streak, budget }) {
  const recordedDays = streak.recorded_days || 0;
  const level = Math.min(MAX_LEVEL, 1 + Math.floor(recordedDays / DAYS_PER_LEVEL));
  const nextLevelIn = level >= MAX_LEVEL ? 0 : DAYS_PER_LEVEL - (recordedDays % DAYS_PER_LEVEL);
  const base = { level, next_level_in: nextLevelIn, streak: streak.current_streak || 0 };

  const missedDays = streak.last_recorded_date ? daysBetween(streak.last_recorded_date, today) - 1 : null;
  if (recordedDays > 0 && missedDays >= 1) {
    return { ...base, mood: "sleeping", message: `Zzz... ${missedDays} ngày rồi chưa ghi gì, đánh thức mình bằng một khoản chi đi!` };
  }
  const evening = Number(String(now).slice(0, 2)) >= nudgeHour;
  if (!streak.recorded_today && evening) {
    return { ...base, mood: "sleeping", message: "Buồn ngủ quá... hôm nay bạn chưa ghi gì cả." };
  }

  const hasBudget = budget && budget.budget !== null && budget.budget !== undefined;
  if (hasBudget) {
    if (budget.remaining_month < 0) {
      return { ...base, mood: "crying", message: `Huhu, tháng này lố ngân sách ${money(budget.remaining_month)} rồi.` };
    }
    if (budget.left_today < 0) {
      return { ...base, mood: "sad", message: `Hôm nay lố ${money(budget.left_today)}, mai mình tiết kiệm bù nhé.` };
    }
    if (budget.daily_allowance > 0 && budget.left_today < budget.daily_allowance * WORRIED_RATIO) {
      return { ...base, mood: "worried", message: `Chỉ còn ${money(budget.left_today)} cho hôm nay thôi đó!` };
    }
  }

  if (base.streak >= PARTY_STREAK) {
    return { ...base, mood: "party", message: `${base.streak} ngày liền ghi chép, quẩy lên!` };
  }
  if (hasBudget) {
    return { ...base, mood: "happy", message: `Hôm nay còn được tiêu ${money(budget.left_today)}, ổn áp!` };
  }
  return { ...base, mood: "chill", message: "Đặt ngân sách tháng để mình canh ví giúp bạn nhé." };
}

module.exports = { petMood, daysBetween };
