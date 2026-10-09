// backend/src/middlewares/auth.middleware.js
const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Vui lòng đăng nhập để thực hiện thao tác này.",
      error_code: "UNAUTHORIZED"
    });
  }

  const secret = process.env.JWT_SECRET || "supersecretjwtkey_sprint1";

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ.",
        error_code: "FORBIDDEN"
      });
    }

    req.user = decoded;
    next();
  });
}

module.exports = {
  authenticateToken
};
