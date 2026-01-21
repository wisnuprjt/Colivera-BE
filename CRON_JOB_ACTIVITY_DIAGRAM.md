# Activity Diagram - Cron Job Workflow

## 📊 1. TOTAL COLIFORM SYNC CRON JOB

Interval: **Setiap 20 detik**
Responsibility: `sensor_data` + `total_coliform`

```
┌─────────────────────────────────────────────────────────────────┐
│                    CRON JOB START (Setiap 20 detik)             │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  FETCH API      │
                    │  HuggingFace    │
                    │  /api/latest    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────────────┐
                    │ Validasi Response       │
                    │ - apiData exists?       │
                    │ - sensor_data exists?   │
                    └────────┬────────┬───────┘
                             │        │
                       ✅Valid │        │ ❌Invalid
                             │        └──────────┐
                             ▼                   ▼
            ┌──────────────────────────┐    ┌────────────┐
            │ Extract Data:            │    │ Log Error  │
            │ - temp_c                 │    │ & Return   │
            │ - do_mgl                 │    └────────────┘
            │ - ph                     │
            │ - conductivity_uscm      │
            │ - totalcoliform_mv       │
            │ - timestamp (API)        │
            └────────┬─────────────────┘
                     │
                     ▼
            ┌──────────────────────┐
            │ Normalize Timestamp  │
            │ Format: YYYY-MM-DD   │
            │         HH:mm:ss     │
            └────────┬─────────────┘
                     │
                     ▼
            ┌──────────────────────┐
            │ Get DB Connection    │
            │ from Pool            │
            └────────┬─────────────┘
                     │
                     ▼
            ┌──────────────────────────────┐
            │ Query sensor_data            │
            │ WHERE timestamp = ?          │
            └────────┬──────────────┬──────┘
                     │              │
            ✅Found  │              │ ❌Not Found
                     │              │
                     ▼              ▼
         ┌──────────────────┐  ┌─────────────────────┐
         │ Use existing     │  │ INSERT sensor_data  │
         │ sensor_data_id   │  │ - timestamp         │
         │                  │  │ - temp_c            │
         └────────┬─────────┘  │ - do_mgl            │
                  │            │ - ph                │
                  │            │ - conductivity_uscm │
                  │            │ - totalcoliform_mv  │
                  │            └────────┬────────────┘
                  │                     │
                  │            ✅Get insertId as
                  │            sensor_data_id
                  │                     │
                  │            ┌────────▼────────┐
                  │            │ UPDATE sensor   │
                  │            │ data with new   │
                  │            │ values          │
                  │            └────────┬────────┘
                  │                     │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌──────────────────────────┐
                  │ Calculate Status from    │
                  │ totalcoliform_mv         │
                  │ Aman: ≤0.70              │
                  │ Waspada: 0.71-0.99       │
                  │ Bahaya: ≥1.0             │
                  └──────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────────┐
              │ INSERT INTO total_coliform       │
              │ - sensor_data_id                 │
              │ - mpn_value                      │
              │ - status                         │
              │ - timestamp                      │
              │                                  │
              │ ON DUPLICATE KEY UPDATE          │
              │ (avoid race condition)            │
              └──────────┬───────────────────────┘
                         │
                         ▼
                 ┌────────────────────┐
                 │ Check affectedRows │
                 └────────┬───┬───────┘
                          │   │
                     ✅>0 │   │ ✅=0
                          │   │
                          ▼   ▼
                 ┌──────────────────────┐
                 │ Log Success or Info  │
                 │ "Data saved" or      │
                 │ "Already up-to-date" │
                 └────────┬─────────────┘
                          │
                          ▼
                 ┌──────────────────────┐
                 │ Release Connection   │
                 │ to Pool              │
                 └────────┬─────────────┘
                          │
                          ▼
                 ┌──────────────────────┐
                 │ END - Wait 20 seconds│
                 │ for next execution   │
                 └──────────────────────┘
```

---

## 🤖 2. AI DETECTION SYNC CRON JOB

Interval: **Setiap 20 detik**
Responsibility: `total_coliform_ai_prediction` ONLY

