const pool = require("../models/db");
const jwt = require("jsonwebtoken");

module.exports = async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT role FROM users WHERE id=? LIMIT 1", [req.userId]);
    const dbRole = rows[0]?.role;

    if (dbRole && dbRole !== req.userRole) {
      // Buat token baru
      const newToken = jwt.sign(
        { id: req.userId, role: dbRole },
        process.env.JWT_SECRET || "colivera_secret_key",
        { expiresIn: "2h" }
      );

      res.cookie("token", newToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
      });

      console.log(`[SESSION SYNC] Role updated for user ${req.userId}: ${req.userRole} → ${dbRole}`);
    }

    next();
  } catch (err) {
    console.error("Session sync error:", err);
    next();
  }
};
