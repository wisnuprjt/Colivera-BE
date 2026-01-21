# 🔄 VISUAL FLOW DIAGRAM: Total Coliform Storage

## Current System Architecture

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                    ┃
┃              HuggingFace AI Model                                 ┃
┃         (https://gary29-water-quality-ai...)                     ┃
┃                                                                    ┃
┃         ┌─────────────────────────────────────────┐               ┃
┃         │  /api/latest (20 detik)                 │               ┃
┃         │                                         │               ┃
┃         │  Response:                              │               ┃
┃         │  {                                      │               ┃
┃         │    timestamp: "2025-12-26T12:56:53Z"   │               ┃
┃         │    sensor_data: {                      │               ┃
┃         │      temp_c: 25.5                      │               ┃
┃         │      totalcoliform_mv: 0.005  ← RAW   │               ┃
┃         │    },                                  │               ┃
┃         │    prediction: {                       │               ┃
┃         │      total_coliform_mv: 0.123 ← AI    │               ┃
┃         │    }                                   │               ┃
┃         │  }                                      │               ┃
┃         └─────────────────────────────────────────┘               ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                              ↓
                    fetch(HUGGINGFACE_API_LATEST)
                              ↓
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                    ┃
┃              ai-prediction-sync.cron.js                           ┃
┃         (Berjalan setiap 20 detik)                                ┃
┃                                                                    ┃
┃         ✅ DIPANGGIL DI: src/index.js line 75                     ┃
┃                                                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                    ↓ runAIPrediction() ↓
         ┌──────────────┬──────────────┬──────────────┐
         ↓              ↓              ↓              ↓
    ┌─────────────┐
    │  STEP 1     │
    │ CEK/INSERT  │
    │ sensor_data │
    └──┬──────────┘
       │
       ├─ Query: SELECT id FROM sensor_data WHERE timestamp = ?
       │
       ├─ JIKA EXISTS:
       │    ├─ sensorDataId = 2975 (existing ID)
       │    └─ log: "Using existing sensor data ID"
       │
       └─ JIKA NOT EXISTS:
            ├─ INSERT INTO sensor_data
            ├─ sensorDataId = 3001 (new ID)
            └─ log: "Created new sensor data"
            
       ↓
    ┌─────────────────────┐
    │  STEP 2             │
    │ CEK/INSERT          │
    │ total_coliform      │
    │ (RAW SENSOR DATA)   │
    └──┬──────────────────┘
       │
       ├─ Dari: sensorData.totalcoliform_mv = 0.005 mV
       │
       ├─ Hitung status:
       │  • 0.005 ≤ 0.70 → "Aman" ✅
       │
       ├─ Query: SELECT id FROM total_coliform WHERE sensor_data_id = ?
       │
       ├─ JIKA NOT EXISTS:
       │    ├─ INSERT INTO total_coliform
       │    │    (sensor_data_id, mpn_value, status, timestamp)
       │    │ VALUES (3001, 0.005, "Aman", "2025-12-26T12:56:53Z")
       │    └─ log: "Total Coliform (Sensor) saved: 0.005 MPN - Aman"
       │
       └─ JIKA EXISTS:
            └─ SKIP (avoid duplikat)
            
       ↓
    ┌─────────────────────────────┐
    │  STEP 3                     │
    │ CEK AI PREDICTION           │
    │ total_coliform_ai_prediction│
    │ (AI PREDICTED DATA)         │
    └──┬──────────────────────────┘
       │
       ├─ Dari: prediction.total_coliform_mv = 0.123 MPN
       │
       ├─ Hitung status:
       │  • 0.123 ≤ 0.70 → "Aman" ✅
       │
       ├─ Query: SELECT id FROM total_coliform_ai_prediction WHERE sensor_data_id = ?
       │
       ├─ JIKA EXISTS (❌ IMPORTANT!):
       │    ├─ log: "AI Prediction for sensor_data_id already exists, skipping"
       │    └─ RETURN (STOP DI SINI! Jangan lanjut insert)
       │
       └─ JIKA NOT EXISTS:
            ├─ INSERT INTO total_coliform_ai_prediction
            │    (sensor_data_id, mpn_value, status, timestamp)
            │ VALUES (3001, 0.123, "Aman", "2025-12-26T12:56:53Z")
            └─ log: "Total Coliform (AI Prediction) saved: 0.123 MPN - Aman"
            
       ↓
    ✅ SYNC COMPLETED


==============================================================================

DATABASE (MySQL/MariaDB)

┌──────────────────────────────────────────────────────────────────────────┐
│                           sensor_data                                    │
├────┬──────────────────────┬────────┬───────┬────┬──────────┬──────────────┤
│ id │ timestamp            │ temp_c │ do... │ ph │ conduct..│ totalcol..mv │
├────┼──────────────────────┼────────┼───────┼────┼──────────┼──────────────┤
│3001│2025-12-26T12:56:53Z │ 25.5   │ 7.2   │7.1 │ 450      │ 0.005        │← RAW
│3002│2025-12-26T12:56:59Z │ 25.6   │ 7.3   │7.0 │ 451      │ 0.008        │
└────┴──────────────────────┴────────┴───────┴────┴──────────┴──────────────┘
     ↓ foreign key (sensor_data_id)
     
     
┌─────────────────────────────────────────────────────────────────────────┐
│              total_coliform                                             │
├────┬─────────────────┬──────────┬────────┬──────────────────────────────┤
│ id │sensor_data_id   │mpn_value │ status │ timestamp                    │
├────┼─────────────────┼──────────┼────────┼──────────────────────────────┤
│ 101│ 3001            │ 0.005    │ Aman   │ 2025-12-26T12:56:53Z        │← SENSOR RAW
│ 102│ 3002            │ 0.008    │ Aman   │ 2025-12-26T12:56:59Z        │
└────┴─────────────────┴──────────┴────────┴──────────────────────────────┘
     ↓ foreign key (sensor_data_id)


┌──────────────────────────────────────────────────────────────────────────┐
│            total_coliform_ai_prediction                                  │
├────┬─────────────────┬──────────┬────────┬──────────────────────────────┤
│ id │sensor_data_id   │mpn_value │ status │ timestamp                    │
├────┼─────────────────┼──────────┼────────┼──────────────────────────────┤
│ 501│ 3001            │ 0.123    │ Aman   │ 2025-12-26T12:56:53Z        │← AI PREDICTED
│ 502│ 3002            │ 0.145    │ Aman   │ 2025-12-26T12:56:59Z        │
└────┴─────────────────┴──────────┴────────┴──────────────────────────────┘


Relationship:
sensor_data [3001]
    ↓
    ├─→ total_coliform [101]        (dari sensor raw: 0.005 mV)
    └─→ total_coliform_ai_prediction [501]  (dari AI: 0.123 MPN)


==============================================================================

DEPRECATED CRON FILES (NOT USED)

❌ sensor-sync.cron.js
   • Not imported di index.js
   • Not called anywhere
   • ⚠️ Kalau ada developer yang jalankan manual → DUPLIKAT BESAR!
   • Recommendation: HAPUS

❌ sensor-data-sync.cron.js  
   • Not imported di index.js
   • Not called anywhere
   • ⚠️ Kalau ada developer yang jalankan manual → DUPLIKAT BESAR!
   • Recommendation: HAPUS


==============================================================================

COMPARISON: ai-prediction-sync VS sensor-sync VS sensor-data-sync

┌────────────────────────┬─────────────────────┬──────────────────┬────────────┐
│ File                   │ API Used            │ Saves             │ Status     │
├────────────────────────┼─────────────────────┼──────────────────┼────────────┤
│ai-prediction-sync.cron │ /api/latest         │ • sensor_data    │ ✅ ACTIVE  │
│                        │ (Complete response) │ • total_coliform │            │
│                        │                     │ • total_coliform │            │
│                        │                     │   _ai_prediction │            │
├────────────────────────┼─────────────────────┼──────────────────┼────────────┤
│sensor-sync.cron.js     │ /iot/latest +       │ • sensor_data    │ ❌ UNUSED  │
│                        │ /predict            │ • ai_prediction  │            │
│                        │ (2 requests)        │   (sendiri)      │            │
├────────────────────────┼─────────────────────┼──────────────────┼────────────┤
│sensor-data-sync.cron   │ /iot/latest         │ • sensor_data    │ ❌ UNUSED  │
│                        │ (Sensor only)       │   only!          │            │
└────────────────────────┴─────────────────────┴──────────────────┴────────────┘

BEST PRACTICE: 
  ✅ Keep: ai-prediction-sync.cron.js (SINGLE SOURCE OF TRUTH)
  ❌ Delete: sensor-sync.cron.js (DUPLICATE & CONFUSING)
  ❌ Delete: sensor-data-sync.cron.js (INCOMPLETE & UNUSED)
```

---

## 🎯 Answer to Your Questions

### Q1: Kalo di Hapus file cron yang deprecated (sensor-sync.cron.js, sensor-data-sync.cron.js) apa yg terjadi?

**Answer:**
```
✅ TIDAK ADA DAMPAK NEGATIF

Karena:
  • Files ini TIDAK dipanggil di index.js
  • System menggunakan HANYA ai-prediction-sync.cron.js
  • Hapus files = cleanup code
  
BAHKAN:
  • Mengurangi confusion (dev tidak tahu mana yang active)
  • Mengurangi risk duplikat (kalau dev jalankan yg salah)
  • Membuat codebase lebih clean

ACTION: ✅ BOLEH DIHAPUS
```

---

### Q2: Caranya Total Coliform menyimpan datanya gimana?

**Answer:**
```
STEP-BY-STEP:

1. HuggingFace /api/latest mengirim:
   {
     sensor_data: { totalcoliform_mv: 0.005 },  ← RAW millivolt
     prediction: { total_coliform_mv: 0.123 }   ← AI predicted MPN
   }

2. System cek: Apakah sensor_data dengan timestamp ini sudah ada?
   • Jika tidak: CREATE baru (INSERT)
   • Jika ya: REUSE existing ID

3. Simpan ke total_coliform:
   • Sumber: sensorData.totalcoliform_mv (0.005)
   • Hitung status berdasarkan value:
     - ≤0.70 → Aman
     - 0.71-0.99 → Waspada  
     - ≥1.0 → Bahaya
   • INSERT: INSERT INTO total_coliform 
             (sensor_data_id, mpn_value, status, timestamp)
     VALUES (3001, 0.005, "Aman", timestamp)

4. Simpan ke total_coliform_ai_prediction:
   • Sumber: prediction.total_coliform_mv (0.123)
   • Hitung status (sama seperti #3)
   • INSERT: INSERT INTO total_coliform_ai_prediction
             (sensor_data_id, mpn_value, status, timestamp)
     VALUES (3001, 0.123, "Aman", timestamp)

5. Cek duplikat:
   • Sebelum insert, check: apakah sensor_data_id ini sudah ada?
   • Jika ada: SKIP (untuk avoid duplikat)
   • Jika tidak: INSERT
   
HASIL:
  • 1 sensor_data record = 1 sensor reading
  • 1 total_coliform record = 1 sensor raw value
  • 1 total_coliform_ai_prediction record = 1 AI predicted value
  • All linked by sensor_data_id
```

---

## 🐛 Debug Duplikat yang Terlihat di Screenshot

Looking at your screenshot (26 Des 2025, 13:46:59 ada 8 rows):

```
POSSIBLE ROOT CAUSES:

1. ❌ Race Condition (Most Likely)
   T=0.00s: Check sensor_data (13:46:59) → NOT EXISTS
   T=0.01s: Check sensor_data (13:46:59) → NOT EXISTS (belum commit!)
   T=0.02s: Process A INSERT → OK
   T=0.03s: Process B INSERT → DUPLIKAT
   
   Result: Sensor data duplikat → total_coliform ikut duplikat

2. ❌ Old Process Still Running
   • Process 1: ai-prediction-sync.cron.js ✅
   • Process 2: sensor-sync.cron.js ❌ (jangan-jangan ini juga running!)
   • Process 3: npm start + nodemon (hot reload) ← malah restart berulang kali!
   
3. ❌ Timezone Mismatch  
   HuggingFace: "2025-12-26T13:46:59.000Z"
   Database:    "2025-12-26 13:46:59"  (disimpan tanpa Z)
   Check:       Dianggap BERBEDA → Insert duplikat
   
4. ❌ No UNIQUE Constraint
   Database tidak punya:
   ALTER TABLE total_coliform ADD UNIQUE (sensor_data_id)
   → Bisa insert berapa kali saja dengan sensor_data_id sama
```

Saya sudah buat file dokumentasi lengkap dengan diagram flow. Mau kita lanjut ke **solusi implementasi** untuk fix duplikat issue?
