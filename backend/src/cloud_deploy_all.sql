-- =========================================================================
-- CLOUD DEPLOY SCRIPT FOR SO CHI TIEU (SQL SERVER)
-- Chay script nay tren CSDL Cloud (Somee / Azure SQL / Remote SQL Server)
-- Script tu dong tao bang, seed du lieu va tao toan bo Stored Procedures
-- =========================================================================

-- =========================================================================
-- NGUON: database/create_tables.sql
-- =========================================================================

/* 2 */
GO

/* -----------------------------------------------------------------------------
   1. Bảng users: tài khoản người dùng
   ----------------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.users (
        id            INT IDENTITY(1, 1) NOT NULL,
        username      NVARCHAR(30)       NOT NULL,
        password_hash VARCHAR(60)        NOT NULL,  -- bcrypt luôn dài đúng 60 ký tự
        created_at    DATETIME2(0)       NOT NULL CONSTRAINT df_users_created_at DEFAULT SYSDATETIME(),

        CONSTRAINT pk_users PRIMARY KEY (id),
        CONSTRAINT uq_users_username UNIQUE (username),
        CONSTRAINT ck_users_username CHECK (LEN(username) >= 3),
        -- Chặn lưu mật khẩu dạng văn bản thường: chỉ nhận chuỗi băm bcrypt ($2a$/$2b$/$2y$, 60 ký tự)
        CONSTRAINT ck_users_password_hash CHECK (
            LEN(password_hash) = 60 AND password_hash LIKE '$2[aby]$%'
        )
    );
    PRINT N'Đã tạo bảng users.';
END
GO

/* -----------------------------------------------------------------------------
   2. Bảng categories: danh mục thu/chi
      user_id = NULL      -> danh mục mặc định, dùng chung cho mọi người dùng
      user_id = <id user> -> danh mục cá nhân, chỉ người đó thấy và dùng được
   ----------------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.categories', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.categories (
        id         INT IDENTITY(1, 1) NOT NULL,
        user_id    INT                NULL,
        name       NVARCHAR(100)      NOT NULL,
        type       VARCHAR(10)        NOT NULL,
        icon       VARCHAR(50)        NOT NULL CONSTRAINT df_categories_icon  DEFAULT 'circle-ellipsis',
        color      VARCHAR(30)        NOT NULL CONSTRAINT df_categories_color DEFAULT 'blue',
        created_at DATETIME2(0)       NOT NULL CONSTRAINT df_categories_created_at DEFAULT SYSDATETIME(),

        CONSTRAINT pk_categories PRIMARY KEY (id),
        CONSTRAINT fk_categories_user FOREIGN KEY (user_id)
            REFERENCES dbo.users (id) ON DELETE CASCADE,
        CONSTRAINT ck_categories_type CHECK (type IN ('income', 'expense')),
        CONSTRAINT ck_categories_name CHECK (LEN(LTRIM(RTRIM(name))) > 0),
        -- Một người không có 2 danh mục trùng tên trong cùng loại.
        -- SQL Server coi các giá trị NULL là bằng nhau trong UNIQUE, nên
        -- danh mục mặc định cũng không bị trùng tên với nhau.
        CONSTRAINT uq_categories_owner_type_name UNIQUE (user_id, type, name)
    );
    PRINT N'Đã tạo bảng categories.';
END
GO

/* -----------------------------------------------------------------------------
   3. Bảng transactions: các khoản thu/chi
      Không lưu cột "type": loại thu/chi lấy từ danh mục, nên không thể có
      khoản "thu" gắn với danh mục "chi" và ngược lại.
   ----------------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.transactions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.transactions (
        id               INT IDENTITY(1, 1) NOT NULL,
        user_id          INT                NOT NULL,
        category_id      INT                NOT NULL,
        amount           DECIMAL(15, 2)     NOT NULL,
        note             NVARCHAR(500)      NULL,
        transaction_date DATE               NOT NULL,
        created_at       DATETIME2(0)       NOT NULL CONSTRAINT df_transactions_created_at DEFAULT SYSDATETIME(),

        CONSTRAINT pk_transactions PRIMARY KEY (id),
        CONSTRAINT fk_transactions_user FOREIGN KEY (user_id)
            REFERENCES dbo.users (id) ON DELETE CASCADE,
        -- Không cho xóa danh mục đang có giao dịch (NO ACTION).
        CONSTRAINT fk_transactions_category FOREIGN KEY (category_id)
            REFERENCES dbo.categories (id),
        CONSTRAINT ck_transactions_amount CHECK (amount > 0)
    );

    -- Tăng tốc truy vấn nhật ký và tổng thu/chi theo người dùng + khoảng ngày
    CREATE INDEX ix_transactions_user_date
        ON dbo.transactions (user_id, transaction_date DESC)
        INCLUDE (category_id, amount);

    CREATE INDEX ix_transactions_category
        ON dbo.transactions (category_id);

    PRINT N'Đã tạo bảng transactions.';
END
GO

/* -----------------------------------------------------------------------------
   4. Trigger: giao dịch chỉ được dùng danh mục mặc định hoặc danh mục
      cá nhân của chính người dùng đó.
   ----------------------------------------------------------------------------- */
CREATE OR ALTER TRIGGER dbo.trg_transactions_category_owner
ON dbo.transactions
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        JOIN dbo.categories AS c ON c.id = i.category_id
        WHERE c.user_id IS NOT NULL
          AND c.user_id <> i.user_id
    )
    BEGIN
        ;THROW 50010, N'Không được dùng danh mục cá nhân của người dùng khác.', 1;
    END
END
GO


GO

-- =========================================================================
-- NGUON: database/seed_categories.sql
-- =========================================================================

/* 3 */
GO

SET IDENTITY_INSERT dbo.categories ON;

MERGE dbo.categories AS target
USING (VALUES
    ( 1, N'Ăn uống',             'expense', 'utensils',        'amber'),
    ( 2, N'Nhà cửa & Phòng trọ', 'expense', 'home',            'blue'),
    ( 3, N'Di chuyển & Xăng xe', 'expense', 'car',             'cyan'),
    ( 4, N'Mua sắm cá nhân',     'expense', 'shopping-bag',    'rose'),
    ( 5, N'Hóa đơn & Tiện ích',  'expense', 'receipt',         'orange'),
    ( 6, N'Học tập & Tri thức',  'expense', 'book-open',       'indigo'),
    ( 7, N'Giải trí & Bạn bè',   'expense', 'gamepad-2',       'violet'),
    ( 8, N'Y tế & Sức khỏe',     'expense', 'heart-pulse',     'red'),
    ( 9, N'Khoản chi khác',      'expense', 'circle-ellipsis', 'emerald'),
    (10, N'Tiền lương',          'income',  'wallet',          'emerald'),
    (11, N'Tiền thưởng',         'income',  'gift',            'green'),
    (12, N'Trợ cấp & Học bổng',  'income',  'hand-coins',      'teal'),
    (13, N'Thu nhập khác',       'income',  'plus-circle',     'lime')
) AS source (id, name, type, icon, color)
ON target.id = source.id
WHEN MATCHED THEN
    UPDATE SET name    = source.name,
               type    = source.type,
               icon    = source.icon,
               color   = source.color,
               user_id = NULL
WHEN NOT MATCHED BY TARGET THEN
    INSERT (id, user_id, name, type, icon, color)
    VALUES (source.id, NULL, source.name, source.type, source.icon, source.color);

SET IDENTITY_INSERT dbo.categories OFF;

-- Danh mục cá nhân tạo sau sẽ bắt đầu từ id 14 trở đi
DECLARE @max_id INT = (SELECT MAX(id) FROM dbo.categories);
DBCC CHECKIDENT ('dbo.categories', RESEED, @max_id) WITH NO_INFOMSGS;

PRINT N'Đã nạp danh mục mặc định.';
GO


GO

-- =========================================================================
-- NGUON: database/procedures.sql
-- =========================================================================

/* 4 */
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


GO

-- =========================================================================
-- NGUON: database/mo_rong/mo_rong_bang.sql
-- =========================================================================

/* =============================================================================
   Mở rộng CSDL cho bản thử nghiệm (nhánh tri/thu-nghiem)
   Chạy SAU các script gốc: create_database -> create_tables -> seed_categories -> procedures
   Tên CSDL truyền vào qua biến sqlcmd: sqlcmd ... -v DB_NAME=so_chi_tri_db
   Script chạy lại nhiều lần không lỗi (kiểm tra tồn tại trước khi tạo).
   ============================================================================= */
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* -----------------------------------------------------------------------------
   1. users: thêm cột cho tài khoản dùng thử, khóa đăng nhập, mã khôi phục
   ----------------------------------------------------------------------------- */
IF COL_LENGTH('dbo.users', 'is_demo') IS NULL
BEGIN
    ALTER TABLE dbo.users ADD
        is_demo              BIT          NOT NULL CONSTRAINT df_users_is_demo DEFAULT 0,
        demo_expires_at      DATETIME2(0) NULL,
        failed_login_count   INT          NOT NULL CONSTRAINT df_users_failed_login DEFAULT 0,
        locked_until         DATETIME2(0) NULL,
        recovery_code_hash   VARCHAR(60)  NULL,
        password_changed_at  DATETIME2(0) NULL,
        survey_snoozed_until DATETIME2(0) NULL;
    PRINT N'Đã thêm cột mở rộng cho users.';
END
GO

IF OBJECT_ID(N'dbo.ck_users_demo_expiry', N'C') IS NULL
    ALTER TABLE dbo.users ADD
        -- Tài khoản dùng thử bắt buộc có hạn dùng
        CONSTRAINT ck_users_demo_expiry CHECK (is_demo = 0 OR demo_expires_at IS NOT NULL),
        CONSTRAINT ck_users_failed_login CHECK (failed_login_count >= 0),
        -- Mã khôi phục cũng chỉ lưu dạng băm bcrypt
        CONSTRAINT ck_users_recovery_hash CHECK (
            recovery_code_hash IS NULL
            OR (LEN(recovery_code_hash) = 60 AND recovery_code_hash LIKE '$2[aby]$%')
        );
GO

/* -----------------------------------------------------------------------------
   2. transactions: giờ phát sinh và nguồn nhập
      source cho biết khoản này được ghi bằng cách nào, để thống kê
      xem người dùng hay nhập bằng giọng nói, ảnh bill hay tay.
   ----------------------------------------------------------------------------- */
IF COL_LENGTH('dbo.transactions', 'transaction_time') IS NULL
BEGIN
    ALTER TABLE dbo.transactions ADD
        transaction_time TIME(0)     NULL,
        source           VARCHAR(10) NOT NULL CONSTRAINT df_transactions_source DEFAULT 'manual';
    PRINT N'Đã thêm cột transaction_time, source cho transactions.';
END
GO

IF OBJECT_ID(N'dbo.ck_transactions_source', N'C') IS NULL
    ALTER TABLE dbo.transactions ADD CONSTRAINT ck_transactions_source
        CHECK (source IN ('manual', 'voice', 'bill', 'sms', 'quick', 'reconcile', 'split', 'demo'));
GO

