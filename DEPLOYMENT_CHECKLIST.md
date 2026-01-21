# ✅ DEPLOYMENT CHECKLIST

## 🔍 Pre-Deployment Review (5-10 minutes)

### Code Review
- [ ] Read COMPLETE_SUMMARY.md
- [ ] Review total-coliform-sync.cron.js
- [ ] Review ai-detection-sync.cron.js
- [ ] Review index.js changes
- [ ] Review migration_001_fix_duplicates.sql

### Environment Check
- [ ] Node.js version: 14.0 or higher
- [ ] MySQL/MariaDB version: 5.7 or higher
- [ ] npm packages up to date
- [ ] `.env` file configured correctly
- [ ] Database credentials verified

### Safety Check
- [ ] Database backup created
- [ ] Backup tested/verified
- [ ] Backup stored in safe location
- [ ] Team notified about maintenance window
- [ ] No critical operations scheduled

---

## 📋 Pre-Deployment Backup (2-3 minutes)

```bash
# Create database backup
mysqldump -u root -p colivera_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup size
ls -lh backup_*.sql

# Test backup (restore to temp db)
mysql -u root -p colivera_db_backup < backup_*.sql
```

- [ ] Backup file created
- [ ] Backup file size > 0 bytes
- [ ] Backup file readable
- [ ] Backup tested successfully

---

## 🛑 Stop Current Application (2-3 minutes)

```bash
# Kill Node.js process
taskkill /IM node.exe /F

# Verify no Node processes running
tasklist | findstr node
# Expected: (empty result)

# Check port 3000 is free (if applicable)
netstat -ano | findstr :3000
# Expected: (empty result)
```

- [ ] Node.js process stopped
- [ ] All Node.js processes killed
- [ ] Port 3000 released (if used)
- [ ] No running processes blocking deployment

---

## 📂 File Deployment (3-5 minutes)

### Copy New Cron Files
```bash
# Verify new files exist
ls -la tools/total-coliform-sync.cron.js
ls -la tools/ai-detection-sync.cron.js

# Verify files are readable
file tools/total-coliform-sync.cron.js
file tools/ai-detection-sync.cron.js
```

- [ ] total-coliform-sync.cron.js exists
- [ ] ai-detection-sync.cron.js exists
- [ ] Both files are valid JavaScript
- [ ] Both files are > 5KB

### Verify index.js Update
```bash
# Check if imports are present
grep -n "startTotalColiformSyncCron\|startAIDetectionSyncCron" src/index.js

# Expected output:
# src/index.js:75: const { startTotalColiformSyncCron } = require(...)
# src/index.js:76: const { startAIDetectionSyncCron } = require(...)
# src/index.js:80: startTotalColiformSyncCron();
# src/index.js:81: startAIDetectionSyncCron();
```

- [ ] Both cron imports exist
- [ ] Both cron function calls exist
- [ ] No syntax errors in index.js

### Verify Old Files Deleted
```bash
# Check old files are gone
ls -la tools/ai-prediction-sync.cron.js  # Should not exist
ls -la tools/sensor-sync.cron.js          # Should not exist
ls -la tools/sensor-data-sync.cron.js     # Should not exist
```

- [ ] ai-prediction-sync.cron.js deleted
- [ ] sensor-sync.cron.js deleted
- [ ] sensor-data-sync.cron.js deleted

---

## 🗄️ Database Migration (3-5 minutes)

### Run Migration Script
```bash
# Option A: Via MySQL CLI
mysql -u root -p colivera_db < database/migration_001_fix_duplicates.sql

# Option B: Via phpMyAdmin
# 1. Open phpMyAdmin
# 2. Select colivera_db database
# 3. Go to SQL tab
# 4. Copy-paste content from migration_001_fix_duplicates.sql
# 5. Click "Execute"
```

- [ ] Migration script executed successfully
- [ ] No error messages during migration
- [ ] Duplicate records deleted (check with provided SELECT)
- [ ] UNIQUE constraints added

