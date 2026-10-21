/**
 * Kiểm thử bộ phân tích câu nói / tin nhắn ngân hàng / hóa đơn.
 * Chạy: npm test   (hoặc: node --test tests)
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { parseVoice, parseDocument, guessCategory } = require("../src/services/textParse.service");

const CTX = { today: "2026-10-15", now: "20:15" };

function one(text, ctx = CTX) {
  const { items } = parseVoice(text, ctx);
  assert.equal(items.length, 1, `"${text}" phải ra đúng 1 khoản, ra ${JSON.stringify(items)}`);
  return items[0];
}

/* ---------------- Câu nói ---------------- */

test("giọng nói: câu mẫu trà sữa 30 nghìn", () => {
  const item = one("hôm nay mua trà sữa 30 nghìn");
  assert.equal(item.amount, 30000);
  assert.equal(item.type, "expense");
  assert.equal(item.category_id, 1);
  assert.equal(item.note, "Trà sữa");
  assert.equal(item.transaction_date, "2026-10-15");
  assert.equal(item.transaction_time, "20:15");
});

test("giọng nói: các cách nói số tiền", () => {
  const cases = [
    ["phở 40k", 40000],
    ["ăn bún 35 ngàn", 35000],
    ["mua giày 1tr2", 1200000],
    ["mua giày 1 triệu 2", 1200000],
    ["tiền trọ 2 triệu rưỡi", 2500000],
    ["tiền trọ 2tr500", 2500000],
    ["đóng học phí 1.250.000 đồng", 1250000],
    ["cà phê 25.000", 25000],
    ["mua sách hai trăm nghìn", 200000],
    ["ăn trưa ba mươi lăm nghìn", 35000],
    ["xăng năm chục", 50000],
    ["áo 2 trăm rưỡi", 250000],
    ["nước mía 15", 15000]
  ];
  for (const [text, amount] of cases) {
    assert.equal(one(text).amount, amount, text);
  }
});

test("giọng nói: số trống không được đánh dấu là đoán", () => {
  assert.equal(one("nước mía 15").amount_guessed, true);
  assert.equal(one("nước mía 15k").amount_guessed, false);
});

test("giọng nói: nhiều khoản trong một câu", () => {
  const { items } = parseVoice("ăn phở 40k rồi đổ xăng 50 nghìn, gửi xe 5k và mua sách 120k", CTX);
  assert.deepEqual(items.map((i) => i.amount), [40000, 50000, 5000, 120000]);
  assert.deepEqual(items.map((i) => i.category_id), [1, 3, 3, 6]);
});

test("giọng nói: nhiều khoản không có từ nối", () => {
  const { items } = parseVoice("phở 40k trà đá 5k", CTX);
  assert.deepEqual(items.map((i) => [i.note, i.amount]), [["Phở", 40000], ["Trà đá", 5000]]);
});

test("giọng nói: số lượng không bị hiểu nhầm thành tiền", () => {
  const item = one("mua 2 ly trà sữa 60k");
  assert.equal(item.amount, 60000);
  assert.match(item.note, /2 ly trà sữa/i);
});

test("giọng nói: hôm qua, giờ cụ thể, buổi trong ngày", () => {
  const a = one("hôm qua ăn lẩu 150k");
  assert.equal(a.transaction_date, "2026-10-14");

  const b = one("lúc 7h30 ăn sáng 25k");
  assert.equal(b.transaction_time, "07:30");

  const c = one("sáng nay ăn bánh mì 20k");
  assert.equal(c.transaction_date, "2026-10-15");
  assert.equal(c.transaction_time, "07:30");

  const d = one("hôm kia 8 giờ tối xem phim 90k");
  assert.equal(d.transaction_date, "2026-10-13");
  assert.equal(d.transaction_time, "20:00");
  assert.equal(d.category_id, 7);
});

test("giọng nói: giờ không bị lấy làm số tiền", () => {
  const item = one("7h tối ăn cơm 35k");
  assert.equal(item.amount, 35000);
  assert.equal(item.transaction_time, "19:00");
});

test("giọng nói: khoản thu", () => {
  const a = one("mẹ gửi 2 triệu");
  assert.equal(a.type, "income");
  assert.equal(a.category_id, 12);

  const b = one("nhận lương làm thêm 3tr");
  assert.equal(b.type, "income");
  assert.equal(b.category_id, 10);

  const c = one("được thưởng 500k");
  assert.equal(c.type, "income");
  assert.equal(c.category_id, 11);
});

