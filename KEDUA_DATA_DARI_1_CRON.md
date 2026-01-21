# 🎯 YA! KEDUA DATA DISIMPAN DARI 1 FILE CRON YANG SAMA

## 📊 Flowchart Lengkap

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      ai-prediction-sync.cron.js                         │
│                     (Berjalan setiap 20 detik)                          │
└──────────────────────────────────────────────────────────────────────────┘
                                    ↓
                        ┌───────────────────────┐
                        │  Fetch /api/latest    │
                        │  dari HuggingFace     │
                        └───────────┬───────────┘
                                    ↓
              ┌─────────────────────────────────────────────┐
              │  Response dari /api/latest:                 │
              │  {                                          │
              │    timestamp: "2025-12-26T14:51:01Z"       │
              │    sensor_data: {                          │
              │      temp_c: 25.5,                         │
              │      totalcoliform_mv: 0.005  ← RAW SENSOR│
              │    },                                      │
              │    prediction: {                           │
              │      total_coliform_mv: 2849.890 ← AI     │
              │    }                                       │
              │  }                                         │
              └──────────────┬──────────────────────────────┘
                             ↓
        ┌────────────────────────────────────────────────────┐
        │  STEP 1: CEK & INSERT sensor_data                  │
        │  ────────────────────────────────────────────────  │
        │  INSERT INTO sensor_data                           │
        │  (timestamp, temp_c, do_mgl, ph,                   │
        │   conductivity_uscm, totalcoliform_mv)             │
        │  VALUES (...)                                      │
        │                                                    │
        │  Result: sensor_data.id = 5001                    │
        └────────────┬───────────────────────────────────────┘
                     ↓
    ┌─────────────────────────────────────────────────────────────┐
    │  STEP 2: CEK & INSERT total_coliform                        │
    │  ───────────────────────────────────────────────────────    │
    │  Data source: sensorData.totalcoliform_mv = 0.005           │
    │  Status hitung: 0.005 ≤ 0.70 → "Aman"                      │
    │                                                             │
    │  INSERT INTO total_coliform                                │
    │    (sensor_data_id, mpn_value, status, timestamp)          │
    │  VALUES                                                     │
    │    (5001, 0.005, "Aman", "2025-12-26T14:51:01Z")          │
    │                                                             │
    │  📊 INI DATA UNTUK:                                        │
    │  👉 "📋 Riwayat Pembacaan Terakhir Total Coliform"        │
    │  (ditampilkan di Total Coliform page)                      │
    └────────────┬──────────────────────────────────────────────┘
                 ↓
    ┌─────────────────────────────────────────────────────────────┐
    │  STEP 3: CEK AI PREDICTION & INSERT                         │
    │  ───────────────────────────────────────────────────────    │
    │  Data source: prediction.total_coliform_mv = 2849.890      │
    │  Status hitung: 2849.890 ≥ 1.0 → "Bahaya"                 │
    │                                                             │
    │  INSERT INTO total_coliform_ai_prediction                  │
    │    (sensor_data_id, mpn_value, status, timestamp)          │
    │  VALUES                                                     │
    │    (5001, 2849.890, "Bahaya", "2025-12-26T14:51:01Z")    │
    │                                                             │
    │  🤖 INI DATA UNTUK:                                        │
    │  👉 "📋 Keterangan & Log Prediksi AI Detection"          │
    │  (ditampilkan di AI Detection page)                        │
    └────────────┬──────────────────────────────────────────────┘
                 ↓
           ✅ SELESAI 1 CYCLE


═════════════════════════════════════════════════════════════════════════════

DATABASE RESULT (Setelah 1 eksekusi runAIPrediction):

┌─────────────────────────────────────────────────────────┐
│               sensor_data                               │
├────┬──────────────────────┬─────────────────────────────┤
│ id │ timestamp            │ totalcoliform_mv            │
├────┼──────────────────────┼─────────────────────────────┤
│5001│2025-12-26T14:51:01Z │ 0.005 (raw dari IoT)       │
└────┴──────────────────────┴─────────────────────────────┘
     ↓ foreign key
     
     
