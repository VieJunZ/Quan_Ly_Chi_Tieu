/**
 * @file health.routes.js
 * @description GET /api/health: máy chủ còn chạy không, kết nối CSDL có ổn không.
 */

const express = require("express");
const db = require("../config/db");
const ocr = require("../services/ocr.service");
const { asyncRoute } = require("../lib/http");

const router = express.Router();

router.get("/health", asyncRoute(async (req, res) => {
  const database = await db.testDbConnection();
  res.status(database.connected ? 200 : 503).json({
    status: database.connected ? "ok" : "degraded",
    storage: "sqlserver",
    database: database.connected
      ? { connected: true, name: database.database_name, server_time: database.server_time }
      : { connected: false, message: "Không kết nối được SQL Server." },
    ocr_language_data: ocr.languageDataReady(),
    uptime_seconds: Math.round(process.uptime())
  });
}));

module.exports = router;
