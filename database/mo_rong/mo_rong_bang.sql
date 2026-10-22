/* =============================================================================
   Mở rộng CSDL cho bản thử nghiệm (nhánh tri/thu-nghiem)
   Chạy SAU các script gốc: create_database -> create_tables -> seed_categories -> procedures
   Tên CSDL truyền vào qua biến sqlcmd: sqlcmd ... -v DB_NAME=so_chi_tri_db
   Script chạy lại nhiều lần không lỗi (kiểm tra tồn tại trước khi tạo).
   ============================================================================= */

USE so_chi_tri_db;
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
        rarity         VARCHAR(20)   NOT NULL CONSTRAINT df_pet_items_rarity DEFAULT 'common',
        required_level INT           NOT NULL CONSTRAINT df_pet_items_level DEFAULT 1,
        description    NVARCHAR(255) NULL,
        effect_data    NVARCHAR(MAX) NULL,
        is_active      BIT           NOT NULL CONSTRAINT df_pet_items_active DEFAULT 1,
        created_at     DATETIME2(0)  NOT NULL CONSTRAINT df_pet_items_created DEFAULT SYSDATETIME(),

        CONSTRAINT pk_pet_shop_items PRIMARY KEY (id),
        CONSTRAINT ck_pet_items_slot CHECK (slot IN
            ('head', 'face', 'emblem', 'held', 'skin', 'bg', 'pedestal', 'aura', 'consumable', 'utility')),
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
    ('ped_redcarpet', N'Thảm đỏ vinh danh', 'pedestal', 70, 'rare', 2, N'Thảm đỏ sang trọng nâng tầm vị thế linh thú', N'{"icon":"🟥"}'),
    ('ped_coins', N'Đống tiền vàng may mắn', 'pedestal', 90, 'epic', 3, N'Lót chân bằng đống tiền xu vàng óng ánh', N'{"icon":"💰"}'),

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
