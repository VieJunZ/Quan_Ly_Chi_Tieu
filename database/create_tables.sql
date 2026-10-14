/* 2 */

USE quan_ly_chi_tieu_db;
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