test("giọng nói: không có số tiền thì trả về phần không hiểu", () => {
  const result = parseVoice("hôm nay trời đẹp quá", CTX);
  assert.equal(result.items.length, 0);
  assert.equal(result.unparsed, "hôm nay trời đẹp quá");
});

test("đoán danh mục", () => {
  assert.equal(guessCategory("Tiền điện tháng 10"), 5);
  assert.equal(guessCategory("Grab bike về nhà"), 3);
  assert.equal(guessCategory("Thuốc cảm"), 8);
  assert.equal(guessCategory("Đồ linh tinh"), 9);
  assert.equal(guessCategory("abc", "income"), 13);
});

/* ---------------- Thông báo ngân hàng ---------------- */

test("SMS ngân hàng: trừ tiền, bỏ qua số dư", () => {
  const sms = "TK 1234xxx789 -55,000VND luc 14-10-2026 12:31:05. SD: 2,345,000VND. ND: THANH TOAN QR HIGHLANDS COFFEE";
  const r = parseDocument(sms, CTX);
  assert.equal(r.doc_kind, "bank_notification");
  assert.equal(r.direction, "expense");
  assert.equal(r.amount, 55000);
  assert.equal(r.transaction_date, "2026-10-14");
  assert.equal(r.transaction_time, "12:31");
  assert.equal(r.category_id, 1);
  assert.ok(r.ignored_balance.includes(2345000));
});

test("SMS ngân hàng: cộng tiền là khoản thu", () => {
  const sms = "Vietcombank: So du TK VCB 0011004xxxxx +2,000,000 VND luc 15-10-2026 09:02:11. So du 5,120,500 VND. Ref MBVCB.123456789.ME GUI TIEN AN";
  const r = parseDocument(sms, CTX);
  assert.equal(r.doc_kind, "bank_notification");
  assert.equal(r.direction, "income");
  assert.equal(r.amount, 2000000);
  assert.ok(r.ignored_balance.includes(5120500));
});

test("SMS ngân hàng: số dư đứng trước số tiền giao dịch", () => {
  const sms = "MBBANK: So du kha dung 1.020.000d. GD: -180.000d 13/10/26 19:45 ND: tien dien thang 10";
  const r = parseDocument(sms, CTX);
  assert.equal(r.amount, 180000);
  assert.equal(r.direction, "expense");
  assert.equal(r.transaction_date, "2026-10-13");
  assert.equal(r.category_id, 5);
});

/* ---------------- Ảnh chuyển khoản (chữ đọc được từ ảnh) ---------------- */

test("ảnh chuyển khoản thành công có banner số dư", () => {
  const text = [
    "Số dư khả dụng",
    "8.765.432 VND",
    "Chuyển tiền thành công",
    "250.000 VND",
    "Người nhận: NGUYEN VAN AN",
    "Ngân hàng nhận: Techcombank",
    "Nội dung: tra tien an trua",
    "Mã giao dịch: FT26288123456",
    "Thời gian: 14:05 15/10/2026",
    "Phí giao dịch: Miễn phí"
  ].join("\n");
  const r = parseDocument(text, CTX);
  assert.equal(r.doc_kind, "transfer");
  assert.equal(r.direction, "expense");
  assert.equal(r.amount, 250000);
  assert.equal(r.transaction_time, "14:05");
  assert.equal(r.reference_code, "FT26288123456");
  assert.ok(r.ignored_balance.includes(8765432));
});

test("ảnh nhận tiền là khoản thu", () => {
  const text = "Nhận tiền thành công\n+1.500.000 đ\nNgười chuyển: TRAN THI B\nNội dung: luong part time\n10:20 12/10/2026";
  const r = parseDocument(text, CTX);
  assert.equal(r.direction, "income");
  assert.equal(r.amount, 1500000);
  assert.equal(r.transaction_date, "2026-10-12");
});

/* ---------------- Hóa đơn ---------------- */

test("hóa đơn: lấy tổng cộng, không lấy tiền khách đưa", () => {
  const text = [
    "PHUC LONG COFFEE & TEA",
    "123 Nguyễn Trãi, Q.5",
    "HÓA ĐƠN THANH TOÁN",
    "Ngày: 15/10/2026 08:42",
    "Trà sữa Phúc Long   1   55.000",
    "Bánh mì que         2   30.000",
    "Tạm tính                85.000",
    "Giảm giá               -10.000",
    "Tổng cộng              75.000",
    "Tiền khách đưa        100.000",
    "Tiền thừa              25.000",
    "Cảm ơn quý khách"
  ].join("\n");
  const r = parseDocument(text, CTX);
  assert.equal(r.doc_kind, "receipt");
  assert.equal(r.direction, "expense");
  assert.equal(r.amount, 75000);
  assert.equal(r.transaction_date, "2026-10-15");
  assert.equal(r.transaction_time, "08:42");
  assert.equal(r.note, "PHUC LONG COFFEE & TEA");
  assert.equal(r.category_id, 1);
});

