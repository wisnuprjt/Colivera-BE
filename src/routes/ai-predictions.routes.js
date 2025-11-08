// routes/ai-predictions.routes.js
const express = require("express");
const router = express.Router();
const aiPredictionsController = require("../controllers/ai-predictions.controller");

// GET /api/ai-predictions/history?limit=50
// Ambil history AI predictions
router.get("/history", aiPredictionsController.getAIPredictionsHistory);

// GET /api/ai-predictions/latest
// Ambil AI prediction terbaru
router.get("/latest", aiPredictionsController.getLatestAIPrediction);

module.exports = router;
