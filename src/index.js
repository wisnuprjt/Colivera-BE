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

const app = express();

// =====================
// Middleware Global
// =====================

// CORS → izinkan akses dari Frontend (Next.js, dll.)
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || "http://localhost:3000").split(","),
    credentials: true,
  })
);

// Body Parser JSON → agar req.body bisa dibaca di POST/PATCH
app.use(express.json());

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

// =====================
// Cron Jobs
// =====================
// Inisialisasi cron job untuk menangani user yang tidak aktif
require("../tools/inactivity.cron");


// =====================
// Setup Socket.IO Server
// =====================
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (process.env.CORS_ORIGIN || "http://localhost:3000").split(","),
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
server.listen(PORT, () =>
  console.log(`✅ COLIVERA-BE running with Socket.IO on http://localhost:${PORT}`)
);
