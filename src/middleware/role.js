const db = require("../models/db");

module.exports = (allowed = []) => async (req, res, next) => {
  try {
    // Check if user is already attached to request (from previous middleware)
    if (req.user) {
      if (!allowed.includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      return next();
    }

    // If no user in request, fetch from database using userId
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await db("users").select("role").where({ id: req.userId }).first();
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (!allowed.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    next();
  } catch (e) {
    console.error("role guard error", e);
    res.status(500).json({ message: "Internal error" });
  }
};