/* -----------------------------------------------------------------------------
   3. sessions: phiên đăng nhập (mỗi thiết bị một phiên)
      JWT mang id phiên; đăng xuất hoặc đổi mật khẩu thì đặt revoked_at,
      token cũ hết hiệu lực ngay dù chưa hết hạn.
   ----------------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.sessions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.sessions (
        id           UNIQUEIDENTIFIER NOT NULL CONSTRAINT df_sessions_id DEFAULT NEWID(),
        user_id      INT              NOT NULL,
        user_agent   NVARCHAR(300)    NULL,
        ip_address   VARCHAR(45)      NULL,
        created_at   DATETIME2(0)     NOT NULL CONSTRAINT df_sessions_created_at DEFAULT SYSDATETIME(),
        last_seen_at DATETIME2(0)     NOT NULL CONSTRAINT df_sessions_last_seen DEFAULT SYSDATETIME(),
        expires_at   DATETIME2(0)     NOT NULL,
        revoked_at   DATETIME2(0)     NULL,

        CONSTRAINT pk_sessions PRIMARY KEY (id),
        CONSTRAINT fk_sessions_user FOREIGN KEY (user_id)
            REFERENCES dbo.users (id) ON DELETE CASCADE,
        CONSTRAINT ck_sessions_expiry CHECK (expires_at > created_at)
    );

    CREATE INDEX ix_sessions_user_active ON dbo.sessions (user_id) WHERE revoked_at IS NULL;
    PRINT N'Đã tạo bảng sessions.';
END
GO

/* -----------------------------------------------------------------------------
   4. receipt_scans: mỗi lần quét ảnh bill / dán thông báo ngân hàng
      Dùng để chống ghi trùng khi người dùng đưa cùng một bill nhiều lần:
        file_sha256  : trùng y hệt file
        image_dhash  : ảnh nhìn giống nhau (chụp lại, nén lại, đổi định dạng)
        content_key  : cùng số tiền + thời điểm + mã giao dịch (ảnh khác nhau
                       nhưng cùng một giao dịch, vd ảnh bill và thông báo ngân hàng)
      transaction_id NULL = mới quét, người dùng chưa xác nhận ghi.
   ----------------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.receipt_scans', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.receipt_scans (
        id             INT IDENTITY(1, 1) NOT NULL,
        user_id        INT                NOT NULL,
        input_kind     VARCHAR(10)        NOT NULL,
        file_sha256    CHAR(64)           NULL,
        image_dhash    CHAR(16)           NULL,
        content_key    CHAR(64)           NULL,
        doc_kind       VARCHAR(20)        NOT NULL,
        direction      VARCHAR(10)        NULL,
        amount         DECIMAL(15, 2)     NULL,
        occurred_at    DATETIME2(0)       NULL,
        reference_code VARCHAR(40)        NULL,
        raw_text       NVARCHAR(MAX)      NULL,
        transaction_id INT                NULL,
        created_at     DATETIME2(0)       NOT NULL CONSTRAINT df_receipt_scans_created_at DEFAULT SYSDATETIME(),

        CONSTRAINT pk_receipt_scans PRIMARY KEY (id),
        CONSTRAINT fk_receipt_scans_user FOREIGN KEY (user_id)
            REFERENCES dbo.users (id) ON DELETE CASCADE,
        CONSTRAINT fk_receipt_scans_transaction FOREIGN KEY (transaction_id)
            REFERENCES dbo.transactions (id),
        CONSTRAINT ck_receipt_scans_input CHECK (input_kind IN ('image', 'text')),
        CONSTRAINT ck_receipt_scans_kind CHECK (doc_kind IN ('receipt', 'bank_notification', 'transfer', 'unknown')),
        CONSTRAINT ck_receipt_scans_direction CHECK (direction IS NULL OR direction IN ('income', 'expense')),
        CONSTRAINT ck_receipt_scans_amount CHECK (amount IS NULL OR amount > 0),
        CONSTRAINT ck_receipt_scans_image CHECK (input_kind = 'text' OR file_sha256 IS NOT NULL)
    );

    CREATE INDEX ix_receipt_scans_sha ON dbo.receipt_scans (user_id, file_sha256) WHERE transaction_id IS NOT NULL;
    CREATE INDEX ix_receipt_scans_content ON dbo.receipt_scans (user_id, content_key) WHERE transaction_id IS NOT NULL;
    -- Một giao dịch chỉ gắn với một lần quét
    CREATE UNIQUE INDEX uq_receipt_scans_transaction ON dbo.receipt_scans (transaction_id) WHERE transaction_id IS NOT NULL;
    PRINT N'Đã tạo bảng receipt_scans.';
END
GO

/* -----------------------------------------------------------------------------
   5. split_bills + debts: chia tiền nhóm và sổ nợ
      Bạn bè chỉ là tên trong sổ của người dùng, không cần tài khoản.
      direction: owed_to_me = người đó nợ mình, i_owe = mình nợ người đó
   ----------------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.split_bills', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.split_bills (
        id             INT IDENTITY(1, 1) NOT NULL,
        user_id        INT                NOT NULL,
        title          NVARCHAR(200)      NOT NULL,
        total_amount   DECIMAL(15, 2)     NOT NULL,
        people_count   INT                NOT NULL,
        my_share       DECIMAL(15, 2)     NOT NULL,
        transaction_id INT                NULL,
        created_at     DATETIME2(0)       NOT NULL CONSTRAINT df_split_bills_created_at DEFAULT SYSDATETIME(),

        CONSTRAINT pk_split_bills PRIMARY KEY (id),
        CONSTRAINT fk_split_bills_user FOREIGN KEY (user_id)
            REFERENCES dbo.users (id) ON DELETE CASCADE,
        CONSTRAINT fk_split_bills_transaction FOREIGN KEY (transaction_id)
            REFERENCES dbo.transactions (id),
        CONSTRAINT ck_split_bills_total CHECK (total_amount > 0),
        CONSTRAINT ck_split_bills_people CHECK (people_count BETWEEN 2 AND 50),
        CONSTRAINT ck_split_bills_share CHECK (my_share >= 0 AND my_share <= total_amount)
    );
    PRINT N'Đã tạo bảng split_bills.';
END
GO

IF OBJECT_ID(N'dbo.debts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.debts (
        id          INT IDENTITY(1, 1) NOT NULL,
        user_id     INT                NOT NULL,
        person_name NVARCHAR(50)       NOT NULL,
        direction   VARCHAR(12)        NOT NULL,
        amount      DECIMAL(15, 2)     NOT NULL,
        note        NVARCHAR(200)      NULL,
        split_id    INT                NULL,
        created_at  DATETIME2(0)       NOT NULL CONSTRAINT df_debts_created_at DEFAULT SYSDATETIME(),
        settled_at  DATETIME2(0)       NULL,

        CONSTRAINT pk_debts PRIMARY KEY (id),
        CONSTRAINT fk_debts_user FOREIGN KEY (user_id)
            REFERENCES dbo.users (id) ON DELETE CASCADE,
        CONSTRAINT fk_debts_split FOREIGN KEY (split_id)
            REFERENCES dbo.split_bills (id),
        CONSTRAINT ck_debts_direction CHECK (direction IN ('owed_to_me', 'i_owe')),
        CONSTRAINT ck_debts_amount CHECK (amount > 0),
        CONSTRAINT ck_debts_person CHECK (LEN(LTRIM(RTRIM(person_name))) > 0)
    );

    CREATE INDEX ix_debts_user_open ON dbo.debts (user_id, person_name) WHERE settled_at IS NULL;
    PRINT N'Đã tạo bảng debts.';
END
GO

/* -----------------------------------------------------------------------------
   6. wallet_checks: đối soát "tiền bốc hơi"
      Người dùng nhập số tiền thật đang có, so với số dư trên sổ.
      difference > 0: sổ nhiều hơn thực tế -> có khoản chi chưa ghi.
   ----------------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.wallet_checks', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.wallet_checks (
        id             INT IDENTITY(1, 1) NOT NULL,
        user_id        INT                NOT NULL,
        actual_balance DECIMAL(15, 2)     NOT NULL,
        book_balance   DECIMAL(15, 2)     NOT NULL,
        difference     AS (book_balance - actual_balance) PERSISTED,
        transaction_id INT                NULL,
        created_at     DATETIME2(0)       NOT NULL CONSTRAINT df_wallet_checks_created_at DEFAULT SYSDATETIME(),

        CONSTRAINT pk_wallet_checks PRIMARY KEY (id),
        CONSTRAINT fk_wallet_checks_user FOREIGN KEY (user_id)
            REFERENCES dbo.users (id) ON DELETE CASCADE,
        CONSTRAINT fk_wallet_checks_transaction FOREIGN KEY (transaction_id)
            REFERENCES dbo.transactions (id),
        CONSTRAINT ck_wallet_checks_actual CHECK (actual_balance >= 0)
    );
    PRINT N'Đã tạo bảng wallet_checks.';
END
GO

/* -----------------------------------------------------------------------------
   7. day_marks: ngày người dùng xác nhận "hôm nay không tiêu gì"
      (để không nhắc lại vào buổi tối)
   ----------------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.day_marks', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.day_marks (
        user_id    INT          NOT NULL,
        mark_date  DATE         NOT NULL,
        kind       VARCHAR(10)  NOT NULL,
        created_at DATETIME2(0) NOT NULL CONSTRAINT df_day_marks_created_at DEFAULT SYSDATETIME(),

        CONSTRAINT pk_day_marks PRIMARY KEY (user_id, mark_date, kind),
        CONSTRAINT fk_day_marks_user FOREIGN KEY (user_id)
            REFERENCES dbo.users (id) ON DELETE CASCADE,
        CONSTRAINT ck_day_marks_kind CHECK (kind IN ('no_spend'))
    );
    PRINT N'Đã tạo bảng day_marks.';
END
GO

/* -----------------------------------------------------------------------------
   8. survey_responses: khảo sát sau 1 ngày dùng
      answers là JSON dạng {"voice":"like","bill":"dislike",...}
      Muốn thêm chức năng thì bắt buộc ghi nội dung đề xuất.
   ----------------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.survey_responses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.survey_responses (
        id                INT IDENTITY(1, 1) NOT NULL,
        user_id           INT                NOT NULL,
        answers           NVARCHAR(MAX)      NOT NULL,
        wants_new_feature BIT                NOT NULL CONSTRAINT df_survey_wants DEFAULT 0,
        suggestion        NVARCHAR(1000)     NULL,
        created_at        DATETIME2(0)       NOT NULL CONSTRAINT df_survey_created_at DEFAULT SYSDATETIME(),

        CONSTRAINT pk_survey_responses PRIMARY KEY (id),
        CONSTRAINT fk_survey_user FOREIGN KEY (user_id)
            REFERENCES dbo.users (id) ON DELETE CASCADE,
        CONSTRAINT uq_survey_user UNIQUE (user_id),
        CONSTRAINT ck_survey_answers_json CHECK (ISJSON(answers) = 1),
        CONSTRAINT ck_survey_suggestion CHECK (
            wants_new_feature = 0 OR LEN(LTRIM(RTRIM(ISNULL(suggestion, N'')))) > 0
        )
    );
    PRINT N'Đã tạo bảng survey_responses.';
END
GO

-- Người dùng được sửa lại góp ý bất cứ lúc nào (vào Tôi > Góp ý cho app)
IF COL_LENGTH('dbo.survey_responses', 'updated_at') IS NULL
BEGIN
    ALTER TABLE dbo.survey_responses ADD updated_at DATETIME2(0) NULL;
    PRINT N'Đã thêm cột updated_at cho survey_responses.';
END
GO

/* -----------------------------------------------------------------------------
   9. budgets: ngân sách theo tháng (month_start luôn là ngày 01)
      Tháng chưa đặt thì dùng ngân sách của tháng gần nhất trước đó.
   ----------------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.budgets', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.budgets (
        user_id     INT            NOT NULL,
        month_start DATE           NOT NULL,
        amount      DECIMAL(15, 2) NOT NULL,
        updated_at  DATETIME2(0)   NOT NULL CONSTRAINT df_budgets_updated_at DEFAULT SYSDATETIME(),

        CONSTRAINT pk_budgets PRIMARY KEY (user_id, month_start),
        CONSTRAINT fk_budgets_user FOREIGN KEY (user_id)
            REFERENCES dbo.users (id) ON DELETE CASCADE,
        CONSTRAINT ck_budgets_amount CHECK (amount > 0),
        CONSTRAINT ck_budgets_month_start CHECK (DAY(month_start) = 1)
    );
    PRINT N'Đã tạo bảng budgets.';
END
GO

/* -----------------------------------------------------------------------------
   10. Chỉ mục cho các truy vấn chạy thường xuyên
       - Danh sách chia tiền / lần đối soát gần nhất của từng người dùng.
       - Xóa giao dịch thì phải gỡ liên kết ở split_bills, wallet_checks theo transaction_id.
       - Xóa người dùng (dọn tài khoản dùng thử) xóa dây chuyền các bảng con theo user_id.
       - Dọn lần quét bill chưa xác nhận và tài khoản dùng thử hết hạn mỗi giờ.
       Không có chỉ mục thì các lệnh trên phải quét cả bảng, càng đông người dùng càng chậm.
   ----------------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_users_demo_expiry' AND object_id = OBJECT_ID(N'dbo.users'))
    CREATE INDEX ix_users_demo_expiry ON dbo.users (demo_expires_at) WHERE is_demo = 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_sessions_user' AND object_id = OBJECT_ID(N'dbo.sessions'))
    CREATE INDEX ix_sessions_user ON dbo.sessions (user_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_receipt_scans_user' AND object_id = OBJECT_ID(N'dbo.receipt_scans'))
    CREATE INDEX ix_receipt_scans_user ON dbo.receipt_scans (user_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_receipt_scans_pending' AND object_id = OBJECT_ID(N'dbo.receipt_scans'))
    CREATE INDEX ix_receipt_scans_pending ON dbo.receipt_scans (created_at) WHERE transaction_id IS NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_split_bills_user' AND object_id = OBJECT_ID(N'dbo.split_bills'))
    CREATE INDEX ix_split_bills_user ON dbo.split_bills (user_id, created_at DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_split_bills_transaction' AND object_id = OBJECT_ID(N'dbo.split_bills'))
    CREATE INDEX ix_split_bills_transaction ON dbo.split_bills (transaction_id) WHERE transaction_id IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_debts_user' AND object_id = OBJECT_ID(N'dbo.debts'))
    CREATE INDEX ix_debts_user ON dbo.debts (user_id, settled_at DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_debts_split' AND object_id = OBJECT_ID(N'dbo.debts'))
    CREATE INDEX ix_debts_split ON dbo.debts (split_id) WHERE split_id IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_wallet_checks_user' AND object_id = OBJECT_ID(N'dbo.wallet_checks'))
    CREATE INDEX ix_wallet_checks_user ON dbo.wallet_checks (user_id, created_at DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_wallet_checks_transaction' AND object_id = OBJECT_ID(N'dbo.wallet_checks'))
    CREATE INDEX ix_wallet_checks_transaction ON dbo.wallet_checks (transaction_id) WHERE transaction_id IS NOT NULL;
PRINT N'Đã kiểm tra chỉ mục.';
GO

/* -----------------------------------------------------------------------------
   11. user_challenges: thử thách tiết kiệm người dùng tự chọn
       Ví dụ "Cà phê không quá 300k trong 30 ngày", "3 ngày không tiêu trong 7 ngày".
       - template_key: loại thử thách + đối tượng, ví dụ cap_keyword:coffee, cap_category:4.
       - target_amount dùng cho thử thách giới hạn tiền, target_count cho giới hạn số lần / số ngày.
       - baseline_amount: số tiền dự kiến sẽ tiêu nếu giữ thói quen cũ (để tính tiền tiết kiệm được).
       - Tiến độ tính lại mỗi lần mở app; vượt hạn mức thì thua ngay, qua ngày kết thúc thì thắng.
   ----------------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.user_challenges', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.user_challenges (
        id              INT IDENTITY(1, 1) NOT NULL,
        user_id         INT                NOT NULL,
        template_key    VARCHAR(40)        NOT NULL,
        kind            VARCHAR(20)        NOT NULL,
        title           NVARCHAR(150)      NOT NULL,
        level           VARCHAR(10)        NULL,
        target_amount   DECIMAL(15, 2)     NULL,
        target_count    INT                NULL,
        baseline_amount DECIMAL(15, 2)     NULL,
        result_amount   DECIMAL(15, 2)     NULL,
        result_count    INT                NULL,
        start_date      DATE               NOT NULL,
        end_date        DATE               NOT NULL,
        status          VARCHAR(10)        NOT NULL CONSTRAINT df_challenges_status DEFAULT 'active',
        created_at      DATETIME2(0)       NOT NULL CONSTRAINT df_challenges_created_at DEFAULT SYSDATETIME(),
        finished_at     DATETIME2(0)       NULL,

        CONSTRAINT pk_user_challenges PRIMARY KEY (id),
        CONSTRAINT fk_challenges_user FOREIGN KEY (user_id)
            REFERENCES dbo.users (id) ON DELETE CASCADE,
        CONSTRAINT ck_challenges_kind CHECK (kind IN
            ('cap_keyword', 'cap_category', 'max_count', 'daily_cap', 'weekend_cap', 'no_spend_days', 'log_streak')),
        CONSTRAINT ck_challenges_level CHECK (level IS NULL OR level IN ('light', 'medium', 'hard')),
        CONSTRAINT ck_challenges_status CHECK (status IN ('active', 'won', 'lost', 'abandoned')),
        CONSTRAINT ck_challenges_dates CHECK (end_date >= start_date AND DATEDIFF(DAY, start_date, end_date) < 31),
        CONSTRAINT ck_challenges_target CHECK (
            (target_amount IS NOT NULL AND target_amount >= 0) OR (target_count IS NOT NULL AND target_count >= 0)
        ),
        -- Còn đang chạy thì chưa có ngày kết thúc thật, đã xong thì phải có
        CONSTRAINT ck_challenges_finished CHECK (
            (status = 'active' AND finished_at IS NULL) OR (status <> 'active' AND finished_at IS NOT NULL)
        )
    );
    PRINT N'Đã tạo bảng user_challenges.';
END
GO

/* -----------------------------------------------------------------------------
   12. user_badges: huy hiệu đã đạt (mỗi huy hiệu chỉ nhận một lần)
   ----------------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.user_badges', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.user_badges (
        user_id      INT          NOT NULL,
        badge_key    VARCHAR(30)  NOT NULL,
        challenge_id INT          NULL,
        earned_at    DATETIME2(0) NOT NULL CONSTRAINT df_badges_earned_at DEFAULT SYSDATETIME(),

        CONSTRAINT pk_user_badges PRIMARY KEY (user_id, badge_key),
        CONSTRAINT fk_badges_user FOREIGN KEY (user_id)
            REFERENCES dbo.users (id) ON DELETE CASCADE
    );
    PRINT N'Đã tạo bảng user_badges.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_challenges_user' AND object_id = OBJECT_ID(N'dbo.user_challenges'))
    CREATE INDEX ix_challenges_user ON dbo.user_challenges (user_id, status, end_date DESC);
GO

/* -----------------------------------------------------------------------------
   13. users.display_name: tên hiển thị để app chào ("Chào Trí"), khác tên đăng nhập.
       Đổi tên hiển thị không ảnh hưởng đăng nhập, mật khẩu hay phiên.
   ----------------------------------------------------------------------------- */