```
┌─────────────────────────────────────────────────────────────────┐
│                    CRON JOB START (Setiap 20 detik)             │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  FETCH API      │
                    │  HuggingFace    │
                    │  /api/latest    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────────────┐
                    │ Validasi Response       │
                    │ - apiData exists?       │
                    │ - prediction exists?    │
                    │ - sensor_data exists?   │
                    └────────┬────────┬───────┘
                             │        │
                       ✅Valid │        │ ❌Invalid
                             │        └──────────┐
                             ▼                   ▼
            ┌──────────────────────────┐    ┌────────────┐
            │ Extract Data:            │    │ Log Error  │
            │ - prediction.            │    │ & Return   │
            │   total_coliform_mv      │    └────────────┘
            │ - sensor_data.*          │
            │ - timestamp (API)        │
            └────────┬─────────────────┘
                     │
                     ▼
            ┌──────────────────────┐
            │ Check if AI MPN      │
            │ value exists         │
            └────────┬────────┬────┘
                     │        │
               ✅Value│        │ ❌Null
                     │        └──────────┐
                     ▼                   ▼
            ┌──────────────────┐    ┌─────────────┐
            │ Continue         │    │ Log Warning │
            │                  │    │ & Return    │
            └────────┬─────────┘    └─────────────┘
                     │
                     ▼
            ┌──────────────────────┐
            │ Normalize Timestamp  │
            │ Format: YYYY-MM-DD   │
            │         HH:mm:ss     │
            └────────┬─────────────┘
                     │
                     ▼
            ┌──────────────────────┐
            │ Get DB Connection    │
            │ from Pool            │
            └────────┬─────────────┘
                     │
                     ▼
            ┌──────────────────────────────┐
            │ Query sensor_data            │
            │ WHERE timestamp = ?          │
            └────────┬──────────────┬──────┘
                     │              │
            ✅Found  │              │ ❌Not Found
                     │              │
                     ▼              ▼
         ┌──────────────────┐  ┌──────────────────────────┐
         │ Use existing     │  │ INSERT sensor_data       │
         │ sensor_data_id   │  │ (create entry for AI)    │
         │                  │  │ - timestamp              │
         └────────┬─────────┘  │ - temp_c (from API)      │
                  │            │ - do_mgl (from API)      │
                  │            │ - ph (from API)          │
                  │            │ - conductivity_uscm      │
                  │            │ - totalcoliform_mv       │
                  │            └────────┬────────────────┘
                  │                     │
                  │            ✅Get insertId as
                  │            sensor_data_id
                  │                     │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌──────────────────────────┐
                  │ Calculate Status from    │
                  │ AI mpn_value             │
                  │ Aman: ≤0.70              │
                  │ Waspada: 0.71-0.99       │
                  │ Bahaya: ≥1.0             │
                  └──────────┬───────────────┘
                             │
                             ▼
         ┌────────────────────────────────────────┐
         │ INSERT INTO total_coliform_ai_prediction│
         │ - sensor_data_id                       │
         │ - mpn_value                            │
         │ - status                               │
         │ - timestamp                            │
         │                                        │
         │ ON DUPLICATE KEY UPDATE                │
         │ (avoid race condition with cron)       │
         └──────────┬─────────────────────────────┘
                    │
                    ▼
            ┌────────────────────┐
            │ Check affectedRows │
            └────────┬───┬───────┘
                     │   │
                ✅>0 │   │ ✅=0
                     │   │
                     ▼   ▼
            ┌──────────────────────┐
            │ Log Success or Info  │
            │ "Data saved" or      │
            │ "Already up-to-date" │
            └────────┬─────────────┘
                     │
                     ▼
            ┌──────────────────────┐
            │ Release Connection   │
            │ to Pool              │
            └────────┬─────────────┘
                     │
                     ▼
            ┌──────────────────────┐
            │ END - Wait 20 seconds│
            │ for next execution   │
            └──────────────────────┘
```

---

## ⚠️ 3. ERROR HANDLING FLOW

Kedua cron job memiliki error handling yang sama:

```
┌──────────────────────────┐
│ Error Occurs             │
└────────┬─────────────────┘
         │
         ▼
    ┌────────────────────────────┐
    │ Catch Error Block           │
    └────────┬─────────────┬──────┘
             │             │
       ┌─────┴─────┐   ┌───┴──────┐
       │             │            │
    Timeout      Network      Other
    (ECONNABORTED)Error      Errors
    (includes     (ECONNREFUSED)
     "timeout")   (ENOTFOUND)
       │             │            │
       ▼             ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌─────────┐
    │ Log:     │ │ Log:     │ │ Log:    │
    │ Timeout  │ │ Connection
    │ - HF     │ │ Error -  │ │ Error   │
    │ Cold     │ │ Can't    │ │ Message │
    │ Start    │ │ reach HF │ └─────────┘
    └────┬─────┘ └────┬─────┘
         │             │
         │             │
         └──────┬──────┘
                │
                ▼
        ┌─────────────────┐
        │ Finally Block   │
        │ (Always Run)    │
        └────────┬────────┘
                 │
                 ▼
        ┌─────────────────────┐
        │ Release Connection  │
        │ to Pool             │
        │ (if exists)         │
        └────────┬────────────┘
                 │
                 ▼
        ┌─────────────────────┐
        │ END with Error      │
        │ Logged              │
        └─────────────────────┘
```

---

## 🔄 4. KEY DIFFERENCES

| Aspek | Total Coliform Sync | AI Detection Sync |
|-------|-------------------|-----------------|
| **Fetch** | sensor_data only | prediction + sensor_data |
| **DB Insert** | sensor_data + total_coliform | total_coliform_ai_prediction only |
| **sensor_data** | Always managed (create/update) | Only read/create if missing |
| **Responsibility** | Master data for sensor | Slave - depends on sensor_data |
| **Validation** | Check sensor_data structure | Check prediction + sensor_data |

---

## ✅ SUMMARY - CRON JOB WORKFLOW

1. **SCHEDULED** → Cron trigger setiap X detik
2. **FETCH** → Hit HuggingFace API dengan timeout
3. **VALIDATE** → Check response structure
4. **EXTRACT** → Parse data dari response
5. **NORMALIZE** → Format timestamp ke lokal
6. **CONNECTION** → Get DB connection dari pool
7. **QUERY** → Check if data exists di database
8. **UPSERT** → Insert/Update dengan ON DUPLICATE KEY
9. **RELEASE** → Release connection ke pool
10. **LOG** → Log success/error/warning
11. **REPEAT** → Wait untuk execution berikutnya

---

## 🔒 SAFETY MECHANISMS

✅ **Duplikat Prevention:**
- `ON DUPLICATE KEY UPDATE` di database level
- Unique constraint pada timestamp

✅ **Race Condition Prevention:**
- Separate responsibility per cron job
- Total Coliform = master untuk sensor_data
- AI Detection = read-only untuk sensor_data

✅ **Connection Safety:**
- Always release connection in finally block
- Connection pool management

✅ **Timeout Protection:**
- 15 detik timeout per API call
- Graceful error handling

✅ **Data Integrity:**
- Validate response structure sebelum process
- Check null values sebelum insert
