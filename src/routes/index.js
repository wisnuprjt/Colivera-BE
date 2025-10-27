const express = require('express');
const router = express.Router();

// =====================
// Import Semua Route Modular
// =====================
const authRoutes = require('./auth.routes');
const userRoutes = require('./users.routes');
const notificationRoutes = require('./notifications.routes');
const totalColiformRoutes = require('./totalcoliform.routes'); // 🆕 Tambahan baru

// =====================
// Tes Endpoint Dasar
// =====================
router.get('/', (req, res) => {
  res.json({ message: 'Colivera API ready' });
});

// =====================
// Mount Sub-Routes
// =====================
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/notifications', notificationRoutes);
router.use('/coliform', totalColiformRoutes); // 🆕 Route baru untuk Total Coliform

// =====================
// Export Router
// =====================
module.exports = router;
