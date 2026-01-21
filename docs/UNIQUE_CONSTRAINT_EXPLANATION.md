# 🔐 UNIQUE CONSTRAINT & ON DUPLICATE KEY UPDATE - Penjelasan Detail

## 📋 Ringkasan Masalah

Dari screenshot dashboard Anda, terlihat:
- 26 baris dengan timestamp `18:23:17`, value `0.000` (sama persis!)
- 3 baris dengan timestamp `18:22:17`, value `2805.240` (sama persis!)
- 12 baris dengan timestamp `18:18:40`, value `2897.080` (sama persis!)

**Ini berarti setiap kali cron jalan (setiap 20 detik), INSERT baris BARU**, bukan melakukan skip/update seperti harusnya.

---

## 🤔 Mengapa Terjadi?

### ❌ Kondisi SEKARANG (Tanpa UNIQUE CONSTRAINT):

```
Database tabel: total_coliform_ai_prediction
┌─────────┬────────────────┬──────────────┬───────────────┐
│ id (PK) │ sensor_data_id │ mpn_value    │ timestamp     │
├─────────┼────────────────┼──────────────┼───────────────┤
│ 1       │ 100            │ 0.000        │ 18:23:17      │  ← Run 1 (INSERT)
│ 2       │ 100            │ 0.000        │ 18:23:17      │  ← Run 2 (INSERT BARU!)
│ 3       │ 100            │ 0.000        │ 18:23:17      │  ← Run 3 (INSERT BARU!)
│ ...     │ 100            │ 0.000        │ 18:23:17      │  ← Run N (INSERT BARU terus!)
└─────────┴────────────────┴──────────────┴───────────────┘
```

**Kenapa INSERT terus-terusan?**