IF COL_LENGTH('dbo.users', 'display_name') IS NULL
BEGIN
    ALTER TABLE dbo.users ADD display_name NVARCHAR(40) NULL;
    PRINT N'Đã thêm cột display_name cho users.';
END
GO

IF OBJECT_ID(N'dbo.ck_users_display_name', N'C') IS NULL
    ALTER TABLE dbo.users ADD
        CONSTRAINT ck_users_display_name CHECK (display_name IS NULL OR LEN(LTRIM(RTRIM(display_name))) > 0);
GO

/* -----------------------------------------------------------------------------
   14. user_category_prefs: mỗi người tự ẩn / sắp xếp danh mục của mình
       - Danh mục mặc định dùng chung nên không sửa tên được, chỉ ẩn hoặc đổi thứ tự.
       - Ẩn chỉ bỏ khỏi danh sách chọn khi ghi khoản mới, các khoản cũ vẫn giữ nguyên.
       - Khóa ngoại tới categories không xóa dây chuyền: categories đã xóa dây chuyền theo users,
         SQL Server không cho hai đường xóa dây chuyền cùng tới một bảng.
   ----------------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.user_category_prefs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.user_category_prefs (
        user_id     INT          NOT NULL,
        category_id INT          NOT NULL,
        is_hidden   BIT          NOT NULL CONSTRAINT df_category_prefs_hidden DEFAULT 0,
        sort_order  INT          NULL,
        updated_at  DATETIME2(0) NOT NULL CONSTRAINT df_category_prefs_updated DEFAULT SYSDATETIME(),

        CONSTRAINT pk_user_category_prefs PRIMARY KEY (user_id, category_id),
        CONSTRAINT fk_category_prefs_user FOREIGN KEY (user_id)
            REFERENCES dbo.users (id) ON DELETE CASCADE,
        CONSTRAINT fk_category_prefs_category FOREIGN KEY (category_id)
            REFERENCES dbo.categories (id),
        CONSTRAINT ck_category_prefs_order CHECK (sort_order IS NULL OR sort_order >= 0)
    );
    PRINT N'Đã tạo bảng user_category_prefs.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_category_prefs_category' AND object_id = OBJECT_ID(N'dbo.user_category_prefs'))
    CREATE INDEX ix_category_prefs_category ON dbo.user_category_prefs (category_id);
GO

/* -----------------------------------------------------------------------------
   15. pet_shop & gamification: Xu tích lũy, tủ đồ linh thú và lịch sử biến động
       - users.coins: số xu người dùng tích lũy được (tặng 100 xu tân thủ)
       - users.pet_fullness: độ no bụng (0 - 100), tăng khi cho ăn
       - pet_shop_items: danh mục phụ kiện (head, face, emblem, held, skin, bg, pedestal, aura, consumable, utility)
       - user_inventory: tủ đồ cá nhân (lưu số lượng và cờ đang mặc is_equipped)
       - pet_coin_history: nhật ký cộng/trừ xu minh bạch
   ----------------------------------------------------------------------------- */
IF COL_LENGTH('dbo.users', 'coins') IS NULL
BEGIN
    ALTER TABLE dbo.users ADD
        coins        INT NOT NULL CONSTRAINT df_users_coins DEFAULT 100,
        pet_fullness INT NOT NULL CONSTRAINT df_users_pet_fullness DEFAULT 80;
    PRINT N'Đã thêm cột coins và pet_fullness cho users.';
END
GO

IF COL_LENGTH('dbo.users', 'badge_points') IS NULL
BEGIN
    ALTER TABLE dbo.users ADD
        badge_points INT NOT NULL CONSTRAINT df_users_badge_points DEFAULT 3;
    PRINT N'Đã thêm cột badge_points cho users.';
END
GO

IF OBJECT_ID(N'dbo.ck_users_coins', N'C') IS NULL
    ALTER TABLE dbo.users ADD
        CONSTRAINT ck_users_coins CHECK (coins >= 0),
        CONSTRAINT ck_users_pet_fullness CHECK (pet_fullness BETWEEN 0 AND 100);
GO

