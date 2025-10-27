const express = require("express");
const router = express.Router();
const controller = require("../controllers/totalcoliform.controller");

// ✅ tambahkan ini biar bisa GET /api/coliform/
router.get("/", controller.getLatest);

// endpoint lainnya
router.post("/", controller.create);
router.get("/latest", controller.getLatest);

module.exports = router;
