/* =============================================================================
   Mở rộng CSDL cho bản thử nghiệm (nhánh tri/thu-nghiem)
   Chạy SAU các script gốc: create_database -> create_tables -> seed_categories -> procedures
   Tên CSDL truyền vào qua biến sqlcmd: sqlcmd ... -v DB_NAME=so_chi_tri_db
   Script chạy lại nhiều lần không lỗi (kiểm tra tồn tại trước khi tạo).
   ============================================================================= */

USE $(DB_NAME);
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

PRINT N'Mở rộng bảng hoàn tất.';
GO
