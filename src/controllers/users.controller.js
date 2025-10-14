const pool = require("../models/db");
const bcrypt = require("bcrypt");

/**
 * POST /api/users
 * Buat user baru (SuperAdmin only)
 */
exports.create = async (req, res) => {
  const { name, email, password, role = "admin" } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: "name/email/password required" });
  }

  const safeRole = role === "superadmin" ? "superadmin" : "admin";
  const hash = await bcrypt.hash(password, 10);

  try {
    const [r] = await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [name, email, hash, safeRole]
    );

    // Audit log
    await pool.query(
      "INSERT INTO audit_logs (actor_id, target_user_id, action, meta) VALUES (?, ?, 'CREATE', ?)",
      [req.userId, r.insertId, JSON.stringify({ name, email, role: safeRole })]
    );

    res.status(201).json({ id: r.insertId, name, email, role: safeRole });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Email already exists" });
    }
    throw err;
  }
};

/**
 * GET /api/users
 * List semua user (kecuali yang soft-deleted)
 */
exports.list = async (_req, res) => {
  const [rows] = await pool.query(
    "SELECT id, name, email, role, is_deleted, created_at, updated_at FROM users WHERE is_deleted=0 ORDER BY id DESC"
  );
  res.json(rows);
};

/**
 * GET /api/users/:id
 */
exports.getOne = async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await pool.query(
    "SELECT id, name, email, role, is_deleted, created_at, updated_at FROM users WHERE id=? AND is_deleted=0 LIMIT 1",
    [id]
  );
  const user = rows[0];
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
};

/**
 * PATCH /api/users/:id
 * Update name/email/role
 */
exports.update = async (req, res) => {
  const id = Number(req.params.id);
  const { name, email, role } = req.body || {};
  const updates = [];
  const params = [];

  if (name) { updates.push("name=?"); params.push(name); }
  if (email) { updates.push("email=?"); params.push(email); }
  if (role)  { updates.push("role=?"); params.push(role === "superadmin" ? "superadmin" : "admin"); }

  if (updates.length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }

  updates.push("updated_at=NOW()");
  params.push(id);

  try {
    const [r] = await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id=? AND is_deleted=0`,
      params
    );
    if (r.affectedRows === 0) return res.status(404).json({ message: "User not found" });

    // Audit log
    await pool.query(
      "INSERT INTO audit_logs (actor_id, target_user_id, action, meta) VALUES (?, ?, 'UPDATE', ?)",
      [req.userId, id, JSON.stringify(Object.keys(req.body))]
    );

    const [rows2] = await pool.query(
      "SELECT id, name, email, role, created_at, updated_at FROM users WHERE id=? LIMIT 1",
      [id]
    );
    res.json(rows2[0]);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Email already exists" });
    }
    throw err;
  }
};

/**
 * PATCH /api/users/:id/password
 * Reset / ganti password user
 */
exports.changePassword = async (req, res) => {
  const id = Number(req.params.id);
  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: "newPassword min 8 chars" });
  }
  const hash = await bcrypt.hash(newPassword, 10);
  const [r] = await pool.query(
    "UPDATE users SET password_hash=?, updated_at=NOW() WHERE id=? AND is_deleted=0",
    [hash, id]
  );
  if (r.affectedRows === 0) return res.status(404).json({ message: "User not found" });

  // Audit log
  await pool.query(
    "INSERT INTO audit_logs (actor_id, target_user_id, action) VALUES (?, ?, 'RESET_PASSWORD')",
    [req.userId, id]
  );

  res.json({ ok: true });
};

/**
 * DELETE /api/users/:id
 * Soft delete user
 */
exports.remove = async (req, res) => {
  const id = Number(req.params.id);
  const [r] = await pool.query(
    "UPDATE users SET is_deleted=1, updated_at=NOW() WHERE id=? AND is_deleted=0",
    [id]
  );
  if (r.affectedRows === 0) return res.status(404).json({ message: "User not found" });

  // Audit log
  await pool.query(
    "INSERT INTO audit_logs (actor_id, target_user_id, action) VALUES (?, ?, 'DELETE')",
    [req.userId, id]
  );

  res.json({ ok: true });
};
