const pool = require('../models/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ message: 'Bad payload' });

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email=? LIMIT 1',
      [email]
    );
    const user = rows[0];
    if (!user)
      return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok)
      return res.status(401).json({ message: 'Invalid credentials' });

    // ===== BUAT TOKEN JWT =====
    const payload = {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'colivera_secret_key',
      { expiresIn: '1h' } // Access token: 1 jam
    );

    // ===== BUAT REFRESH TOKEN =====
    const refreshToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.REFRESH_TOKEN_SECRET || 'colivera_refresh_secret_key',
      { expiresIn: '7d' } // Refresh token: 7 hari
    );

    // ===== SIMPAN TOKEN KE COOKIE (untuk frontend) =====
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });

    // ===== KIRIM RESPONSE KE CLIENT (FE & Postman) =====
    res.status(200).json({
      success: true,
      token, // 🧩 dikirim agar Postman / FE bisa pakai Authorization header
      user: payload,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// =============================
// GET /api/auth/me
// =============================
// =============================
// GET /api/auth/me
// =============================
exports.me = async (req, res) => {
  try {
    if (!req.userId)
      return res.status(401).json({ message: "Unauthorized" });

    // ✅ tambahkan created_at dan updated_at agar FE bisa tahu kapan akun dibuat
    const [rows] = await pool.query(
      `SELECT id, name, email, role, created_at, updated_at 
       FROM users 
       WHERE id = ? AND is_deleted = 0 
       LIMIT 1`,
      [req.userId]
    );

    const user = rows[0];
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({
      success: true,
      user, // sudah berisi created_at
    });
  } catch (e) {
    console.error("me error", e);
    return res.status(500).json({ message: "Internal error" });
  }
};


// =============================
// POST /api/auth/logout
// =============================
exports.logout = async (req, res) => {
  try {
    res.clearCookie('token', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (e) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// =============================
// POST /api/auth/refresh
// Manual refresh token endpoint (opsional)
// =============================
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token not found' });
    }

    // Verifikasi refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET || 'colivera_refresh_secret_key'
    );

    // Buat access token baru
    const newAccessToken = jwt.sign(
      { id: decoded.id, role: decoded.role },
      process.env.JWT_SECRET || 'colivera_secret_key',
      { expiresIn: '1h' }
    );

    // Set cookie baru
    res.cookie('token', newAccessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });

    res.json({
      success: true,
      token: newAccessToken,
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(403).json({ message: 'Invalid refresh token' });
  }
};
