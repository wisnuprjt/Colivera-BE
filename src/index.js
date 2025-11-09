// =====================
// Load Environment Variables
// =====================
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");
const routes = require("./routes"); // <- index.js otomatis gabung semua route
const overrideRoutes = require("./routes/override.routes");

const app = express();

// =====================
// Middleware Global
// =====================

// CORS → izinkan akses dari Frontend (Next.js, dll.)
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(",").map(origin => origin.trim())
  : ["http://localhost:3000"]; // Fallback untuk development

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Body Parser JSON → agar req.body bisa dibaca di POST/PATCH
app.use(express.json());

// Error handler untuk JSON parse error
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('❌ Bad JSON:', err.message);
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid JSON format in request body' 
    });
  }
  next();
});

// Cookie Parser → supaya backend bisa baca cookie JWT
app.use(cookieParser());

// =====================
// Health Check Route
// =====================
app.get("/health", (_, res) =>
  res.json({ ok: true, service: "colivera-be" })
);

// =====================
// Routes Utama
// =====================
// Semua route dikumpulkan di /src/routes/index.js
app.use("/api", routes);
app.use("/api/override", overrideRoutes);
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/sensor", require("./routes/sensor.routes"));

// =====================
// Cron Jobs
// =====================
// Inisialisasi cron job untuk menangani user yang tidak aktif
require("../tools/inactivity.cron");

// Inisialisasi cron jobs untuk sync data
const { startAIPredictionSyncCron } = require("../tools/ai-prediction-sync.cron");
startAIPredictionSyncCron(); // Akan otomatis call sensor sync juga


// =====================
// Setup Socket.IO Server
// =====================
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Simpan instance IO secara global biar bisa dipanggil dari controller
global._io = io;

// Listener untuk koneksi client socket
io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
  });
});

// =====================
// Jalankan Server
// =====================
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`✅ COLIVERA-BE running with Socket.IO on port ${PORT}`);
  console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
});
