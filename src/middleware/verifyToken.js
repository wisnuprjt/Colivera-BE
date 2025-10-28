// ===============================
// Middleware: verifyToken.js
// Fungsi: Mengecek dan memverifikasi JWT token yang dikirim oleh client.
// Jika token valid → lanjut ke route berikutnya (next())
// Jika token expired → mencoba refresh token baru (jika tersedia)
// ===============================

const jwt = require("jsonwebtoken");

// Middleware utama
module.exports = (req, res, next) => {
  // Ambil token dari cookies (diset saat login)
  const token = req.cookies.token;
  const refreshToken = req.cookies.refreshToken; // ← tambahkan refresh token opsional

  // Jika tidak ada token sama sekali
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    // ✅ Verifikasi token utama
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "colivera_secret_key");

    // Simpan informasi user di objek req untuk digunakan di route berikutnya
    req.userId = decoded.id;
    req.userRole = decoded.role;

    // Jika semua ok → lanjut ke next middleware / route
    return next();

  } catch (err) {
    console.error("JWT Verify Error:", err);

    // ===============================
    // 🔄 Jika token sudah expired, coba refresh otomatis
    // ===============================
    if (err.name === "TokenExpiredError") {
      // Jika refresh token tidak ada, kirim 401
      if (!refreshToken) {
        return res.status(401).json({ message: "Session expired, please login again." });
      }

      try {
        // Verifikasi refresh token
        const decodedRefresh = jwt.verify(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET || "colivera_refresh_secret_key"
        );

        // Buat token baru (access token)
        const newAccessToken = jwt.sign(
          { id: decodedRefresh.id, role: decodedRefresh.role },
          process.env.JWT_SECRET || "colivera_secret_key",
          { expiresIn: "1h" } // masa hidup access token baru
        );

        // Kirim token baru ke cookies supaya otomatis dipakai
        res.cookie("token", newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
        });

        // Masukkan user info dari refresh token
        req.userId = decodedRefresh.id;
        req.userRole = decodedRefresh.role;

        console.log("✅ Access token refreshed automatically");
        return next(); // lanjut ke route

      } catch (refreshErr) {
        console.error("Refresh Token Error:", refreshErr);
        return res.status(403).json({ message: "Invalid refresh token, please login again." });
      }
    }

    // ===============================
    // ❌ Jika error lain (token invalid, salah format, dll)
    // ===============================
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};
