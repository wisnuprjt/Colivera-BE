const express = require('express');
const router = express.Router();
const Auth = require('../middleware/auth'); // verifikasi JWT
const Controller = require('../controllers/notifications.controller');

// GET /api/notifications?status=unread&limit=20&offset=0
router.get('/', Auth, Controller.listNotifications);

// GET /api/notifications/unread_count
router.get('/unread_count', Auth, Controller.unreadCount);

// POST /api/notifications
// body: { sensor_id, message, severity?, status?, cfu_value?, threshold? }
router.post('/', Auth, Controller.createNotification);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', Auth, Controller.markRead);

// PATCH /api/notifications/:id/resolve
router.patch('/:id/resolve', Auth, Controller.markResolved);

// DELETE /api/notifications/:id
router.delete('/:id', Auth, Controller.remove);

module.exports = router;
