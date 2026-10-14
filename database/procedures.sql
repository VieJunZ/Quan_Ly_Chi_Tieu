/* 4 */

USE quan_ly_chi_tieu_db;
GO

CREATE OR ALTER PROCEDURE dbo.sp_add_transaction
    @user_id          INT,
    @category_id      INT,
    @amount           DECIMAL(15, 2),
    @note             NVARCHAR(500) = NULL,
    @transaction_date DATE
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE id = @user_id)
        THROW 50001, N'Người dùng không tồn tại.', 1;

    IF @amount IS NULL OR @amount <= 0
        THROW 50002, N'Số tiền phải lớn hơn 0.', 1;

    IF @transaction_date IS NULL
        THROW 50004, N'Ngày giao dịch không được để trống.', 1;

    -- Chỉ nhận danh mục mặc định hoặc danh mục của chính người dùng
    IF NOT EXISTS (
        SELECT 1 FROM dbo.categories
        WHERE id = @category_id
          AND (user_id IS NULL OR user_id = @user_id)
    )
        THROW 50003, N'Danh mục không tồn tại hoặc không thuộc người dùng.', 1;

    DECLARE @new TABLE (id INT);

    INSERT INTO dbo.transactions (user_id, category_id, amount, note, transaction_date)
    OUTPUT inserted.id INTO @new (id)
    VALUES (@user_id, @category_id, @amount, NULLIF(LTRIM(RTRIM(@note)), N''), @transaction_date);

    SELECT t.id,
           t.user_id,
           t.category_id,
           c.type,
           c.name AS category_name,
           t.amount,
           t.note,
           CONVERT(VARCHAR(10), t.transaction_date, 23) AS transaction_date,  -- chuỗi YYYY-MM-DD cho frontend
           t.created_at
    FROM dbo.transactions AS t
    JOIN dbo.categories   AS c ON c.id = t.category_id
    WHERE t.id = (SELECT id FROM @new);
END
GO

