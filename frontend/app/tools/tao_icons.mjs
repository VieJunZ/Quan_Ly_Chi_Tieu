// Tạo frontend/app/js/icons.js chỉ chứa các biểu tượng Lucide app thực sự dùng.
// Quét chuỗi dạng "ten-bieu-tuong" trong frontend/app/js, database và backend/src
// (danh mục lưu tên biểu tượng trong CSDL), giữ những tên có trong Lucide.
// Chạy: node frontend/app/tools/tao_icons.mjs
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "frontend/js/lucide.min.js"), "utf8"), ctx);
const { icons } = ctx.lucide;
const toPascal = (n) => n.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
const walk = (d, ext) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (e.name === "node_modules" ? [] : walk(path.join(d, e.name), ext)) : ext.some((x) => e.name.endsWith(x)) ? [path.join(d, e.name)] : []);
const files = [...walk(path.join(ROOT, "frontend/app/js"), [".js"]).filter((f) => !f.endsWith("icons.js")), ...walk(path.join(ROOT, "database"), [".sql"]), ...walk(path.join(ROOT, "backend/src"), [".js"])];
const names = new Set(["circle"]);
for (const f of files) for (const m of fs.readFileSync(f, "utf8").matchAll(/["'`]([a-z][a-z0-9]*(?:-[a-z0-9]+)*)["'`]/g)) if (icons[toPascal(m[1])]) names.add(m[1]);
const out = {};
// Chỉ giữ phần hình bên trong, thuộc tính chung của thẻ svg do icon() trong ui.js tự gắn
for (const n of [...names].sort()) out[n] = icons[toPascal(n)][2];
const body = `// Bộ biểu tượng rút gọn lấy từ Lucide v0.468.0 (giấy phép ISC, https://lucide.dev).
// Chỉ gồm các biểu tượng app dùng, thay cho file lucide.min.js đầy đủ (358 KB).
// Tạo lại khi thêm biểu tượng mới: node frontend/app/tools/tao_icons.mjs
export default ${JSON.stringify(out)};
`;
fs.writeFileSync(path.join(ROOT, "frontend/app/js/icons.js"), body);
console.log(names.size, "icons", body.length, "bytes");
