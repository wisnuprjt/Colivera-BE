// src/routes/users.routes.js
const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/role');
const ctrl = require('../controllers/users.controller');

// Endpoint untuk user biasa (admin/superadmin) - lihat profil sendiri
router.get('/profile', verifyToken, ctrl.getProfile);

// Semua endpoint hanya bisa diakses oleh SuperAdmin
router.post('/', verifyToken, requireRole(['superadmin']), ctrl.create);
router.get('/', verifyToken, requireRole(['superadmin']), ctrl.list);
router.get('/:id', verifyToken, requireRole(['superadmin']), ctrl.getOne);
router.patch('/:id', verifyToken, requireRole(['superadmin']), ctrl.update);
router.patch('/:id/password', verifyToken, requireRole(['superadmin']), ctrl.changePassword);
router.delete('/:id', verifyToken, requireRole(['superadmin']), ctrl.remove);

module.exports = router;
