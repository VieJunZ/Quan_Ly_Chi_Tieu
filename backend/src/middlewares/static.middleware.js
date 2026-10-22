/**
 * @file static.middleware.js
 * @description Phục vụ giao diện /app nhanh cho nhiều người dùng cùng lúc:
 *  - Đọc file một lần rồi giữ trong RAM, nén sẵn bản brotli và gzip (không nén lại mỗi request).
 *  - Gắn ETag để trình duyệt hỏi lại chỉ nhận 304 (vài byte) khi file chưa đổi.
 *  - Cache-Control theo loại file: trang và service worker luôn hỏi lại, css/js/ảnh dùng lại một lúc.
 *  - Thay chuỗi __SITE_URL__ trong file .html bằng địa chỉ thật (biến SITE_URL hoặc tên miền đang truy cập)
 *    để thẻ canonical, Open Graph đúng khi đưa lên tên miền riêng.
 * Khi chạy NODE_ENV=production thì không kiểm tra file đổi nữa (đỡ một lần đọc ổ đĩa mỗi request).
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");
const { promisify } = require("util");

const brotli = promisify(zlib.brotliCompress);
const gzip = promisify(zlib.gzip);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};
const COMPRESSIBLE = new Set([".html", ".css", ".js", ".mjs", ".json", ".webmanifest", ".svg", ".txt", ".xml"]);
const MAX_CACHED_BYTES = 2 * 1024 * 1024;

function cacheControl(file, ext) {
  const name = path.basename(file);
  if (ext === ".html" || name === "sw.js" || name === "manifest.json") return "no-cache";
  if (ext === ".png" || ext === ".svg" || ext === ".jpg" || ext === ".webp" || ext === ".ico") {
    return "public, max-age=86400, stale-while-revalidate=604800";
  }
  return "public, max-age=300, stale-while-revalidate=86400";
}

/** Địa chỉ gốc của trang, ví dụ https://thuchi.vn (không có dấu / cuối). */
function siteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
  const host = String(req.get("host") || "localhost").replace(/[^\w.:[\]-]/g, "");
  return `${req.protocol}://${host}`;
}

// Nén chạy trên thread pool của Node (không chặn các yêu cầu khác trong lúc nén)
async function build(body, ext) {
  const entry = {
    body,
    etag: `"${crypto.createHash("sha1").update(body).digest("base64url").slice(0, 22)}"`,
    br: null,
    gzip: null
  };
  if (COMPRESSIBLE.has(ext) && body.length > 1024) {
    [entry.br, entry.gzip] = await Promise.all([
      brotli(body, {
        params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: body.length }
      }),
      gzip(body, { level: 9 })
    ]);
  }
  return entry;
}

/**
 * @param {string} rootDir - thư mục chứa giao diện (frontend/app)
 */
function createStaticServer(rootDir) {
  const root = path.resolve(rootDir);
  const cache = new Map();
  // File đang được đọc và nén: người đến sau chờ dùng chung kết quả, không nén lại lần nữa
  // (vừa bật máy chủ mà 100 người cùng xin app.css thì chỉ nén 1 lần thay vì 100 lần)
  const building = new Map();
  const watchChanges = process.env.NODE_ENV !== "production";

  async function readAndBuild(file, ext, site, key, mtime) {
    let body = await fs.promises.readFile(file);
    if (ext === ".html") body = Buffer.from(body.toString("utf8").replaceAll("__SITE_URL__", site));
    const entry = { ...(await build(body, ext)), mtime };
    cache.set(key, entry);
    return entry;
  }

  async function load(file, ext, req) {
    const site = ext === ".html" ? siteUrl(req) : "";
    const key = `${file}|${site}`;
    let entry = cache.get(key);
    if (!entry || watchChanges) {
      const stat = await fs.promises.stat(file).catch(() => null);
      if (!stat || !stat.isFile()) return null;
      const mtime = stat.mtimeMs;
      if (entry && entry.mtime === mtime) return entry;
      if (stat.size > MAX_CACHED_BYTES) return { stream: true, size: stat.size, mtime };
      const job = `${key}|${mtime}`;
      if (!building.has(job)) {
        building.set(job, readAndBuild(file, ext, site, key, mtime).finally(() => building.delete(job)));
      }
      entry = await building.get(job);
    }
    return entry;
  }

  return async function serveStatic(req, res, next) {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    let rel;
    try {
      rel = decodeURIComponent(req.path);
    } catch {
      return next();
    }
    if (rel.endsWith("/")) rel += "index.html";
    const file = path.join(root, rel);
    // Chặn đường dẫn kiểu /../ ra ngoài thư mục giao diện
    if (file !== root && !file.startsWith(root + path.sep)) return next();
    let ext = path.extname(file).toLowerCase();
    let target = file;
    if (!ext) {
      target = `${file}.html`;
      ext = ".html";
    }

    try {
      const entry = await load(target, ext, req);
      if (!entry) return next();
      if (entry.stream) return res.sendFile(target, { headers: { "Cache-Control": cacheControl(target, ext) } });

      res.setHeader("Content-Type", TYPES[ext] || "application/octet-stream");
      res.setHeader("Cache-Control", cacheControl(target, ext));
      res.setHeader("ETag", entry.etag);
      res.setHeader("Vary", "Accept-Encoding");

      if (req.headers["if-none-match"] === entry.etag) return res.status(304).end();

      const accept = String(req.headers["accept-encoding"] || "");
      let body = entry.body;
      if (entry.br && /\bbr\b/.test(accept)) {
        body = entry.br;
        res.setHeader("Content-Encoding", "br");
      } else if (entry.gzip && /\bgzip\b/.test(accept)) {
        body = entry.gzip;
        res.setHeader("Content-Encoding", "gzip");
      }
      res.setHeader("Content-Length", body.length);
      return req.method === "HEAD" ? res.end() : res.end(body);
    } catch (error) {
      return next(error);
    }
  };
}

/** robots.txt và sitemap.xml cho công cụ tìm kiếm. */
function seoRoutes(app) {
  app.get("/robots.txt", (req, res) => {
    res.type("text/plain").set("Cache-Control", "public, max-age=86400").send(
      `User-agent: *\nAllow: /app/\nDisallow: /api/\n\nSitemap: ${siteUrl(req)}/sitemap.xml\n`);
  });
  app.get("/sitemap.xml", (req, res) => {
    const site = siteUrl(req);
    res.type("application/xml").set("Cache-Control", "public, max-age=86400").send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
      + `  <url><loc>${site}/app/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>\n`);
  });
}

module.exports = { createStaticServer, seoRoutes, siteUrl };
