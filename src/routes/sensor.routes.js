const express = require("express");
const router = express.Router();
const sensorController = require("../controllers/sensor.controller");
const verifyToken = require("../middleware/verifyToken");

// =============================
// SENSOR DATA ENDPOINTS
// =============================

// GET /api/sensor/latest
// Ambil data sensor TERBARU dari HuggingFace & simpan ke DB
router.get("/latest", sensorController.getLatestSensor);

// GET /api/sensor/cached
// Ambil data sensor terakhir dari DATABASE (lebih cepat, no auth needed)
router.get("/cached", sensorController.getCachedSensor);

// GET /api/sensor/history?limit=100
// Ambil history data sensor untuk grafik
router.get("/history", sensorController.getSensorHistory);

// POST /api/sensor/predict
// Prediksi AI E.coli berdasarkan data sensor terbaru
router.post("/predict", sensorController.predictEcoli);

// =============================
// TOTAL COLIFORM ENDPOINTS
// =============================

// POST /api/sensor/coliform/sync
// Fetch history dari API Gary & simpan ke database
router.post("/coliform/sync", sensorController.syncColiformHistory);

// GET /api/sensor/coliform/history?limit=100
// Ambil history total coliform dari database
router.get("/coliform/history", sensorController.getColiformHistory);

// GET /api/sensor/coliform/latest
// Ambil data coliform terbaru
router.get("/coliform/latest", sensorController.getLatestColiform);

// =============================
// AI DETECTION ENDPOINT
// =============================

// GET /api/sensor/ai-detection
// Ambil data sensor + prediksi AI lengkap dengan rekomendasi
router.get("/ai-detection", sensorController.getAIDetection);

module.exports = router;
