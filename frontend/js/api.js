/**
 * @file api.js
 * @description Gọi backend (cùng địa chỉ với trang web, tiền tố /api) và giữ phiên đăng nhập.
 *
 * Bộ nhớ đệm cho lệnh GET (kiểu "stale-while-revalidate"): đã từng tải thì trả ngay số liệu cũ để màn hình
 * hiện tức thì, đồng thời hỏi lại máy chủ ở nền; số liệu mới khác số cũ thì phát sự kiện "thuchi:stale"
 * để app vẽ lại. Mọi lệnh ghi (POST/PUT/DELETE) xóa bộ đệm để lần sau luôn lấy số mới.
 * Bộ đệm được lưu vào localStorage theo từng tài khoản nên mở lại app cũng thấy số ngay.
 */

import { tr, lang } from "./i18n.js";
import { handleMockRequest } from "./mock.js";

const TOKEN_KEY = "sochi.token";
const USER_KEY = "sochi.user";
const CACHE_KEY = "thuchi.cache";
const CACHE_MAX_CHARS = 1_500_000;
const CACHE_MAX_AGE_MS = 3 * 24 * 3600 * 1000;
// Vừa tải xong trong khoảng này thì không hỏi lại máy chủ nữa
const REVALIDATE_AFTER_MS = 2000;

const memStorage = new Map();

function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return memStorage.get(key) || null;
  }
}

function storageSet(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
  if (value === null) memStorage.delete(key);
  else memStorage.set(key, String(value));
}

let memoryToken = storageGet(TOKEN_KEY);
let memoryUser = null;
try {
  const raw = storageGet(USER_KEY);
  memoryUser = raw ? JSON.parse(raw) : null;
} catch {
  memoryUser = null;
}

function getUser() {
  if (!memoryUser) return null;
  return memoryUser.user || memoryUser;
}

export function isDemoUser() {
  const u = getUser();
  return Boolean(u && u.is_demo);
}

export const session = {
  get token() {
    return memoryToken;
  },
  get user() {
    return getUser();
  },
  save({ token, user }) {
    if (token) {
      memoryToken = token;
      storageSet(TOKEN_KEY, token);
    }
    if (user) {
      // Chuẩn hoá luôn lưu đối tượng phẳng, tránh lồng { user: { user: ... } }
      const flat = user.user ? { ...user.user, ...user, user: undefined } : user;
      memoryUser = flat;
      storageSet(USER_KEY, JSON.stringify(flat));
    }
  },
  clear() {
    memoryToken = null;
    memoryUser = null;
    storageSet(TOKEN_KEY, null);
    storageSet(USER_KEY, null);
    clearCache();
  }
};

/* ---------- Bộ nhớ đệm GET ---------- */

const cache = new Map();
const inflight = new Map();
let cacheOwner = null;

function ownerKey() {
  const u = getUser();
  return u && u.id ? String(u.id) : (u && u.is_demo ? "demo" : null);
}

function loadCache() {
  try {
    const saved = JSON.parse(storageGet(CACHE_KEY) || "null");
    if (!saved || saved.owner !== ownerKey()) return;
    const oldest = Date.now() - CACHE_MAX_AGE_MS;
    for (const [url, entry] of saved.entries || []) {
      if (entry.at > oldest) cache.set(url, { data: entry.data, at: 0 });
    }
  } catch {
    /* Bộ đệm hỏng thì bỏ qua */
  }
}
cacheOwner = ownerKey();
if (cacheOwner) loadCache();

let persistTimer = null;
function persistSoon() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const owner = ownerKey();
    if (!owner) return;
    // Mới nhất trước, cắt bớt khi quá dung lượng
    const entries = [...cache.entries()].sort((a, b) => b[1].at - a[1].at);
    let text = "";
    while (entries.length) {
      text = JSON.stringify({ owner, entries: entries.map(([url, e]) => [url, { data: e.data, at: e.at || Date.now() }]) });
      if (text.length <= CACHE_MAX_CHARS) break;
      entries.pop();
    }
    storageSet(CACHE_KEY, entries.length ? text : null);
  }, 800);
}

export function clearCache() {
  cache.clear();
  inflight.clear();
  clearTimeout(persistTimer);
  storageSet(CACHE_KEY, null);
}

