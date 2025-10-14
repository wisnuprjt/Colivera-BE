const express = require('express');
const router = express.Router();

// Import semua route modular
const authRoutes = require('./auth.routes');
const userRoutes = require('./users.routes');
const notificationRoutes = require('./notifications.routes'); // 🆕

// Tes endpoint dasar
router.get('/', (req, res) => {
  res.json({ message: 'Colivera API ready' });
});

// Mount sub-route
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/notifications', notificationRoutes); // 🆕

module.exports = router;
