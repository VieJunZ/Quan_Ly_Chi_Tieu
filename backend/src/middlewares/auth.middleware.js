/**
 * @file auth.middleware.js
 * @description Middleware xác thực người dùng bằng JSON Web Token (JWT).
 * Kiểm tra header Authorization (dạng 'Bearer <token>') để bảo vệ các API riêng tư.
 */

const jwt = require("jsonwebtoken");

/**
 * Middleware kiểm tra và giải mã mã xác thực JWT trong HTTP request.
 * Nếu hợp lệ: gán thông tin người dùng vào req.user và tiếp tục (next).
 * Nếu không hợp lệ hoặc thiếu: chặn request và trả về mã lỗi 401 hoặc 403.
 *
 * @param {import('express').Request} req - Express Request object
 * @param {import('express').Response} res - Express Response object
 * @param {import('express').NextFunction} next - Hàm chuyển tiếp tới middleware/controller tiếp theo
 */
function authenticateToken(req, res, next) {
  // Lấy header Authorization (hỗ trợ cả chữ hoa lẫn chữ thường)
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  
  // Trích xuất chuỗi token từ dạng "Bearer <token>"
  const token = authHeader && authHeader.split(" ")[1];

  // Trường hợp 1: Không gửi token -> Trả về 401 Unauthorized
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Vui lòng đăng nhập để thực hiện thao tác này.",
      error_code: "UNAUTHORIZED"
    });
  }

  const secret = process.env.JWT_SECRET || "supersecretjwtkey_sprint1";

  // Xác minh chữ ký số của token với secret key
  jwt.verify(token, secret, (err, decoded) => {
    // Trường hợp 2: Token bị sai, giả mạo hoặc đã hết hạn -> Trả về 403 Forbidden
    if (err) {
      return res.status(403).json({
        success: false,
        message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ.",
        error_code: "FORBIDDEN"
      });
    }

    // Token hợp lệ: Lưu payload (chứa id, username) vào req.user để các controller phía sau sử dụng
    req.user = decoded;
    next();
  });
}

module.exports = {
  authenticateToken
};
