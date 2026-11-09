/* =============================================================================
   MỞ RỘNG CSDL: TÍNH NĂNG NHÓM CHI TIÊU (QUỸ CHUNG) VÀ ĐỒNG BỘ NỢ LIÊN KẾT
   Tương thích hoàn toàn với Microsoft SQL Server 2016 / 2019 / 2022
   ============================================================================= */

-- 1. Bổ sung cột linked_user_id vào bảng dbo.debts (nếu chưa có)
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'dbo.debts') AND name = N'linked_user_id'
)
BEGIN
    ALTER TABLE dbo.debts 
    ADD linked_user_id INT NULL 
    CONSTRAINT fk_debts_linked_user REFERENCES dbo.users(id);
    
    PRINT N'Đã thêm cột linked_user_id vào bảng debts.';
END
GO

-- 2. Bảng dbo.expense_groups (Nhóm chi tiêu / Quỹ chung)
IF OBJECT_ID(N'dbo.expense_groups', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.expense_groups (
        id          INT IDENTITY(1, 1) NOT NULL,
        name        NVARCHAR(100)      NOT NULL,
        invite_code VARCHAR(12)        NOT NULL,
        created_by  INT                NOT NULL,
        created_at  DATETIME2(0)       NOT NULL CONSTRAINT df_expense_groups_created_at DEFAULT SYSDATETIME(),

        CONSTRAINT pk_expense_groups PRIMARY KEY (id),
        CONSTRAINT uq_expense_groups_code UNIQUE (invite_code),
        CONSTRAINT fk_expense_groups_creator FOREIGN KEY (created_by) REFERENCES dbo.users(id)
    );
    PRINT N'Đã tạo bảng expense_groups.';
END
GO

-- 3. Bảng dbo.group_members (Thành viên trong nhóm)
IF OBJECT_ID(N'dbo.group_members', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.group_members (
        group_id   INT          NOT NULL,
        user_id    INT          NOT NULL,
        role       VARCHAR(20)  NOT NULL CONSTRAINT df_group_members_role DEFAULT 'member',
        joined_at  DATETIME2(0) NOT NULL CONSTRAINT df_group_members_joined_at DEFAULT SYSDATETIME(),

        CONSTRAINT pk_group_members PRIMARY KEY (group_id, user_id),
        CONSTRAINT fk_group_members_group FOREIGN KEY (group_id) REFERENCES dbo.expense_groups(id) ON DELETE CASCADE,
        CONSTRAINT fk_group_members_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
    );
    PRINT N'Đã tạo bảng group_members.';
END
GO

-- 4. Bảng dbo.group_expenses (Khoản chi tiêu chung của nhóm)
IF OBJECT_ID(N'dbo.group_expenses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.group_expenses (
        id             INT IDENTITY(1, 1) NOT NULL,
        group_id       INT                NOT NULL,
        payer_id       INT                NOT NULL,
        amount         DECIMAL(15, 2)     NOT NULL,
        category_name  NVARCHAR(50)       NOT NULL CONSTRAINT df_group_expenses_cat DEFAULT N'Chi tiêu chung',
        note           NVARCHAR(250)      NULL,
        created_at     DATETIME2(0)       NOT NULL CONSTRAINT df_group_expenses_created_at DEFAULT SYSDATETIME(),

        CONSTRAINT pk_group_expenses PRIMARY KEY (id),
        CONSTRAINT fk_group_expenses_group FOREIGN KEY (group_id) REFERENCES dbo.expense_groups(id) ON DELETE CASCADE,
        CONSTRAINT fk_group_expenses_payer FOREIGN KEY (payer_id) REFERENCES dbo.users(id),
        CONSTRAINT ck_group_expenses_amount CHECK (amount > 0)
    );
    PRINT N'Đã tạo bảng group_expenses.';
END
GO