test("hóa đơn: nhãn tổng ở dòng trên, số ở dòng dưới", () => {
  const text = "CIRCLE K\nHoa don ban le\nMi ly 2 x 12.000\nKHACH CAN TRA\n24.000 d\nTien mat 50.000";
  const r = parseDocument(text, CTX);
  assert.equal(r.doc_kind, "receipt");
  assert.equal(r.amount, 24000);
});

// Chữ OCR đọc thật từ tests/fixtures/hoa_don_chup_bong.png (ảnh chụp có bóng): mất dấu "/" và ":", đọc sai vài chữ
const BILL_OCR_LOI = [
  "VINH NGUYEN RES",
  "355 Sự Vạn Hạnh P.12, Q10",
  "ĐT: 080.126.8955 - 080.126.9833",
  "HOA BON THANH TOÁN",
  "SéHD 0002",
  "Ngảym 29032019 Giờm: 235900",
  "Ban:                            Ban 01",
  "Thụ ngân     ADMIN",
  "TÊN HÃNG             SL DomGa TEN",
  "1)Coca                     2. 25000 50000",
  "2)Spnte          :       2       25,000 50.000",
  "3)Coca                  2       25000 50.000",
  "4JTonc                  2. 25000 50,000",
  "§)Soda                  1       25000 25.000",
  "T.Céng                 9                   225,000",
  "TIEN MAT       225,000",
  "Hai trăm hai mươi 18m ngắn đồng /.",
  "CAM On Quy Khách - Họn Gặp Lại"
].join("\n");

test("hóa đơn chụp: ngày giờ mất dấu phân cách không bị lấy làm tiền", () => {
  const r = parseDocument(BILL_OCR_LOI, CTX);
  assert.equal(r.doc_kind, "receipt");
  assert.equal(r.amount, 225000);
  assert.equal(r.transaction_date, "2019-03-29");
  assert.equal(r.transaction_time, "23:59");
  assert.equal(r.date_found, true);
  assert.equal(r.note, "VINH NGUYEN RES");
  assert.equal(r.category_id, 1);
});

test("hóa đơn: tiêu đề 'Hóa đơn thanh toán' không phải dòng tổng", () => {
  const text = "QUAN AN NGON\nHÓA ĐƠN THANH TOÁN\nSố HĐ 123456\nCơm gà 1 45.000\nTrà đá 2 10.000\nT.Cộng 55.000";
  const r = parseDocument(text, CTX);
  assert.equal(r.amount, 55000);
});

test("hóa đơn: số tiền trơn không dấu chấm vẫn đọc được", () => {
  const r = parseDocument("TAP HOA MINH\nNgay 14/10/2026 Gio 09:30\nTong cong 150000", CTX);
  assert.equal(r.amount, 150000);
  assert.equal(r.transaction_time, "09:30");
});

test("giờ dính liền chỉ hiểu khi có nhãn giờ", () => {
  // Giờ chỉ được dùng khi chứng từ có ngày, nên mỗi mẫu đều kèm ngày
  assert.equal(parseDocument("Hoa don\nNgay 14/10/2026 Gio in 23 59 00\nTong cong 50.000", CTX).transaction_time, "23:59");
  assert.equal(parseDocument("Hoa don\nNgay 14/10/2026 Gio: 0815\nTong cong 50.000", CTX).transaction_time, "08:15");
  // Không có nhãn giờ thì không đoán, dùng giờ hiện tại
  assert.equal(parseDocument("Hoa don\nNgay 14/10/2026 Ma 2359\nTong cong 50.000", CTX).transaction_time, "20:15");
});

test("ngày trong tương lai thì dùng hôm nay", () => {
  const r = parseDocument("Hoa don\nNgay 20/12/2026\nTong cong 50.000", CTX);
  assert.equal(r.transaction_date, "2026-10-15");
  assert.equal(r.date_found, false);
});

test("văn bản lạ thì độ tin cậy thấp", () => {
  const r = parseDocument("xin chào các bạn", CTX);
  assert.equal(r.doc_kind, "unknown");
  assert.equal(r.amount, null);
  assert.equal(r.confidence, 0);
});
