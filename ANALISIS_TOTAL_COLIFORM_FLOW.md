# 📋 ANALISIS FLOW TOTAL COLIFORM & DAMPAK HAPUS FILE CRON

## 🔴 KONDISI SAAT INI (AKTUAL)

### Status File Cron:
```
✅ AKTIF   → ai-prediction-sync.cron.js     (dipanggil di index.js line 75)
❌ TIDAK   → sensor-data-sync.cron.js       (NOT CALLED)
❌ TIDAK   → sensor-sync.cron.js            (NOT CALLED)
```

### Yang Running Sekarang:
**HANYA 1 cron job**: `ai-prediction-sync.cron.js` setiap 20 detik

---

## 📊 CARA KERJA FLOW PENYIMPANAN TOTAL COLIFORM

### Timeline: Setiap 20 detik

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: FETCH /api/latest dari HuggingFace                      │
│ ────────────────────────────────────────────────────────────────│
│ Response struktur:                                              │
│ {                                                               │
│   "timestamp": "2025-12-26T12:56:53Z",                          │
│   "sensor_data": {                                              │
│     "temp_c": 25.5,                                             │
│     "do_mgl": 7.2,                                              │
│     "ph": 7.1,                                                  │
│     "conductivity_uscm": 450,                                   │
│     "totalcoliform_mv": 0.005      ← RAW SENSOR VALUE          │
│   },                                                            │
│   "prediction": {                                               │
│     "total_coliform_mv": 0.123     ← AI PREDICTED VALUE        │
│   }                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: CEK SENSOR_DATA (Apakah sudah ada?)                     │
│ ────────────────────────────────────────────────────────────────│
│ Query: SELECT id FROM sensor_data WHERE timestamp = ?           │
│                                                                 │
│ Jika SUDAH ADA:                    Jika BELUM ADA:             │
│  → Gunakan ID yang existing         → INSERT sensor_data baru   │
│  → sensorDataId = 2975              → sensorDataId = 3001      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: SIMPAN KE total_coliform (RAW SENSOR)                   │
│ ────────────────────────────────────────────────────────────────│
│ Kondisi: totalcoliform_mv dari sensor_data adalah 0.005         │
│                                                                 │
│ Hitung status:                                                  │
│  • Jika ≤0.70 → "Aman"  ✅                                      │
│  • Jika 0.71-0.99 → "Waspada" ⚠️                                │
│  • Jika ≥1.0 → "Bahaya" 🔴                                      │
│                                                                 │
│ Karena 0.005 ≤ 0.70 → Status: "Aman"                           │
│                                                                 │
│ INSERT INTO total_coliform                                     │
│   (sensor_data_id, mpn_value, status, timestamp)               │
│ VALUES                                                          │
│   (3001, 0.005, "Aman", "2025-12-26T12:56:53Z")               │
│                                                                 │
│ ⚠️ TAPI SEBELUMNYA CEK DULU:                                    │
│   SELECT id FROM total_coliform                                │
│   WHERE sensor_data_id = 3001                                  │
│   → Jika ada 0 rows: INSERT ✅                                  │
│   → Jika ada 1+ rows: SKIP (untuk avoid duplikat)              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: SIMPAN KE total_coliform_ai_prediction (AI PREDICTED)   │
│ ────────────────────────────────────────────────────────────────│
│ Kondisi: total_coliform_mv dari prediction adalah 0.123         │
│                                                                 │
│ Hitung status:                                                  │
│  • Karena 0.123 ≤ 0.70 → Status: "Aman"                        │
│                                                                 │
│ CEK DULU (BEDA DENGAN total_coliform!):                         │
│   SELECT id FROM total_coliform_ai_prediction                  │
│   WHERE sensor_data_id = 3001                                  │
│   → Jika ada 1+ rows: SKIP & RETURN (JANGAN lanjut)            │
│                                                                 │
│ Jika belum ada, INSERT:                                         │
│   INSERT INTO total_coliform_ai_prediction                     │
│     (sensor_data_id, mpn_value, status, timestamp)             │
│   VALUES                                                        │
│     (3001, 0.123, "Aman", "2025-12-26T12:56:53Z")              │
│                                                                 │
│ ✅ Jika sudah ada → SKIP & STOP proses (PENTING!)              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📌 PERBEDAAN ANTARA total_coliform & total_coliform_ai_prediction

| Tabel | Sumber | Value | Dihitung dari |
|-------|--------|-------|---------------|
| `total_coliform` | Raw Sensor | `sensorData.totalcoliform_mv` (millivolt) | IoT Device langsung |
| `total_coliform_ai_prediction` | AI Model | `prediction.total_coliform_mv` (MPN) | HuggingFace AI prediction |

**Contoh dari `/api/latest`:**
```
Sensor data: { totalcoliform_mv: 0.005 mV }  ← RAW dari IoT
                        ↓
           (stored di total_coliform)
                        
Prediction:  { total_coliform_mv: 0.123 MPN }  ← AI processed
                        ↓
           (stored di total_coliform_ai_prediction)
```

---

## ⚠️ DAMPAK JIKA HAPUS FILE DEPRECATED

### SKENARIO 1: Hapus `sensor-data-sync.cron.js`
```
❌ Dampak: TIDAK ADA

Alasan:
  • File ini TIDAK DIPANGGIL di index.js
  • Hanya file backup/deprecated yang tidak terpakai
  • Sistem tetap berjalan normal dengan ai-prediction-sync.cron.js
  
✅ Rekomendasi: BOLEH dihapus (cleanup)
```

---

### SKENARIO 2: Hapus `sensor-sync.cron.js`
```
❌ Dampak: TIDAK ADA

Alasan:
  • File ini TIDAK DIPANGGIL di index.js
  • Hanya file backup yang tidak terpakai
  • Sistem tetap berjalan normal dengan ai-prediction-sync.cron.js
  
✅ Rekomendasi: BOLEH dihapus (cleanup)
```

---

### SKENARIO 3: Hapus `ai-prediction-sync.cron.js` (JANGAN!)
```
🔴 DAMPAK PARAH: SISTEM BERHENTI

Alasan:
  • File ini SATU-SATUNYA yang dipanggil di index.js (line 75)
  • Tanpa ini:
    ❌ TIDAK ada sync sensor_data
    ❌ TIDAK ada sync total_coliform
    ❌ TIDAK ada sync total_coliform_ai_prediction
    ❌ Dashboard menampilkan data lama/basi
    ❌ Notifikasi sensor offline tidak terdeteksi (inactivity.cron tetap jalan, tapi data kosong)

🚨 CRITICAL: JANGAN dihapus!
```

---

## 🔍 ALUR DATA SAAT INI (REAL SCENARIO)

### Waktu T=0s: Request pertama
```
GET /api/latest
├─ Fetch sensor & prediction
├─ Check sensor_data (timestamp: 12:56:53) → NOT EXISTS
├─ INSERT sensor_data ID=3001
├─ Check total_coliform (sensor_data_id: 3001) → NOT EXISTS
├─ INSERT total_coliform (3001, 0.005, "Aman")
├─ Check total_coliform_ai_prediction (sensor_data_id: 3001) → NOT EXISTS
├─ INSERT total_coliform_ai_prediction (3001, 0.123, "Aman")
└─ ✅ BERHASIL - Data inserted 1x
```

### Waktu T=20s: Request kedua (timestamp SAMA)
```
GET /api/latest (masih 12:56:53 karena sensor belum update)
├─ Fetch sensor & prediction
├─ Check sensor_data (timestamp: 12:56:53) → EXISTS! ID=3001
├─ Reuse sensorDataId = 3001
├─ Check total_coliform (sensor_data_id: 3001) → EXISTS! (dari T=0s)
├─ SKIP INSERT total_coliform ✓ (avoid duplikat)
├─ Check total_coliform_ai_prediction (sensor_data_id: 3001) → EXISTS! (dari T=0s)
├─ ❌ RETURN / SKIP ← PENTING! Jangan lanjut INSERT
└─ ✅ SMART - Data tidak duplikat
```

### Waktu T=40s: Request ketiga (timestamp BARU)
```
GET /api/latest (sensor update: 12:56:59)
├─ Fetch sensor & prediction
├─ Check sensor_data (timestamp: 12:56:59) → NOT EXISTS
├─ INSERT sensor_data ID=3002
├─ Check total_coliform (sensor_data_id: 3002) → NOT EXISTS
├─ INSERT total_coliform (3002, 0.008, "Aman")
├─ Check total_coliform_ai_prediction (sensor_data_id: 3002) → NOT EXISTS
├─ INSERT total_coliform_ai_prediction (3002, 0.145, "Aman")
└─ ✅ BERHASIL - Data baru inserted
```

---

## 🐛 MENGAPA MASIH ADA DUPLIKAT DI DATABASE?

Lihat di screenshot (26 Des 2025, 13:46:59 ada 8 duplikat):

### Kemungkinan Penyebab:

#### 1️⃣ **Race Condition**
```
T=0.00s: Proses A check sensor_data (timestamp 12:56:53) → NOT EXISTS
T=0.01s: Proses B check sensor_data (timestamp 12:56:53) → NOT EXISTS
T=0.02s: Proses A INSERT sensor_data → OK
T=0.03s: Proses B INSERT sensor_data → DUPLIKAT! ← Sebelum A selesai
```

#### 2️⃣ **Timezone Mismatch**
```
HuggingFace mengirim: "2025-12-26T12:56:53.000Z"   (UTC)
Database menyimpan:   "2025-12-26 12:56:53"        (UTC+7 lokal)
Saat check timestamp:  Dianggap BERBEDA!
Result: Duplikat insert ❌
```

#### 3️⃣ **Database Connection Issues**
```
INSERT berhasil tapi connection timeout sebelum response diterima
→ Proses retry & INSERT lagi
→ Duplikat data
```

#### 4️⃣ **Old Code Running**
```
Kalau ada 2 proses Node.js yang jalan:
- Process 1: ai-prediction-sync.cron.js ← ACTIVE
- Process 2: sensor-sync.cron.js ← DEPRECATED tapi masih running!
→ Keduanya INSERT data → DUPLIKAT BESAR-BESARAN
```

**INI YANG KEMUNGKINAN TERJADI!**

---

## ✅ SOLUSI DUPLIKAT

### 1. Gunakan UNIQUE CONSTRAINT (Database Level)
```sql
ALTER TABLE total_coliform 
ADD UNIQUE KEY unique_sensor_data (sensor_data_id);

ALTER TABLE total_coliform_ai_prediction 
ADD UNIQUE KEY unique_sensor_ai (sensor_data_id);
```

### 2. Gunakan INSERT IGNORE atau ON DUPLICATE
```javascript
// Instead of:
await pool.query(
  `INSERT INTO total_coliform (sensor_data_id, mpn_value, status, timestamp)
   VALUES (?, ?, ?, ?)`,
  [sensorDataId, sensorMpnValue, sensorStatus, apiData.timestamp]
);

// Use:
await pool.query(
  `INSERT INTO total_coliform (sensor_data_id, mpn_value, status, timestamp)
   VALUES (?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE
   mpn_value = VALUES(mpn_value),
   status = VALUES(status),
   timestamp = VALUES(timestamp)`,
  [sensorDataId, sensorMpnValue, sensorStatus, apiData.timestamp]
);
```

### 3. Hapus File Deprecated
```bash
rm tools/sensor-sync.cron.js
rm tools/sensor-data-sync.cron.js
```

### 4. Pastikan Hanya 1 Instance Node.js
```bash
# Check running Node processes
tasklist | findstr node

# Kill semua kecuali 1
taskkill /PID <PID> /F
```

---

## 📊 DATA DI DASHBOARD

Ketika klik "Total Coliform":
```
Frontend request: GET /api/coliform/history?limit=10

Backend query:
  SELECT * FROM total_coliform
  ORDER BY timestamp DESC
  LIMIT 10
  
Result ditampilkan di table dengan columns:
  - timestamp (dari API)
  - mpn_value (raw sensor data)
  - status (calculated dari mpn_value)
```

**Kalau ada duplikat di database, dashboard menampilkan duplikat itu juga!**

---

## 🎯 RINGKASAN

| Pertanyaan | Jawaban |
|-----------|---------|
| Apa terjadi hapus sensor-sync.cron.js? | ✅ Aman, tidak ada dampak (sudah deprecated) |
| Apa terjadi hapus sensor-data-sync.cron.js? | ✅ Aman, tidak ada dampak (sudah deprecated) |
| Apa terjadi hapus ai-prediction-sync.cron.js? | 🔴 FATAL! Sistem berhenti total |
| Bagaimana total_coliform disimpan? | Dari raw sensor value dalam /api/latest |
| Bagaimana ai_prediction disimpan? | Dari AI predicted value dalam /api/latest |
| Kenapa ada duplikat? | Race condition + timezone + old process running |
| Solusi duplikat? | UNIQUE constraint + DELETE duplikat existing + hapus deprecated cron |
