const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const { sendOverride, getStatus } = require("../controllers/override.controller");

// GET endpoint untuk cek status MQTT connection
router.get("/", verifyToken, getStatus);

// POST endpoint untuk kirim override command
router.post("/", verifyToken, sendOverride);

module.exports = router;
