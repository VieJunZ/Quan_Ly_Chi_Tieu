// backend/src/routes/category.routes.js
const express = require("express");
const storage = require("../services/storage");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { type } = req.query;
    const categories = await storage.getCategories(type);
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
