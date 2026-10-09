/**
 * @file auth.routes.js
 * @description Tuyến API xử lý xác thực người dùng: Đăng ký (Register) và Đăng nhập (Login).
 * Tích hợp bảo mật nhiều lớp:
 *   1. Chống Brute-force mật khẩu bằng Rate Limiter.
 *   2. Kiểm soát độ dài và định dạng đầu vào (chống DoS / ReDoS / Payload Injection).
 *   3. Băm mật khẩu một chiều bằng thuật toán bcryptjs chuẩn (10 salt rounds).
 *   4. Cấp phát JWT Bearer Token có thời hạn bảo vệ bằng khóa bí mật.
 */

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const storage = require("../services/storage");
const { createRateLimiter } = require("../middlewares/rateLimit.middleware");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey_sprint1";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Giới hạn tần suất: tối đa 30 lần thử / phút trên mỗi địa chỉ IP
const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: "Bạn đã thao tác đăng ký/đăng nhập quá nhiều lần. Vui lòng thử lại sau 1 phút."
});

/**
 * @route   POST /api/auth/register
 * @desc    Đăng ký tài khoản người dùng mới
 * @access  Public
 * @body    {string} username - Tên đăng nhập (tối thiểu 3 ký tự, tối đa 30 ký tự)
 * @body    {string} password - Mật khẩu (từ 8 đến 128 ký tự)
 */
router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    const cleanUsername = String(username || "").trim();
    const cleanPassword = String(password || "");

    // 1. Kiểm tra độ dài hợp lệ (Validation)
    if (cleanUsername.length < 3 || cleanPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Tên đăng nhập cần ít nhất 3 ký tự, mật khẩu ít nhất 8 ký tự.",
        error_code: "VALIDATION_ERROR"
      });
    }

    // 2. Chống tấn công DoS bằng chuỗi mật khẩu siêu dài vào bcrypt
    if (cleanPassword.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu không được vượt quá 128 ký tự.",
        error_code: "PASSWORD_TOO_LONG"
      });
    }

    // 3. Kiểm tra định dạng tên đăng nhập an toàn (chữ, số, gạch dưới, gạch ngang, chấm)
    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        message: "Tên đăng nhập từ 3-30 ký tự và không chứa ký tự đặc biệt nguy hiểm.",
        error_code: "INVALID_USERNAME_FORMAT"
      });
    }

    // 4. Kiểm tra xem tên đăng nhập đã được ai sử dụng chưa
    const existingUser = await storage.findUserByUsername(cleanUsername);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Tên đăng nhập đã tồn tại trên hệ thống.",
        error_code: "USER_ALREADY_EXISTS"
      });
    }

    // 5. Băm mật khẩu bằng thuật toán bcrypt an toàn (10 rounds salt)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(cleanPassword, salt);

    // 6. Lưu người dùng mới vào cơ sở dữ liệu
    const newUser = await storage.createUser({
      username: cleanUsername,
      password: hashedPassword
    });

    // 7. Cấp phát JWT token có hạn 7 ngày
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 8. Trả về kết quả thành công HTTP 201 Created (tuyệt đối không trả về mật khẩu)
    res.status(201).json({
      token,
      user_id: newUser.id,
      user: {
        id: newUser.id,
        username: newUser.username
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Đăng nhập vào tài khoản và nhận JWT token
 * @access  Public
 * @body    {string} username - Tên đăng nhập
 * @body    {string} password - Mật khẩu
 */
router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    const cleanUsername = String(username || "").trim();
    const cleanPassword = String(password || "");

    // 1. Kiểm tra sự tồn tại của tham số
    if (!cleanUsername || !cleanPassword) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.",
        error_code: "MISSING_CREDENTIALS"
      });
    }

    // 2. Tìm kiếm người dùng theo username
    const user = await storage.findUserByUsername(cleanUsername);
    if (!user) {
      // Thông báo chung chung để tránh kẻ tấn công dò tìm tài khoản (User Enumeration Prevention)
      return res.status(401).json({
        success: false,
        message: "Tên đăng nhập hoặc mật khẩu không chính xác.",
        error_code: "INVALID_CREDENTIALS"
      });
    }

    // 3. So khớp mật khẩu nhập vào với mã hash trong CSDL
    const isMatch = await bcrypt.compare(cleanPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Tên đăng nhập hoặc mật khẩu không chính xác.",
        error_code: "INVALID_CREDENTIALS"
      });
    }

    // 4. Mật khẩu đúng: Cấp phát JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 5. Trả về thông tin phiên đăng nhập HTTP 200 OK (không trả mật khẩu)
    res.status(200).json({
      token,
      user_id: user.id,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
