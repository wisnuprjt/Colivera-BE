# Colivera Backend - Sensor Sync Cron Job

## 📋 Deskripsi
Cron job untuk otomatis mengambil data sensor dari HuggingFace API dan menyimpannya ke database secara berkala.

## 🎯 Fungsi Utama
1. **Auto Fetch Data**: Mengambil data sensor terbaru dari API Gary di HuggingFace
2. **Auto Save**: Menyimpan data ke table `sensor_data` 
3. **AI Prediction**: Menjalankan prediksi AI dan simpan ke `ai_predictions`
4. **Total Coliform**: Menyimpan hasil ke `total_coliform` dengan status
5. **Duplicate Check**: Mencegah data duplikat berdasarkan timestamp

## ⚙️ Konfigurasi

### Environment Variables
Tambahkan di file `.env`:

```env
# Interval sync dalam menit (default: 1 menit)
SENSOR_SYNC_INTERVAL=1
```

### Ubah Interval Sync
- **1 menit** (realtime, banyak request): `SENSOR_SYNC_INTERVAL=1`
- **5 menit** (balanced): `SENSOR_SYNC_INTERVAL=5`
- **15 menit** (hemat resource): `SENSOR_SYNC_INTERVAL=15`

## 🚀 Cara Menjalankan

### Opsi 1: Standalone (Recommended untuk Production)
Jalankan cron job di terminal terpisah:

```bash
npm run cron:sensor
```

### Opsi 2: Integrate dengan Main Server
Tambahkan di `src/index.js`:

```javascript
// Import cron job
const { startSensorSyncCron } = require("../tools/sensor-sync.cron");

// Start cron setelah server berjalan
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start sensor sync cron job
  startSensorSyncCron();
});
```

### Opsi 3: Pakai PM2 (Production)
Buat file `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: "colivera-api",
      script: "./src/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "sensor-sync-cron",
      script: "./tools/sensor-sync.cron.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
```

Jalankan dengan:
```bash
pm2 start ecosystem.config.js
pm2 logs sensor-sync-cron
```

## 📊 Log Output

Contoh log saat cron berjalan:

```
🚀 ========================================
🤖 SENSOR SYNC CRON JOB STARTED
⏱️  Sync interval: Every 1 minute(s)
🔗 API URL: https://gary29-water-quality-ai.hf.space/iot/latest
🚀 ========================================

📡 [2025-11-08T10:30:00.000Z] Starting sensor data sync...
🔄 Fetching data from HuggingFace API...
✅ Data received from API: { temp_c: 27.8, do_mgl: 7.0, ph: 123.0, ... }
💾 Sensor data saved to database with ID: 1234
🤖 Running AI prediction...
🎯 AI Prediction saved: AMAN ✅ (confidence: 95.2%)
📊 Total coliform data saved with status: Normal
✅ Sensor sync completed successfully
```

## 🛠️ Troubleshooting

### Error: Timeout
```
⏱️  Timeout: HuggingFace Space might be in cold start
```
**Solusi**: HuggingFace Space sedang cold start, tunggu beberapa menit atau tingkatkan timeout.

### Error: Connection Refused
```
🔌 Connection error: Cannot reach HuggingFace API
```
**Solusi**: 
- Cek koneksi internet
- Pastikan URL API benar
- Cek status HuggingFace Space

### Data Duplikat
Cron job otomatis skip data dengan timestamp yang sama.

## 📈 Monitoring

### Cek Log Realtime
```bash
npm run cron:sensor
```

### Cek Database
```sql
-- Lihat data sensor terbaru
SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 10;

-- Lihat AI predictions terbaru
SELECT * FROM ai_predictions ORDER BY prediction_timestamp DESC LIMIT 10;

-- Lihat total coliform terbaru
SELECT * FROM total_coliform ORDER BY timestamp DESC LIMIT 10;
```

## 🔧 Development

### Test Manual Sync
Bisa panggil function langsung:

```javascript
const { syncSensorData } = require('./tools/sensor-sync.cron');

// Jalankan sekali
syncSensorData();
```

### Debugging
Set environment variable untuk verbose logging:

```bash
DEBUG=* npm run cron:sensor
```

## 📝 Notes

- Cron job akan jalan **setiap X menit** sesuai `SENSOR_SYNC_INTERVAL`
- Data disimpan ke 3 table: `sensor_data`, `ai_predictions`, `total_coliform`
- Duplicate check berdasarkan `timestamp` dari API
- Timeout default: 15 detik per request
- AI prediction berjalan otomatis setelah data sensor disimpan

## 🚀 Deployment

### Hosting dengan PM2
1. Install PM2: `npm install -g pm2`
2. Start: `pm2 start tools/sensor-sync.cron.js --name sensor-sync`
3. Auto-restart on boot: `pm2 startup` dan `pm2 save`
4. Monitor: `pm2 monit`

### Hosting dengan Docker
Tambahkan di `docker-compose.yml`:

```yaml
services:
  sensor-cron:
    build: .
    command: npm run cron:sensor
    restart: always
    env_file: .env
    depends_on:
      - mysql
```

---

**Made with ❤️ for Colivera Water Quality Monitoring System**
