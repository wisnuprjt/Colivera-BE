const pool = require('../models/db');
const bcrypt = require('bcrypt');

/**
 * POST /api/users
 * Hanya superadmin (gate di middleware/route)
 */
exports.create = async (req, res) => {
  const { name, email, password, role = 'admin' } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name/email/password required' });
  }

  const safeRole = role === 'superadmin' ? 'superadmin' : 'admin';
  const hash = await bcrypt.hash(password, 10);

  try {
    const [r] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, hash, safeRole]
    );
    res.status(201).json({ id: r.insertId, name, email, role: safeRole });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email already exists' });
    }
    throw err;
  }
};

/**
 * GET /api/users
 * Hanya superadmin (gate di middleware/route)
 */
exports.list = async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT id, name, email, role, created_at FROM users ORDER BY id DESC'
  );
  res.json(rows);
};

/**
 * GET /api/users/:id
 * Hanya superadmin (gate di middleware/route)
 */
exports.getOne = async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await pool.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id=? LIMIT 1',
    [id]
  );
  const user = rows[0];
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

/**
 * PATCH /api/users/:id
 * Update name/email/role (optional). Hanya superadmin.
 */
exports.update = async (req, res) => {
  const id = Number(req.params.id);
  const { name, email, role } = req.body || {};
  const updates = [];
  const params = [];

  if (name) { updates.push('name=?'); params.push(name); }
  if (email) { updates.push('email=?'); params.push(email); }
  if (role)  { updates.push('role=?');  params.push(role === 'superadmin' ? 'superadmin' : 'admin'); }

  if (updates.length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  try {
    params.push(id);
    const [r] = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id=?`,
      params
    );
    if (r.affectedRows === 0) return res.status(404).json({ message: 'User not found' });

    const [rows2] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id=? LIMIT 1',
      [id]
    );
    res.json(rows2[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email already exists' });
    }
    throw err;
  }
};

/**
 * PATCH /api/users/:id/password
 * Ganti password user (oleh superadmin). Atau bisa kamu pakai untuk "reset password".
 */
exports.changePassword = async (req, res) => {
  const id = Number(req.params.id);
  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'newPassword min 8 chars' });
  }
  const hash = await bcrypt.hash(newPassword, 10);
  const [r] = await pool.query(
    'UPDATE users SET password_hash=? WHERE id=?',
    [hash, id]
  );
  if (r.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
  res.json({ ok: true });
};

/**
 * DELETE /api/users/:id
 * Hanya superadmin.
 */
exports.remove = async (req, res) => {
  const id = Number(req.params.id);
  const [r] = await pool.query('DELETE FROM users WHERE id=?', [id]);
  if (r.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
  res.json({ ok: true });
};
