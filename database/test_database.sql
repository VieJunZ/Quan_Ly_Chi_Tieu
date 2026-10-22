/* 5 */

USE quan_ly_chi_tieu_db;
GO

SET NOCOUNT ON;

DECLARE @results TABLE (
    no        INT IDENTITY(1, 1),
    test_case NVARCHAR(150),
    result    VARCHAR(4),
    detail    NVARCHAR(300)
);

-- Chuỗi băm bcrypt giả (đúng định dạng 60 ký tự) dùng cho tài khoản thử
DECLARE @hash   VARCHAR(60) = '$2b$10$' + REPLICATE('x', 53);
DECLARE @suffix VARCHAR(8)  = LEFT(REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''), 8);
DECLARE @user_a INT, @user_b INT, @user_c INT, @cat_a INT;
DECLARE @err INT, @n INT;

DECLARE @added TABLE (
    id INT, user_id INT, category_id INT, type VARCHAR(10), category_name NVARCHAR(100),
    amount DECIMAL(15, 2), note NVARCHAR(500), transaction_date VARCHAR(10), created_at DATETIME2(0)
);
DECLARE @log TABLE (
    seq INT IDENTITY(1, 1),   -- thứ tự dòng thủ tục trả về
    id INT, user_id INT, category_id INT, type VARCHAR(10), category_name NVARCHAR(100),
    category_icon VARCHAR(50), category_color VARCHAR(30),
    amount DECIMAL(15, 2), note NVARCHAR(500), transaction_date VARCHAR(10), created_at DATETIME2(0)
);
DECLARE @summary TABLE (
    total_income DECIMAL(15, 2), total_expense DECIMAL(15, 2), balance DECIMAL(16, 2), transaction_count INT
);
DECLARE @cats TABLE (
    id INT, name NVARCHAR(100), type VARCHAR(10), icon VARCHAR(50), color VARCHAR(30), is_default BIT
);
DECLARE @new_cat TABLE (
    id INT, name NVARCHAR(100), type VARCHAR(10), icon VARCHAR(50), color VARCHAR(30), is_default BIT
);

/* ---------------------------------------------------------------------------
   Chuẩn bị dữ liệu thử
   --------------------------------------------------------------------------- */
INSERT INTO dbo.users (username, password_hash) VALUES ('test_a_' + @suffix, @hash);
SET @user_a = SCOPE_IDENTITY();
INSERT INTO dbo.users (username, password_hash) VALUES ('test_b_' + @suffix, @hash);
SET @user_b = SCOPE_IDENTITY();
INSERT INTO dbo.users (username, password_hash) VALUES ('test_c_' + @suffix, @hash);
SET @user_c = SCOPE_IDENTITY();   -- C không có giao dịch nào

/* ===========================================================================
   NHÓM 1: Cấu trúc và dữ liệu mặc định
   =========================================================================== */
SELECT @n = COUNT(*) FROM dbo.categories WHERE user_id IS NULL;
INSERT @results VALUES (N'Có đủ 13 danh mục mặc định',
    IIF(@n = 13, 'PASS', 'FAIL'), CONCAT(N'Số danh mục mặc định: ', @n));

SELECT @n = COUNT(*) FROM dbo.categories WHERE user_id IS NULL AND type = 'income';
INSERT @results VALUES (N'Danh mục mặc định có 4 mục thu, 9 mục chi',
    IIF(@n = 4 AND (SELECT COUNT(*) FROM dbo.categories WHERE user_id IS NULL AND type = 'expense') = 9, 'PASS', 'FAIL'),
    CONCAT(N'Số mục thu: ', @n));

/* ===========================================================================
   NHÓM 2: Bảo mật mật khẩu và tài khoản
   =========================================================================== */
