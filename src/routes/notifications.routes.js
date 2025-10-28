const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/notifications.controller");
const auth = require("../middleware/auth");

router.get("/", auth, ctrl.list);
router.get("/unread-count", auth, ctrl.unreadCount);
router.post("/", auth, ctrl.create);
router.patch("/:id/read", auth, ctrl.markRead);
router.patch("/:id/resolve", auth, ctrl.markResolved);
router.delete("/:id", auth, ctrl.remove);

module.exports = router;
