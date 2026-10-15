-- database/init.sql
-- Khởi tạo cơ sở dữ liệu Quản Lý Chi Tiêu (quan_ly_chi_tieu_db)

CREATE DATABASE IF NOT EXISTS quan_ly_chi_tieu_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE quan_ly_chi_tieu_db;

-- 1. Bảng Người dùng
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng Danh mục Thu / Chi
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    icon VARCHAR(50) DEFAULT 'circle-ellipsis',
    color VARCHAR(30) DEFAULT 'blue',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng Giao dịch
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    note TEXT NULL,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_trans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_trans_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    INDEX idx_user_trans_date (user_id, transaction_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Dữ liệu Danh mục mặc định (Seed Data)
INSERT INTO categories (id, name, type, icon, color) VALUES
(1, 'Ăn uống', 'expense', 'utensils', 'amber'),
(2, 'Nhà cửa & Phòng trọ', 'expense', 'home', 'blue'),
(3, 'Di chuyển & Xăng xe', 'expense', 'car', 'cyan'),
(4, 'Mua sắm cá nhân', 'expense', 'shopping-bag', 'rose'),
(5, 'Hóa đơn & Tiện ích', 'expense', 'receipt', 'orange'),
(6, 'Học tập & Tri thức', 'expense', 'book-open', 'indigo'),
(7, 'Giải trí & Bạn bè', 'expense', 'gamepad-2', 'violet'),
(8, 'Y tế & Sức khỏe', 'expense', 'heart-pulse', 'red'),
(9, 'Khoản chi khác', 'expense', 'circle-ellipsis', 'emerald'),
(10, 'Tiền lương', 'income', 'wallet', 'emerald'),
(11, 'Tiền thưởng', 'income', 'gift', 'green'),
(12, 'Trợ cấp & Học bổng', 'income', 'hand-coins', 'teal'),
(13, 'Thu nhập khác', 'income', 'plus-circle', 'lime')
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    type = VALUES(type),
    icon = VALUES(icon),
    color = VALUES(color);