BEGIN TRY
    INSERT INTO dbo.users (username, password_hash) VALUES ('test_plain_' + @suffix, '12345678');
    INSERT @results VALUES (N'Từ chối mật khẩu dạng văn bản thường', 'FAIL', N'CSDL vẫn cho lưu');
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    INSERT @results VALUES (N'Từ chối mật khẩu dạng văn bản thường', IIF(ERROR_NUMBER() = 547, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

BEGIN TRY
    INSERT INTO dbo.users (username, password_hash) VALUES (UPPER('test_a_' + @suffix), @hash);
    INSERT @results VALUES (N'Từ chối tên đăng nhập trùng (không phân biệt hoa thường)', 'FAIL', N'CSDL vẫn cho lưu');
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    INSERT @results VALUES (N'Từ chối tên đăng nhập trùng (không phân biệt hoa thường)', IIF(ERROR_NUMBER() = 2627, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

/* ===========================================================================
   NHÓM 3: Thêm khoản thu/chi
   =========================================================================== */
BEGIN TRY
    -- Tài khoản A
    INSERT @added EXEC dbo.sp_add_transaction @user_id = @user_a, @category_id = 10, @amount = 3000000, @note = N'Lương làm thêm',  @transaction_date = '2026-10-01';
    INSERT @added EXEC dbo.sp_add_transaction @user_id = @user_a, @category_id = 1,  @amount = 50000,   @note = N'Cơm trưa',        @transaction_date = '2026-10-05';
    INSERT @added EXEC dbo.sp_add_transaction @user_id = @user_a, @category_id = 2,  @amount = 1200000, @note = N'Tiền phòng',      @transaction_date = '2026-09-28';
    -- Tài khoản B
    INSERT @added EXEC dbo.sp_add_transaction @user_id = @user_b, @category_id = 1,  @amount = 20000,   @note = N'Bánh mì',         @transaction_date = '2026-10-05';
    INSERT @added EXEC dbo.sp_add_transaction @user_id = @user_b, @category_id = 12, @amount = 500000,  @note = N'Học bổng',        @transaction_date = '2026-10-02';

    INSERT @results VALUES (N'Thêm khoản thu/chi hợp lệ', IIF((SELECT COUNT(*) FROM @added) = 5, 'PASS', 'FAIL'),
        CONCAT(N'Đã thêm ', (SELECT COUNT(*) FROM @added), N'/5 giao dịch'));
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    INSERT @results VALUES (N'Thêm khoản thu/chi hợp lệ', 'FAIL', ERROR_MESSAGE());
END CATCH

INSERT @results VALUES (N'Giao dịch liên kết đúng người dùng và loại theo danh mục',
    IIF(NOT EXISTS (
        SELECT 1 FROM @added AS a
        JOIN dbo.categories AS c ON c.id = a.category_id
        WHERE a.type <> c.type
           OR a.user_id NOT IN (@user_a, @user_b)
    ) AND (SELECT type FROM @added WHERE note = N'Lương làm thêm') = 'income', 'PASS', 'FAIL'), NULL);

INSERT @results VALUES (N'Lưu và đọc đúng tiếng Việt có dấu',
    IIF(EXISTS (SELECT 1 FROM dbo.transactions WHERE user_id = @user_a AND note = N'Cơm trưa'), 'PASS', 'FAIL'), NULL);

-- Số tiền = 0 và số tiền âm qua thủ tục
BEGIN TRY
    EXEC dbo.sp_add_transaction @user_id = @user_a, @category_id = 1, @amount = 0, @transaction_date = '2026-10-05';
    INSERT @results VALUES (N'Thủ tục từ chối số tiền = 0', 'FAIL', N'Vẫn thêm được');
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    INSERT @results VALUES (N'Thủ tục từ chối số tiền = 0', IIF(ERROR_NUMBER() = 50002, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

BEGIN TRY
    EXEC dbo.sp_add_transaction @user_id = @user_a, @category_id = 1, @amount = -50000, @transaction_date = '2026-10-05';
    INSERT @results VALUES (N'Thủ tục từ chối số tiền âm', 'FAIL', N'Vẫn thêm được');
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    INSERT @results VALUES (N'Thủ tục từ chối số tiền âm', IIF(ERROR_NUMBER() = 50002, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

-- Số tiền = 0 và số tiền âm khi INSERT thẳng vào bảng (ràng buộc CHECK)
BEGIN TRY
    INSERT INTO dbo.transactions (user_id, category_id, amount, transaction_date) VALUES (@user_a, 1, 0, '2026-10-05');
    INSERT @results VALUES (N'Bảng từ chối số tiền = 0 (CHECK)', 'FAIL', N'Vẫn thêm được');
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    INSERT @results VALUES (N'Bảng từ chối số tiền = 0 (CHECK)', IIF(ERROR_NUMBER() = 547, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

BEGIN TRY
    INSERT INTO dbo.transactions (user_id, category_id, amount, transaction_date) VALUES (@user_a, 1, -1, '2026-10-05');
    INSERT @results VALUES (N'Bảng từ chối số tiền âm (CHECK)', 'FAIL', N'Vẫn thêm được');
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    INSERT @results VALUES (N'Bảng từ chối số tiền âm (CHECK)', IIF(ERROR_NUMBER() = 547, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

-- Danh mục / người dùng không tồn tại
BEGIN TRY
    EXEC dbo.sp_add_transaction @user_id = @user_a, @category_id = 999999, @amount = 10000, @transaction_date = '2026-10-05';
    INSERT @results VALUES (N'Từ chối danh mục không tồn tại', 'FAIL', N'Vẫn thêm được');
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    INSERT @results VALUES (N'Từ chối danh mục không tồn tại', IIF(ERROR_NUMBER() = 50003, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

BEGIN TRY
    INSERT INTO dbo.transactions (user_id, category_id, amount, transaction_date) VALUES (999999, 1, 10000, '2026-10-05');
    INSERT @results VALUES (N'Từ chối giao dịch của người dùng không tồn tại (FK)', 'FAIL', N'Vẫn thêm được');
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    INSERT @results VALUES (N'Từ chối giao dịch của người dùng không tồn tại (FK)', IIF(ERROR_NUMBER() = 547, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

/* ===========================================================================
   NHÓM 4: Danh mục mặc định và danh mục cá nhân
   =========================================================================== */
BEGIN TRY
    INSERT @new_cat EXEC dbo.sp_add_category @user_id = @user_a, @name = N'Trà sữa', @type = 'expense', @icon = 'cup-soda', @color = 'pink';
    SELECT @cat_a = id FROM @new_cat;
    INSERT @added EXEC dbo.sp_add_transaction @user_id = @user_a, @category_id = @cat_a, @amount = 30000, @note = N'Trà sữa', @transaction_date = '2026-10-10';
    INSERT @results VALUES (N'Tạo và dùng danh mục cá nhân', IIF(@cat_a IS NOT NULL, 'PASS', 'FAIL'), CONCAT(N'id danh mục mới: ', @cat_a));
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    INSERT @results VALUES (N'Tạo và dùng danh mục cá nhân', 'FAIL', ERROR_MESSAGE());
END CATCH

BEGIN TRY
    EXEC dbo.sp_add_category @user_id = @user_a, @name = N'Ăn uống', @type = 'expense';
    INSERT @results VALUES (N'Từ chối danh mục cá nhân trùng tên danh mục mặc định', 'FAIL', N'Vẫn tạo được');
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    INSERT @results VALUES (N'Từ chối danh mục cá nhân trùng tên danh mục mặc định', IIF(ERROR_NUMBER() = 50007, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

BEGIN TRY
    EXEC dbo.sp_add_transaction @user_id = @user_b, @category_id = @cat_a, @amount = 10000, @transaction_date = '2026-10-05';
    INSERT @results VALUES (N'Thủ tục: B không dùng được danh mục cá nhân của A', 'FAIL', N'Vẫn thêm được');
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    INSERT @results VALUES (N'Thủ tục: B không dùng được danh mục cá nhân của A', IIF(ERROR_NUMBER() = 50003, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

BEGIN TRY
    INSERT INTO dbo.transactions (user_id, category_id, amount, transaction_date) VALUES (@user_b, @cat_a, 10000, '2026-10-05');
    INSERT @results VALUES (N'Trigger: B không dùng được danh mục cá nhân của A', 'FAIL', N'Vẫn thêm được');
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    INSERT @results VALUES (N'Trigger: B không dùng được danh mục cá nhân của A', IIF(ERROR_NUMBER() = 50010, 'PASS', 'FAIL'), ERROR_MESSAGE());
END CATCH

DELETE @cats;
INSERT @cats EXEC dbo.sp_get_categories_for_user @user_id = @user_a;
INSERT @results VALUES (N'A thấy 13 danh mục mặc định + 1 danh mục cá nhân',
    IIF((SELECT COUNT(*) FROM @cats) = 14 AND EXISTS (SELECT 1 FROM @cats WHERE id = @cat_a AND is_default = 0), 'PASS', 'FAIL'),
    CONCAT(N'Số danh mục: ', (SELECT COUNT(*) FROM @cats)));

DELETE @cats;
INSERT @cats EXEC dbo.sp_get_categories_for_user @user_id = @user_b;
INSERT @results VALUES (N'B không thấy danh mục cá nhân của A',
    IIF((SELECT COUNT(*) FROM @cats) = 13 AND NOT EXISTS (SELECT 1 FROM @cats WHERE id = @cat_a), 'PASS', 'FAIL'),
    CONCAT(N'Số danh mục: ', (SELECT COUNT(*) FROM @cats)));

/* ===========================================================================
   NHÓM 5: Nhật ký thu/chi theo người dùng
   =========================================================================== */
DELETE @log;
INSERT @log (id, user_id, category_id, type, category_name, category_icon, category_color, amount, note, transaction_date, created_at)
    EXEC dbo.sp_get_transactions_by_user @user_id = @user_a;
INSERT @results VALUES (N'Nhật ký A có đủ 4 giao dịch của A',
    IIF((SELECT COUNT(*) FROM @log) = 4, 'PASS', 'FAIL'), CONCAT(N'Số dòng: ', (SELECT COUNT(*) FROM @log)));
INSERT @results VALUES (N'Nhật ký A không lẫn dữ liệu của B',
    IIF(NOT EXISTS (SELECT 1 FROM @log WHERE user_id <> @user_a), 'PASS', 'FAIL'), NULL);
INSERT @results VALUES (N'Nhật ký sắp xếp ngày mới nhất trước',
    IIF(NOT EXISTS (
            SELECT 1 FROM @log AS x JOIN @log AS y ON x.seq < y.seq
            WHERE x.transaction_date < y.transaction_date
               OR (x.transaction_date = y.transaction_date AND x.id < y.id)
        ), 'PASS', 'FAIL'),
    CONCAT(N'Dòng đầu: ', (SELECT transaction_date FROM @log WHERE seq = 1)));
INSERT @results VALUES (N'Ngày giao dịch trả về dạng chuỗi YYYY-MM-DD (frontend so sánh chuỗi)',
    IIF(NOT EXISTS (SELECT 1 FROM @log WHERE transaction_date NOT LIKE '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
        AND NOT EXISTS (SELECT 1 FROM @added WHERE transaction_date NOT LIKE '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        'PASS', 'FAIL'),
    CONCAT(N'Ví dụ: ', (SELECT transaction_date FROM @log WHERE seq = 1)));

DELETE @log;
INSERT @log (id, user_id, category_id, type, category_name, category_icon, category_color, amount, note, transaction_date, created_at)
    EXEC dbo.sp_get_transactions_by_user @user_id = @user_b;
INSERT @results VALUES (N'Nhật ký B chỉ có 2 giao dịch của B',
    IIF((SELECT COUNT(*) FROM @log) = 2 AND NOT EXISTS (SELECT 1 FROM @log WHERE user_id <> @user_b), 'PASS', 'FAIL'),
    CONCAT(N'Số dòng: ', (SELECT COUNT(*) FROM @log)));

DELETE @log;
INSERT @log (id, user_id, category_id, type, category_name, category_icon, category_color, amount, note, transaction_date, created_at)
    EXEC dbo.sp_get_transactions_by_user @user_id = @user_a, @from_date = '2026-10-01', @to_date = '2026-10-31';
INSERT @results VALUES (N'Lọc nhật ký A theo tháng 10/2026',
    IIF((SELECT COUNT(*) FROM @log) = 3, 'PASS', 'FAIL'), CONCAT(N'Số dòng: ', (SELECT COUNT(*) FROM @log)));

DELETE @log;
INSERT @log (id, user_id, category_id, type, category_name, category_icon, category_color, amount, note, transaction_date, created_at)
    EXEC dbo.sp_get_transactions_by_user @user_id = @user_a, @type = 'income';
INSERT @results VALUES (N'Lọc nhật ký A chỉ khoản thu',
    IIF((SELECT COUNT(*) FROM @log) = 1 AND NOT EXISTS (SELECT 1 FROM @log WHERE type <> 'income'), 'PASS', 'FAIL'),
    CONCAT(N'Số dòng: ', (SELECT COUNT(*) FROM @log)));

DELETE @log;
INSERT @log (id, user_id, category_id, type, category_name, category_icon, category_color, amount, note, transaction_date, created_at)
    EXEC dbo.sp_get_transactions_by_user @user_id = @user_c;
INSERT @results VALUES (N'Tài khoản chưa có giao dịch: nhật ký rỗng, không lỗi',
    IIF((SELECT COUNT(*) FROM @log) = 0, 'PASS', 'FAIL'), CONCAT(N'Số dòng: ', (SELECT COUNT(*) FROM @log)));

/* ===========================================================================
   NHÓM 6: Tổng thu, tổng chi, số dư
   A: thu 3.000.000; chi 50.000 + 1.200.000 + 30.000 = 1.280.000; dư 1.720.000
   A tháng 10: thu 3.000.000; chi 80.000; dư 2.920.000
   B: thu 500.000; chi 20.000; dư 480.000
   =========================================================================== */
DELETE @summary;
INSERT @summary EXEC dbo.sp_get_summary_by_user @user_id = @user_a;
INSERT @results SELECT N'Tổng thu/chi/số dư toàn bộ của A',
    IIF(total_income = 3000000 AND total_expense = 1280000 AND balance = 1720000, 'PASS', 'FAIL'),
    CONCAT(N'thu=', total_income, N', chi=', total_expense, N', dư=', balance)
FROM @summary;

DELETE @summary;
INSERT @summary EXEC dbo.sp_get_summary_by_user @user_id = @user_a, @from_date = '2026-10-01', @to_date = '2026-10-31';
INSERT @results SELECT N'Tổng thu/chi/số dư tháng 10/2026 của A',
    IIF(total_income = 3000000 AND total_expense = 80000 AND balance = 2920000, 'PASS', 'FAIL'),
    CONCAT(N'thu=', total_income, N', chi=', total_expense, N', dư=', balance)
FROM @summary;

DELETE @summary;
INSERT @summary EXEC dbo.sp_get_summary_by_user @user_id = @user_b;
INSERT @results SELECT N'Tổng thu/chi/số dư của B không lẫn với A',
    IIF(total_income = 500000 AND total_expense = 20000 AND balance = 480000, 'PASS', 'FAIL'),
    CONCAT(N'thu=', total_income, N', chi=', total_expense, N', dư=', balance)
FROM @summary;

DELETE @summary;
INSERT @summary EXEC dbo.sp_get_summary_by_user @user_id = @user_c;
INSERT @results VALUES (N'Tài khoản chưa có giao dịch: tổng = 0, số dư = 0',
    IIF((SELECT COUNT(*) FROM @summary) = 1
        AND EXISTS (SELECT 1 FROM @summary WHERE total_income = 0 AND total_expense = 0 AND balance = 0), 'PASS', 'FAIL'),
    (SELECT CONCAT(N'thu=', total_income, N', chi=', total_expense, N', dư=', balance) FROM @summary));

/* ===========================================================================
   NHÓM 7: Xóa người dùng thì xóa luôn giao dịch và danh mục cá nhân
   (đồng thời là bước dọn dữ liệu thử)
   =========================================================================== */
BEGIN TRY
    DELETE FROM dbo.users WHERE id IN (@user_a, @user_b, @user_c);
    INSERT @results VALUES (N'Xóa người dùng xóa kèm giao dịch và danh mục cá nhân',
        IIF(NOT EXISTS (SELECT 1 FROM dbo.transactions WHERE user_id IN (@user_a, @user_b, @user_c))
            AND NOT EXISTS (SELECT 1 FROM dbo.categories WHERE user_id IN (@user_a, @user_b, @user_c)), 'PASS', 'FAIL'), NULL);
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    INSERT @results VALUES (N'Xóa người dùng xóa kèm giao dịch và danh mục cá nhân', 'FAIL', ERROR_MESSAGE());
    -- Dọn thủ công nếu xóa dây chuyền lỗi
    DELETE FROM dbo.transactions WHERE user_id IN (@user_a, @user_b, @user_c);
    DELETE FROM dbo.categories   WHERE user_id IN (@user_a, @user_b, @user_c);
    DELETE FROM dbo.users        WHERE id      IN (@user_a, @user_b, @user_c);
END CATCH

/* ---------------------------------------------------------------------------
   In kết quả
   --------------------------------------------------------------------------- */
SELECT no AS [STT], result AS [Kết quả], test_case AS [Ca kiểm thử], detail AS [Chi tiết]
FROM @results
ORDER BY no;

DECLARE @total INT = (SELECT COUNT(*) FROM @results);
DECLARE @failed INT = (SELECT COUNT(*) FROM @results WHERE result = 'FAIL');

PRINT CONCAT(N'Tổng: ', @total, N' ca | PASS: ', @total - @failed, N' | FAIL: ', @failed);

IF @failed > 0
    THROW 50099, N'Có ca kiểm thử FAIL, xem bảng kết quả ở trên.', 1;
GO
