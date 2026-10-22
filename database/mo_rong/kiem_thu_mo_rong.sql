/* =============================================================================
   Kiểm thử phần mở rộng CSDL (chạy sau mo_rong_bang.sql và mo_rong_thu_tuc.sql)
   Tự tạo dữ liệu thử và tự dọn khi xong. Có ca FAIL thì script báo lỗi.
   ============================================================================= */

USE so_chi_tri_db;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

SET NOCOUNT ON;

DECLARE @results TABLE (
    no        INT IDENTITY(1, 1),
    test_case NVARCHAR(150),
    result    VARCHAR(4),
    detail    NVARCHAR(300)
);

DECLARE @hash   VARCHAR(60) = '$2b$10$' + REPLICATE('x', 53);
DECLARE @suffix VARCHAR(8)  = LEFT(REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''), 8);
DECLARE @today  DATE = CAST(SYSDATETIME() AS DATE);
DECLARE @u INT, @demo_old INT, @demo_new INT, @n INT, @scan INT, @scan2 INT, @tx INT;
DECLARE @sha CHAR(64) = REPLICATE('a', 64), @sha_khac CHAR(64) = REPLICATE('b', 64), @key CHAR(64) = REPLICATE('c', 64);

DECLARE @tx_row TABLE (
    id INT, category_id INT, type VARCHAR(10), category_name NVARCHAR(100), category_icon VARCHAR(50),
    category_color VARCHAR(30), amount DECIMAL(15, 2), note NVARCHAR(500), transaction_date VARCHAR(10),
    transaction_time VARCHAR(5), source VARCHAR(10), created_at VARCHAR(19)
);
DECLARE @dups TABLE (
    scan_id INT, transaction_id INT, match_kind VARCHAR(20), doc_kind VARCHAR(20), amount DECIMAL(15, 2),
    occurred_at VARCHAR(16), scanned_at VARCHAR(19), note NVARCHAR(500), transaction_date VARCHAR(10)
);
DECLARE @split TABLE (split_id INT, transaction_id INT, people_count INT, share_each DECIMAL(15, 2), my_share DECIMAL(15, 2), payer_name NVARCHAR(50));
DECLARE @wallet TABLE (check_id INT, book_balance DECIMAL(15, 2), actual_balance DECIMAL(15, 2), difference DECIMAL(15, 2), transaction_id INT,
                        ledger_balance DECIMAL(15, 2), owed_to_me DECIMAL(15, 2), i_owe DECIMAL(15, 2));
DECLARE @habits TABLE (
    category_id INT, category_name NVARCHAR(100), category_icon VARCHAR(50), category_color VARCHAR(30), type VARCHAR(10),
    amount DECIMAL(15, 2), note NVARCHAR(500), days_used INT, usual_time VARCHAR(5)
);
DECLARE @day TABLE (day VARCHAR(10), spent DECIMAL(15, 2), received DECIMAL(15, 2), transaction_count INT, marked_no_spend BIT);

INSERT INTO dbo.users (username, password_hash) VALUES ('mr_test_' + @suffix, @hash);
SET @u = SCOPE_IDENTITY();

/* ===========================================================================
   NHÓM 1: Tài khoản dùng thử, mã khôi phục
   =========================================================================== */
BEGIN TRY
    INSERT INTO dbo.users (username, password_hash, is_demo) VALUES ('mr_demo_x_' + @suffix, @hash, 1);
    INSERT @results VALUES (N'Tài khoản dùng thử bắt buộc có hạn dùng', 'FAIL', N'CSDL vẫn cho lưu');
