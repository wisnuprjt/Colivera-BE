const pool = require("../models/db");
const jwt = require("jsonwebtoken");

module.exports = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT role, is_deleted FROM users WHERE id=? LIMIT 1", 
      [req.userId]
    );
    
    const user = rows[0];
    
    // ✅ CEK: Jika user sudah dihapus (soft delete)
    if (!user || user.is_deleted === 1) {
      console.log(`[SESSION INVALID] User ${req.userId} has been deleted. Force logout.`);
      
      // Hapus cookie token
      res.clearCookie("token", { path: "/" });
      res.clearCookie("refreshToken", { path: "/" });
      
      // Kirim response 401 dengan flag khusus
      return res.status(401).json({ 
        success: false,
        message: "Akun Anda telah dinonaktifkan oleh administrator.",
        accountDeleted: true,  // Flag khusus untuk frontend
        forceLogout: true
      });
    }

    const dbRole = user.role;

    // ✅ Sinkronisasi role jika berubah
    if (dbRole && dbRole !== req.userRole) {
      // Buat token baru dengan role yang updated
      const newToken = jwt.sign(
        { id: req.userId, role: dbRole },
        process.env.JWT_SECRET || "colivera_secret_key",
        { expiresIn: "1h" }
      );

      res.cookie("token", newToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
      });

      console.log(`[SESSION SYNC] Role updated for user ${req.userId}: ${req.userRole} → ${dbRole}`);
      
      // Update req.userRole untuk request ini
      req.userRole = dbRole;
    }

    next();
  } catch (err) {
    console.error("Session sync error:", err);
    // Jika error database, tetap lanjut (jangan block request)
    next();
  }
};
