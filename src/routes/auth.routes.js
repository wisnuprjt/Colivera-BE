const express = require("express");
const router = express.Router();

// Import controller & middleware
const authCtrl = require("../controllers/auth.controller");
const verifyToken = require("../middleware/verifyToken");
const sessionWatcher = require("../middleware/sessionWatcher");

// ===============================
// AUTH ROUTES
// ===============================

// [POST] /api/auth/login
// - Verifikasi email & password
// - Generate JWT + set cookie
router.post("/login", authCtrl.login);

// [GET] /api/auth/me
// - Verifikasi token dari cookie
// - Sinkronisasi role user (real-time)
// - Mengembalikan data user aktif
router.get("/me", verifyToken, sessionWatcher, authCtrl.me);

// [POST] /api/auth/logout
// - Menghapus cookie JWT
router.post("/logout", authCtrl.logout);

// [POST] /api/auth/refresh
// - Refresh access token menggunakan refresh token
router.post("/refresh", authCtrl.refreshToken);

module.exports = router;