/* -----------------------------------------------------------------------------
   2. Nhật ký thu/chi theo người dùng
   Tham số lọc đều không bắt buộc:
     @from_date, @to_date : khoảng ngày (tính cả 2 đầu)
     @type                : 'income' hoặc 'expense'
     @limit               : số dòng tối đa (mặc định 100)
   Sắp xếp: ngày mới nhất trước, cùng ngày thì giao dịch nhập sau đứng trước.
   Người dùng chưa có giao dịch -> trả về 0 dòng.
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_get_transactions_by_user
    @user_id   INT,
    @from_date DATE        = NULL,
    @to_date   DATE        = NULL,
    @type      VARCHAR(10) = NULL,
    @limit     INT         = 100
AS
BEGIN
    SET NOCOUNT ON;

    IF @from_date IS NOT NULL AND @to_date IS NOT NULL AND @from_date > @to_date
        THROW 50008, N'Khoảng ngày không hợp lệ (from_date > to_date).', 1;

    IF @type IS NOT NULL AND @type NOT IN ('income', 'expense')
        THROW 50005, N'Loại danh mục không hợp lệ (chỉ nhận income/expense).', 1;

    SELECT TOP (CASE WHEN @limit > 0 THEN @limit ELSE 100 END)
           t.id,
           t.user_id,
           t.category_id,
           c.type,
           c.name  AS category_name,
           c.icon  AS category_icon,
           c.color AS category_color,
           t.amount,
           t.note,
           CONVERT(VARCHAR(10), t.transaction_date, 23) AS transaction_date,  -- chuỗi YYYY-MM-DD cho frontend
           t.created_at
    FROM dbo.transactions AS t
    JOIN dbo.categories   AS c ON c.id = t.category_id
    WHERE t.user_id = @user_id
      AND (@from_date IS NULL OR t.transaction_date >= @from_date)
      AND (@to_date   IS NULL OR t.transaction_date <= @to_date)
      AND (@type      IS NULL OR c.type = @type)
    ORDER BY t.transaction_date DESC, t.id DESC;
END
GO

/* -----------------------------------------------------------------------------
   3. Tổng thu, tổng chi và số dư
   Số dư = Tổng thu - Tổng chi.
   Không truyền khoảng ngày -> tính trên toàn bộ giao dịch.
   Truyền khoảng ngày (vd: đầu và cuối tháng) -> tính trong khoảng đó.
   Luôn trả về đúng 1 dòng; người dùng chưa có giao dịch nhận 0 / 0 / 0.
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_get_summary_by_user
    @user_id   INT,
    @from_date DATE = NULL,
    @to_date   DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @from_date IS NOT NULL AND @to_date IS NOT NULL AND @from_date > @to_date
        THROW 50008, N'Khoảng ngày không hợp lệ (from_date > to_date).', 1;

    SELECT s.total_income,
           s.total_expense,
           s.total_income - s.total_expense AS balance,
           s.transaction_count
    FROM (
        SELECT CAST(COALESCE(SUM(CASE WHEN c.type = 'income'  THEN t.amount ELSE 0 END), 0) AS DECIMAL(15, 2)) AS total_income,
               CAST(COALESCE(SUM(CASE WHEN c.type = 'expense' THEN t.amount ELSE 0 END), 0) AS DECIMAL(15, 2)) AS total_expense,
               COUNT(t.id) AS transaction_count
        FROM dbo.transactions AS t
        JOIN dbo.categories   AS c ON c.id = t.category_id
        WHERE t.user_id = @user_id
          AND (@from_date IS NULL OR t.transaction_date >= @from_date)
          AND (@to_date   IS NULL OR t.transaction_date <= @to_date)
    ) AS s;
END
GO

/* -----------------------------------------------------------------------------
   4. Danh mục người dùng được thấy: mặc định + cá nhân của chính họ
   @user_id = NULL -> chỉ lấy danh mục mặc định (dùng khi chưa đăng nhập)
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_get_categories_for_user
    @user_id INT         = NULL,
    @type    VARCHAR(10) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @type IS NOT NULL AND @type NOT IN ('income', 'expense')
        THROW 50005, N'Loại danh mục không hợp lệ (chỉ nhận income/expense).', 1;

    SELECT id,
           name,
           type,
           icon,
           color,
           CAST(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END AS BIT) AS is_default
    FROM dbo.categories
    WHERE (user_id IS NULL OR user_id = @user_id)
      AND (@type IS NULL OR type = @type)
    ORDER BY is_default DESC, type, id;
END
GO

/* -----------------------------------------------------------------------------
   5. Tạo danh mục cá nhân
   Không được trùng tên với danh mục mặc định hoặc danh mục cá nhân khác
   của chính người đó (cùng loại).
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_add_category
    @user_id INT,
    @name    NVARCHAR(100),
    @type    VARCHAR(10),
    @icon    VARCHAR(50) = 'circle-ellipsis',
    @color   VARCHAR(30) = 'blue'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @clean_name NVARCHAR(100) = LTRIM(RTRIM(@name));

    IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE id = @user_id)
        THROW 50001, N'Người dùng không tồn tại.', 1;

    IF @type IS NULL OR @type NOT IN ('income', 'expense')
        THROW 50005, N'Loại danh mục không hợp lệ (chỉ nhận income/expense).', 1;

    IF @clean_name IS NULL OR @clean_name = N''
        THROW 50006, N'Tên danh mục không được để trống.', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.categories
        WHERE type = @type
          AND name = @clean_name
          AND (user_id IS NULL OR user_id = @user_id)
    )
        THROW 50007, N'Danh mục đã tồn tại.', 1;

    DECLARE @new TABLE (id INT);

    INSERT INTO dbo.categories (user_id, name, type, icon, color)
    OUTPUT inserted.id INTO @new (id)
    VALUES (@user_id, @clean_name, @type,
            COALESCE(@icon, 'circle-ellipsis'), COALESCE(@color, 'blue'));

    SELECT id, name, type, icon, color, CAST(0 AS BIT) AS is_default
    FROM dbo.categories
    WHERE id = (SELECT id FROM @new);
END
GO

PRINT N'Đã tạo các stored procedure.';
GO
