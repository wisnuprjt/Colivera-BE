const NotificationModel = require('../models/notifications.model');
const { validateCreateNotification } = require('../validators/notifications.schema');

async function listNotifications(req, res) {
  try {
    const { status, limit, offset } = req.query;
    const data = await NotificationModel.getNotifications({ status, limit, offset });
    res.json({ success: true, data });
  } catch (err) {
    console.error('listNotifications error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
}

async function unreadCount(req, res) {
  try {
    const count = await NotificationModel.getUnreadCount();
    res.json({ success: true, data: { unread: count } });
  } catch (err) {
    console.error('unreadCount error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
  }
}

async function createNotification(req, res) {
  try {
    const { valid, errors } = validateCreateNotification(req.body);
    if (!valid) return res.status(400).json({ success: false, errors });

    const created = await NotificationModel.createNotification(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('createNotification error:', err);
    res.status(500).json({ success: false, message: 'Failed to create notification' });
  }
}

async function markRead(req, res) {
  try {
    const { id } = req.params;
    const updated = await NotificationModel.markAsRead(id);
    if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('markRead error:', err);
    res.status(500).json({ success: false, message: 'Failed to mark read' });
  }
}

async function markResolved(req, res) {
  try {
    const { id } = req.params;
    const updated = await NotificationModel.markAsResolved(id);
    if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('markResolved error:', err);
    res.status(500).json({ success: false, message: 'Failed to mark resolved' });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const ok = await NotificationModel.removeNotification(id);
    if (!ok) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('remove notification error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
}

module.exports = {
  listNotifications,
  unreadCount,
  createNotification,
  markRead,
  markResolved,
  remove,
};
