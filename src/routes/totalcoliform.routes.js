const express = require("express");
const router = express.Router();
const controller = require("../controllers/totalcoliform.controller");

// ✅ tambahkan ini biar bisa GET /api/coliform/
router.get("/", controller.getLatest);

// endpoint lainnya
router.post("/", controller.create);
router.get("/latest", controller.getLatest);

// AI Prediction history
router.get("/ai-prediction/history", controller.getAIPredictionHistory);

module.exports = router;
