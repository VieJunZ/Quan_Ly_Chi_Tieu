/**
 * @file demo.service.js
 * @description Chế độ dùng thử: tạo tài khoản tạm 24 giờ kèm dữ liệu mẫu giống một sinh viên thật
 * (tiền trọ, gửi xe mỗi sáng, trà sữa buổi chiều, một bữa lẩu chia tiền...) để người dùng thấy
 * ngay các chức năng như gợi ý theo thói quen, sổ nợ, Mini-View mà không phải nhập gì.
 */

const crypto = require("crypto");
const bcrypt = require("./hash.service");
const db = require("../config/db");
const { todayLocal, nowTimeLocal, isValidDate, isValidTime } = require("../lib/validate");

const DEMO_HOURS = 24;

function randomSuffix(length = 6) {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function shiftDate(isoDate, days) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/**
 * Dữ liệu mẫu 12 ngày gần nhất. Mỗi dòng: [lệch ngày, giờ, danh mục, số tiền, ghi chú].
 * Các khoản lặp lại (gửi xe, cơm trưa, trà sữa) tạo thành "thói quen" cho chức năng gợi ý 1 chạm.
 */
function sampleRows(today, nowTime) {
  const rows = [
    [-12, "09:00", 12, 3000000, "Bố mẹ gửi tiền tháng"],
    [-11, "19:30", 2, 1800000, "Tiền phòng trọ"],
    [-8, "20:10", 5, 250000, "Tiền điện nước"],
    [-7, "10:20", 6, 120000, "Mua giáo trình"],
    [-5, "21:00", 10, 1500000, "Lương làm thêm quán cà phê"],
    [-4, "18:40", 4, 159000, "Áo phông Shopee"],
    [-3, "20:30", 7, 90000, "Xem phim"],
    [-1, "21:15", 8, 45000, "Thuốc cảm"]
  ];

  for (let day = -10; day <= -1; day++) {
    if (day !== -6) rows.push([day, day % 2 ? "07:40" : "07:50", 3, 5000, "Gửi xe"]);
    if (day % 3 !== 0) rows.push([day, "11:45", 1, 35000, "Cơm trưa"]);
  }
  for (const day of [-9, -6, -4, -2, -1]) rows.push([day, "15:10", 1, 30000, "Trà sữa"]);
  // Vài thói quen quen thuộc để màn Thử thách có gợi ý ngay khi dùng thử
  for (const day of [-11, -9, -8, -5, -3, -2]) rows.push([day, "08:15", 1, 29000, "Cà phê sữa đá Highlands"]);
  rows.push([-10, "22:10", 3, 32000, "GrabBike về trọ"], [-6, "21:40", 3, 28000, "Grab đi chơi về"], [-3, "23:00", 3, 35000, "GrabBike"]);
  rows.push([-7, "20:00", 1, 65000, "ShopeeFood cơm gà"], [-5, "21:30", 1, 55000, "ShopeeFood bún bò"]);

  // Hôm nay: chỉ những khoản đã qua giờ hiện tại
  for (const row of [[0, "07:45", 3, 5000, "Gửi xe"], [0, "11:50", 1, 35000, "Cơm trưa"]]) {
    if (row[1] <= nowTime) rows.push(row);
  }

  return rows.map(([offset, time, categoryId, amount, note]) => ({
    category_id: categoryId,
    amount,
    note,
    transaction_date: shiftDate(today, offset),
    transaction_time: time
  }));
}

/**
 * Tạo tài khoản dùng thử và dữ liệu mẫu trong một transaction.
 * @param {string} [clientToday] - Ngày trên máy người dùng (YYYY-MM-DD)
 * @param {string} [clientNow] - Giờ trên máy người dùng (HH:mm)
 */
async function createDemoUser(clientToday, clientNow) {
  const today = isValidDate(clientToday) ? clientToday : todayLocal();
  const nowTime = isValidTime(clientNow) ? clientNow : nowTimeLocal();
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

  return db.withTransaction(async (tx) => {
    let user = null;
    for (let attempt = 0; attempt < 5 && !user; attempt++) {
      const username = `khach_${randomSuffix()}`;
      const rows = await db.query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE username = @username)
          INSERT INTO dbo.users (username, password_hash, is_demo, demo_expires_at)
          OUTPUT inserted.id, inserted.username
          VALUES (@username, @hash, 1, DATEADD(HOUR, @hours, SYSDATETIME()))`,
      { username, hash: passwordHash, hours: DEMO_HOURS }, tx);
      user = rows[0] || null;
    }
    if (!user) throw new Error("Không tạo được tên tài khoản dùng thử.");

    await db.query(`
      INSERT INTO dbo.transactions (user_id, category_id, amount, note, transaction_date, transaction_time, source)
      SELECT @user_id, j.category_id, j.amount, j.note, j.transaction_date, j.transaction_time, 'demo'
      FROM OPENJSON(@rows) WITH (
        category_id      INT            '$.category_id',
        amount           DECIMAL(15, 2) '$.amount',
        note             NVARCHAR(500)  '$.note',
        transaction_date DATE           '$.transaction_date',
        transaction_time TIME(0)        '$.transaction_time'
      ) AS j`, { user_id: user.id, rows: JSON.stringify(sampleRows(today, nowTime)) }, tx);

    // Một bữa lẩu 2 hôm trước chia 4 người: có sẵn sổ nợ để xem
    const split = await db.execRows("dbo.sp_create_split_bill", {
      user_id: user.id,
      title: "Lẩu sinh nhật Nam",
      total_amount: 640000,
      people_json: JSON.stringify(["Nam", "Hùng", "Lan"]),
      category_id: 1,
      transaction_date: shiftDate(today, -2),
      transaction_time: "19:30"
    }, tx);
    if (split[0] && split[0].transaction_id) {
      await db.query("UPDATE dbo.transactions SET source = 'demo' WHERE id = @id", { id: split[0].transaction_id }, tx);
    }
    // Lan đã trả lại phần của mình
    await db.query(`
      UPDATE dbo.debts SET settled_at = SYSDATETIME()
      WHERE user_id = @user_id AND person_name = N'Lan'`, { user_id: user.id }, tx);
    await db.query(`
      INSERT INTO dbo.debts (user_id, person_name, direction, amount, note)
      VALUES (@user_id, N'Minh', 'i_owe', 50000, N'Mượn tiền in tài liệu')`, { user_id: user.id }, tx);

    // Ngân sách tháng để thấy ngay "Còn được tiêu hôm nay" và thú cưng ví tiền
    await db.query(`
      INSERT INTO dbo.budgets (user_id, month_start, amount)
      VALUES (@user_id, @month_start, 4000000)`, { user_id: user.id, month_start: `${today.slice(0, 7)}-01` }, tx);

    return user;
  });
}

/** Xóa dữ liệu mẫu (giữ lại những gì người dùng tự nhập trong lúc dùng thử). */
async function removeSampleData(userId, scope) {
  await db.query(`
    DELETE d FROM dbo.debts AS d
    WHERE d.user_id = @uid
      AND (d.person_name = N'Minh' AND d.note = N'Mượn tiền in tài liệu'
           OR d.split_id IN (SELECT sb.id FROM dbo.split_bills AS sb
                             JOIN dbo.transactions AS t ON t.id = sb.transaction_id
                             WHERE sb.user_id = @uid AND t.source = 'demo'));

    DELETE sb FROM dbo.split_bills AS sb
    JOIN dbo.transactions AS t ON t.id = sb.transaction_id
    WHERE sb.user_id = @uid AND t.source = 'demo';

    DELETE FROM dbo.transactions WHERE user_id = @uid AND source = 'demo';`, { uid: userId }, scope);
}

/** Xóa tài khoản dùng thử đã hết hạn (chạy định kỳ). */
async function cleanupExpired() {
  const rows = await db.execRows("dbo.sp_cleanup_demo_users");
  return rows[0] ? rows[0].deleted_count : 0;
}

module.exports = { DEMO_HOURS, createDemoUser, removeSampleData, cleanupExpired, sampleRows };
