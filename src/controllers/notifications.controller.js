const {
  getNotifications,
  createNotification,
  getUnreadCount,
  markAsRead,
  markAsResolved,
  removeNotification,
} = require("../models/notifications.model");

const { validateCreateNotification } = require("../validators/notifications.schema");

/**
 * GET /api/notifications
 * Query opsional:
 *   ?type=inactivity
 *   ?active=1
 *   ?limit=10
 *   ?status=unread
 */
exports.list = async (req, res) => {
  try {
    const { type, status, active, limit, offset } = req.query;
    const rows = await getNotifications({ type, status, active, limit, offset });
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/notifications/unread-count
 */
exports.unreadCount = async (_req, res) => {
  try {
    const count = await getUnreadCount();
    res.json({ success: true, count });
  } catch (err) {
    console.error("Error fetching unread count:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/notifications
 */
exports.create = async (req, res) => {
  try {
    const { valid, errors } = validateCreateNotification(req.body);
    if (!valid) return res.status(400).json({ success: false, errors });

    const notif = await createNotification(req.body);
    res.status(201).json({ success: true, data: notif });
  } catch (err) {
    console.error("Error creating notification:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * PATCH /api/notifications/:id/read
 */
exports.markRead = async (req, res) => {
  try {
    const notif = await markAsRead(req.params.id);
    if (!notif) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: notif });
  } catch (err) {
    console.error("Error marking read:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * PATCH /api/notifications/:id/resolve
 */
exports.markResolved = async (req, res) => {
  try {
    const notif = await markAsResolved(req.params.id);
    if (!notif) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: notif });
  } catch (err) {
    console.error("Error resolving notification:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * DELETE /api/notifications/:id
 */
exports.remove = async (req, res) => {
  try {
    const deleted = await removeNotification(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    console.error("Error deleting notification:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
