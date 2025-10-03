const jwt = require("jsonwebtoken");

module.exports = function auth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Simpan minimal yang dibutuhkan
    req.userId = decoded.id;
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