let staleTimer = null;
function announceStale() {
  clearTimeout(staleTimer);
  staleTimer = setTimeout(() => window.dispatchEvent(new Event("thuchi:stale")), 60);
}

export class ApiError extends Error {
  constructor(status, data) {
    super((data && data.message) || tr("Có lỗi xảy ra, vui lòng thử lại."));
    this.status = status;
    this.code = data && data.error_code;
    this.data = data || {};
  }
}

const pad = (n) => String(n).padStart(2, "0");

/** Ngày trên máy người dùng (YYYY-MM-DD) - backend tính "hôm nay" theo ngày này. */
export function today(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Giờ trên máy người dùng (HH:mm). */
export function nowTime(date = new Date()) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function shiftDate(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  return today(new Date(y, m - 1, d + days));
}

/**
 * @param {string} path - đường dẫn sau /api, ví dụ "/auth/login"
 * @param {object} [options]
 * @param {string} [options.method]
 * @param {object} [options.body] - gửi dạng JSON
 * @param {FormData} [options.form] - gửi dạng multipart (ảnh bill)
 * @param {object} [options.query]
 */
export async function api(path, { method = "GET", body, form, query, fresh = false, silentAuth = false } = {}) {
  let url = `/api${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") params.set(key, value);
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  // Chế độ dùng thử hoặc endpoint demo: Xử lý 100% bằng Mock cục bộ trên máy, KHÔNG lưu hay gửi lên Cloud Database
  if (path === "/auth/demo" || (isDemoUser() && path !== "/auth/register" && path !== "/auth/login")) {
    return handleMockRequest(url, method, body);
  }

  if (method !== "GET") {
    const data = await send(url, method, body, form);
    // Đã ghi dữ liệu: số liệu cũ trong bộ đệm không còn đúng (đọc ảnh/chữ/giọng nói thì chưa ghi gì)
    if (cache.size && !path.startsWith("/scan/")) clearCache();
    return data;
  }

  // Đổi tài khoản thì bỏ bộ đệm của tài khoản trước
  if (cacheOwner !== ownerKey()) {
    cache.clear();
    cacheOwner = ownerKey();
    if (cacheOwner) loadCache();
  }
  // Giờ phút (now) đổi liên tục nên không đưa vào khoá, nếu không bộ đệm sẽ trượt mỗi phút
  const key = url.replace(/([?&])now=[^&]*&?/, "$1").replace(/[?&]$/, "");
  const hit = cache.get(key);
  if (hit && !fresh) {
    if (Date.now() - hit.at > REVALIDATE_AFTER_MS) {
      getFresh(url, key).then((data) => {
        if (JSON.stringify(data) !== JSON.stringify(hit.data)) announceStale();
      }).catch(() => {});
    }
    return hit.data;
  }
  return getFresh(url, key);
}

/** GET thật tới máy chủ; nhiều nơi cùng xin một địa chỉ thì chỉ gọi một lần. */
function getFresh(url, key = url) {
  if (inflight.has(key)) return inflight.get(key);
  const job = send(url, "GET").then((data) => {
    if (inflight.get(key) === job) {
      cache.set(key, { data, at: Date.now() });
      persistSoon();
    }
    return data;
  }).finally(() => {
    if (inflight.get(key) === job) inflight.delete(key);
  });
  inflight.set(key, job);
  return job;
}

async function send(url, method, body, form) {
  const headers = { "X-Lang": lang };
  if (memoryToken) headers.Authorization = `Bearer ${memoryToken}`;
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, { method, headers, body: payload });
  } catch {
    // Không kết nối được máy chủ (chạy độc lập trên Netlify / APK): Tự động dùng Local Mock
    return handleMockRequest(url, method, body);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (res.status === 404 || res.status === 502 || res.status === 503) {
      return handleMockRequest(url, method, body);
    }
    const error = new ApiError(res.status, data);
    if (res.status === 401 && memoryToken && (error.code === "TOKEN_INVALID" || error.code === "SESSION_REVOKED")) {
      session.clear();
      if (!silentAuth) {
        window.dispatchEvent(new CustomEvent("sochi:signed-out", { detail: error.message }));
      }
    }
    throw error;
  }
  return data;
}