### Verify UNIQUE Constraints
```sql
-- Check total_coliform constraint
SELECT CONSTRAINT_NAME 
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_NAME = 'total_coliform' 
AND COLUMN_NAME = 'sensor_data_id'
AND CONSTRAINT_NAME != 'PRIMARY';

-- Expected: unique_total_coliform_sensor_data

-- Check total_coliform_ai_prediction constraint
SELECT CONSTRAINT_NAME 
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_NAME = 'total_coliform_ai_prediction' 
AND COLUMN_NAME = 'sensor_data_id'
AND CONSTRAINT_NAME != 'PRIMARY';

-- Expected: unique_ai_prediction_sensor_data
```

- [ ] UNIQUE constraint on total_coliform exists
- [ ] UNIQUE constraint on ai_prediction exists
- [ ] No duplicate records remain

### Verify Data Cleanup
```sql
-- Check for duplicates
SELECT sensor_data_id, COUNT(*) FROM total_coliform 
GROUP BY sensor_data_id HAVING COUNT(*) > 1;
-- Expected: (Empty result set)

SELECT sensor_data_id, COUNT(*) FROM total_coliform_ai_prediction 
GROUP BY sensor_data_id HAVING COUNT(*) > 1;
-- Expected: (Empty result set)
```

- [ ] No duplicates in total_coliform
- [ ] No duplicates in total_coliform_ai_prediction
- [ ] Data integrity verified

---

## 🚀 Start Application (2-3 minutes)

```bash
# Navigate to project directory
cd c:\Users\Asus\Desktop\TA\ SKRIPSI\Backup\ Hosting\ Rollback\Colivera-BE

# Start Node.js
npm start

# Expected console output (within 5 seconds):
# 🚀 ========================================
# 📊 TOTAL COLIFORM SYNC CRON JOB STARTED
# ⏱️  Sync interval: Every 20 second(s)
# 📋 Responsibility: sensor_data + total_coliform
# 🚀 ========================================
#
# 🚀 ========================================
# 🤖 AI DETECTION SYNC CRON JOB STARTED
# ⏱️  Sync interval: Every 20 second(s)
# 📋 Responsibility: total_coliform_ai_prediction
# 🚀 ========================================
```

- [ ] Node.js started successfully
- [ ] No startup errors
- [ ] Both cron jobs printed startup messages
- [ ] Server listening on port 3000 (or configured port)

---

## 📊 Post-Deployment Verification (10-15 minutes)

### Monitor Console Output (First 100 seconds)
```
Expected pattern (every 20 seconds):

📊 [timestamp] Starting Total Coliform sync...
🔄 Fetching from HuggingFace /api/latest...
✅ Data received from API: {...}
📊 Checking sensor_data...
✓ Using existing sensor data ID: XXXX
📊 Syncing Total Coliform (Sensor): X.XXX MPN - Status
✓ Total Coliform (Sensor) saved: X.XXX MPN - Status
✅ Total Coliform sync completed successfully

🤖 [timestamp] Starting AI Detection sync...
🔄 Fetching from HuggingFace /api/latest...
✅ Data received from API: {...}
📊 Checking sensor_data...
✓ Using existing sensor data ID: XXXX
🤖 Syncing AI Detection: XXX.XX MPN - Status
✓ AI Detection (Prediction) saved: XXX.XX MPN - Status
✅ AI Detection sync completed successfully
```

- [ ] Cron #1 (Total Coliform) runs every 20 seconds
- [ ] Cron #2 (AI Detection) runs every 20 seconds
- [ ] Both complete within ~10 seconds each
- [ ] No error messages
- [ ] Timestamps are incrementing correctly

### Database Verification
```bash
# Check latest records
mysql -u root -p colivera_db << EOF
SELECT COUNT(*) as total_coliform_count FROM total_coliform;
SELECT COUNT(*) as ai_pred_count FROM total_coliform_ai_prediction;
SELECT MAX(timestamp) as latest_timestamp FROM sensor_data;
SELECT MAX(timestamp) as latest_timestamp FROM total_coliform;
SELECT MAX(timestamp) as latest_timestamp FROM total_coliform_ai_prediction;
EOF

# Expected:
# - All counts > 0
# - All timestamps are recent (within last minute)
# - No duplicates (based on earlier checks)
```

- [ ] total_coliform has records
- [ ] total_coliform_ai_prediction has records
- [ ] Latest timestamps are recent
- [ ] Record counts increasing (check again after 1 minute)

