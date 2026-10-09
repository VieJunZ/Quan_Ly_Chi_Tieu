// backend/src/routes/auth.routes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const storage = require("../services/storage");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey_sprint1";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// 1. Đăng ký tài khoản
router.post("/register", async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    const cleanUsername = String(username || "").trim();
    const cleanPassword = String(password || "");

    if (cleanUsername.length < 3 || cleanPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Tên đăng nhập cần ít nhất 3 ký tự, mật khẩu ít nhất 8 ký tự.",
        error_code: "VALIDATION_ERROR"
      });
    }

    const existingUser = await storage.findUserByUsername(cleanUsername);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Tên đăng nhập đã tồn tại trên hệ thống.",
        error_code: "USER_ALREADY_EXISTS"
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(cleanPassword, salt);

    const newUser = await storage.createUser({
      username: cleanUsername,
      password: hashedPassword
    });

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

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

// 2. Đăng nhập
router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    const cleanUsername = String(username || "").trim();
    const cleanPassword = String(password || "");

    if (!cleanUsername || !cleanPassword) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.",
        error_code: "MISSING_CREDENTIALS"
      });
    }

    const user = await storage.findUserByUsername(cleanUsername);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Tên đăng nhập hoặc mật khẩu không chính xác.",
        error_code: "INVALID_CREDENTIALS"
      });
    }

    const isMatch = await bcrypt.compare(cleanPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Tên đăng nhập hoặc mật khẩu không chính xác.",
        error_code: "INVALID_CREDENTIALS"
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

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
