// src/middleware/role.js
const pool = require("../models/db");

/**
 * Middleware RBAC (Role-Based Access Control)
 * @param {string[]} allowed - daftar role yang diizinkan
 */
module.exports = (allowed = []) => async (req, res, next) => {
  try {
    // 1. Jika middleware auth sudah attach user lengkap ke req.user
    if (req.user) {
      if (!allowed.includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      return next();
    }

    // 2. Jika hanya ada req.userId (misal dari JWT minimal payload)
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Query pakai mysql2 pool
    const [rows] = await pool.query(
      "SELECT id, role FROM users WHERE id=? AND is_deleted=0 LIMIT 1",
      [req.userId]
    );
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!allowed.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // attach user role supaya bisa dipakai di controller
    req.user = user;
    next();
  } catch (e) {
    console.error("role guard error", e);
    res.status(500).json({ message: "Internal error", detail: e.message });
  }
};
