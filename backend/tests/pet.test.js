const test = require("node:test");
const assert = require("node:assert");
const { petMood, daysBetween } = require("../src/services/pet.service");

const streak = (over = {}) => ({ current_streak: 3, best_streak: 5, recorded_today: true, last_recorded_date: "2026-03-10", recorded_days: 10, ...over });
const budget = (over = {}) => ({ budget: 3000000, daily_allowance: 100000, left_today: 60000, remaining_month: 2000000, ...over });
const base = { today: "2026-03-10", now: "12:00", nudgeHour: 20 };

test("daysBetween tính qua tháng", () => {
  assert.strictEqual(daysBetween("2026-02-27", "2026-03-02"), 3);
});

test("trong ngân sách thì vui, lên cấp theo số ngày ghi", () => {
  const pet = petMood({ ...base, streak: streak(), budget: budget() });
  assert.strictEqual(pet.mood, "happy");
  assert.strictEqual(pet.level, 2);
  assert.strictEqual(pet.next_level_in, 4);
  assert.match(pet.message, /60\.000đ/);
});

test("quên ghi từ hôm kia thì ngủ", () => {
  const pet = petMood({ ...base, streak: streak({ recorded_today: false, last_recorded_date: "2026-03-07", current_streak: 0 }), budget: budget() });
  assert.strictEqual(pet.mood, "sleeping");
  assert.match(pet.message, /2 ngày/);
});

test("hôm qua có ghi, buổi sáng chưa ghi thì vẫn thức; tối chưa ghi thì buồn ngủ", () => {
  const s = streak({ recorded_today: false, last_recorded_date: "2026-03-09" });
  assert.strictEqual(petMood({ ...base, streak: s, budget: budget() }).mood, "happy");
  assert.strictEqual(petMood({ ...base, now: "20:30", streak: s, budget: budget() }).mood, "sleeping");
});

test("lố ngân sách tháng thì khóc, lố hôm nay thì buồn, sắp hết thì lo", () => {
  assert.strictEqual(petMood({ ...base, streak: streak(), budget: budget({ remaining_month: -1, left_today: -5 }) }).mood, "crying");
  assert.strictEqual(petMood({ ...base, streak: streak(), budget: budget({ left_today: -20000 }) }).mood, "sad");
  assert.strictEqual(petMood({ ...base, streak: streak(), budget: budget({ left_today: 10000 }) }).mood, "worried");
});

test("chuỗi 7 ngày thì quẩy, chưa có ngân sách thì chill", () => {
  assert.strictEqual(petMood({ ...base, streak: streak({ current_streak: 7 }), budget: budget() }).mood, "party");
  assert.strictEqual(petMood({ ...base, streak: streak(), budget: { budget: null } }).mood, "chill");
});

test("người mới chưa ghi gì thì không ngủ vào buổi sáng, cấp tối đa 10", () => {
  const empty = { current_streak: 0, best_streak: 0, recorded_today: false, last_recorded_date: null, recorded_days: 0 };
  assert.strictEqual(petMood({ ...base, streak: empty, budget: { budget: null } }).mood, "chill");
  assert.strictEqual(petMood({ ...base, streak: streak({ recorded_days: 500 }), budget: budget() }).level, 10);
});
