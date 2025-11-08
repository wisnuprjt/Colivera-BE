const express = require('express');
const router = express.Router();

// =====================
// Import Semua Route Modular
// =====================
const authRoutes = require('./auth.routes');
const userRoutes = require('./users.routes');
const notificationRoutes = require('./notifications.routes');
const totalColiformRoutes = require('./totalcoliform.routes'); // 🆕 Tambahan baru
const sensorRoutes = require('./sensor.routes'); // 🆕 Route untuk sensor & AI prediction
const aiPredictionsRoutes = require('./ai-predictions.routes'); // 🆕 Route untuk AI Predictions

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
router.use('/sensor', sensorRoutes); // 🆕 Route baru untuk Sensor & AI Prediction
router.use('/ai-predictions', aiPredictionsRoutes); // 🆕 Route baru untuk AI Predictions

// =====================
// Export Router
// =====================
module.exports = router;
