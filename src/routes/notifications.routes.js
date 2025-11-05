const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/notifications.controller");
const auth = require("../middleware/auth");
const { sendTelegram, getUpdates } = require("../services/telegram.service");

// ===== DEVELOPMENT ENDPOINTS (tanpa auth) =====
// Taruh di paling atas agar tidak tertangkap route lain

// Endpoint untuk mendapatkan CHAT_ID
router.get("/dev/get-chat-id", async (_req, res) => {
    try {
        const result = await getUpdates();
        res.json({ 
            success: true,
            message: "Kirim pesan '/start' ke bot di Telegram, lalu refresh endpoint ini",
            updates: result 
        });
    } catch (error) {
        console.error("Get updates error:", error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

router.get("/dev/ping-telegram", async (_req, res) => {
    try {
        const result = await sendTelegram("✅ COLIVERA: Test ping dari backend berhasil!");
        res.json({ 
            success: true,
            message: "Telegram notification sent",
            result: result 
        });
    } catch (error) {
        console.error("Telegram error:", error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// ===== PROTECTED ENDPOINTS (dengan auth) =====
router.get("/", auth, ctrl.list);
router.get("/unread-count", auth, ctrl.unreadCount);
router.post("/", auth, ctrl.create);
router.patch("/:id/read", auth, ctrl.markRead);
router.patch("/:id/resolve", auth, ctrl.markResolved);
router.delete("/:id", auth, ctrl.remove);

module.exports = router;