### Dashboard Verification
```
Open browser:
1. http://localhost:3000/dashboard/ecoliview
   - Check "Total Coliform" page
   - Should show data without duplicates
   - Timestamps should be recent
   
2. http://localhost:3000/dashboard/aidetectionview
   - Check "AI Detection" page
   - Should show prediction data
   - Timestamps should match sensor timestamps
```

- [ ] Total Coliform page loads
- [ ] AI Detection page loads
- [ ] No duplicate rows visible
- [ ] Data appears fresh (current time stamps)
- [ ] Graph/chart displays correctly

### API Verification
```bash
# Test total coliform API
curl http://localhost:3000/api/coliform/history?limit=5

# Test AI detection API
curl http://localhost:3000/api/coliform/ai-prediction/history?limit=5

# Expected: JSON response with array of records, no duplicates
```

- [ ] Coliform API returns data
- [ ] AI prediction API returns data
- [ ] Response format is valid JSON
- [ ] No duplicate records in responses

---

## 🔍 Extended Monitoring (Next 24 hours)

### Hourly Check (First 6 hours)
```bash
# Monitor console for errors
# Check database for unexpected behavior
# Verify cron jobs run consistently

Every hour:
  [ ] Console output looks normal
  [ ] No error messages appeared
  [ ] Cron jobs ran (check timestamps)
  [ ] Database growing normally
```

### Daily Check (Next 24 hours)
```
Next morning:
  [ ] No errors in logs
  [ ] Data integrity maintained
  [ ] No duplicate records created
  [ ] Dashboard displays correctly
  [ ] API endpoints responsive
  [ ] Database size reasonable
```

---

## ⚠️ Rollback Plan (If Something Goes Wrong)

### If Application Won't Start
```bash
# 1. Check error message
npm start 2>&1 | head -50

# 2. Revert index.js to previous version
# 3. Delete new cron files
# 4. Restart application
npm start

# 5. If still broken, restore from backup:
mysql -u root -p colivera_db < backup_XXXX.sql
```

- [ ] Understand error message
- [ ] Document error for debugging
- [ ] Proceed with rollback if necessary

### If Database Migration Failed
```bash
# 1. Restore database from backup
mysql -u root -p colivera_db < backup_XXXX.sql

# 2. Verify data is restored
SELECT COUNT(*) FROM total_coliform;
SELECT COUNT(*) FROM total_coliform_ai_prediction;

# 3. Try migration again or contact support
```

- [ ] Backup ready to restore
- [ ] Understand why migration failed
- [ ] Have migration script ready for retry

### If Duplicates Still Appearing
```bash
# 1. Check if UNIQUE constraint is properly added
SHOW CREATE TABLE total_coliform;

# 2. Verify index exists
SHOW INDEX FROM total_coliform;

# 3. Re-run migration if constraint missing
mysql -u root -p colivera_db < database/migration_001_fix_duplicates.sql

# 4. Monitor console for ON DUPLICATE KEY UPDATE messages
```

- [ ] UNIQUE constraints verified
- [ ] Migration re-run if necessary
- [ ] Console shows "handled by ON DUPLICATE KEY UPDATE"

---

## 📝 Deployment Sign-Off

```
Deployment Completed: ______________________ (Date/Time)
Deployed By: ______________________________ (Name)
Reviewed By: ______________________________ (Name)

Pre-Deployment Checks:    ✓ PASSED / ⚠️ WARNINGS / ❌ FAILED
Database Migration:       ✓ PASSED / ⚠️ WARNINGS / ❌ FAILED
Application Startup:      ✓ PASSED / ⚠️ WARNINGS / ❌ FAILED
Verification Tests:       ✓ PASSED / ⚠️ WARNINGS / ❌ FAILED

Overall Status: ✓ READY FOR PRODUCTION / ⚠️ NEEDS ATTENTION / ❌ ROLLBACK REQUIRED

Notes:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 📞 Support Contacts

If deployment has issues:

1. **Check Documentation First**
   - IMPLEMENTATION_GUIDE.md
   - Troubleshooting section
   - This checklist

2. **Review Logs**
   - Console output
   - Database logs
   - Application logs

3. **Contact**
   - Development team
   - Database administrator
   - DevOps engineer

---

**Deployment Ready? Follow this checklist step-by-step!** ✨

**Expected Total Time: 30-45 minutes**
