// src/routes/auth.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');

// PENTING: pakai referensi fungsi (tanpa "()")
router.post('/login', ctrl.login);
router.get('/me', require('../middleware/auth'), ctrl.me);
router.post('/logout', ctrl.logout);

module.exports = router;