Cron code menggunakan:
```javascript
const [result] = await connection.query(
  `INSERT INTO total_coliform_ai_prediction (sensor_data_id, mpn_value, status, timestamp)
   VALUES (?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE
   mpn_value = VALUES(mpn_value),
   status = VALUES(status),
   timestamp = VALUES(timestamp)`,
  [sensorDataId, aiMpnPrediction, aiStatus, normalizedTimestamp]
);
```

**TAPI** MySQL tidak tahu record mana yang dianggap "DUPLICATE" karena **TIDAK ADA UNIQUE CONSTRAINT**!

Akibatnya:
1. MySQL hanya check PRIMARY KEY (`id`)
2. `id` baru setiap kali → tidak ada PK conflict
3. `sensor_data_id` bisa lebih dari 1 record → TIDAK dianggap duplikat
4. Query selalu INSERT → baris terus bertambah ✅ ❌

---

## ✅ Solusi: Tambah UNIQUE CONSTRAINT

### Apa itu UNIQUE CONSTRAINT?

**UNIQUE constraint = "Hanya boleh 1 nilai untuk kolom ini"**

Contoh:
```sql
ALTER TABLE total_coliform_ai_prediction 
ADD CONSTRAINT uk_ai_prediction_sensor_data_id UNIQUE (sensor_data_id);
```

Artinya:
- Nilai `sensor_data_id = 100` hanya boleh ada 1 record
- Nilai `sensor_data_id = 101` hanya boleh ada 1 record
- Dst.

### Bagaimana Cara Kerja ON DUPLICATE KEY UPDATE dengan UNIQUE CONSTRAINT?

```
Saat Cron Run 1:
INSERT INTO total_coliform_ai_prediction 
VALUES (sensor_data_id=100, mpn_value=0.000, ...)
├─ sensor_data_id=100 BELUM ada di database
└─ ✅ INSERT berhasil → Baris baru ditambah

Saat Cron Run 2 (20 detik kemudian, API mengirim data SAMA):
INSERT INTO total_coliform_ai_prediction 
VALUES (sensor_data_id=100, mpn_value=0.000, ...)
├─ sensor_data_id=100 SUDAH ADA (UNIQUE constraint detect!)
├─ ✅ ON DUPLICATE KEY UPDATE trigger
└─ UPDATE baris yang ada (bukan INSERT baru)

Saat Cron Run 3:
INSERT INTO total_coliform_ai_prediction 
VALUES (sensor_data_id=100, mpn_value=0.000, ...)
├─ sensor_data_id=100 SUDAH ADA
├─ ✅ ON DUPLICATE KEY UPDATE trigger
└─ UPDATE baris yang ada (bukan INSERT baru)
```

**Hasil:**
- Database tetap punya **HANYA 1 record** per sensor_data_id
- Dashboard menampilkan **1 row**, bukan 26 row dengan data sama
- Setiap cron run hanya UPDATE nilai (tidak INSERT baru)

---

## 📊 SEBELUM vs SESUDAH Constraint

### ❌ SEBELUM (Current - Tanpa UNIQUE):

| Run | Action | DB Records | Dashboard Shows |
|-----|--------|-----------|-----------------|
| 1   | INSERT | 1 row     | 1 row (18:23:17, 0.000) |
| 2   | INSERT | 2 rows    | 2 rows (sama data) |
| 3   | INSERT | 3 rows    | 3 rows (sama data) |
| ... | INSERT | 26 rows   | **26 rows sama** ❌ |

### ✅ SESUDAH (Dengan UNIQUE):

| Run | Action | DB Records | Dashboard Shows |
|-----|--------|-----------|-----------------|
| 1   | INSERT | 1 row     | 1 row (18:23:17, 0.000) |
| 2   | UPDATE | 1 row     | **1 row (sama)** ✅ |
| 3   | UPDATE | 1 row     | **1 row (sama)** ✅ |
| ... | UPDATE | 1 row     | **1 row (sama)** ✅ |

---

## 🚀 Implementasi Langkah-Langkah

### Step 1: Backup Database (OPTIONAL tapi RECOMMENDED)
```sql
-- Backup ke file untuk jaga-jaga
BACKUP DATABASE colivera_db TO DISK = 'C:\backup\colivera_db_backup.bak';
```

### Step 2: Delete Duplikat Data (dari run yang sudah lewat)

File: `migration_001_fix_duplicates.sql` (sudah ada)

```sql
-- Hanya keep 1 record per sensor_data_id (data terbaru)
DELETE FROM total_coliform_ai_prediction
WHERE id NOT IN (
    SELECT MAX(id) FROM total_coliform_ai_prediction GROUP BY sensor_data_id
);
```

### Step 3: Tambah UNIQUE CONSTRAINT

File: `migration_002_add_unique_constraints.sql` (baru dibuat)

```sql
ALTER TABLE total_coliform 
ADD CONSTRAINT uk_total_coliform_sensor_data_id UNIQUE (sensor_data_id);

ALTER TABLE total_coliform_ai_prediction 
ADD CONSTRAINT uk_ai_prediction_sensor_data_id UNIQUE (sensor_data_id);
```

---

## 📝 Execution Timeline (OPSI A Lanjutan)

**Timeline yang direkomendasikan:**

1. **TODAY (Hari ini)**: ✅ Done
   - Deploy 2-cron architecture
   - Monitor system
   - Verify timestamps correct

2. **TOMORROW (Besok)**: ⏳ Prepare
   - Verify no new issues
   - Check database size growth
   - Check console logs for errors

3. **NEXT 24-48 HOURS**: 🔧 Execute Migrations
   - **Maintenance Window**: Pilih waktu low-traffic (malam/pagi)
   - Run `migration_001_fix_duplicates.sql`
     - Delete 25 duplikat rows (dari 26 menjadi 1)
   - Run `migration_002_add_unique_constraints.sql`
     - Tambah UNIQUE constraints
     - Verify dengan `SHOW CREATE TABLE`

4. **POST-MIGRATION**: ✅ Verify
   - Dashboard hanya show 1 row per sensor (bukan 26)
   - Cron terus jalan dengan UPDATE bukan INSERT
   - Console logs show "already up-to-date" messages

---

## 🎯 Kesimpulan

| Aspek | Penjelasan |
|-------|-----------|
| **Masalah Sekarang** | INSERT terus-terusan karena tidak ada UNIQUE constraint |
| **Kenapa Terjadi** | ON DUPLICATE KEY UPDATE perlu UNIQUE untuk detect duplikat |
| **Solusi** | Tambah UNIQUE constraint pada (sensor_data_id) |
| **Kapan Run** | Setelah verify 2-cron berjalan stabil (24-48 jam) |
| **Risk Level** | ✅ LOW - constraint hanya prevent duplikat baru |
| **Benefit** | ✅ Database clean, Dashboard accurate, Zero duplikat |

---

## 🔍 Verification SQL

Setelah jalankan migration, verify dengan:

```sql
-- Check total_coliform constraint
SHOW CREATE TABLE total_coliform;
-- Harus ada: UNIQUE KEY `uk_total_coliform_sensor_data_id` (`sensor_data_id`)

-- Check ai_prediction constraint  
SHOW CREATE TABLE total_coliform_ai_prediction;
-- Harus ada: UNIQUE KEY `uk_ai_prediction_sensor_data_id` (`sensor_data_id`)

-- Check jumlah rows (harus sama dengan jumlah unique sensor_data_id)
SELECT COUNT(*) FROM total_coliform_ai_prediction;
SELECT COUNT(DISTINCT sensor_data_id) FROM total_coliform_ai_prediction;
-- Kedua query harus return angka SAMA
```

---

## ⚠️ Important Notes

1. **CONSTRAINT tidak menghapus data lama**: Constraint hanya prevent duplikat BARU. Duplikat lama di database perlu dihapus manual dengan `migration_001_fix_duplicates.sql` dulu.

2. **0-downtime migration**: Constraints bisa ditambah tanpa stop aplikasi (MariaDB support online DDL).

3. **ON DUPLICATE KEY UPDATE requirement**: MySQL/MariaDB HARUS ada UNIQUE constraint/PRIMARY KEY untuk trigger ON DUPLICATE KEY UPDATE.

4. **Timezone sudah fix**: `normalizeTimestamp()` sudah fix, jadi sekarang data timestamp benar-benar match system clock.

---

## 📞 Kontol Opsi

**OPSI A: Minimal Risk (Current)**
- Deploy 2-cron: ✅ Done
- Monitor 24-48h: ⏳ In Progress
- Delete duplikat: 📋 Prepare
- Add constraint: 📋 Prepare

**OPSI B: Aggressive (Immediate)**
- Deploy 2-cron: ✅ Done
- Run migration immediately: Run now
- Add constraint immediately: Run now
- Risk: Potential downtime jika ada error

Rekomendasi: **OPSI A** lebih aman untuk production system 🎯