IF OBJECT_ID(N'dbo.pet_shop_items', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.pet_shop_items (
        id             VARCHAR(50)   NOT NULL,
        name           NVARCHAR(100) NOT NULL,
        slot           VARCHAR(20)   NOT NULL,
        price_coins    INT           NOT NULL CONSTRAINT df_pet_items_price DEFAULT 0,
        price_badges   INT           NOT NULL CONSTRAINT df_pet_items_price_badges DEFAULT 0,
        rarity         VARCHAR(20)   NOT NULL CONSTRAINT df_pet_items_rarity DEFAULT 'common',
        required_level INT           NOT NULL CONSTRAINT df_pet_items_level DEFAULT 1,
        description    NVARCHAR(255) NULL,
        effect_data    NVARCHAR(MAX) NULL,
        is_active      BIT           NOT NULL CONSTRAINT df_pet_items_active DEFAULT 1,
        created_at     DATETIME2(0)  NOT NULL CONSTRAINT df_pet_items_created DEFAULT SYSDATETIME(),

        CONSTRAINT pk_pet_shop_items PRIMARY KEY (id),
        CONSTRAINT ck_pet_items_slot CHECK (slot IN
            ('head', 'face', 'emblem', 'held', 'skin', 'bg', 'pedestal', 'aura', 'consumable', 'utility', 'egg', 'pet')),
        CONSTRAINT ck_pet_items_price CHECK (price_coins >= 0),
        CONSTRAINT ck_pet_items_rarity CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
        CONSTRAINT ck_pet_items_level CHECK (required_level >= 1)
    );
    PRINT N'Đã tạo bảng pet_shop_items.';
END
GO

IF OBJECT_ID(N'dbo.user_inventory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.user_inventory (
        id          INT          IDENTITY(1, 1) NOT NULL,
        user_id     INT          NOT NULL,
        item_id     VARCHAR(50)  NOT NULL,
        quantity    INT          NOT NULL CONSTRAINT df_user_inventory_qty DEFAULT 1,
        is_equipped BIT          NOT NULL CONSTRAINT df_user_inventory_equipped DEFAULT 0,
        acquired_at DATETIME2(0) NOT NULL CONSTRAINT df_user_inventory_acquired DEFAULT SYSDATETIME(),

        CONSTRAINT pk_user_inventory PRIMARY KEY (id),
        CONSTRAINT fk_user_inventory_user FOREIGN KEY (user_id)
            REFERENCES dbo.users (id) ON DELETE CASCADE,
        CONSTRAINT fk_user_inventory_item FOREIGN KEY (item_id)
            REFERENCES dbo.pet_shop_items (id) ON DELETE CASCADE,
        CONSTRAINT uq_user_inventory UNIQUE (user_id, item_id),
        CONSTRAINT ck_user_inventory_qty CHECK (quantity >= 0)
    );

    CREATE INDEX ix_user_inventory_user ON dbo.user_inventory (user_id, is_equipped);
    PRINT N'Đã tạo bảng user_inventory.';
END
GO

IF OBJECT_ID(N'dbo.pet_coin_history', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.pet_coin_history (
        id            INT           IDENTITY(1, 1) NOT NULL,
        user_id       INT           NOT NULL,
        amount        INT           NOT NULL,
        balance_after INT           NOT NULL,
        reason        NVARCHAR(100) NOT NULL,
        item_id       VARCHAR(50)   NULL,
        created_at    DATETIME2(0)  NOT NULL CONSTRAINT df_coin_history_created DEFAULT SYSDATETIME(),

        CONSTRAINT pk_pet_coin_history PRIMARY KEY (id),
        CONSTRAINT fk_coin_history_user FOREIGN KEY (user_id)
            REFERENCES dbo.users (id) ON DELETE CASCADE,
        CONSTRAINT fk_coin_history_item FOREIGN KEY (item_id)
            REFERENCES dbo.pet_shop_items (id),
        CONSTRAINT ck_coin_history_balance CHECK (balance_after >= 0)
    );

    CREATE INDEX ix_coin_history_user ON dbo.pet_coin_history (user_id, created_at DESC);
    PRINT N'Đã tạo bảng pet_coin_history.';
END
GO

-- Nạp sẵn các vật phẩm mẫu ban đầu vào pet_shop_items
IF NOT EXISTS (SELECT 1 FROM dbo.pet_shop_items WHERE id = 'hat_grad')
BEGIN
    INSERT INTO dbo.pet_shop_items (id, name, slot, price_coins, rarity, required_level, description, effect_data)
    VALUES
    -- Đầu (Headwear)
    ('hat_grad', N'Mũ tốt nghiệp cử nhân', 'head', 50, 'common', 1, N'Mũ tốt nghiệp biểu tượng của tri thức đại học', N'{"icon":"🎓"}'),
    ('hat_crown', N'Vương miện hoàng gia', 'head', 150, 'legendary', 5, N'Dành cho chiến thần quản lý tài chính thượng lưu', N'{"icon":"👑"}'),
    ('hat_sprout', N'Mầm cây ăn đất', 'head', 30, 'common', 1, N'Hưởng ứng truyền thống sinh viên mọc mầm cuối tháng', N'{"icon":"🌱"}'),
    ('hat_cat', N'Tai mèo đáng yêu', 'head', 60, 'rare', 2, N'Tai mèo vểnh tinh nghịch tạo nét dễ thương', N'{"icon":"🐱"}'),
    ('hat_ribbon', N'Nơ hồng xinh xắn', 'head', 40, 'common', 1, N'Nơ thắt điệu đà trang nhã', N'{"icon":"🎀"}'),

    -- Mắt & Mặt (Face)
    ('face_pixel', N'Kính râm Deal with it', 'face', 80, 'epic', 3, N'Kính đen pixel cực ngầu thể hiện bản lĩnh kiềm chế chi tiêu', N'{"icon":"🕶️"}'),
    ('face_glasses', N'Kính cận tri thức', 'face', 40, 'common', 1, N'Kính cận tròn dành cho chuyên gia kế toán sinh viên', N'{"icon":"👓"}'),
    ('face_sleep', N'Mặt nạ ngủ êm ái', 'face', 50, 'common', 2, N'Ngủ ngon không lo nghĩ về các khoản chi tiêu quá tay', N'{"icon":"😴"}'),
    ('face_patch', N'Miếng dán cá nhân', 'face', 35, 'common', 1, N'Chiến tích vượt qua những ngày thâm hụt ví tiền', N'{"icon":"🩹"}'),

    -- Biểu tượng trán (Emblem)
    ('emblem_coin', N'Đồng xu truyền thống', 'emblem', 0, 'common', 1, N'Biểu tượng đồng tiền Việt Nam chữ đ mặc định', N'{"icon":"🪙"}'),
    ('emblem_flame', N'Ngọn lửa chuỗi ngày', 'emblem', 100, 'epic', 4, N'Bùng cháy ngọn lửa kiên trì ghi chép liên tiếp', N'{"icon":"🔥"}'),
    ('emblem_diamond', N'Kim cương tài chính', 'emblem', 200, 'legendary', 7, N'Biểu tượng đỉnh cao của sự vững vàng kinh tế', N'{"icon":"💎"}'),
    ('emblem_lightning', N'Tia sét năng lượng', 'emblem', 80, 'rare', 3, N'Nạp đầy năng lượng quản lý chi tiêu tích cực', N'{"icon":"⚡"}'),

    -- Tay / Lơ lửng bên hông (Held / Floating)
    ('held_boba', N'Trà sữa full topping', 'held', 45, 'common', 1, N'Cốc trà sữa ngọt ngào phần thưởng tự thưởng bản thân', N'{"icon":"🧋"}'),
    ('held_calculator', N'Máy tính bỏ túi kế toán', 'held', 50, 'common', 2, N'Tính toán từng đồng chi li không bao giờ thất thoát', N'{"icon":"🮮"}'),
    ('held_noddles', N'Cốc mì tôm cứu đói', 'held', 25, 'common', 1, N'Món ăn kinh điển đồng hành qua những mùa thi', N'{"icon":"🍜"}'),
    ('held_card', N'Thẻ ngân hàng VIP đen', 'held', 120, 'epic', 5, N'Thẻ tín dụng hạng thương gia quyền lực', N'{"icon":"💳"}'),

    -- Phông nền & Đế đứng (Background & Pedestal)
    ('bg_dorm', N'Phòng trọ sinh viên', 'bg', 0, 'common', 1, N'Căn phòng trọ thân thương gắn liền kỷ niệm sinh viên', N'{"icon":"🏠"}'),
    ('bg_cafe', N'Quán cafe học bài chill', 'bg', 80, 'rare', 2, N'Không gian cafe nhẹ nhàng ấm cúng đầy cảm hứng', N'{"icon":"☕"}'),
    ('bg_beach', N'Bãi biển nghỉ dưỡng', 'bg', 120, 'epic', 4, N'Kỳ nghỉ hè xứng đáng sau những tháng ngày tiết kiệm', N'{"icon":"🏖️"}'),
    ('bg_vault', N'Két sắt kho vàng', 'bg', 180, 'legendary', 6, N'Hầm chứa két sắt tiền vàng đầy ắp thịnh vượng', N'{"icon":"🏦"}'),
    ('ped_cloud', N'Đám mây bồng bềnh', 'pedestal', 40, 'common', 1, N'Linh thú lướt trên đám mây trắng phao thảnh thơi nhẹ nhõm', N'{"icon":"☁️"}'),
    ('ped_books', N'Chồng sách tri thức', 'pedestal', 50, 'common', 1, N'Bục sách giáo trình đại học nâng tầm tri thức sinh viên', N'{"icon":"📚"}'),
    ('ped_ice', N'Tảng băng pha lê', 'pedestal', 60, 'rare', 2, N'Đóng băng các khoản chi bốc đồng để bảo toàn số dư ví', N'{"icon":"🧊"}'),
    ('ped_redcarpet', N'Thảm đỏ vinh danh', 'pedestal', 70, 'rare', 2, N'Thảm đỏ sang trọng nâng tầm vị thế linh thú', N'{"icon":"🟥"}'),
    ('ped_lotus', N'Đài sen thanh tịnh', 'pedestal', 85, 'rare', 2, N'Tâm bất biến giữa dòng đời biến động giá cả thị trường', N'{"icon":"🪷"}'),
    ('ped_coins', N'Đống tiền vàng may mắn', 'pedestal', 90, 'epic', 3, N'Lót chân bằng đống tiền xu vàng óng ánh', N'{"icon":"💰"}'),
    ('ped_cyber', N'Đĩa bay Cyber Neon', 'pedestal', 130, 'epic', 4, N'Đĩa năng lượng tương lai phát sáng xanh neon lơ lửng', N'{"icon":"🛸"}'),
    ('ped_gold_throne', N'Ngai vàng đại gia', 'pedestal', 200, 'legendary', 6, N'Bệ ngai vàng rực rỡ tượng trưng đỉnh cao chiến thần tiết kiệm', N'{"icon":"👑"}'),
    ('ped_mushroom', N'Nấm thần kỳ', 'pedestal', 55, 'common', 1, N'Cây nấm đỏ chấm trắng cổ tích nâng linh thú bay bổng trí tưởng tượng', N'{"icon":"🍄"}'),
    ('ped_star', N'Ngôi sao vàng may mắn', 'pedestal', 75, 'rare', 2, N'Ngôi sao năm cánh vàng kim lấp lánh dành cho ngôi sao tiết kiệm', N'{"icon":"⭐"}'),
    ('ped_donut', N'Donut phủ kem nhiều màu', 'pedestal', 65, 'rare', 2, N'Bệ donut hồng phủ kem rắc hạt sặc sỡ ngọt ngào dễ thương', N'{"icon":"🍩"}'),
    ('ped_pizza', N'Miếng pizza phô mai', 'pedestal', 45, 'common', 1, N'Miếng pizza nóng hổi phô mai kéo sợi đứng lên là chiến đấu', N'{"icon":"🍕"}'),

    -- Hào quang (Aura)
    ('aura_sakura', N'Hào quang Anh Đào Thần Thoại', 'aura', 95, 'rare', 2, N'Vầng sáng hồng pastel dịu êm với cánh hoa anh đào bay lượn theo làn gió', N'{"icon":"🌸"}'),
    ('aura_flame', N'Hào quang Lửa Rực Cháy', 'aura', 120, 'epic', 3, N'Ngọn lửa năng lượng vàng cam bốc lên hừng hực cùng tàn lửa bay lượn', N'{"icon":"🔥"}'),
    ('aura_frost', N'Hào quang Cực Quang Băng Tuyết', 'aura', 135, 'epic', 4, N'Dải sáng cực quang xanh tuyết trắng lung linh với hoa tuyết xoay tròn', N'{"icon":"❄️"}'),
    ('aura_cyber', N'Hào quang Cyber Neon', 'aura', 140, 'epic', 4, N'Vòng năng lượng phát sáng xanh Cyan & tím Magenta điện tử công nghệ cao', N'{"icon":"⚡"}'),
    ('aura_galaxy', N'Hào quang Ngân Hà Tinh Vân', 'aura', 210, 'legendary', 6, N'Vòng xoáy vũ trụ tím khói huyền ảo với các hành tinh nhỏ xoay quanh quỹ đạo', N'{"icon":"🌌"}'),
    ('aura_gold', N'Hào quang Kim Quang Chí Tôn', 'aura', 250, 'legendary', 7, N'Tia sáng mặt trời vàng kim thần thánh chiếu tỏa hào quang chói lọi', N'{"icon":"👑"}'),

    -- Màu da / Skin
    ('skin_piggy', N'Skin Heo đất vàng', 'skin', 100, 'rare', 3, N'Chuyển đổi toàn thân linh thú sang màu vàng kim heo đất', N'{"icon":"🐷"}'),
    ('skin_cyber', N'Skin Cyberpunk Neon', 'skin', 150, 'epic', 5, N'Phong cách tương lai với ánh sáng neon tím xanh', N'{"icon":"🤖"}'),
    ('skin_ghost', N'Skin Bóng ma cháy túi', 'skin', 120, 'rare', 2, N'Linh thú hóa bóng ma trắng trong suốt lơ lửng khi hết tiền', N'{"icon":"👻"}'),

    -- Vật phẩm chức năng & Tiêu hao (Utility & Consumable)
    ('util_streak_freeze', N'Bùa Hộ Mệnh đóng băng chuỗi', 'utility', 60, 'epic', 1, N'Tự động kích hoạt cứu chuỗi ngày nếu lỡ quên ghi 1 hôm', N'{"type":"streak_freeze","stackable":true}'),
    ('food_noddles_dragon', N'Mì tôm thanh long', 'consumable', 15, 'common', 1, N'Đặc sản cứu đói tăng 30 điểm no bụng cho linh thú', N'{"fullness":30}'),
    ('food_wagyu', N'Bò dát vàng hoàng gia', 'consumable', 100, 'legendary', 3, N'Bữa tiệc thượng hạng hồi phục 100 điểm no bụng và tỏa sáng', N'{"fullness":100}'),
    ('util_coffee', N'Cà phê sinh viên tăng EXP', 'consumable', 40, 'rare', 1, N'Tăng gấp đôi tốc độ thăng cấp thú cưng trong 24 giờ', N'{"exp_boost":2}'),
    ('util_gacha_box', N'Rương Bí Ẩn may mắn', 'utility', 50, 'rare', 1, N'Mở ngẫu nhiên nhận phụ kiện hiếm hoặc lượng xu bất ngờ', N'{"type":"gacha"}');
    PRINT N'Đã nạp danh mục vật phẩm mẫu vào pet_shop_items.';
END
GO

PRINT N'Mở rộng bảng hoàn tất.';
GO


GO

-- =========================================================================
-- NGUON: database/mo_rong/mo_rong_thu_tuc.sql
-- =========================================================================

/* =============================================================================
   Thủ tục mở rộng cho bản thử nghiệm.
   Giữ nguyên các thủ tục gốc trong procedures.sql; thủ tục mới có hậu tố _ex
   khi chúng là bản nâng cấp của thủ tục gốc (thêm giờ, nguồn nhập, liên kết bill).
   ============================================================================= */
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* -----------------------------------------------------------------------------
   0. Đọc một giao dịch (dùng lại sau khi thêm)
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_get_transaction_ex
    @user_id INT,
    @id      INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT t.id,
           t.category_id,
           c.type,
           c.name  AS category_name,
           c.icon  AS category_icon,
           c.color AS category_color,
           t.amount,
           t.note,
           CONVERT(VARCHAR(10), t.transaction_date, 23) AS transaction_date,
           CONVERT(VARCHAR(5), t.transaction_time, 108) AS transaction_time,
           t.source,
           CONVERT(VARCHAR(19), t.created_at, 120) AS created_at
    FROM dbo.transactions AS t
    JOIN dbo.categories   AS c ON c.id = t.category_id
    WHERE t.id = @id AND t.user_id = @user_id;
END
GO

/* -----------------------------------------------------------------------------
   1. Thêm giao dịch có giờ, nguồn nhập và (tùy chọn) gắn với lần quét bill
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_add_transaction_ex
    @user_id          INT,
    @category_id      INT,
    @amount           DECIMAL(15, 2),
    @note             NVARCHAR(500) = NULL,
    @transaction_date DATE,
    @transaction_time TIME(0)       = NULL,
    @source           VARCHAR(10)   = 'manual',
    @scan_id          INT           = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE id = @user_id)
        THROW 50001, N'Người dùng không tồn tại.', 1;

    IF @amount IS NULL OR @amount <= 0
        THROW 50002, N'Số tiền phải lớn hơn 0.', 1;

    IF @transaction_date IS NULL
        THROW 50004, N'Ngày giao dịch không được để trống.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.categories
        WHERE id = @category_id AND (user_id IS NULL OR user_id = @user_id)
    )
        THROW 50003, N'Danh mục không tồn tại hoặc không thuộc người dùng.', 1;

    IF @scan_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM dbo.receipt_scans
        WHERE id = @scan_id AND user_id = @user_id AND transaction_id IS NULL
    )
        THROW 50020, N'Lần quét không tồn tại hoặc đã được ghi thành giao dịch.', 1;

    DECLARE @new TABLE (id INT);

    BEGIN TRANSACTION;

    INSERT INTO dbo.transactions (user_id, category_id, amount, note, transaction_date, transaction_time, source)
    OUTPUT inserted.id INTO @new (id)
    VALUES (@user_id, @category_id, @amount, NULLIF(LTRIM(RTRIM(@note)), N''),
            @transaction_date, @transaction_time, COALESCE(@source, 'manual'));

    IF @scan_id IS NOT NULL
        UPDATE dbo.receipt_scans
        SET transaction_id = (SELECT id FROM @new)
        WHERE id = @scan_id;

    COMMIT;

    DECLARE @new_id INT = (SELECT id FROM @new);
    EXEC dbo.sp_get_transaction_ex @user_id = @user_id, @id = @new_id;
END
GO

/* -----------------------------------------------------------------------------
   2. Lấy giao dịch (dùng chung cho danh sách và cho kết quả sau khi thêm)
      Bộ lọc không bắt buộc: khoảng ngày, loại, danh mục, từ khóa ghi chú.
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_get_transactions_ex
    @user_id     INT,
    @from_date   DATE          = NULL,
    @to_date     DATE          = NULL,
    @type        VARCHAR(10)   = NULL,
    @category_id INT           = NULL,
    @keyword     NVARCHAR(100) = NULL,
    @limit       INT           = 200
AS
BEGIN
    SET NOCOUNT ON;

    IF @from_date IS NOT NULL AND @to_date IS NOT NULL AND @from_date > @to_date
        THROW 50008, N'Khoảng ngày không hợp lệ (from_date > to_date).', 1;

    IF @type IS NOT NULL AND @type NOT IN ('income', 'expense')
        THROW 50005, N'Loại danh mục không hợp lệ (chỉ nhận income/expense).', 1;

    SELECT TOP (CASE WHEN @limit BETWEEN 1 AND 1000 THEN @limit ELSE 200 END)
           t.id,
           t.category_id,
           c.type,
           c.name  AS category_name,
           c.icon  AS category_icon,
           c.color AS category_color,
           t.amount,
           t.note,
           CONVERT(VARCHAR(10), t.transaction_date, 23) AS transaction_date,
           CONVERT(VARCHAR(5), t.transaction_time, 108) AS transaction_time,
           t.source,
           CONVERT(VARCHAR(19), t.created_at, 120) AS created_at
    FROM dbo.transactions AS t
    JOIN dbo.categories   AS c ON c.id = t.category_id
    WHERE t.user_id = @user_id
      AND (@from_date   IS NULL OR t.transaction_date >= @from_date)
      AND (@to_date     IS NULL OR t.transaction_date <= @to_date)
      AND (@type        IS NULL OR c.type = @type)
      AND (@category_id IS NULL OR t.category_id = @category_id)
      AND (@keyword     IS NULL OR t.note LIKE N'%' + @keyword + N'%' OR c.name LIKE N'%' + @keyword + N'%')
    ORDER BY t.transaction_date DESC, t.transaction_time DESC, t.id DESC;
END
GO

/* -----------------------------------------------------------------------------
   3. Xóa giao dịch: gỡ liên kết ở các bảng tham chiếu rồi mới xóa.
      Lần quét bill gắn với giao dịch cũng bị xóa, để người dùng có thể
      quét lại đúng bill đó mà không bị báo trùng.
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_delete_transaction
    @user_id INT,
    @id      INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.transactions WHERE id = @id AND user_id = @user_id)
        THROW 50021, N'Không tìm thấy giao dịch.', 1;

    BEGIN TRANSACTION;
    DELETE FROM dbo.receipt_scans WHERE transaction_id = @id AND user_id = @user_id;
    UPDATE dbo.split_bills   SET transaction_id = NULL WHERE transaction_id = @id;
    UPDATE dbo.wallet_checks SET transaction_id = NULL WHERE transaction_id = @id;
    DELETE FROM dbo.transactions WHERE id = @id AND user_id = @user_id;
    COMMIT;

    SELECT @id AS deleted_id;
END
GO

/* -----------------------------------------------------------------------------
   4. Tổng hợp một ngày: dùng cho Mini-View (đã chi hôm nay) và lời nhắc buổi tối
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_get_day_summary
    @user_id INT,
    @day     DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT CONVERT(VARCHAR(10), @day, 23) AS day,
           CAST(COALESCE(SUM(CASE WHEN c.type = 'expense' THEN t.amount END), 0) AS DECIMAL(15, 2)) AS spent,
           CAST(COALESCE(SUM(CASE WHEN c.type = 'income'  THEN t.amount END), 0) AS DECIMAL(15, 2)) AS received,
           COUNT(t.id) AS transaction_count,
           CAST(CASE WHEN EXISTS (
               SELECT 1 FROM dbo.day_marks
               WHERE user_id = @user_id AND mark_date = @day AND kind = 'no_spend'
           ) THEN 1 ELSE 0 END AS BIT) AS marked_no_spend
    FROM dbo.transactions AS t
    JOIN dbo.categories   AS c ON c.id = t.category_id
    WHERE t.user_id = @user_id AND t.transaction_date = @day;
END
GO

/* -----------------------------------------------------------------------------
   5. Gợi ý 1 chạm theo thói quen
      Khoản lặp lại >= 3 lần trong 30 ngày (cùng danh mục, số tiền, ghi chú),
      giờ trung bình gần giờ hiện tại (±90 phút) và hôm nay chưa ghi.
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_get_habit_suggestions
    @user_id  INT,
    @today    DATE,
    @now_time TIME(0),
    @window   INT = 90
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @now_min INT = DATEDIFF(MINUTE, CAST('00:00' AS TIME(0)), @now_time);

    WITH history AS (
        SELECT t.category_id,
               t.amount,
               LOWER(LTRIM(RTRIM(ISNULL(t.note, N'')))) AS note_key,
               t.note,
               DATEDIFF(MINUTE, CAST('00:00' AS TIME(0)), t.transaction_time) AS minute_of_day,
               t.transaction_date
        FROM dbo.transactions AS t
        WHERE t.user_id = @user_id
          AND t.transaction_date >= DATEADD(DAY, -30, @today)
          AND t.transaction_date < @today
          AND t.transaction_time IS NOT NULL
    ),
    habits AS (
        SELECT category_id,
               amount,
               note_key,
               COUNT(DISTINCT transaction_date) AS days_used,
               AVG(minute_of_day) AS avg_minute
        FROM history
        GROUP BY category_id, amount, note_key
        HAVING COUNT(DISTINCT transaction_date) >= 3
    )
    SELECT TOP (4)
           h.category_id,
           c.name AS category_name,
           c.icon AS category_icon,
           c.color AS category_color,
           c.type,
           h.amount,
           latest.note,
           h.days_used,
           CONCAT(RIGHT('0' + CAST(h.avg_minute / 60 AS VARCHAR(2)), 2), ':',
                  RIGHT('0' + CAST(h.avg_minute % 60 AS VARCHAR(2)), 2)) AS usual_time
    FROM habits AS h
    JOIN dbo.categories AS c ON c.id = h.category_id
    CROSS APPLY (
        -- Hiển thị ghi chú đúng như lần gần nhất người dùng gõ
        SELECT TOP (1) LTRIM(RTRIM(x.note)) AS note
        FROM history AS x
        WHERE x.category_id = h.category_id AND x.amount = h.amount AND x.note_key = h.note_key
        ORDER BY x.transaction_date DESC
    ) AS latest
    WHERE ABS(h.avg_minute - @now_min) <= @window
      AND NOT EXISTS (
          SELECT 1 FROM dbo.transactions AS t
          WHERE t.user_id = @user_id
            AND t.transaction_date = @today
            AND t.category_id = h.category_id
            AND t.amount = h.amount
            AND LOWER(LTRIM(RTRIM(ISNULL(t.note, N'')))) = h.note_key
      )
    ORDER BY h.days_used DESC, ABS(h.avg_minute - @now_min);
END
GO

/* -----------------------------------------------------------------------------
   6. Tìm lần quét đã ghi trùng với lần quét mới
      Thứ tự ưu tiên: trùng file > ảnh giống (dHash, khoảng cách Hamming <= 6)
      > trùng nội dung (số tiền + thời điểm + mã GD).
      dHash 64 bit lưu dạng 16 ký tự hex; so sánh bằng BIGINT XOR.
   ----------------------------------------------------------------------------- */
CREATE OR ALTER FUNCTION dbo.fn_hamming64 (@a BIGINT, @b BIGINT)
RETURNS INT
WITH SCHEMABINDING
AS
BEGIN
    DECLARE @x BIGINT = @a ^ @b, @count INT = 0;
    -- Bit dấu xử lý riêng vì BIGINT có dấu
    IF @x < 0
    BEGIN
        SET @count = 1;
        SET @x = @x & 0x7FFFFFFFFFFFFFFF;
    END
    WHILE @x <> 0
    BEGIN
        SET @x = @x & (@x - 1);
        SET @count += 1;
    END
    RETURN @count;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_find_duplicate_scans
    @user_id     INT,
    @file_sha256 CHAR(64) = NULL,
    @image_dhash CHAR(16) = NULL,
    @content_key CHAR(64) = NULL,
    @exclude_id  INT      = NULL,
    @amount      DECIMAL(15, 2) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @dhash_value BIGINT = CASE WHEN @image_dhash IS NULL THEN NULL
                                       ELSE CONVERT(BIGINT, CONVERT(BINARY(8), @image_dhash, 2)) END;

    -- Ảnh chụp màn hình cùng một ứng dụng ngân hàng có bố cục giống nhau nên dHash rất gần nhau.
    -- Vì vậy "ảnh giống" chỉ tính là trùng khi số tiền đọc được cũng bằng nhau.
    SELECT TOP (3) d.*
    FROM (
        SELECT s.id AS scan_id,
               s.transaction_id,
               CASE
                   WHEN @file_sha256 IS NOT NULL AND s.file_sha256 = @file_sha256 THEN 'same_file'
                   WHEN @content_key IS NOT NULL AND s.content_key = @content_key THEN 'same_content'
                   WHEN @dhash_value IS NOT NULL AND s.image_dhash IS NOT NULL AND @amount IS NOT NULL
                        AND s.amount = @amount
                        AND dbo.fn_hamming64(@dhash_value, CONVERT(BIGINT, CONVERT(BINARY(8), s.image_dhash, 2))) <= 6
                        THEN 'similar_image'
               END AS match_kind,
               s.doc_kind,
               s.amount,
               CONVERT(VARCHAR(16), s.occurred_at, 120) AS occurred_at,
               CONVERT(VARCHAR(19), s.created_at, 120) AS scanned_at,
               t.note,
               CONVERT(VARCHAR(10), t.transaction_date, 23) AS transaction_date
        FROM dbo.receipt_scans AS s
        JOIN dbo.transactions AS t ON t.id = s.transaction_id
        WHERE s.user_id = @user_id
          AND s.transaction_id IS NOT NULL
          AND (@exclude_id IS NULL OR s.id <> @exclude_id)
    ) AS d
    WHERE d.match_kind IS NOT NULL
    ORDER BY CASE d.match_kind WHEN 'same_file' THEN 1 WHEN 'same_content' THEN 2 ELSE 3 END,
             d.scan_id DESC;
END
GO

/* -----------------------------------------------------------------------------
   7. Chia tiền nhóm: phần của mình luôn ghi thành khoản chi (mình đã ăn/dùng phần đó),
      phần còn lại thành nợ.
      @people_json: ["Nam","Hùng"] (tên những người còn lại, giữ thứ tự nhập).
      Số người = số tên + 1 (mình). Chia đều, phần lẻ do mình chịu.
      @i_paid = 1: mình trả cả hóa đơn -> mỗi người còn lại nợ mình một phần.
      @i_paid = 0: @payer_name trả (bỏ trống thì lấy tên đầu tiên) -> mình nợ người đó phần của mình.
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_create_split_bill
    @user_id          INT,
    @title            NVARCHAR(200),
    @total_amount     DECIMAL(15, 2),
    @people_json      NVARCHAR(MAX),
    @category_id      INT,
    @transaction_date DATE,
    @transaction_time TIME(0)      = NULL,
    @i_paid           BIT          = 1,
    @payer_name       NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF ISJSON(@people_json) <> 1
        THROW 50030, N'Danh sách người chia không hợp lệ.', 1;

    DECLARE @people TABLE (name NVARCHAR(50) PRIMARY KEY, ord INT NOT NULL);
    INSERT INTO @people (name, ord)
    SELECT name, MIN(ord)
    FROM (
        SELECT LEFT(LTRIM(RTRIM(value)), 50) AS name, CAST([key] AS INT) AS ord
        FROM OPENJSON(@people_json)
        WHERE type = 1 AND LEN(LTRIM(RTRIM(value))) > 0
    ) AS p
    GROUP BY name;

    DECLARE @others INT = (SELECT COUNT(*) FROM @people);
    IF @others < 1
        THROW 50031, N'Cần ít nhất 1 người để chia.', 1;
    IF @others > 49
        THROW 50030, N'Chia tối đa 50 người.', 1;

    IF @total_amount IS NULL OR @total_amount <= 0
        THROW 50002, N'Số tiền phải lớn hơn 0.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.categories
        WHERE id = @category_id AND type = 'expense' AND (user_id IS NULL OR user_id = @user_id)
    )
        THROW 50003, N'Danh mục chi tiêu không hợp lệ.', 1;

    IF LEN(LTRIM(RTRIM(ISNULL(@title, N'')))) = 0
        SET @title = N'Chia tiền';

    DECLARE @payer NVARCHAR(50) = NULL;
    IF @i_paid = 0
    BEGIN
        SET @payer = LTRIM(RTRIM(@payer_name));
        IF @payer IS NULL OR @payer = N''
            SET @payer = (SELECT TOP (1) name FROM @people ORDER BY ord);
        ELSE IF NOT EXISTS (SELECT 1 FROM @people WHERE name = @payer)
            THROW 50032, N'Người trả tiền phải nằm trong danh sách chia.', 1;
    END

    DECLARE @count INT = @others + 1;
    DECLARE @share DECIMAL(15, 2) = FLOOR(@total_amount / @count);
    DECLARE @my_share DECIMAL(15, 2) = @total_amount - @share * @others;

    DECLARE @split_id INT, @tx_id INT;
    DECLARE @new TABLE (id INT);

    BEGIN TRANSACTION;

    INSERT INTO dbo.split_bills (user_id, title, total_amount, people_count, my_share)
    VALUES (@user_id, @title, @total_amount, @count, @my_share);
    SET @split_id = SCOPE_IDENTITY();

    INSERT INTO dbo.transactions (user_id, category_id, amount, note, transaction_date, transaction_time, source)
    OUTPUT inserted.id INTO @new (id)
    VALUES (@user_id, @category_id, @my_share,
            LEFT(CONCAT(@title, N' (phần của mình, chia ', @count, N' người)'), 500),
            @transaction_date, @transaction_time, 'split');
    SET @tx_id = (SELECT id FROM @new);
    UPDATE dbo.split_bills SET transaction_id = @tx_id WHERE id = @split_id;

    IF @i_paid = 1
        INSERT INTO dbo.debts (user_id, person_name, direction, amount, note, split_id)
        SELECT @user_id, name, 'owed_to_me', @share, LEFT(@title, 200), @split_id FROM @people;
    ELSE
        INSERT INTO dbo.debts (user_id, person_name, direction, amount, note, split_id)
        VALUES (@user_id, @payer, 'i_owe', @my_share, LEFT(@title, 200), @split_id);

    COMMIT;

    SELECT @split_id AS split_id, @tx_id AS transaction_id, @count AS people_count,
           @share AS share_each, @my_share AS my_share, @payer AS payer_name;
END
GO

/* -----------------------------------------------------------------------------
   8. Sổ nợ: tổng hợp theo từng người (chỉ khoản chưa trả)
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_get_debt_summary
    @user_id INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT person_name,
           CAST(SUM(CASE WHEN direction = 'owed_to_me' THEN amount ELSE -amount END) AS DECIMAL(15, 2)) AS net_amount,
           COUNT(*) AS open_count
    FROM dbo.debts
    WHERE user_id = @user_id AND settled_at IS NULL
    GROUP BY person_name
    ORDER BY ABS(SUM(CASE WHEN direction = 'owed_to_me' THEN amount ELSE -amount END)) DESC;
END
GO

/* -----------------------------------------------------------------------------
   8b. Xóa một lần chia tiền (nhập nhầm): xóa các khoản nợ, khoản chi phần của mình và bản ghi chia.
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_delete_split_bill
    @user_id INT,
    @id      INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @tx_id INT;
    SELECT @tx_id = transaction_id FROM dbo.split_bills WHERE id = @id AND user_id = @user_id;
    IF @@ROWCOUNT = 0
        THROW 50033, N'Không tìm thấy lần chia tiền này.', 1;

    BEGIN TRANSACTION;
    DELETE FROM dbo.debts WHERE split_id = @id AND user_id = @user_id;
    DELETE FROM dbo.split_bills WHERE id = @id AND user_id = @user_id;
    IF @tx_id IS NOT NULL
        DELETE FROM dbo.transactions WHERE id = @tx_id AND user_id = @user_id;
    COMMIT;

    SELECT @id AS deleted_id, @tx_id AS deleted_transaction_id;
END
GO

/* -----------------------------------------------------------------------------
   9. Đối soát ví: so số tiền thật với số tiền lẽ ra phải có.
      Lẽ ra có = số dư trên sổ - nợ người khác chưa trả mình + mình còn nợ người khác
      (trả hộ bạn thì tiền đã ra khỏi ví nhưng chưa phải khoản chi của mình; vay bạn thì ngược lại).
      @record = 1: ghi luôn khoản chênh lệch thành giao dịch
      (thiếu tiền -> khoản chi "Chi không nhớ", dư tiền -> khoản thu)
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_wallet_check
    @user_id          INT,
    @actual_balance   DECIMAL(15, 2),
    @record           BIT     = 0,
    @transaction_date DATE,
    @transaction_time TIME(0) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @actual_balance IS NULL OR @actual_balance < 0
        THROW 50040, N'Số tiền thực tế không hợp lệ.', 1;

    DECLARE @book DECIMAL(15, 2) = (
        SELECT COALESCE(SUM(CASE WHEN c.type = 'income' THEN t.amount ELSE -t.amount END), 0)
        FROM dbo.transactions AS t
        JOIN dbo.categories   AS c ON c.id = t.category_id
        WHERE t.user_id = @user_id
    );
    DECLARE @owed_to_me DECIMAL(15, 2), @i_owe DECIMAL(15, 2);
    SELECT @owed_to_me = COALESCE(SUM(CASE WHEN direction = 'owed_to_me' THEN amount END), 0),
           @i_owe      = COALESCE(SUM(CASE WHEN direction = 'i_owe' THEN amount END), 0)
    FROM dbo.debts
    WHERE user_id = @user_id AND settled_at IS NULL;

    DECLARE @expected DECIMAL(15, 2) = @book - @owed_to_me + @i_owe;
    DECLARE @diff DECIMAL(15, 2) = @expected - @actual_balance;
    DECLARE @check_id INT, @tx_id INT;
    DECLARE @new TABLE (id INT);

    BEGIN TRANSACTION;

    INSERT INTO dbo.wallet_checks (user_id, actual_balance, book_balance)
    VALUES (@user_id, @actual_balance, @expected);
    SET @check_id = SCOPE_IDENTITY();

    IF @record = 1 AND @diff <> 0
    BEGIN
        -- 9 = Khoản chi khác, 13 = Thu nhập khác (danh mục mặc định)
        INSERT INTO dbo.transactions (user_id, category_id, amount, note, transaction_date, transaction_time, source)
        OUTPUT inserted.id INTO @new (id)
        VALUES (@user_id,
                CASE WHEN @diff > 0 THEN 9 ELSE 13 END,
                ABS(@diff),
                CASE WHEN @diff > 0 THEN N'Chi không nhớ (đối soát ví)' ELSE N'Tiền dư chưa ghi (đối soát ví)' END,
                @transaction_date, @transaction_time, 'reconcile');
        SET @tx_id = (SELECT id FROM @new);
        UPDATE dbo.wallet_checks SET transaction_id = @tx_id WHERE id = @check_id;
    END

    COMMIT;

    SELECT @check_id AS check_id, @expected AS book_balance, @actual_balance AS actual_balance,
           @diff AS difference, @tx_id AS transaction_id,
           @book AS ledger_balance, @owed_to_me AS owed_to_me, @i_owe AS i_owe;
END
GO

/* -----------------------------------------------------------------------------
   10. Dọn tài khoản dùng thử đã hết hạn (xóa user -> dữ liệu con tự xóa theo)
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_cleanup_demo_users
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.users WHERE is_demo = 1 AND demo_expires_at < SYSDATETIME();
    SELECT @@ROWCOUNT AS deleted_count;
END
GO

/* -----------------------------------------------------------------------------
   11. Thống kê khảo sát: mỗi chức năng bao nhiêu người thích / chưa thích
   ----------------------------------------------------------------------------- */
CREATE OR ALTER VIEW dbo.vw_survey_summary
AS
SELECT j.[key] AS feature,
       SUM(CASE WHEN j.value = 'like' THEN 1 ELSE 0 END)    AS like_count,
       SUM(CASE WHEN j.value = 'dislike' THEN 1 ELSE 0 END) AS dislike_count,
       SUM(CASE WHEN j.value = 'unused' THEN 1 ELSE 0 END)  AS unused_count
FROM dbo.survey_responses AS r
CROSS APPLY OPENJSON(r.answers) AS j
GROUP BY j.[key];
GO

/* -----------------------------------------------------------------------------
   12. Ngân sách tháng và "Còn được tiêu hôm nay"
       Mức tiêu mỗi ngày = (ngân sách - đã chi trong tháng, trừ hôm nay) / số ngày còn lại (tính cả hôm nay).
       Hôm nay tiêu ít thì ngày mai được tiêu nhiều hơn và ngược lại.
       Khoản chi ghi trước cho ngày sau trong tháng cũng được trừ vào ngân sách.
       Tháng chưa đặt ngân sách thì dùng ngân sách của tháng gần nhất trước đó.
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_get_budget_status
    @user_id INT,
    @today   DATE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @month_start   DATE = DATEFROMPARTS(YEAR(@today), MONTH(@today), 1);
    DECLARE @month_end     DATE = EOMONTH(@today);
    DECLARE @days_in_month INT  = DAY(@month_end);
    DECLARE @days_left     INT  = DATEDIFF(DAY, @today, @month_end) + 1;
    DECLARE @budget DECIMAL(15, 2), @budget_month DATE;

    SELECT TOP (1) @budget = amount, @budget_month = month_start
    FROM dbo.budgets
    WHERE user_id = @user_id AND month_start <= @month_start
    ORDER BY month_start DESC;

    DECLARE @spent_month DECIMAL(15, 2), @spent_today DECIMAL(15, 2);
    SELECT @spent_month = COALESCE(SUM(t.amount), 0),
           @spent_today = COALESCE(SUM(CASE WHEN t.transaction_date = @today THEN t.amount END), 0)
    FROM dbo.transactions AS t
    JOIN dbo.categories   AS c ON c.id = t.category_id
    WHERE t.user_id = @user_id AND c.type = 'expense'
      AND t.transaction_date BETWEEN @month_start AND @month_end;

    DECLARE @allowance DECIMAL(15, 2) =
        CASE WHEN @budget IS NULL THEN NULL
             WHEN @budget - (@spent_month - @spent_today) <= 0 THEN 0
             ELSE FLOOR((@budget - (@spent_month - @spent_today)) / @days_left) END;

    SELECT CONVERT(VARCHAR(10), @month_start, 23)  AS month_start,
           CONVERT(VARCHAR(10), @today, 23)        AS today,
           @days_in_month                          AS days_in_month,
           @days_left                              AS days_left,
           @budget                                 AS budget,
           CONVERT(VARCHAR(10), @budget_month, 23) AS budget_month,
           CAST(CASE WHEN @budget_month < @month_start THEN 1 ELSE 0 END AS BIT) AS is_inherited,
           @spent_month                            AS spent_month,
           @spent_today                            AS spent_today,
           CAST(@budget - @spent_month AS DECIMAL(15, 2))          AS remaining_month,
           CAST(FLOOR(@budget / @days_in_month) AS DECIMAL(15, 2)) AS planned_daily,
           @allowance                              AS daily_allowance,
           CAST(@allowance - @spent_today AS DECIMAL(15, 2))       AS left_today;
END
GO

/* -----------------------------------------------------------------------------
   13. Lịch nhiệt: tổng chi / thu từng ngày trong tháng, kể cả ngày không có giao dịch
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_get_month_calendar
    @user_id     INT,
    @month_start DATE
AS
BEGIN
    SET NOCOUNT ON;

    SET @month_start = DATEFROMPARTS(YEAR(@month_start), MONTH(@month_start), 1);
    DECLARE @month_end DATE = EOMONTH(@month_start);

    WITH days AS (
        SELECT TOP (DAY(@month_end))
               DATEADD(DAY, CAST(ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS INT) - 1, @month_start) AS d
        FROM sys.all_objects
    ),
    totals AS (
        SELECT t.transaction_date AS d,
               SUM(CASE WHEN c.type = 'expense' THEN t.amount ELSE 0 END) AS spent,
               SUM(CASE WHEN c.type = 'income'  THEN t.amount ELSE 0 END) AS received,
               COUNT(*) AS transaction_count
        FROM dbo.transactions AS t
        JOIN dbo.categories   AS c ON c.id = t.category_id
        WHERE t.user_id = @user_id AND t.transaction_date BETWEEN @month_start AND @month_end
        GROUP BY t.transaction_date
    )
    SELECT CONVERT(VARCHAR(10), days.d, 23) AS day,
           CAST(COALESCE(totals.spent, 0) AS DECIMAL(15, 2))    AS spent,
           CAST(COALESCE(totals.received, 0) AS DECIMAL(15, 2)) AS received,
           COALESCE(totals.transaction_count, 0)                AS transaction_count,
           CAST(CASE WHEN m.mark_date IS NULL THEN 0 ELSE 1 END AS BIT) AS no_spend
    FROM days
    LEFT JOIN totals ON totals.d = days.d
    LEFT JOIN dbo.day_marks AS m ON m.user_id = @user_id AND m.mark_date = days.d AND m.kind = 'no_spend'
    ORDER BY days.d;
END
GO

/* -----------------------------------------------------------------------------
   14. Chuỗi ngày ghi chép: ngày có giao dịch hoặc đã bấm "không tiêu gì" đều được tính.
       Chuỗi hiện tại vẫn còn nếu hôm qua có ghi mà hôm nay chưa ghi (còn cả ngày để ghi).
       Khoản ghi trước cho ngày sau hôm nay không được tính.
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_get_streak
    @user_id INT,
    @today   DATE
AS
BEGIN
    SET NOCOUNT ON;

    WITH recorded AS (
        SELECT transaction_date AS d FROM dbo.transactions
        WHERE user_id = @user_id AND transaction_date <= @today
        UNION
        SELECT mark_date FROM dbo.day_marks
        WHERE user_id = @user_id AND kind = 'no_spend' AND mark_date <= @today
    ),
    grouped AS (
        SELECT d, DATEADD(DAY, -CAST(ROW_NUMBER() OVER (ORDER BY d) AS INT), d) AS grp
        FROM recorded
    ),
    runs AS (
        SELECT MIN(d) AS start_d, MAX(d) AS end_d, COUNT(*) AS len
        FROM grouped
        GROUP BY grp
    )
    SELECT COALESCE(MAX(CASE WHEN end_d >= DATEADD(DAY, -1, @today) THEN len END), 0) AS current_streak,
           COALESCE(MAX(len), 0) AS best_streak,
           CAST(CASE WHEN MAX(end_d) = @today THEN 1 ELSE 0 END AS BIT) AS recorded_today,
           CONVERT(VARCHAR(10), MAX(end_d), 23) AS last_recorded_date,
           COALESCE(SUM(len), 0) AS recorded_days
    FROM runs;
END
GO

/* -----------------------------------------------------------------------------
   15. Danh mục theo ý người dùng: mặc định + của riêng họ, kèm cờ ẩn, thứ tự đã sắp
       và số khoản đã ghi ở từng danh mục (để màn Cài đặt hiện "12 khoản").
       Chưa sắp xếp bao giờ thì giữ thứ tự cũ: mặc định trước, cá nhân sau.
       @include_hidden = 0: bỏ danh mục đã ẩn (dùng cho ô chọn khi ghi khoản mới).
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_get_categories_view
    @user_id        INT,
    @type           VARCHAR(10) = NULL,
    @include_hidden BIT         = 0
AS
BEGIN
    SET NOCOUNT ON;

    IF @type IS NOT NULL AND @type NOT IN ('income', 'expense')
        THROW 50005, N'Loại danh mục không hợp lệ (chỉ nhận income/expense).', 1;

    WITH used AS (
        SELECT category_id, COUNT(*) AS used_count
        FROM dbo.transactions
        WHERE user_id = @user_id
        GROUP BY category_id
    )
    SELECT c.id, c.name, c.type, c.icon, c.color,
           CAST(CASE WHEN c.user_id IS NULL THEN 1 ELSE 0 END AS BIT) AS is_default,
           CAST(COALESCE(p.is_hidden, 0) AS BIT) AS is_hidden,
           CAST(ROW_NUMBER() OVER (
               PARTITION BY c.type
               ORDER BY CASE WHEN p.sort_order IS NULL THEN 1 ELSE 0 END, p.sort_order,
                        CASE WHEN c.user_id IS NULL THEN 0 ELSE 1 END, c.id) AS INT) AS position,
           COALESCE(u.used_count, 0) AS used_count
    FROM dbo.categories AS c
    LEFT JOIN dbo.user_category_prefs AS p ON p.category_id = c.id AND p.user_id = @user_id
    LEFT JOIN used AS u ON u.category_id = c.id
    WHERE (c.user_id IS NULL OR c.user_id = @user_id)
      AND (@type IS NULL OR c.type = @type)
      AND (@include_hidden = 1 OR COALESCE(p.is_hidden, 0) = 0)
    ORDER BY c.type, position;
END
GO

/* -----------------------------------------------------------------------------
   16. Sửa danh mục của riêng mình (tên, icon, màu).
       Danh mục mặc định dùng chung cho mọi người nên chỉ được ẩn, không được sửa.
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_update_category
    @user_id     INT,
    @category_id INT,
    @name        NVARCHAR(100),
    @icon        VARCHAR(50) = NULL,
    @color       VARCHAR(30) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @clean_name NVARCHAR(100) = LTRIM(RTRIM(@name));
    DECLARE @owner INT, @type VARCHAR(10), @found BIT = 0;

    SELECT @owner = user_id, @type = type, @found = 1
    FROM dbo.categories
    WHERE id = @category_id AND (user_id IS NULL OR user_id = @user_id);

    IF @found = 0
        THROW 50003, N'Danh mục không tồn tại.', 1;
    IF @owner IS NULL
        THROW 50050, N'Danh mục mặc định không sửa được, bạn có thể ẩn nó đi.', 1;
    IF @clean_name IS NULL OR @clean_name = N''
        THROW 50006, N'Tên danh mục không được để trống.', 1;
    IF EXISTS (
        SELECT 1 FROM dbo.categories
        WHERE type = @type AND name = @clean_name AND id <> @category_id
          AND (user_id IS NULL OR user_id = @user_id)
    )
        THROW 50007, N'Danh mục đã tồn tại.', 1;

    UPDATE dbo.categories
    SET name  = @clean_name,
        icon  = COALESCE(@icon, icon),
        color = COALESCE(@color, color)
    WHERE id = @category_id;

    SELECT id, name, type, icon, color, CAST(0 AS BIT) AS is_default
    FROM dbo.categories
    WHERE id = @category_id;
END
GO

/* -----------------------------------------------------------------------------
   17. Ẩn / hiện một danh mục. Mỗi loại (thu, chi) phải còn ít nhất một danh mục hiện,
       nếu không thì không ghi khoản mới được.
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_set_category_hidden
    @user_id     INT,
    @category_id INT,
    @hidden      BIT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @type VARCHAR(10);
    SELECT @type = type FROM dbo.categories
    WHERE id = @category_id AND (user_id IS NULL OR user_id = @user_id);
    IF @type IS NULL
        THROW 50003, N'Danh mục không tồn tại.', 1;

    BEGIN TRANSACTION;

    IF @hidden = 1 AND NOT EXISTS (
        SELECT 1
        FROM dbo.categories AS c
        LEFT JOIN dbo.user_category_prefs AS p WITH (UPDLOCK, HOLDLOCK)
               ON p.category_id = c.id AND p.user_id = @user_id
        WHERE c.type = @type AND c.id <> @category_id
          AND (c.user_id IS NULL OR c.user_id = @user_id)
          AND COALESCE(p.is_hidden, 0) = 0
    )
        THROW 50051, N'Phải giữ lại ít nhất một danh mục để còn ghi khoản mới.', 1;

    UPDATE dbo.user_category_prefs
    SET is_hidden = @hidden, updated_at = SYSDATETIME()
    WHERE user_id = @user_id AND category_id = @category_id;
    IF @@ROWCOUNT = 0
        INSERT INTO dbo.user_category_prefs (user_id, category_id, is_hidden)
        VALUES (@user_id, @category_id, @hidden);

    COMMIT;
END
GO

/* -----------------------------------------------------------------------------
   18. Lưu thứ tự danh mục của một loại. @ids_json là mảng id theo thứ tự mới, ví dụ [4,1,9].
       Danh mục cùng loại không có trong mảng xếp sau cùng theo thứ tự cũ.
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_save_category_order
    @user_id  INT,
    @type     VARCHAR(10),
    @ids_json NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @type IS NULL OR @type NOT IN ('income', 'expense')
        THROW 50005, N'Loại danh mục không hợp lệ (chỉ nhận income/expense).', 1;
    IF ISJSON(@ids_json) = 0 OR LEFT(LTRIM(@ids_json), 1) <> N'['
        THROW 50052, N'Thứ tự danh mục không hợp lệ.', 1;

    DECLARE @raw TABLE (category_id INT NULL, sort_order INT NOT NULL);
    INSERT INTO @raw (category_id, sort_order)
    SELECT TRY_CAST(value AS INT), CAST([key] AS INT)
    FROM OPENJSON(@ids_json);

    IF EXISTS (SELECT 1 FROM @raw WHERE category_id IS NULL)
       OR EXISTS (SELECT 1 FROM @raw GROUP BY category_id HAVING COUNT(*) > 1)
       OR EXISTS (
           SELECT 1 FROM @raw AS o
           LEFT JOIN dbo.categories AS c
                  ON c.id = o.category_id AND c.type = @type AND (c.user_id IS NULL OR c.user_id = @user_id)
           WHERE c.id IS NULL)
        THROW 50052, N'Thứ tự danh mục không hợp lệ.', 1;

    BEGIN TRANSACTION;

    UPDATE p SET sort_order = NULL, updated_at = SYSDATETIME()
    FROM dbo.user_category_prefs AS p
    JOIN dbo.categories AS c ON c.id = p.category_id
    WHERE p.user_id = @user_id AND c.type = @type
      AND NOT EXISTS (SELECT 1 FROM @raw AS o WHERE o.category_id = p.category_id);

    UPDATE p SET sort_order = o.sort_order, updated_at = SYSDATETIME()
    FROM dbo.user_category_prefs AS p
    JOIN @raw AS o ON o.category_id = p.category_id
    WHERE p.user_id = @user_id;

    INSERT INTO dbo.user_category_prefs (user_id, category_id, sort_order)
    SELECT @user_id, o.category_id, o.sort_order
    FROM @raw AS o
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.user_category_prefs AS p
        WHERE p.user_id = @user_id AND p.category_id = o.category_id);

    COMMIT;
END
GO

/* -----------------------------------------------------------------------------
   19. sp_get_pet_shop_items: Lấy danh sách shop kèm trạng thái của người dùng
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_get_pet_shop_items
    @user_id INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE id = @user_id)
        THROW 50001, N'Người dùng không tồn tại.', 1;

    -- Kết quả 1: Số xu, độ no và huy hiệu của người dùng
    SELECT coins, pet_fullness, ISNULL(badge_points, 3) AS badge_points
    FROM dbo.users
    WHERE id = @user_id;

    -- Kết quả 2: Danh sách vật phẩm kèm số lượng sở hữu và trạng thái đang mặc
    SELECT s.id,
           s.name,
           s.slot,
           s.price_coins,
           ISNULL(s.price_badges, 0) AS price_badges,
           s.rarity,
           s.required_level,
           s.description,
           s.effect_data,
           ISNULL(i.quantity, 0) AS owned_quantity,
           ISNULL(i.is_equipped, 0) AS is_equipped
    FROM dbo.pet_shop_items AS s
    LEFT JOIN dbo.user_inventory AS i
           ON i.item_id = s.id AND i.user_id = @user_id
    WHERE s.is_active = 1
    ORDER BY CASE s.slot
                WHEN 'egg' THEN 0
                WHEN 'pet' THEN 1
                WHEN 'head' THEN 2
                WHEN 'face' THEN 3
                WHEN 'emblem' THEN 4
                WHEN 'held' THEN 5
                WHEN 'skin' THEN 6
                WHEN 'bg' THEN 7
                WHEN 'pedestal' THEN 8
                WHEN 'aura' THEN 9
                WHEN 'utility' THEN 10
                WHEN 'consumable' THEN 11
                ELSE 12 END,
             s.price_coins ASC;
END
GO

/* -----------------------------------------------------------------------------
   20. sp_buy_pet_item: Mua vật phẩm bằng xu tích lũy
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_buy_pet_item
    @user_id INT,
    @item_id VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE id = @user_id)
        THROW 50001, N'Người dùng không tồn tại.', 1;

    DECLARE @price INT, @price_badges INT, @slot VARCHAR(20), @name NVARCHAR(100);
    SELECT @price = price_coins, @price_badges = ISNULL(price_badges, 0), @slot = slot, @name = name
    FROM dbo.pet_shop_items
    WHERE id = @item_id AND is_active = 1;

    IF @price IS NULL
        THROW 50060, N'Vật phẩm không tồn tại trong cửa hàng.', 1;

    DECLARE @current_coins INT, @current_badges INT;
    SELECT @current_coins = coins, @current_badges = ISNULL(badge_points, 3)
    FROM dbo.users WHERE id = @user_id;

    IF @current_coins < @price
        THROW 50061, N'Không đủ xu để mua vật phẩm này.', 1;

    IF @current_badges < @price_badges
        THROW 50067, N'Không đủ huy hiệu để mua vật phẩm này.', 1;

    -- Đồ thời trang/linh thú chỉ sở hữu 1 lần, riêng consumable/utility/egg được mua nhiều lần
    IF @slot NOT IN ('consumable', 'utility', 'egg')
       AND EXISTS (SELECT 1 FROM dbo.user_inventory WHERE user_id = @user_id AND item_id = @item_id AND quantity > 0)
        THROW 50062, N'Bạn đã sở hữu vật phẩm này rồi.', 1;

    BEGIN TRANSACTION;

    DECLARE @new_balance INT = @current_coins - @price;
    DECLARE @new_badges INT = @current_badges - @price_badges;
    UPDATE dbo.users SET coins = @new_balance, badge_points = @new_badges WHERE id = @user_id;

    IF EXISTS (SELECT 1 FROM dbo.user_inventory WHERE user_id = @user_id AND item_id = @item_id)
    BEGIN
        UPDATE dbo.user_inventory
        SET quantity = quantity + 1
        WHERE user_id = @user_id AND item_id = @item_id;
    END
    ELSE
    BEGIN
        DECLARE @auto_equip BIT = IIF(@slot NOT IN ('consumable', 'utility', 'egg'), 1, 0);

        -- Nếu là skin của linh thú và chưa có linh thú đó, không auto equip
        IF @slot = 'skin'
        BEGIN
            DECLARE @skin_pet VARCHAR(50) = JSON_VALUE((SELECT effect_data FROM dbo.pet_shop_items WHERE id = @item_id), '$.pet_id');
            IF @skin_pet IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.user_inventory WHERE user_id = @user_id AND item_id = @skin_pet AND quantity > 0)
            BEGIN
                SET @auto_equip = 0;
            END
        END

        IF @auto_equip = 1
        BEGIN
            UPDATE i
            SET is_equipped = 0
            FROM dbo.user_inventory AS i
            JOIN dbo.pet_shop_items AS s ON s.id = i.item_id
            WHERE i.user_id = @user_id AND s.slot = @slot;
        END

        INSERT INTO dbo.user_inventory (user_id, item_id, quantity, is_equipped)
        VALUES (@user_id, @item_id, 1, @auto_equip);

        -- Nếu mua Linh Thú (slot = 'pet'), tự động cấp 2 skin miễn phí kèm theo
        IF @slot = 'pet'
        BEGIN
            INSERT INTO dbo.user_inventory (user_id, item_id, quantity, is_equipped)
            SELECT @user_id, s.id, 1, IIF(s.id LIKE '%_default', 1, 0)
            FROM dbo.pet_shop_items AS s
            WHERE s.slot = 'skin'
              AND JSON_VALUE(s.effect_data, '$.pet_id') = @item_id
              AND JSON_VALUE(s.effect_data, '$.is_free_with_pet') = 'true'
              AND NOT EXISTS (
                  SELECT 1 FROM dbo.user_inventory AS inv
                  WHERE inv.user_id = @user_id AND inv.item_id = s.id
              );
        END
    END

    INSERT INTO dbo.pet_coin_history (user_id, amount, balance_after, reason, item_id)
    VALUES (@user_id, -@price, @new_balance, CONCAT(N'Mua: ', @name), @item_id);

    COMMIT;

    SELECT @new_balance AS coins, @new_badges AS badge_points, @item_id AS item_id;
END
GO

/* -----------------------------------------------------------------------------
   21. sp_equip_pet_item: Mặc / tháo phụ kiện linh thú & đồng bộ skin linh thú
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_equip_pet_item
    @user_id INT,
    @item_id VARCHAR(50),
    @equip   BIT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE id = @user_id)
        THROW 50001, N'Người dùng không tồn tại.', 1;

    DECLARE @slot VARCHAR(20) = (SELECT slot FROM dbo.pet_shop_items WHERE id = @item_id);
    IF @slot IS NULL OR @slot IN ('consumable', 'utility', 'egg')
        THROW 50063, N'Vật phẩm này không thể trang bị.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.user_inventory WHERE user_id = @user_id AND item_id = @item_id AND quantity > 0)
        THROW 50064, N'Bạn chưa sở hữu vật phẩm này.', 1;

    -- Nếu trang bị skin của Linh Thú, kiểm tra người dùng đã sở hữu Linh Thú tương ứng chưa
    IF @equip = 1 AND @slot = 'skin'
    BEGIN
        DECLARE @target_pet VARCHAR(50) = JSON_VALUE((SELECT effect_data FROM dbo.pet_shop_items WHERE id = @item_id), '$.pet_id');
        IF @target_pet IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.user_inventory WHERE user_id = @user_id AND item_id = @target_pet AND quantity > 0)
            THROW 50068, N'Bạn cần sở hữu Linh Thú tương ứng trước khi trang bị skin này.', 1;
    END

    BEGIN TRANSACTION;

    IF @equip = 1
    BEGIN
        UPDATE i
        SET is_equipped = 0
        FROM dbo.user_inventory AS i
        JOIN dbo.pet_shop_items AS s ON s.id = i.item_id
        WHERE i.user_id = @user_id AND s.slot = @slot;

        UPDATE dbo.user_inventory
        SET is_equipped = 1
        WHERE user_id = @user_id AND item_id = @item_id;

        -- Nếu trang bị skin của Linh Thú, tự động kích hoạt Linh Thú đó
        IF @slot = 'skin'
        BEGIN
            DECLARE @req_pet VARCHAR(50) = JSON_VALUE((SELECT effect_data FROM dbo.pet_shop_items WHERE id = @item_id), '$.pet_id');
            IF @req_pet IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.user_inventory WHERE user_id = @user_id AND item_id = @req_pet AND quantity > 0)
            BEGIN
                UPDATE i
                SET is_equipped = 0
                FROM dbo.user_inventory AS i
                JOIN dbo.pet_shop_items AS s ON s.id = i.item_id
                WHERE i.user_id = @user_id AND s.slot = 'pet';

                UPDATE dbo.user_inventory
                SET is_equipped = 1
                WHERE user_id = @user_id AND item_id = @req_pet;
            END
        END

        -- Nếu trang bị Linh Thú (slot = 'pet'), chuyển sang skin mặc định của linh thú đó (nếu chưa mặc skin của nó)
        IF @slot = 'pet'
        BEGIN
            DECLARE @current_skin_pet VARCHAR(50) = (
                SELECT JSON_VALUE(s.effect_data, '$.pet_id')
                FROM dbo.user_inventory AS inv
                JOIN dbo.pet_shop_items AS s ON s.id = inv.item_id
                WHERE inv.user_id = @user_id AND s.slot = 'skin' AND inv.is_equipped = 1
            );

            IF @current_skin_pet IS NULL OR @current_skin_pet <> @item_id
            BEGIN
                DECLARE @def_skin VARCHAR(50) = (
                    SELECT TOP 1 id FROM dbo.pet_shop_items
                    WHERE slot = 'skin' AND JSON_VALUE(effect_data, '$.pet_id') = @item_id AND JSON_VALUE(effect_data, '$.theme') = 'default'
                );
                IF @def_skin IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.user_inventory WHERE user_id = @user_id AND item_id = @def_skin)
                BEGIN
                    UPDATE i
                    SET is_equipped = 0
                    FROM dbo.user_inventory AS i
                    JOIN dbo.pet_shop_items AS s ON s.id = i.item_id
                    WHERE i.user_id = @user_id AND s.slot = 'skin';

                    UPDATE dbo.user_inventory
                    SET is_equipped = 1
                    WHERE user_id = @user_id AND item_id = @def_skin;
                END
            END
        END
    END
    ELSE
    BEGIN
        UPDATE dbo.user_inventory
        SET is_equipped = 0
        WHERE user_id = @user_id AND item_id = @item_id;

        -- Nếu tháo Linh Thú (slot = 'pet'), tự động tháo luôn mọi skin của Linh Thú đó
        IF @slot = 'pet'
        BEGIN
            UPDATE i
            SET is_equipped = 0
            FROM dbo.user_inventory AS i
            JOIN dbo.pet_shop_items AS s ON s.id = i.item_id
            WHERE i.user_id = @user_id AND s.slot = 'skin'
              AND JSON_VALUE(s.effect_data, '$.pet_id') = @item_id;
        END
    END

    COMMIT;

    SELECT item_id, is_equipped FROM dbo.user_inventory WHERE user_id = @user_id AND item_id = @item_id;
END
GO

/* -----------------------------------------------------------------------------
   22. sp_use_pet_consumable: Tiêu thụ thức ăn / bùa hộ mệnh
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_use_pet_consumable
    @user_id INT,
    @item_id VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE id = @user_id)
        THROW 50001, N'Người dùng không tồn tại.', 1;

    DECLARE @slot VARCHAR(20) = (SELECT slot FROM dbo.pet_shop_items WHERE id = @item_id);
    IF @slot NOT IN ('consumable', 'utility')
        THROW 50065, N'Vật phẩm này không phải đồ tiêu hao.', 1;

    DECLARE @qty INT = (SELECT quantity FROM dbo.user_inventory WHERE user_id = @user_id AND item_id = @item_id);
    IF @qty IS NULL OR @qty <= 0
        THROW 50066, N'Bạn không có vật phẩm này trong túi.', 1;

    BEGIN TRANSACTION;

    UPDATE dbo.user_inventory
    SET quantity = quantity - 1
    WHERE user_id = @user_id AND item_id = @item_id;

    DECLARE @new_fullness INT;
    IF @item_id = 'food_noddles_dragon'
    BEGIN
        UPDATE dbo.users SET pet_fullness = IIF(pet_fullness + 30 > 100, 100, pet_fullness + 30) WHERE id = @user_id;
    END
    ELSE IF @item_id = 'food_wagyu'
    BEGIN
        UPDATE dbo.users SET pet_fullness = 100 WHERE id = @user_id;
    END

    SELECT @new_fullness = pet_fullness FROM dbo.users WHERE id = @user_id;

    COMMIT;

    SELECT @item_id AS item_id, @qty - 1 AS remaining_qty, @new_fullness AS pet_fullness;
END
GO

/* -----------------------------------------------------------------------------
   23. sp_add_pet_coins: Cộng hoặc trừ xu có ghi lịch sử
   ----------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.sp_add_pet_coins
    @user_id INT,
    @amount  INT,
    @reason  NVARCHAR(100),
    @item_id VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE id = @user_id)
        THROW 50001, N'Người dùng không tồn tại.', 1;

    DECLARE @current INT = (SELECT coins FROM dbo.users WHERE id = @user_id);
    DECLARE @new_balance INT = @current + @amount;
    IF @new_balance < 0
        THROW 50061, N'Số xu không đủ để thực hiện.', 1;

    BEGIN TRANSACTION;

    UPDATE dbo.users SET coins = @new_balance WHERE id = @user_id;

    INSERT INTO dbo.pet_coin_history (user_id, amount, balance_after, reason, item_id)
    VALUES (@user_id, @amount, @new_balance, @reason, @item_id);

    COMMIT;

    SELECT @new_balance AS coins;
END
GO

PRINT N'Đã tạo các thủ tục mở rộng.';
GO


GO

