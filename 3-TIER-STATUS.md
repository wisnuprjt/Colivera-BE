# 🎯 Sistem Status Kualitas Air 3-Tier (Bahasa Indonesia)

## Ringkasan

Upgrade dari sistem 2-tier ke sistem 3-tier untuk klasifikasi kualitas air yang lebih detail, **SEMUA MENGGUNAKAN BAHASA INDONESIA**.

---

## 📊 Level Status (3-Tier)

| Level | Icon | Status | Deskripsi | Kondisi |
|-------|------|--------|-----------|---------|
| **Tier 1** | 🟢 | **Aman** | Air sangat aman untuk dikonsumsi | `potable=true` & `confidence>=0.7` |
| **Tier 2** | 🟡 | **Waspada** | Air mungkin aman, perlu monitoring | `potable=true` & `confidence<0.7` |
| **Tier 3** | 🔴 | **Bahaya** | Air tidak aman, jangan dikonsumsi | `potable=false` |

---

## 🔧 Implementation

### 1. Database Changes

**Kolom Baru di `ai_predictions`:**
```sql
risk_level ENUM('Aman', 'Waspada', 'Bahaya')
```

**Update `total_coliform.status`:**
```sql
status ENUM('Aman', 'Waspada', 'Bahaya')
```

**Semua Bahasa Indonesia!** 🇮🇩

---

### 2. Backend Logic

**File:** `tools/sensor-sync.cron.js`

```javascript
// Logika 3-Tier (Bahasa Indonesia)
if (!potable) {
  riskLevel = 'Bahaya';      // 🔴 Air tidak aman
} else if (confidence < 0.7) {
  riskLevel = 'Waspada';     // 🟡 AI kurang yakin
} else {
  riskLevel = 'Aman';        // 🟢 Air aman, AI yakin
}
```

---

### 3. API Response Format

**Endpoint:** `GET /api/sensor/coliform/history`

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "mpn_value": 123,
      "status": "Critical",      // 2-tier (backward compatible)
      "risk_level": "Danger",    // 3-tier (new)
      "confidence": 0.85
    },
    {
      "id": 2,
      "mpn_value": 50,
      "status": "Warning",
      "risk_level": "Warning",
      "confidence": 0.65
    },
    {
      "id": 3,
      "mpn_value": 10,
      "status": "Normal",
      "risk_level": "Safe",
      "confidence": 0.95
    }
  ]
}
```

---

## 🚀 Migration Steps

### Step 1: Run Database Migration

```bash
node database/update-3-tier-status.js
```

This will:
- ✅ Create backup of existing data
- ✅ Update database schema
- ✅ Migrate existing records to 3-tier
- ✅ Show summary of changes

### Step 2: Restart Backend

```bash
npm start
```

### Step 3: Update Frontend (Optional)

**Display 3-tier badges:**

```tsx
// Status Badge Component
const StatusBadge = ({ riskLevel }) => {
  const config = {
    Safe: { color: 'green', icon: '🟢', label: 'Aman' },
    Warning: { color: 'yellow', icon: '🟡', label: 'Waspada' },
    Danger: { color: 'red', icon: '🔴', label: 'Bahaya' }
  };
  
  const { color, icon, label } = config[riskLevel];
  
  return (
    <span className={`badge badge-${color}`}>
      {icon} {label}
    </span>
  );
};
```

---

## 📈 Examples

### Example 1: Safe Water (95% Confidence)
```
Input: potable=true, confidence=0.95
Output: 🟢 Safe → Status: Normal
Log: 🎯 AI Prediction saved: 🟢 SAFE (confidence: 95.0%)
```

### Example 2: Warning (65% Confidence)
```
Input: potable=true, confidence=0.65
Output: 🟡 Warning → Status: Warning
Log: 🎯 AI Prediction saved: 🟡 WARNING (confidence: 65.0%)
```

### Example 3: Danger (85% Confidence)
```
Input: potable=false, confidence=0.85
Output: 🔴 Danger → Status: Critical
Log: 🎯 AI Prediction saved: 🔴 DANGER (confidence: 85.0%)
```

---

## ⚙️ Configuration

### Adjust Confidence Threshold

Edit `tools/sensor-sync.cron.js`:

```javascript
// Default threshold: 0.7
} else if (potable && confidence < 0.7) {

// Change to 0.6 for more lenient:
} else if (potable && confidence < 0.6) {

// Change to 0.8 for more strict:
} else if (potable && confidence < 0.8) {
```

---

## 🔮 Future-Proof Design

**If API Gary adds native 3-tier support:**

```json
{
  "ai_detection": {
    "risk_level": "Warning",  // API directly returns 3-tier
    "confidence": 0.65
  }
}
```

Backend will automatically use API's `risk_level` instead of calculating it!

```javascript
// Backend automatically detects and uses API's risk_level
if (predictionResult.ai_detection?.risk_level) {
  riskLevel = predictionResult.ai_detection.risk_level; // Use API's value
} else {
  // Fallback to calculation
}
```

---

## 📊 Database Schema

### Before (2-Tier)
```sql
ai_predictions:
  - potable: BOOLEAN (0/1)
  - confidence: FLOAT

total_coliform:
  - status: ENUM('Normal', 'Critical')
```

### After (3-Tier)
```sql
ai_predictions:
  - potable: BOOLEAN (0/1)          -- Kept for backward compatibility
  - confidence: FLOAT
  - risk_level: ENUM('Safe', 'Warning', 'Danger')  -- NEW!

total_coliform:
  - status: ENUM('Normal', 'Warning', 'Critical')  -- Updated!
```

---

## 🎨 Frontend Display Suggestions

### Card Display
```
┌─────────────────────────────┐
│   Water Quality Status      │
│                             │
│   🟢 AMAN (95% yakin)      │
│                             │
│   Semua parameter normal    │
└─────────────────────────────┘
```

### Table Display
| Timestamp | MPN | Status | Confidence |
|-----------|-----|--------|------------|
| 08/11 06:25 | 123 | 🔴 Bahaya | 85% |
| 08/11 06:13 | 50 | 🟡 Waspada | 65% |
| 08/11 06:04 | 10 | 🟢 Aman | 95% |

### Gauge Chart
```
     Safe
    🟢
   /   \
  /     \
🟡-------🔴
Warning Danger
```

---

## 🧪 Testing

### Test Scenarios

1. **High Confidence Safe:**
   - potable=true, confidence=0.95
   - Expected: Safe

2. **Low Confidence Safe:**
   - potable=true, confidence=0.60
   - Expected: Warning

3. **High Confidence Danger:**
   - potable=false, confidence=0.90
   - Expected: Danger

4. **Low Confidence Danger:**
   - potable=false, confidence=0.55
   - Expected: Danger (always danger if potable=false)

---

## 📝 Notes

- **Backward Compatible:** Old 2-tier `potable` field still exists
- **Flexible:** Works with current API and future 3-tier API
- **Clear Logic:** Confidence < 0.7 triggers Warning
- **Easy to Adjust:** Threshold can be configured

---

**Made with ❤️ for Colivera Water Quality Monitoring System**
