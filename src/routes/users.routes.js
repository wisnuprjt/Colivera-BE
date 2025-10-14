// src/routes/users.routes.js
const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/role');
const ctrl = require('../controllers/users.controller');

// Semua endpoint hanya bisa diakses oleh SuperAdmin
router.post('/', auth, requireRole(['superadmin']), ctrl.create);
router.get('/', auth, requireRole(['superadmin']), ctrl.list);
router.get('/:id', auth, requireRole(['superadmin']), ctrl.getOne);
router.patch('/:id', auth, requireRole(['superadmin']), ctrl.update);
router.patch('/:id/password', auth, requireRole(['superadmin']), ctrl.changePassword);
router.delete('/:id', auth, requireRole(['superadmin']), ctrl.remove);

module.exports = router;
