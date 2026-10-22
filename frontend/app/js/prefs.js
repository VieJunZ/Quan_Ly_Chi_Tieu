/**
 * @file prefs.js
 * @description Tùy chọn hiển thị lưu trên máy (localStorage): sáng/tối, màu chủ đạo, cỡ chữ,
 * thú cưng ở trang chủ, rung khi chạm, ngôn ngữ. Đoạn script đầu index.html đọc cùng các khóa này
 * để áp ngay từ lần vẽ đầu, không bị nháy màu.
 */

const KEYS = {
  theme: "sochi.theme",
  accent: "sochi.accent",
  font: "sochi.font",
  pet: "sochi.pet",
  haptics: "sochi.haptics",
  lang: "sochi.lang"
};

const CHOICES = {
  theme: ["system", "light", "dark"],
  accent: ["candy", "ocean", "mint", "sunset"],
  font: ["sm", "md", "lg"],
  pet: ["on", "off"],
  haptics: ["on", "off"],
  lang: ["vi", "en"]
};

/** Giá trị mặc định: không lưu gì vào máy khi người dùng chọn đúng mặc định. */
const DEFAULTS = { theme: "system", accent: "candy", font: "md", pet: "on", haptics: "on", lang: "vi" };

export function getPref(name) {
  try {
    const value = localStorage.getItem(KEYS[name]);
    return CHOICES[name].includes(value) ? value : DEFAULTS[name];
  } catch {
    return DEFAULTS[name];
  }
}

export function setPref(name, value) {
  if (!CHOICES[name].includes(value)) return;
  try {
    if (value === DEFAULTS[name]) localStorage.removeItem(KEYS[name]);
    else localStorage.setItem(KEYS[name], value);
  } catch {
    // Không lưu được (chế độ ẩn danh) thì vẫn đổi cho phiên này
  }
  applyPrefs({ [name]: value });
}

/** Gắn tùy chọn lên thẻ <html> để CSS đổi theo. */
export function applyPrefs(values = {}) {
  const root = document.documentElement;
  const read = (name) => (name in values ? values[name] : getPref(name));
  const theme = read("theme");
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  for (const name of ["accent", "font"]) {
    const value = read(name);
    if (value === DEFAULTS[name]) delete root.dataset[name];
    else root.dataset[name] = value;
  }
}
