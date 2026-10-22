/* 3 */

USE quan_ly_chi_tieu_db;
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
