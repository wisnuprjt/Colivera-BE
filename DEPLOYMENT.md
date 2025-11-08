# 🚀 Colivera Backend - Deployment Guide

## 📋 Quick Start

### Development Mode
```bash
# Install dependencies
npm install

# Start server with nodemon (auto-reload)
npm run dev
```

Server akan jalan di `http://localhost:4000` dengan:
- ✅ Auto sensor sync setiap 1 menit
- ✅ Inactivity monitoring
- ✅ Socket.IO realtime updates

---

## 🔧 Environment Setup

1. **Copy `.env.example` ke `.env`**:
```bash
cp .env.example .env
```

2. **Edit `.env` dengan konfigurasi Anda**:
```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=colivera_db

# JWT
JWT_SECRET=your_secret_key_here

# Cron Job
SENSOR_SYNC_INTERVAL=1  # Sync every 1 minute
INACTIVITY_MINUTES=5    # Alert after 5 minutes no data
```

---

## 🤖 Cron Job - Sensor Sync

### Apa itu Sensor Sync?
Cron job yang otomatis:
1. Fetch data sensor dari HuggingFace API
2. Simpan ke database (`sensor_data` table)
3. Jalankan AI prediction
4. Simpan hasil ke `ai_predictions` dan `total_coliform`

### Cara Kerja
```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Cron Job  │─────>│ HuggingFace  │─────>│   Database   │
│ (setiap 1') │      │     API      │      │   (MySQL)    │
└─────────────┘      └──────────────┘      └──────────────┘
```

### Opsi Menjalankan

#### **Opsi 1: Terintegrasi dengan Server** ✅ (Default, Recommended)
Cron job otomatis jalan saat server start:
```bash
npm run dev   # Development
npm start     # Production
```

Cron job sudah include di `src/index.js`:
```javascript
const { startSensorSyncCron } = require("../tools/sensor-sync.cron");
startSensorSyncCron();
```

#### **Opsi 2: Standalone Process** (Buka terminal terpisah)
```bash
npm run cron:sensor
```

Gunakan opsi ini jika:
- Mau monitoring log cron job secara terpisah
- Server dan cron job perlu resource management berbeda

---

## 📊 Monitoring

### Cek Log Server
```bash
npm run dev
```

Output yang normal:
```
✅ COLIVERA-BE running with Socket.IO on http://localhost:4000
🚀 SENSOR SYNC CRON JOB STARTED
⏱️  Sync interval: Every 1 minute(s)
📡 Starting sensor data sync...
✅ Data received from API
💾 Sensor data saved to database with ID: 123
🤖 Running AI prediction...
🎯 AI Prediction saved: AMAN ✅
✅ Sensor sync completed successfully
```

### Cek Database
```sql
-- Data sensor terbaru
SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 10;

-- AI predictions
SELECT 
  sd.timestamp,
  sd.temp_c,
  sd.ph,
  ap.potable,
  ap.confidence
FROM sensor_data sd
LEFT JOIN ai_predictions ap ON sd.id = ap.sensor_data_id
ORDER BY sd.timestamp DESC
LIMIT 10;

-- Total coliform status
SELECT * FROM total_coliform ORDER BY timestamp DESC LIMIT 10;
```

---

## 🚀 Production Deployment

### Option 1: PM2 Process Manager (Recommended)

**Install PM2**:
```bash
npm install -g pm2
```

**Start with PM2**:
```bash
pm2 start ecosystem.config.js
```

**Check status**:
```bash
pm2 status
pm2 logs colivera-api
pm2 monit
```

**Auto-start on server reboot**:
```bash
pm2 startup
pm2 save
```

**Stop/Restart**:
```bash
pm2 restart colivera-api
pm2 stop colivera-api
pm2 delete colivera-api
```

### Option 2: Docker

**Build image**:
```bash
docker build -t colivera-backend .
```

**Run container**:
```bash
docker run -d \
  --name colivera-api \
  -p 4000:4000 \
  --env-file .env \
  colivera-backend
```

**Check logs**:
```bash
docker logs -f colivera-api
```

### Option 3: Hosting Platforms

#### **Vercel / Netlify / Railway**
1. Push code ke GitHub
2. Connect repository
3. Set environment variables
4. Deploy

**Note**: Pastikan platform support **background jobs** untuk cron.

#### **VPS (DigitalOcean, AWS EC2, etc.)**
```bash
# Clone repository
git clone https://github.com/wisnuprjt/Colivera-BE.git
cd Colivera-BE

# Install dependencies
npm install

# Setup environment
cp .env.example .env
nano .env

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## ⚙️ Configuration

### Ubah Interval Sync
Edit `.env`:
```env
# Realtime (setiap 1 menit)
SENSOR_SYNC_INTERVAL=1

# Balanced (setiap 5 menit)
SENSOR_SYNC_INTERVAL=5

# Hemat resource (setiap 15 menit)
SENSOR_SYNC_INTERVAL=15
```

### Disable Cron Job
Comment out di `src/index.js`:
```javascript
// const { startSensorSyncCron } = require("../tools/sensor-sync.cron");
// startSensorSyncCron();
```

---

## 🔧 Troubleshooting

### Cron Job Tidak Jalan
**Check:**
1. Environment variable `SENSOR_SYNC_INTERVAL` sudah di-set?
2. Koneksi internet ke HuggingFace API OK?
3. Database connection OK?

**Test manual**:
```bash
npm run cron:sensor
```

### API Timeout
```
⏱️ Timeout: HuggingFace Space might be in cold start
```

**Solusi**: 
- HuggingFace Space perlu "wake up" (cold start)
- Tunggu 1-2 menit, cron akan retry otomatis
- Atau tingkatkan timeout di `sensor-sync.cron.js`

### Database Error
```
❌ Error during sensor sync: ER_ACCESS_DENIED_ERROR
```

**Solusi**:
- Check `.env` credentials
- Pastikan database `colivera_db` sudah dibuat
- Run migration: `node database/create-sensor-tables.js`

### Duplicate Data
Cron job otomatis skip data dengan timestamp sama, jadi aman.

---

## 📁 Project Structure

```
Colivera-BE/
├── src/
│   ├── index.js                 # Main server + cron init
│   ├── controllers/             # API controllers
│   │   ├── sensor.controller.js # Sensor endpoints
│   │   └── ...
│   ├── models/                  # Database models
│   │   ├── sensor.model.js      # Sensor data queries
│   │   └── ...
│   └── routes/                  # API routes
├── tools/
│   ├── sensor-sync.cron.js     # ⭐ Sensor sync cron job
│   └── inactivity.cron.js       # Inactivity monitoring
├── database/                    # DB migrations
├── .env                         # Environment variables
├── .env.example                 # Example env file
├── ecosystem.config.js          # PM2 configuration
├── package.json
└── DEPLOYMENT.md               # This file
```

---

## 🎯 Features

- ✅ Auto fetch sensor data dari HuggingFace API
- ✅ Auto save ke database MySQL
- ✅ AI prediction otomatis
- ✅ Realtime updates via Socket.IO
- ✅ Duplicate prevention
- ✅ Error handling & retry logic
- ✅ Production-ready dengan PM2
- ✅ Monitoring & logging

---

## 📞 Support

Jika ada masalah atau pertanyaan:
1. Check log error di console
2. Baca `CRON_README.md` untuk detail cron job
3. Check database apakah data masuk

---

**Made with ❤️ for Colivera Water Quality Monitoring System**
