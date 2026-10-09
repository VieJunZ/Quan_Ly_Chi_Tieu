/**
 * @file auth.routes.js
 * @description Tuyến API xử lý xác thực người dùng: Đăng ký (Register) và Đăng nhập (Login).
 * Sử dụng bcryptjs để băm mật khẩu một chiều an toàn và jsonwebtoken để cấp phát JWT Bearer Token.
 * Endpoints:
 *   - POST /api/auth/register
 *   - POST /api/auth/login
 */

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const storage = require("../services/storage");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey_sprint1";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * @route   POST /api/auth/register
 * @desc    Đăng ký tài khoản người dùng mới
 * @access  Public
 * @body    {string} username - Tên đăng nhập (tối thiểu 3 ký tự)
 * @body    {string} password - Mật khẩu (tối thiểu 8 ký tự)
 */
router.post("/register", async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    const cleanUsername = String(username || "").trim();
    const cleanPassword = String(password || "");

    // 1. Kiểm tra tính hợp lệ của dữ liệu đầu vào (Validation)
    if (cleanUsername.length < 3 || cleanPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Tên đăng nhập cần ít nhất 3 ký tự, mật khẩu ít nhất 8 ký tự.",
        error_code: "VALIDATION_ERROR"
      });
    }

    // 2. Kiểm tra xem tên đăng nhập đã được ai sử dụng chưa
    const existingUser = await storage.findUserByUsername(cleanUsername);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Tên đăng nhập đã tồn tại trên hệ thống.",
        error_code: "USER_ALREADY_EXISTS"
      });
    }

    // 3. Băm mật khẩu bằng thuật toán bcrypt an toàn (10 rounds salt)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(cleanPassword, salt);

    // 4. Lưu người dùng mới vào cơ sở dữ liệu
    const newUser = await storage.createUser({
      username: cleanUsername,
      password: hashedPassword
    });

    // 5. Cấp phát JWT token có hạn 7 ngày
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 6. Trả về kết quả thành công HTTP 201 Created
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
router.post("/login", async (req, res, next) => {
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

    // 5. Trả về thông tin phiên đăng nhập HTTP 200 OK
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