┌──────────────────────────────────────────────────────────────────┐
│               total_coliform                                     │
│  (Untuk 📋 Riwayat Pembacaan Terakhir Total Coliform)           │
├────┬─────────────────┬──────────┬────────┬──────────────────────┤
│ id │sensor_data_id   │mpn_value │ status │ timestamp            │
├────┼─────────────────┼──────────┼────────┼──────────────────────┤
│ 301│ 5001            │ 0.005    │ Aman   │ 2025-12-26T14:51:01Z│
└────┴─────────────────┴──────────┴────────┴──────────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│          total_coliform_ai_prediction                            │
│  (Untuk 📋 Keterangan & Log Prediksi AI Detection)              │
├────┬─────────────────┬──────────┬────────┬──────────────────────┤
│ id │sensor_data_id   │mpn_value │ status │ timestamp            │
├────┼─────────────────┼──────────┼────────┼──────────────────────┤
│ 501│ 5001            │ 2849.890 │ Bahaya │ 2025-12-26T14:51:01Z│
└────┴─────────────────┴──────────┴────────┴──────────────────────┘

```

---

## 🎬 SCENARIO: Setiap 20 Detik

### T=0s (First run)
```
runAIPrediction() called
├─ Fetch /api/latest
├─ sensor_data.id = 5001 (INSERT)
├─ total_coliform (id=301) INSERT ke table total_coliform ← Riwayat Coliform
└─ total_coliform_ai_prediction (id=501) INSERT ke table ai_prediction ← AI Log
```

### T=20s (Second run, timestamp SAMA)
```
runAIPrediction() called
├─ Fetch /api/latest (masih timestamp 14:51:01)
├─ sensor_data.id = 5001 (REUSE existing)
├─ total_coliform: CEK → EXISTS → SKIP (jangan insert lagi)
└─ total_coliform_ai_prediction: CEK → EXISTS → RETURN (stop di sini)
```

### T=40s (Third run, timestamp BARU 14:51:07)
```
runAIPrediction() called
├─ Fetch /api/latest (timestamp 14:51:07)
├─ sensor_data.id = 5002 (INSERT baru)
├─ total_coliform (id=302) INSERT ke table total_coliform ← Riwayat Coliform
└─ total_coliform_ai_prediction (id=502) INSERT ke table ai_prediction ← AI Log
```

---

## 📱 BAGAIMANA DATA DITAMPILKAN DI FRONTEND?

### Page 1: Total Coliform (Riwayat Pembacaan Terakhir)

**Endpoint:** `GET /api/coliform/history?limit=100`

**Query di backend:**
```javascript
SELECT * FROM total_coliform 
ORDER BY timestamp DESC 
LIMIT 100
```

**Display:**
```
Timestamp                MPN    Status
─────────────────────────────────────────
26 Des 2025, 14:51:01   0.005   🟢 Aman
26 Des 2025, 13:46:59   1       🔴 Bahaya
26 Des 2025, 13:46:59   1       🔴 Bahaya
26 Des 2025, 13:46:59   1       🔴 Bahaya
...
```

---

### Page 2: AI Detection (Keterangan & Log Prediksi)

**Endpoint:** `GET /api/coliform/ai-prediction/history?limit=100`

**Query di backend:**
```javascript
SELECT * FROM total_coliform_ai_prediction 
ORDER BY timestamp DESC 
LIMIT 100
```

**Display:**
```
Timestamp                MPN          Status
──────────────────────────────────────────────
26 Des 2025, 14:51:01   2849.890     🔴 Bahaya
26 Des 2025, 14:54:05   0.000        🟢 Aman
26 Des 2025, 14:51:01   2849.890     🔴 Bahaya
...
```

---

## 🔗 RELATIONSHIP DIAGRAM

```
                    1 Sensor Reading (sensor_data)
                             │
                    ┌────────┴────────┐
                    ↓                 ↓
         ┌────────────────────┐  ┌─────────────────────────┐
         │  total_coliform    │  │total_coliform_ai_pred.  │
         ├────────────────────┤  ├─────────────────────────┤
         │ RAW SENSOR VALUE   │  │ AI PREDICTED VALUE      │
         │ 0.005 millivolt    │  │ 2849.890 MPN            │
         │ (dari IoT device)  │  │ (dari AI model)         │
         └────────────────────┘  └─────────────────────────┘
              │                          │
              └──────────┬───────────────┘
                         │
         ┌───────────────┴────────────────┐
         ↓                                ↓
    Total Coliform page              AI Detection page
    (Riwayat Pembacaan)             (Prediksi & Log)