END TRY
BEGIN CATCH
    INSERT @results VALUES (N'Tài khoản dùng thử bắt buộc có hạn dùng', IIF(ERROR_NUMBER() = 547, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

BEGIN TRY
    UPDATE dbo.users SET recovery_code_hash = 'ABCD-1234' WHERE id = @u;
    INSERT @results VALUES (N'Mã khôi phục chỉ nhận dạng băm bcrypt', 'FAIL', N'CSDL vẫn cho lưu');
END TRY
BEGIN CATCH
    INSERT @results VALUES (N'Mã khôi phục chỉ nhận dạng băm bcrypt', IIF(ERROR_NUMBER() = 547, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

/* ===========================================================================
   NHÓM 2: Giao dịch có giờ và nguồn nhập
   =========================================================================== */
INSERT @tx_row EXEC dbo.sp_add_transaction_ex @user_id = @u, @category_id = 1, @amount = 30000,
    @note = N'Trà sữa', @transaction_date = @today, @transaction_time = '15:05', @source = 'voice';
INSERT @results VALUES (N'Thêm giao dịch kèm giờ và nguồn "voice"',
    IIF(EXISTS (SELECT 1 FROM @tx_row WHERE transaction_time = '15:05' AND source = 'voice' AND type = 'expense'), 'PASS', 'FAIL'),
    (SELECT TOP 1 CONCAT(note, ' ', transaction_date, ' ', transaction_time, ' ', source) FROM @tx_row));

BEGIN TRY
    EXEC dbo.sp_add_transaction_ex @user_id = @u, @category_id = 1, @amount = 1000,
        @transaction_date = @today, @source = 'hack';
    INSERT @results VALUES (N'Từ chối nguồn nhập không hợp lệ', 'FAIL', N'CSDL vẫn cho lưu');
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    INSERT @results VALUES (N'Từ chối nguồn nhập không hợp lệ', IIF(ERROR_NUMBER() = 547, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

/* ===========================================================================
   NHÓM 3: Quét bill và chống ghi trùng
   =========================================================================== */
INSERT INTO dbo.receipt_scans (user_id, input_kind, file_sha256, image_dhash, content_key, doc_kind, direction, amount, occurred_at)
VALUES (@u, 'image', @sha, '00000000000000FF', REPLICATE('c', 64), 'transfer', 'expense', 45000, DATEADD(HOUR, 9, CAST(@today AS DATETIME2(0))));
SET @scan = SCOPE_IDENTITY();

-- Chưa xác nhận ghi thì chưa tính là trùng
DELETE @dups;
INSERT @dups EXEC dbo.sp_find_duplicate_scans @user_id = @u, @file_sha256 = @sha;
INSERT @results VALUES (N'Lần quét chưa xác nhận không bị tính là trùng',
    IIF(NOT EXISTS (SELECT 1 FROM @dups), 'PASS', 'FAIL'), NULL);

DELETE @tx_row;
INSERT @tx_row EXEC dbo.sp_add_transaction_ex @user_id = @u, @category_id = 1, @amount = 45000,
    @note = N'Cơm gà', @transaction_date = @today, @transaction_time = '09:00', @source = 'bill', @scan_id = @scan;
SET @tx = (SELECT id FROM @tx_row);
INSERT @results VALUES (N'Xác nhận ghi bill: lần quét được gắn với giao dịch',
    IIF((SELECT transaction_id FROM dbo.receipt_scans WHERE id = @scan) = @tx, 'PASS', 'FAIL'), CONCAT(N'transaction_id=', @tx));

BEGIN TRY
    EXEC dbo.sp_add_transaction_ex @user_id = @u, @category_id = 1, @amount = 45000,
        @transaction_date = @today, @source = 'bill', @scan_id = @scan;
    INSERT @results VALUES (N'Không ghi 2 lần từ cùng một lần quét', 'FAIL', N'CSDL vẫn cho lưu');
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    INSERT @results VALUES (N'Không ghi 2 lần từ cùng một lần quét', IIF(ERROR_NUMBER() = 50020, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

DELETE @dups;
INSERT @dups EXEC dbo.sp_find_duplicate_scans @user_id = @u, @file_sha256 = @sha, @image_dhash = '00000000000000FF';
INSERT @results VALUES (N'Up lại đúng file cũ -> báo trùng file',
    IIF((SELECT TOP 1 match_kind FROM @dups) = 'same_file', 'PASS', 'FAIL'), (SELECT TOP 1 match_kind FROM @dups));

-- Ảnh khác file nhưng nhìn giống (lệch 5 bit dHash)
DELETE @dups;
INSERT @dups EXEC dbo.sp_find_duplicate_scans @user_id = @u, @file_sha256 = @sha_khac, @image_dhash = '0000000000000007', @amount = 45000;
INSERT @results VALUES (N'Ảnh chụp lại (dHash lệch 5 bit, cùng số tiền) -> báo ảnh giống',
    IIF((SELECT TOP 1 match_kind FROM @dups) = 'similar_image', 'PASS', 'FAIL'), (SELECT TOP 1 match_kind FROM @dups));

-- Hai ảnh chụp màn hình cùng app ngân hàng (bố cục giống) nhưng số tiền khác -> không phải trùng
DELETE @dups;
INSERT @dups EXEC dbo.sp_find_duplicate_scans @user_id = @u, @file_sha256 = @sha_khac, @image_dhash = '0000000000000007', @amount = 120000;
INSERT @results VALUES (N'Ảnh bố cục giống nhưng khác số tiền -> không báo trùng',
    IIF(NOT EXISTS (SELECT 1 FROM @dups), 'PASS', 'FAIL'), (SELECT TOP 1 match_kind FROM @dups));

DELETE @dups;
INSERT @dups EXEC dbo.sp_find_duplicate_scans @user_id = @u, @file_sha256 = @sha_khac, @image_dhash = 'FFFFFFFF00000000';
INSERT @results VALUES (N'Ảnh khác hẳn -> không báo trùng',
    IIF(NOT EXISTS (SELECT 1 FROM @dups), 'PASS', 'FAIL'), NULL);

DELETE @dups;
INSERT @dups EXEC dbo.sp_find_duplicate_scans @user_id = @u, @content_key = @key;
INSERT @results VALUES (N'Ảnh khác nhưng cùng số tiền + thời điểm + mã GD -> báo trùng nội dung',
    IIF((SELECT TOP 1 match_kind FROM @dups) = 'same_content', 'PASS', 'FAIL'), (SELECT TOP 1 match_kind FROM @dups));

INSERT @results VALUES (N'Hàm đếm bit khác nhau (Hamming) đúng với số âm',
    IIF(dbo.fn_hamming64(0, -1) = 64 AND dbo.fn_hamming64(1, 3) = 1 AND dbo.fn_hamming64(5, 5) = 0, 'PASS', 'FAIL'),
    CONCAT(dbo.fn_hamming64(0, -1), '/', dbo.fn_hamming64(1, 3), '/', dbo.fn_hamming64(5, 5)));

EXEC dbo.sp_delete_transaction @user_id = @u, @id = @tx;
DELETE @dups;
INSERT @dups EXEC dbo.sp_find_duplicate_scans @user_id = @u, @file_sha256 = @sha;
INSERT @results VALUES (N'Xóa giao dịch thì được quét lại bill đó',
    IIF(NOT EXISTS (SELECT 1 FROM @dups) AND NOT EXISTS (SELECT 1 FROM dbo.transactions WHERE id = @tx), 'PASS', 'FAIL'), NULL);

/* ===========================================================================
   NHÓM 4: Chia tiền nhóm và sổ nợ
   =========================================================================== */
INSERT @split EXEC dbo.sp_create_split_bill @user_id = @u, @title = N'Lẩu', @total_amount = 600000,
    @people_json = N'["Nam","Hùng","Lan"]', @category_id = 1, @transaction_date = @today;
INSERT @results VALUES (N'Chia 600k cho 4 người: mỗi người 150k, 3 khoản nợ',
    IIF(EXISTS (SELECT 1 FROM @split WHERE people_count = 4 AND share_each = 150000 AND my_share = 150000)
        AND (SELECT COUNT(*) FROM dbo.debts WHERE user_id = @u AND direction = 'owed_to_me') = 3, 'PASS', 'FAIL'),
    (SELECT CONCAT(people_count, N' người, mỗi người ', share_each, N', mình ', my_share) FROM @split));

DELETE @split;
INSERT @split EXEC dbo.sp_create_split_bill @user_id = @u, @title = N'Taxi', @total_amount = 100000,
    @people_json = N'["Nam","Nam"," "]', @category_id = 3, @transaction_date = @today;
INSERT @results VALUES (N'Chia 100k: bỏ tên trùng/rỗng, phần lẻ mình chịu (50k/50k)',
    IIF(EXISTS (SELECT 1 FROM @split WHERE people_count = 2 AND share_each = 50000 AND my_share = 50000), 'PASS', 'FAIL'),
    (SELECT CONCAT(people_count, N' người, mỗi người ', share_each, N', mình ', my_share) FROM @split));

DELETE @split;
INSERT @split EXEC dbo.sp_create_split_bill @user_id = @u, @title = N'Trà sữa', @total_amount = 100000,
    @people_json = N'["Hùng","Lan"]', @category_id = 1, @transaction_date = @today;
INSERT @results VALUES (N'Chia 100k cho 3: mỗi người 33.333, mình 33.334',
    IIF(EXISTS (SELECT 1 FROM @split WHERE share_each = 33333 AND my_share = 33334), 'PASS', 'FAIL'),
    (SELECT CONCAT(share_each, ' / ', my_share) FROM @split));

SELECT @n = COUNT(*) FROM dbo.debts WHERE user_id = @u AND person_name = N'Nam' AND settled_at IS NULL;
INSERT @results VALUES (N'Nam nợ 2 khoản (lẩu + taxi)', IIF(@n = 2, 'PASS', 'FAIL'), CONCAT(@n, N' khoản'));

DELETE @split;
INSERT @split EXEC dbo.sp_create_split_bill @user_id = @u, @title = N'Cà phê', @total_amount = 90000,
    @people_json = N'["Hùng","Lan"]', @category_id = 1, @transaction_date = @today, @i_paid = 0, @payer_name = N'Lan';
INSERT @results VALUES (N'Lan trả 90k cho 3 người: mình ghi chi 30k và nợ Lan 30k',
    IIF(EXISTS (SELECT 1 FROM @split s JOIN dbo.transactions t ON t.id = s.transaction_id
                WHERE s.payer_name = N'Lan' AND t.amount = 30000 AND t.source = 'split')
        AND EXISTS (SELECT 1 FROM dbo.debts WHERE user_id = @u AND person_name = N'Lan' AND direction = 'i_owe' AND amount = 30000)
        AND NOT EXISTS (SELECT 1 FROM dbo.debts WHERE user_id = @u AND person_name = N'Hùng' AND note = N'Cà phê'), 'PASS', 'FAIL'),
    (SELECT CONCAT(payer_name, ' ', my_share) FROM @split));

BEGIN TRY
    EXEC dbo.sp_create_split_bill @user_id = @u, @title = N'Lỗi', @total_amount = 90000,
        @people_json = N'["Hùng"]', @category_id = 1, @transaction_date = @today, @i_paid = 0, @payer_name = N'Tuấn';
    INSERT @results VALUES (N'Người trả không có trong danh sách -> báo lỗi', 'FAIL', N'không báo lỗi');
END TRY
BEGIN CATCH
    INSERT @results VALUES (N'Người trả không có trong danh sách -> báo lỗi', IIF(ERROR_NUMBER() = 50032, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH;

BEGIN TRY
    EXEC dbo.sp_create_split_bill @user_id = @u, @title = N'Lỗi', @total_amount = 90000,
        @people_json = N'["Hùng"]', @category_id = 10, @transaction_date = @today;
    INSERT @results VALUES (N'Chia tiền vào danh mục thu nhập -> báo lỗi', 'FAIL', N'không báo lỗi');
END TRY
BEGIN CATCH
    INSERT @results VALUES (N'Chia tiền vào danh mục thu nhập -> báo lỗi', IIF(ERROR_NUMBER() = 50003, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH;

-- Nhập nhầm rồi xóa cả lần chia
DECLARE @wrong_split INT, @wrong_tx INT;
DELETE @split;
INSERT @split EXEC dbo.sp_create_split_bill @user_id = @u, @title = N'Nhầm', @total_amount = 40000,
    @people_json = N'["Nam"]', @category_id = 1, @transaction_date = @today;
SELECT @wrong_split = split_id, @wrong_tx = transaction_id FROM @split;
EXEC dbo.sp_delete_split_bill @user_id = @u, @id = @wrong_split;
INSERT @results VALUES (N'Xóa lần chia nhập nhầm: mất cả nợ lẫn khoản chi',
    IIF(NOT EXISTS (SELECT 1 FROM dbo.debts WHERE split_id = @wrong_split)
        AND NOT EXISTS (SELECT 1 FROM dbo.split_bills WHERE id = @wrong_split)
        AND NOT EXISTS (SELECT 1 FROM dbo.transactions WHERE id = @wrong_tx), 'PASS', 'FAIL'), NULL);

/* ===========================================================================
   NHÓM 5: Đối soát ví "tiền bốc hơi"
   =========================================================================== */
INSERT INTO dbo.transactions (user_id, category_id, amount, note, transaction_date) VALUES (@u, 10, 1000000, N'Lương', @today);
-- Sổ: +1.000.000 - 30.000 (trà sữa) - 150.000 - 50.000 - 33.334 - 30.000 (cà phê Lan trả) = 706.666
-- Bạn bè còn nợ mình 450.000 + 50.000 + 66.666 = 566.666, mình nợ Lan 30.000
-- -> lẽ ra trong ví có 706.666 - 566.666 + 30.000 = 170.000 (đúng bằng 1.000.000 - 830.000 tiền mặt đã trả)
INSERT @wallet EXEC dbo.sp_wallet_check @user_id = @u, @actual_balance = 150000, @record = 1, @transaction_date = @today;
INSERT @results VALUES (N'Đối soát có tính nợ: lẽ ra 170.000, thực tế 150.000 -> ghi khoản chi 20.000',
    IIF(EXISTS (SELECT 1 FROM @wallet w JOIN dbo.transactions t ON t.id = w.transaction_id
                WHERE w.ledger_balance = 706666 AND w.owed_to_me = 566666 AND w.i_owe = 30000
                  AND w.book_balance = 170000 AND w.difference = 20000
                  AND t.amount = 20000 AND t.category_id = 9 AND t.source = 'reconcile'), 'PASS', 'FAIL'),
    (SELECT CONCAT(N'sổ ', ledger_balance, N', lẽ ra ', book_balance, N', lệch ', difference) FROM @wallet));

DELETE @wallet;
INSERT @wallet EXEC dbo.sp_wallet_check @user_id = @u, @actual_balance = 150000, @record = 1, @transaction_date = @today;
INSERT @results VALUES (N'Đối soát lại ngay sau đó: khớp, không ghi thêm',
    IIF(EXISTS (SELECT 1 FROM @wallet WHERE difference = 0 AND transaction_id IS NULL), 'PASS', 'FAIL'),
    (SELECT CONCAT(N'lệch ', difference) FROM @wallet));

/* ===========================================================================
   NHÓM 6: Gợi ý theo thói quen, tổng hợp ngày
   =========================================================================== */
INSERT INTO dbo.transactions (user_id, category_id, amount, note, transaction_date, transaction_time)
VALUES (@u, 3, 5000, N'Gửi xe', DATEADD(DAY, -1, @today), '07:50'),
       (@u, 3, 5000, N'Gửi xe', DATEADD(DAY, -2, @today), '08:10'),
       (@u, 3, 5000, N'gửi xe ', DATEADD(DAY, -4, @today), '08:00');

INSERT @habits EXEC dbo.sp_get_habit_suggestions @user_id = @u, @today = @today, @now_time = '08:30';
INSERT @results VALUES (N'8h30 gợi ý "Gửi xe 5k" (đã gửi 3 ngày, khoảng 8h)',
    IIF(EXISTS (SELECT 1 FROM @habits WHERE amount = 5000 AND usual_time = '08:00' AND days_used = 3 AND note = N'Gửi xe' COLLATE Latin1_General_BIN), 'PASS', 'FAIL'),
    (SELECT TOP 1 CONCAT(note, ' ', amount, ' ', usual_time) FROM @habits));

DELETE @habits;
INSERT @habits EXEC dbo.sp_get_habit_suggestions @user_id = @u, @today = @today, @now_time = '14:00';
INSERT @results VALUES (N'14h không gợi ý "Gửi xe" (xa giờ thường gửi)',
    IIF(NOT EXISTS (SELECT 1 FROM @habits), 'PASS', 'FAIL'), NULL);

INSERT INTO dbo.transactions (user_id, category_id, amount, note, transaction_date, transaction_time)
VALUES (@u, 3, 5000, N'Gửi xe', @today, '08:20');
DELETE @habits;
INSERT @habits EXEC dbo.sp_get_habit_suggestions @user_id = @u, @today = @today, @now_time = '08:30';
INSERT @results VALUES (N'Hôm nay đã ghi "Gửi xe" thì không gợi ý nữa',
    IIF(NOT EXISTS (SELECT 1 FROM @habits), 'PASS', 'FAIL'), NULL);

INSERT @day EXEC dbo.sp_get_day_summary @user_id = @u, @day = @today;
-- Chi hôm nay: 30.000 + 150.000 + 50.000 + 33.334 + 30.000 (cà phê) + 20.000 (đối soát) + 5.000 = 318.334
INSERT @results VALUES (N'Đã chi hôm nay = 318.334 (Mini-View)',
    IIF((SELECT spent FROM @day) = 318334, 'PASS', 'FAIL'), (SELECT CONCAT(N'chi ', spent, N', thu ', received) FROM @day));

/* ===========================================================================
   NHÓM 7: Khảo sát
   =========================================================================== */
BEGIN TRY
    INSERT INTO dbo.survey_responses (user_id, answers) VALUES (@u, N'không phải json');
    INSERT @results VALUES (N'Khảo sát: từ chối câu trả lời không phải JSON', 'FAIL', N'CSDL vẫn cho lưu');
END TRY
BEGIN CATCH
    INSERT @results VALUES (N'Khảo sát: từ chối câu trả lời không phải JSON', IIF(ERROR_NUMBER() = 547, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

BEGIN TRY
    INSERT INTO dbo.survey_responses (user_id, answers, wants_new_feature) VALUES (@u, N'{}', 1);
    INSERT @results VALUES (N'Khảo sát: muốn thêm chức năng thì phải ghi đề xuất', 'FAIL', N'CSDL vẫn cho lưu');
END TRY
BEGIN CATCH
    INSERT @results VALUES (N'Khảo sát: muốn thêm chức năng thì phải ghi đề xuất', IIF(ERROR_NUMBER() = 547, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

INSERT INTO dbo.survey_responses (user_id, answers) VALUES (@u, N'{"mr_test_voice":"like","mr_test_bill":"dislike"}');
INSERT @results VALUES (N'Khảo sát: thống kê đếm đúng thích / chưa thích',
    IIF(EXISTS (SELECT 1 FROM dbo.vw_survey_summary WHERE feature = 'mr_test_voice' AND like_count = 1)
        AND EXISTS (SELECT 1 FROM dbo.vw_survey_summary WHERE feature = 'mr_test_bill' AND dislike_count = 1), 'PASS', 'FAIL'), NULL);

/* ===========================================================================
   NHÓM 8: Ngân sách tháng, chuỗi ngày, lịch nhiệt (tài khoản riêng, ngày cố định 10/03/2026)
   =========================================================================== */
DECLARE @b INT;
DECLARE @budget TABLE (
    month_start VARCHAR(10), today VARCHAR(10), days_in_month INT, days_left INT, budget DECIMAL(15, 2),
    budget_month VARCHAR(10), is_inherited BIT, spent_month DECIMAL(15, 2), spent_today DECIMAL(15, 2),
    remaining_month DECIMAL(15, 2), planned_daily DECIMAL(15, 2), daily_allowance DECIMAL(15, 2), left_today DECIMAL(15, 2)
);
DECLARE @streak TABLE (current_streak INT, best_streak INT, recorded_today BIT, last_recorded_date VARCHAR(10), recorded_days INT);
DECLARE @cal TABLE (day VARCHAR(10), spent DECIMAL(15, 2), received DECIMAL(15, 2), transaction_count INT, no_spend BIT);

INSERT INTO dbo.users (username, password_hash) VALUES ('mr_budget_' + @suffix, @hash);
SET @b = SCOPE_IDENTITY();

INSERT @budget EXEC dbo.sp_get_budget_status @user_id = @b, @today = '2026-03-10';
INSERT @results VALUES (N'Ngân sách: chưa đặt thì không có mức tiêu mỗi ngày',
    IIF((SELECT COUNT(*) FROM @budget WHERE budget IS NULL AND daily_allowance IS NULL AND left_today IS NULL) = 1, 'PASS', 'FAIL'), NULL);

BEGIN TRY
    INSERT INTO dbo.budgets (user_id, month_start, amount) VALUES (@b, '2026-03-01', 0);
    INSERT @results VALUES (N'Ngân sách: từ chối số tiền 0', 'FAIL', N'CSDL vẫn cho lưu');
END TRY
BEGIN CATCH
    INSERT @results VALUES (N'Ngân sách: từ chối số tiền 0', IIF(ERROR_NUMBER() = 547, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

BEGIN TRY
    INSERT INTO dbo.budgets (user_id, month_start, amount) VALUES (@b, '2026-03-15', 100000);
    INSERT @results VALUES (N'Ngân sách: tháng phải bắt đầu từ ngày 01', 'FAIL', N'CSDL vẫn cho lưu');
END TRY
BEGIN CATCH
    INSERT @results VALUES (N'Ngân sách: tháng phải bắt đầu từ ngày 01', IIF(ERROR_NUMBER() = 547, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

-- Chi 100k/ngày từ 01 đến 05, ngày 08 bấm "không tiêu gì", 09 chi 60k, hôm nay (10) chi 40k,
-- ghi trước 200k cho ngày 15; ngày 02 có thu 1 triệu (không tính vào ngân sách)
INSERT INTO dbo.transactions (user_id, category_id, amount, note, transaction_date)
VALUES (@b, 1, 100000, N'Ăn', '2026-03-01'), (@b, 1, 100000, N'Ăn', '2026-03-02'), (@b, 3, 100000, N'Xe', '2026-03-03'),
       (@b, 1, 100000, N'Ăn', '2026-03-04'), (@b, 4, 100000, N'Mua', '2026-03-05'), (@b, 1, 60000, N'Ăn', '2026-03-09'),
       (@b, 1, 40000, N'Ăn', '2026-03-10'), (@b, 5, 200000, N'Điện', '2026-03-15'), (@b, 12, 1000000, N'Trợ cấp', '2026-03-02');
INSERT INTO dbo.day_marks (user_id, mark_date, kind) VALUES (@b, '2026-03-08', 'no_spend');
INSERT INTO dbo.budgets (user_id, month_start, amount) VALUES (@b, '2026-02-01', 3000000);

DELETE @budget;
INSERT @budget EXEC dbo.sp_get_budget_status @user_id = @b, @today = '2026-03-10';
-- (3.000.000 - (800.000 - 40.000)) / 22 ngày còn lại = 101.818
INSERT @results VALUES (N'Ngân sách: tháng chưa đặt dùng ngân sách tháng trước, chia đều số còn lại',
    IIF(EXISTS (SELECT 1 FROM @budget WHERE budget = 3000000 AND is_inherited = 1 AND days_left = 22
                AND spent_month = 800000 AND spent_today = 40000 AND daily_allowance = 101818
                AND left_today = 61818 AND remaining_month = 2200000), 'PASS', 'FAIL'),
    (SELECT CONCAT(N'mỗi ngày ', daily_allowance, N', còn hôm nay ', left_today) FROM @budget));

INSERT INTO dbo.budgets (user_id, month_start, amount) VALUES (@b, '2026-03-01', 500000);
DELETE @budget;
INSERT @budget EXEC dbo.sp_get_budget_status @user_id = @b, @today = '2026-03-10';
INSERT @results VALUES (N'Ngân sách: vượt ngân sách thì mức tiêu là 0, hôm nay âm',
    IIF(EXISTS (SELECT 1 FROM @budget WHERE budget = 500000 AND is_inherited = 0 AND daily_allowance = 0
                AND left_today = -40000 AND remaining_month = -300000), 'PASS', 'FAIL'),
    (SELECT CONCAT(N'mỗi ngày ', daily_allowance, N', còn hôm nay ', left_today) FROM @budget));

INSERT @streak EXEC dbo.sp_get_streak @user_id = @b, @today = '2026-03-10';
INSERT @results VALUES (N'Chuỗi ngày: tính cả ngày "không tiêu gì", bỏ ngày ghi trước',
    IIF(EXISTS (SELECT 1 FROM @streak WHERE current_streak = 3 AND best_streak = 5 AND recorded_today = 1
                AND last_recorded_date = '2026-03-10' AND recorded_days = 8), 'PASS', 'FAIL'),
    (SELECT CONCAT(N'hiện tại ', current_streak, N', dài nhất ', best_streak, N', số ngày ', recorded_days) FROM @streak));

DELETE @streak;
INSERT @streak EXEC dbo.sp_get_streak @user_id = @b, @today = '2026-03-11';
INSERT @results VALUES (N'Chuỗi ngày: hôm nay chưa ghi thì chuỗi vẫn giữ',
    IIF(EXISTS (SELECT 1 FROM @streak WHERE current_streak = 3 AND recorded_today = 0), 'PASS', 'FAIL'), NULL);

DELETE @streak;
INSERT @streak EXEC dbo.sp_get_streak @user_id = @b, @today = '2026-03-13';
INSERT @results VALUES (N'Chuỗi ngày: bỏ quá 1 ngày thì chuỗi về 0',
    IIF(EXISTS (SELECT 1 FROM @streak WHERE current_streak = 0 AND best_streak = 5), 'PASS', 'FAIL'), NULL);

INSERT @cal EXEC dbo.sp_get_month_calendar @user_id = @b, @month_start = '2026-03-17';
INSERT @results VALUES (N'Lịch nhiệt: đủ 31 ngày, tổng chi và ngày "không tiêu gì" đúng',
    IIF((SELECT COUNT(*) FROM @cal) = 31
        AND (SELECT SUM(spent) FROM @cal) = 800000
        AND EXISTS (SELECT 1 FROM @cal WHERE day = '2026-03-08' AND no_spend = 1 AND spent = 0)
        AND EXISTS (SELECT 1 FROM @cal WHERE day = '2026-03-02' AND spent = 100000 AND received = 1000000 AND transaction_count = 2)
        AND EXISTS (SELECT 1 FROM @cal WHERE day = '2026-03-31' AND transaction_count = 0), 'PASS', 'FAIL'),
    (SELECT CONCAT(COUNT(*), N' ngày, tổng chi ', SUM(spent)) FROM @cal));

DELETE FROM dbo.users WHERE id = @b;
INSERT @results VALUES (N'Ngân sách: xóa người dùng xóa kèm ngân sách',
    IIF(NOT EXISTS (SELECT 1 FROM dbo.budgets WHERE user_id = @b), 'PASS', 'FAIL'), NULL);

/* ===========================================================================
   NHÓM 8b: Tên hiển thị và danh mục theo ý người dùng (ẩn, sửa, sắp xếp)
   =========================================================================== */
DECLARE @cv TABLE (
    id INT, name NVARCHAR(100), type VARCHAR(10), icon VARCHAR(50), color VARCHAR(30),
    is_default BIT, is_hidden BIT, position INT, used_count INT
);
DECLARE @cat_row TABLE (id INT, name NVARCHAR(100), type VARCHAR(10), icon VARCHAR(50), color VARCHAR(30), is_default BIT);
DECLARE @my_cat INT, @other INT;

BEGIN TRY
    UPDATE dbo.users SET display_name = N'   ' WHERE id = @u;
    INSERT @results VALUES (N'Tên hiển thị: chặn tên toàn khoảng trắng', 'FAIL', N'Không bị chặn');
END TRY
BEGIN CATCH
    INSERT @results VALUES (N'Tên hiển thị: chặn tên toàn khoảng trắng', IIF(ERROR_NUMBER() = 547, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH
UPDATE dbo.users SET display_name = N'Trí' WHERE id = @u;
INSERT @results VALUES (N'Tên hiển thị: lưu được tên có dấu',
    IIF((SELECT display_name FROM dbo.users WHERE id = @u) = N'Trí', 'PASS', 'FAIL'), NULL);

-- Chưa sắp xếp: giữ thứ tự cũ, mặc định trước
INSERT @cv EXEC dbo.sp_get_categories_view @user_id = @u, @type = 'expense';
INSERT @results VALUES (N'Danh mục: chưa sắp xếp thì giữ thứ tự mặc định',
    IIF((SELECT id FROM @cv WHERE position = 1) = 1 AND (SELECT COUNT(*) FROM @cv WHERE is_hidden = 1) = 0, 'PASS', 'FAIL'), NULL);

-- Ẩn danh mục mặc định: biến mất khỏi ô chọn, vẫn thấy khi xem đủ
EXEC dbo.sp_set_category_hidden @user_id = @u, @category_id = 6, @hidden = 1;
DELETE @cv;
INSERT @cv EXEC dbo.sp_get_categories_view @user_id = @u, @type = 'expense';
SET @n = (SELECT COUNT(*) FROM @cv WHERE id = 6);
DELETE @cv;
INSERT @cv EXEC dbo.sp_get_categories_view @user_id = @u, @type = 'expense', @include_hidden = 1;
INSERT @results VALUES (N'Danh mục: ẩn thì bỏ khỏi ô chọn, xem đủ vẫn thấy',
    IIF(@n = 0 AND (SELECT is_hidden FROM @cv WHERE id = 6) = 1, 'PASS', 'FAIL'), NULL);

-- Ẩn chỉ áp dụng cho chính người đó
INSERT INTO dbo.users (username, password_hash) VALUES ('mr_cat_' + @suffix, @hash);
SET @other = SCOPE_IDENTITY();
DELETE @cv;
INSERT @cv EXEC dbo.sp_get_categories_view @user_id = @other, @type = 'expense';
INSERT @results VALUES (N'Danh mục: người khác vẫn thấy danh mục mình đã ẩn',
    IIF(EXISTS (SELECT 1 FROM @cv WHERE id = 6), 'PASS', 'FAIL'), NULL);
EXEC dbo.sp_set_category_hidden @user_id = @other, @category_id = 2, @hidden = 1;

-- Không cho ẩn hết danh mục thu
EXEC dbo.sp_set_category_hidden @user_id = @u, @category_id = 10, @hidden = 1;
EXEC dbo.sp_set_category_hidden @user_id = @u, @category_id = 11, @hidden = 1;
EXEC dbo.sp_set_category_hidden @user_id = @u, @category_id = 12, @hidden = 1;
BEGIN TRY
    EXEC dbo.sp_set_category_hidden @user_id = @u, @category_id = 13, @hidden = 1;
    INSERT @results VALUES (N'Danh mục: không cho ẩn danh mục cuối cùng của một loại', 'FAIL', N'Không bị chặn');
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    INSERT @results VALUES (N'Danh mục: không cho ẩn danh mục cuối cùng của một loại', IIF(ERROR_NUMBER() = 50051, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH
EXEC dbo.sp_set_category_hidden @user_id = @u, @category_id = 10, @hidden = 0;
EXEC dbo.sp_set_category_hidden @user_id = @u, @category_id = 11, @hidden = 0;
EXEC dbo.sp_set_category_hidden @user_id = @u, @category_id = 12, @hidden = 0;

-- Danh mục mặc định không sửa được, danh mục riêng thì sửa được
BEGIN TRY
    EXEC dbo.sp_update_category @user_id = @u, @category_id = 1, @name = N'Đồ ăn';
    INSERT @results VALUES (N'Danh mục: không cho sửa danh mục mặc định', 'FAIL', N'Không bị chặn');
END TRY
BEGIN CATCH
    INSERT @results VALUES (N'Danh mục: không cho sửa danh mục mặc định', IIF(ERROR_NUMBER() = 50050, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

INSERT @cat_row EXEC dbo.sp_add_category @user_id = @u, @name = N'Trà sữa', @type = 'expense';
SET @my_cat = (SELECT id FROM @cat_row);
DELETE @cat_row;
INSERT @cat_row EXEC dbo.sp_update_category @user_id = @u, @category_id = @my_cat, @name = N'  Trà sữa & cà phê ', @icon = 'coffee', @color = 'rose';
INSERT @results VALUES (N'Danh mục: sửa tên, icon, màu danh mục riêng (bỏ khoảng trắng thừa)',
    IIF(EXISTS (SELECT 1 FROM @cat_row WHERE name = N'Trà sữa & cà phê' AND icon = 'coffee' AND color = 'rose'), 'PASS', 'FAIL'), NULL);

BEGIN TRY
    EXEC dbo.sp_update_category @user_id = @other, @category_id = @my_cat, @name = N'Của tôi';
    INSERT @results VALUES (N'Danh mục: không sửa được danh mục của người khác', 'FAIL', N'Không bị chặn');
END TRY
BEGIN CATCH
    INSERT @results VALUES (N'Danh mục: không sửa được danh mục của người khác', IIF(ERROR_NUMBER() = 50003, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

BEGIN TRY
    EXEC dbo.sp_update_category @user_id = @u, @category_id = @my_cat, @name = N'Ăn uống';
    INSERT @results VALUES (N'Danh mục: đổi tên trùng danh mục có sẵn bị chặn', 'FAIL', N'Không bị chặn');
END TRY
BEGIN CATCH
    INSERT @results VALUES (N'Danh mục: đổi tên trùng danh mục có sẵn bị chặn', IIF(ERROR_NUMBER() = 50007, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

-- Sắp xếp: đưa danh mục riêng lên đầu, danh mục không nêu tên xếp sau
SET @n = 0;
BEGIN TRY
    EXEC dbo.sp_save_category_order @user_id = @u, @type = 'expense', @ids_json = N'[10]';
    SET @n = 0;
END TRY
BEGIN CATCH
    SET @n = IIF(ERROR_NUMBER() = 50052, 1, 0);
END CATCH
INSERT @results VALUES (N'Danh mục: chặn sắp xếp sai loại hoặc id không có thật', IIF(@n = 1, 'PASS', 'FAIL'), NULL);

DECLARE @order_json NVARCHAR(100) = CONCAT(N'[', @my_cat, N', 4, 1]');
EXEC dbo.sp_save_category_order @user_id = @u, @type = 'expense', @ids_json = @order_json;
DELETE @cv;
INSERT @cv EXEC dbo.sp_get_categories_view @user_id = @u, @type = 'expense';
INSERT @results VALUES (N'Danh mục: lưu thứ tự mới, danh mục không nêu xếp sau',
    IIF((SELECT id FROM @cv WHERE position = 1) = @my_cat
        AND (SELECT id FROM @cv WHERE position = 2) = 4
        AND (SELECT id FROM @cv WHERE position = 3) = 1
        AND (SELECT id FROM @cv WHERE position = 4) = 2, 'PASS', 'FAIL'), NULL);

-- Đếm số khoản đã ghi ở từng danh mục
INSERT @tx_row EXEC dbo.sp_add_transaction_ex @user_id = @u, @category_id = @my_cat, @amount = 25000, @transaction_date = @today;
DELETE @cv;
INSERT @cv EXEC dbo.sp_get_categories_view @user_id = @u, @type = 'expense';
INSERT @results VALUES (N'Danh mục: đếm đúng số khoản đã ghi',
    IIF((SELECT used_count FROM @cv WHERE id = @my_cat) = 1, 'PASS', 'FAIL'), NULL);

-- Xóa người dùng xóa kèm tùy chỉnh danh mục và danh mục riêng
BEGIN TRY
    DELETE FROM dbo.users WHERE id = @other;
    INSERT @results VALUES (N'Danh mục: xóa người dùng xóa kèm tùy chỉnh',
        IIF(NOT EXISTS (SELECT 1 FROM dbo.user_category_prefs WHERE user_id = @other), 'PASS', 'FAIL'), NULL);
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    INSERT @results VALUES (N'Danh mục: xóa người dùng xóa kèm tùy chỉnh', 'FAIL', ERROR_MESSAGE());
END CATCH

/* ===========================================================================
   NHÓM 9: Dọn tài khoản dùng thử hết hạn (kiểm tra xóa dây chuyền mọi bảng)
   =========================================================================== */
INSERT INTO dbo.users (username, password_hash, is_demo, demo_expires_at)
VALUES ('mr_demo_old_' + @suffix, @hash, 1, DATEADD(HOUR, -1, SYSDATETIME()));
SET @demo_old = SCOPE_IDENTITY();
INSERT INTO dbo.users (username, password_hash, is_demo, demo_expires_at)
VALUES ('mr_demo_new_' + @suffix, @hash, 1, DATEADD(HOUR, 23, SYSDATETIME()));
SET @demo_new = SCOPE_IDENTITY();

-- Tài khoản cũ có dữ liệu ở mọi bảng con
INSERT INTO dbo.sessions (user_id, expires_at) VALUES (@demo_old, DATEADD(DAY, 1, SYSDATETIME()));
DELETE @tx_row;
INSERT INTO dbo.receipt_scans (user_id, input_kind, doc_kind) VALUES (@demo_old, 'text', 'unknown');
SET @scan2 = SCOPE_IDENTITY();
INSERT @tx_row EXEC dbo.sp_add_transaction_ex @user_id = @demo_old, @category_id = 1, @amount = 20000,
    @transaction_date = @today, @source = 'sms', @scan_id = @scan2;
EXEC dbo.sp_create_split_bill @user_id = @demo_old, @title = N'Bún', @total_amount = 60000,
    @people_json = N'["A"]', @category_id = 1, @transaction_date = @today;
EXEC dbo.sp_wallet_check @user_id = @demo_old, @actual_balance = 0, @record = 1, @transaction_date = @today;
INSERT INTO dbo.day_marks (user_id, mark_date, kind) VALUES (@demo_old, @today, 'no_spend');
INSERT INTO dbo.survey_responses (user_id, answers) VALUES (@demo_old, N'{}');

BEGIN TRY
    EXEC dbo.sp_cleanup_demo_users;
    INSERT @results VALUES (N'Dọn tài khoản dùng thử hết hạn, giữ tài khoản còn hạn',
        IIF(NOT EXISTS (SELECT 1 FROM dbo.users WHERE id = @demo_old)
            AND EXISTS (SELECT 1 FROM dbo.users WHERE id = @demo_new)
            AND NOT EXISTS (SELECT 1 FROM dbo.transactions WHERE user_id = @demo_old)
            AND NOT EXISTS (SELECT 1 FROM dbo.receipt_scans WHERE user_id = @demo_old)
            AND NOT EXISTS (SELECT 1 FROM dbo.debts WHERE user_id = @demo_old), 'PASS', 'FAIL'), NULL);
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    INSERT @results VALUES (N'Dọn tài khoản dùng thử hết hạn, giữ tài khoản còn hạn', 'FAIL', ERROR_MESSAGE());
END CATCH

/* ===========================================================================
   NHÓM 15: Pet Shop, Tủ đồ linh thú & Biến động xu
   =========================================================================== */
-- 58. Người dùng mới có sẵn 100 xu và độ no 80
INSERT @results VALUES (N'Người dùng mới có sẵn 100 xu và độ no 80',
    IIF((SELECT coins FROM dbo.users WHERE id = @u) = 100 AND (SELECT pet_fullness FROM dbo.users WHERE id = @u) = 80, 'PASS', 'FAIL'), NULL);

-- 59. Mua vật phẩm thời trang thành công (Mũ cử nhân 50 xu -> còn 50 xu, tự động mặc)
BEGIN TRY
    EXEC dbo.sp_buy_pet_item @user_id = @u, @item_id = 'hat_grad';
    INSERT @results VALUES (N'Mua vật phẩm trừ đúng xu và tự động trang bị',
        IIF((SELECT coins FROM dbo.users WHERE id = @u) = 50
            AND EXISTS (SELECT 1 FROM dbo.user_inventory WHERE user_id = @u AND item_id = 'hat_grad' AND is_equipped = 1)
            AND EXISTS (SELECT 1 FROM dbo.pet_coin_history WHERE user_id = @u AND amount = -50), 'PASS', 'FAIL'), NULL);
END TRY
BEGIN CATCH
    INSERT @results VALUES (N'Mua vật phẩm trừ đúng xu và tự động trang bị', 'FAIL', ERROR_MESSAGE());
END CATCH

-- 60. Chặn mua trùng vật phẩm thời trang đã sở hữu
BEGIN TRY
    EXEC dbo.sp_buy_pet_item @user_id = @u, @item_id = 'hat_grad';
    INSERT @results VALUES (N'Chặn mua trùng vật phẩm thời trang đã sở hữu', 'FAIL', N'CSDL vẫn cho mua trùng');
END TRY
BEGIN CATCH
    INSERT @results VALUES (N'Chặn mua trùng vật phẩm thời trang đã sở hữu', IIF(ERROR_NUMBER() = 50062, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

-- 61. Chặn mua khi không đủ xu (mua vương miện 150 xu trong khi chỉ còn 50 xu)
BEGIN TRY
    EXEC dbo.sp_buy_pet_item @user_id = @u, @item_id = 'hat_crown';
    INSERT @results VALUES (N'Chặn mua khi không đủ xu', 'FAIL', N'CSDL vẫn cho mua');
END TRY
BEGIN CATCH
    INSERT @results VALUES (N'Chặn mua khi không đủ xu', IIF(ERROR_NUMBER() = 50061, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

-- 62. Mua mũ khác (Mầm cây 30 xu) -> tự động tháo Mũ cử nhân
BEGIN TRY
    EXEC dbo.sp_buy_pet_item @user_id = @u, @item_id = 'hat_sprout';
    INSERT @results VALUES (N'Mặc phụ kiện mới tự động tháo phụ kiện cũ cùng slot',
        IIF((SELECT is_equipped FROM dbo.user_inventory WHERE user_id = @u AND item_id = 'hat_sprout') = 1
            AND (SELECT is_equipped FROM dbo.user_inventory WHERE user_id = @u AND item_id = 'hat_grad') = 0, 'PASS', 'FAIL'), NULL);
END TRY
BEGIN CATCH
    INSERT @results VALUES (N'Mặc phụ kiện mới tự động tháo phụ kiện cũ cùng slot', 'FAIL', ERROR_MESSAGE());
END CATCH

-- 63. Mua và tiêu thụ thức ăn (Mì tôm thanh long 15 xu) -> tăng độ no
BEGIN TRY
    EXEC dbo.sp_buy_pet_item @user_id = @u, @item_id = 'food_noddles_dragon';
    EXEC dbo.sp_use_pet_consumable @user_id = @u, @item_id = 'food_noddles_dragon';
    INSERT @results VALUES (N'Tiêu thụ thức ăn tăng độ no của thú cưng',
        IIF((SELECT pet_fullness FROM dbo.users WHERE id = @u) = 100
            AND (SELECT quantity FROM dbo.user_inventory WHERE user_id = @u AND item_id = 'food_noddles_dragon') = 0, 'PASS', 'FAIL'), NULL);
END TRY
BEGIN CATCH
    INSERT @results VALUES (N'Tiêu thụ thức ăn tăng độ no của thú cưng', 'FAIL', ERROR_MESSAGE());
END CATCH

-- 64. Cộng xu thưởng khi hoàn thành nhiệm vụ (+50 xu)
BEGIN TRY
    EXEC dbo.sp_add_pet_coins @user_id = @u, @amount = 50, @reason = N'Thưởng chuỗi 7 ngày';
    INSERT @results VALUES (N'Cộng xu thưởng ghi nhận vào lịch sử biến động',
        IIF(EXISTS (SELECT 1 FROM dbo.pet_coin_history WHERE user_id = @u AND amount = 50 AND reason = N'Thưởng chuỗi 7 ngày'), 'PASS', 'FAIL'), NULL);
END TRY
BEGIN CATCH
    INSERT @results VALUES (N'Cộng xu thưởng ghi nhận vào lịch sử biến động', 'FAIL', ERROR_MESSAGE());
END CATCH

/* ---------------------------------------------------------------------------
   Dọn dữ liệu thử (cũng là ca kiểm tra xóa dây chuyền với người dùng thường)
   --------------------------------------------------------------------------- */
BEGIN TRY
    DELETE FROM dbo.users WHERE id IN (@u, @demo_old, @demo_new);
    INSERT @results VALUES (N'Xóa người dùng xóa kèm mọi dữ liệu mở rộng',
        IIF(NOT EXISTS (SELECT 1 FROM dbo.debts WHERE user_id = @u)
            AND NOT EXISTS (SELECT 1 FROM dbo.split_bills WHERE user_id = @u)
            AND NOT EXISTS (SELECT 1 FROM dbo.wallet_checks WHERE user_id = @u)
            AND NOT EXISTS (SELECT 1 FROM dbo.user_inventory WHERE user_id = @u)
            AND NOT EXISTS (SELECT 1 FROM dbo.pet_coin_history WHERE user_id = @u), 'PASS', 'FAIL'), NULL);
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    INSERT @results VALUES (N'Xóa người dùng xóa kèm mọi dữ liệu mở rộng', 'FAIL', ERROR_MESSAGE());
END CATCH

SELECT no AS [STT], result AS [Kết quả], test_case AS [Ca kiểm thử], detail AS [Chi tiết]
FROM @results
ORDER BY no;

DECLARE @total INT = (SELECT COUNT(*) FROM @results);
DECLARE @failed INT = (SELECT COUNT(*) FROM @results WHERE result = 'FAIL');

PRINT CONCAT(N'Mở rộng - Tổng: ', @total, N' ca | PASS: ', @total - @failed, N' | FAIL: ', @failed);

IF @failed > 0
    THROW 50099, N'Có ca kiểm thử FAIL, xem bảng kết quả ở trên.', 1;
GO
