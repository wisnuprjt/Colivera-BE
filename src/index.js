// Load environment variables dari file .env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

// =====================
// Middleware global
// =====================

// CORS -> supaya Frontend (misal: Next.js di localhost:3000) bisa akses API ini
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  credentials: true
}));

// Body parser JSON -> supaya req.body bisa langsung dipakai (POST, PATCH, dsb)
app.use(express.json());

// Cookie parser -> supaya backend bisa baca & set cookie (dipakai untuk JWT token)
app.use(cookieParser());

// =====================
// Health check route
// =====================
// Bisa dipakai cek cepat apakah server hidup
app.get('/health', (_, res) => res.json({ ok: true, service: 'colivera-be' }));

// =====================
// Routes utama
// =====================
// /api        -> default router (tes /api)
// /api/auth   -> login, logout, cek profil
// /api/users  -> user management (hanya superadmin)
app.use('/api', require('./routes'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/users.routes'));

// =====================
// Jalankan server
// =====================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`BE running on http://localhost:${PORT}`));