```

---

## 💾 CODE ANALYSIS: ai-prediction-sync.cron.js

### Step 5 (Line 113-130): Simpan Total Coliform RAW
```javascript
// 5. Simpan ke total_coliform (Sensor) - Raw millivolt
if (sensorData.totalcoliform_mv !== undefined && sensorData.totalcoliform_mv !== null) {
  const sensorMpnValue = sensorData.totalcoliform_mv;  // ← 0.005
  const sensorStatus = calculateStatusFromMPN(sensorMpnValue);  // ← "Aman"
  
  // Check exist dulu
  const [existingSensorColiform] = await pool.query(
    `SELECT id FROM total_coliform WHERE sensor_data_id = ? LIMIT 1`,
    [sensorDataId]
  );
  
  if (existingSensorColiform.length === 0) {
    await pool.query(
      `INSERT INTO total_coliform (sensor_data_id, mpn_value, status, timestamp)
       VALUES (?, ?, ?, ?)`,
      [sensorDataId, sensorMpnValue, sensorStatus, apiData.timestamp]
    );
    console.log(`📊 Total Coliform (Sensor) saved: ${sensorMpnValue} MPN - ${sensorStatus}`);
  }
}
```

👉 **INI UNTUK**: "Riwayat Pembacaan Terakhir Total Coliform"

---

### Step 6 (Line 132-142): Simpan AI Prediction
```javascript
// 6. Simpan ke total_coliform_ai_prediction (AI Prediction) - MPN dari /api/latest
const aiStatus = calculateStatusFromMPN(aiMpnPrediction);  // aiMpnPrediction = 2849.890

await pool.query(
  `INSERT INTO total_coliform_ai_prediction (sensor_data_id, mpn_value, status, timestamp)
   VALUES (?, ?, ?, ?)`,
  [sensorDataId, aiMpnPrediction, aiStatus, apiData.timestamp]
);

console.log(`🤖 Total Coliform (AI Prediction) saved: ${aiMpnPrediction.toFixed(2)} MPN - ${aiStatus}`);
console.log("✅ AI Prediction sync completed successfully\n");
```

👉 **INI UNTUK**: "Keterangan & Log Prediksi AI Detection"

---

## 🎯 JAWABAN SINGKAT

| Fitur | Disimpan oleh | Ke Table | Source Data |
|-------|--------------|----------|------------|
| 📋 Riwayat Pembacaan Terakhir Total Coliform | ai-prediction-sync.cron.js | `total_coliform` | `sensorData.totalcoliform_mv` (raw sensor) |
| 📋 Keterangan & Log Prediksi AI Detection | ai-prediction-sync.cron.js | `total_coliform_ai_prediction` | `prediction.total_coliform_mv` (AI predicted) |

**KESIMPULAN:** ✅ **YA! BENAR!**

Kedua data disimpan dari **1 file cron yang sama** (`ai-prediction-sync.cron.js`) dalam **1 proses yang sama** (`runAIPrediction()`), tapi ke **2 table yang BERBEDA**:

1. `total_coliform` ← Raw sensor readings
2. `total_coliform_ai_prediction` ← AI predictions

**Jadi:**
- 1 cron job = 1 request ke `/api/latest`
- 1 request = 2 data points disimpan
- 2 data points = 2 tables terpisah
- 2 tables = 2 halaman dashboard berbeda

---

## 🐛 KENAPA DUPLIKAT?

Dari screenshot "Riwayat Pembacaan Terakhir Total Coliform", ada banyak duplikat dengan timestamp sama:

```
26 Des 2025, 13:52:16   0   Aman
26 Des 2025, 13:52:16   0   Aman  ← DUPLIKAT
26 Des 2025, 13:52:16   0   Aman  ← DUPLIKAT
```

**Penyebab:**
1. **Race condition** dalam 1 cron execution
2. **Timezone mismatch** (check != insert)
3. **Multiple Node.js processes** running
4. **No UNIQUE constraint** di database

**Solusi:**
- Add UNIQUE constraint ke `total_coliform` & `total_coliform_ai_prediction`
- Ensure timestamp normalization (UTC)
- Kill all Node.js processes kecuali 1
- Use `ON DUPLICATE KEY UPDATE` untuk safer insert
