# 🇮🇩 QUICK START - Status 3-Tier Bahasa Indonesia

## 📊 Status Kualitas Air

| Icon | Status | Database Value | Kondisi |
|------|--------|----------------|---------|
| 🟢 | **AMAN** | `'Aman'` | Air sangat aman, AI yakin (confidence ≥ 70%) |
| 🟡 | **WASPADA** | `'Waspada'` | Air mungkin aman, AI kurang yakin (confidence < 70%) |
| 🔴 | **BAHAYA** | `'Bahaya'` | Air tidak aman, jangan minum! |

---

## 🚀 Cara Install (3 Langkah)

### 1️⃣ Jalankan Migration Database
```bash
cd "C:\Users\Asus\Desktop\Capstone\Colivera v2\Colivera-BE"
node database/update-3-tier-status.js
```

**Apa yang terjadi:**
- ✅ Backup data otomatis
- ✅ Update database ke bahasa Indonesia
- ✅ Convert data lama ke 3-tier

### 2️⃣ Restart Backend
```bash
npm start
```

### 3️⃣ Done! ✅

Backend akan otomatis pakai sistem 3-tier berbahasa Indonesia!

---

## 📊 Database Schema (Bahasa Indonesia)

### Table: `ai_predictions`
```sql
CREATE TABLE ai_predictions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sensor_data_id INT,
  potable BOOLEAN NOT NULL,
  confidence FLOAT,
  risk_level ENUM('Aman', 'Waspada', 'Bahaya'),  -- BARU! Bahasa Indonesia
  prediction_timestamp DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table: `total_coliform`
```sql
CREATE TABLE total_coliform (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  sensor_data_id INT UNSIGNED,
  mpn_value FLOAT,
  status ENUM('Aman', 'Waspada', 'Bahaya'),  -- Bahasa Indonesia!
  timestamp DATETIME
);
```

---

## 🎯 Logika Sederhana

```
Data Sensor → AI Prediction
    ↓
AI bilang: potable = false?
    ↓ YES
🔴 Status: Bahaya
    ↓ NO
AI bilang: potable = true
    ↓
Cek confidence:
    ↓
confidence >= 0.7?
    ↓ YES              ↓ NO
🟢 Status: Aman    🟡 Status: Waspada
```

---

## 📝 Contoh Response API

**Endpoint:** `GET /api/sensor/coliform/history`

```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "mpn_value": 123,
      "status": "Bahaya",          // 🔴 Bahasa Indonesia!
      "confidence": 0.85,
      "formatted_timestamp": "08/11/2025 14.30.00"
    },
    {
      "id": 2,
      "mpn_value": 50,
      "status": "Waspada",         // 🟡 Bahasa Indonesia!
      "confidence": 0.65,
      "formatted_timestamp": "08/11/2025 14.25.00"
    },
    {
      "id": 3,
      "mpn_value": 10,
      "status": "Aman",            // 🟢 Bahasa Indonesia!
      "confidence": 0.95,
      "formatted_timestamp": "08/11/2025 14.20.00"
    }
  ]
}
```

---

## 🎨 Display di Frontend

### Badge Component (React/Next.js)
```tsx
const getBadgeStyle = (status: string) => {
  const styles = {
    'Aman': 'bg-green-100 text-green-800',
    'Waspada': 'bg-yellow-100 text-yellow-800',
    'Bahaya': 'bg-red-100 text-red-800'
  };
  return styles[status] || 'bg-gray-100 text-gray-800';
};

// Usage
<span className={`px-3 py-1 rounded-full ${getBadgeStyle(item.status)}`}>
  {item.status === 'Aman' && '🟢'}
  {item.status === 'Waspada' && '🟡'}
  {item.status === 'Bahaya' && '🔴'}
  {item.status}
</span>
```

---

## 🔧 Konfigurasi Threshold

Edit file `tools/sensor-sync.cron.js` line ~145:

```javascript
// Threshold default: 0.7 (70%)
} else if (potable && confidence < 0.7) {
  riskLevel = 'Waspada';
}

// Ubah jadi lebih ketat (80%):
} else if (potable && confidence < 0.8) {
  riskLevel = 'Waspada';
}

// Ubah jadi lebih longgar (60%):
} else if (potable && confidence < 0.6) {
  riskLevel = 'Waspada';
}
```

---

## 📊 Log Output (Bahasa Indonesia)

Setelah migration, log akan tampil seperti ini:

```
🎯 AI Prediction saved: 🟢 AMAN (confidence: 95.0%)
📊 Total coliform data saved with status: Aman

🎯 AI Prediction saved: 🟡 WASPADA (confidence: 65.0%)
📊 Total coliform data saved with status: Waspada

🎯 AI Prediction saved: 🔴 BAHAYA (confidence: 85.0%)
📊 Total coliform data saved with status: Bahaya
```

---

## ✅ Checklist

- [ ] Jalankan `node database/update-3-tier-status.js`
- [ ] Lihat output migration berhasil
- [ ] Restart backend dengan `npm start`
- [ ] Cek log - harus ada 🟢🟡🔴
- [ ] Test API: `GET /api/sensor/coliform/history`
- [ ] Update frontend untuk tampilkan badge status

---

## 🎯 Hasil Akhir

**Sebelum (2-Tier Bahasa Inggris):**
- ❌ Normal
- ❌ Critical

**Sesudah (3-Tier Bahasa Indonesia):**
- ✅ 🟢 Aman
- ✅ 🟡 Waspada
- ✅ 🔴 Bahaya

**Lebih mudah dipahami user Indonesia!** 🇮🇩

---

**Made with ❤️ for Colivera**
