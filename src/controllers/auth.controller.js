const pool = require('../models/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Bad payload' });

  const [rows] = await pool.query('SELECT * FROM users WHERE email=? LIMIT 1', [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const payload = { id: user.id, role: user.role, name: user.name, email: user.email };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });

  // set cookie httpOnly (untuk FE)
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: false, path: '/' });
  res.json({ user: payload });
};

exports.me = async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1', [req.userId]);
    const user = rows[0];

    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  } catch (e) {
    console.error("me error", e);
    return res.status(500).json({ message: "Internal error" });
  }
};

exports.logout = async (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ ok: true });
};
