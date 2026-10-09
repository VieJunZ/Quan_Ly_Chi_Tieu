// backend/src/routes/health.routes.js
const express = require("express");
const router = express.Router();
const storage = require("../services/storage");

router.get("/health", async (req, res, next) => {
  try {
    const status = await storage.getHealthStatus();
    res.json(status);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
