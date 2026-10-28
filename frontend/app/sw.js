/**
 * @file sw.js
 * @description Service worker của Quản lý thu chi: lưu sẵn khung giao diện để mở app tức thì và dùng được khi mất mạng.
 * Dữ liệu (/api) luôn lấy từ máy chủ, không bao giờ lưu vào bộ nhớ đệm.
 *  - Trang (index.html): lấy bản mới, mạng chậm quá 3 giây hoặc mất mạng thì dùng bản đã lưu.
 *  - css, js, ảnh, phông chữ: trả ngay bản đã lưu rồi cập nhật ngầm cho lần mở sau.
 */

const CACHE = "thuchi-shell-v25";
const FONT_CACHE = "thuchi-fonts-v1";
const SHELL = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/app.js",
  "./js/api.js",
  "./js/ui.js",
  "./js/icons.js",
  "./icon-192.png",
  "./js/pet.js",
  "./js/coach.js",
  "./js/prefs.js",
  "./js/i18n.js",
  "./js/lang/en.js",
  "./js/screens/auth.js",
  "./js/screens/home.js",
  "./js/screens/history.js",
  "./js/screens/debts.js",
  "./js/screens/wallet.js",
  "./js/screens/me.js",
  "./js/screens/challenges.js",
  "./js/screens/settings.js",
  "./js/screens/categories.js",
  "./js/flows/add.js",
  "./js/flows/mini.js",
  "./js/flows/survey.js",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Đang sửa code trên máy (localhost) thì luôn lấy bản mới để thấy thay đổi ngay
const DEV = ["localhost", "127.0.0.1"].includes(location.hostname);
const FONT_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);

function saveTo(cacheName, req, res) {
  if (res.ok || res.type === "opaque") {
    const copy = res.clone();
    caches.open(cacheName).then((cache) => cache.put(req, copy));
  }
  return res;
}

/** Bản đã lưu có thì trả ngay, đồng thời tải bản mới cất cho lần sau. */
function staleWhileRevalidate(event, cacheName) {
  const req = event.request;
  const network = fetch(req).then((res) => saveTo(cacheName, req, res));
  event.waitUntil(network.catch(() => {}));
  return caches.match(req, { ignoreSearch: true }).then((hit) => hit || network);
}

/** Trang: ưu tiên bản mới, mạng chậm hoặc mất thì dùng bản đã lưu. */
function networkFirst(req) {
  const network = fetch(req).then((res) => saveTo(CACHE, req, res));
  const fallback = () => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("./index.html"));
  const slow = new Promise((resolve) => setTimeout(resolve, 3000)).then(fallback);
  return Promise.race([network, slow.then((hit) => hit || network)])
    .catch(() => fallback().then((hit) => hit || Response.error()));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (FONT_HOSTS.has(url.hostname)) {
    event.respondWith(staleWhileRevalidate(event, FONT_CACHE));
    return;
  }
  // Dữ liệu người dùng và trang của nơi khác: để trình duyệt tự xử lý
  if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  event.respondWith(req.mode === "navigate" || DEV ? networkFirst(req) : staleWhileRevalidate(event, CACHE));
});
