-- ============================================================================
-- database/migration_001_fix_duplicates.sql
-- ============================================================================
-- Purpose: Clean up existing duplicates dan add UNIQUE constraints
-- Run this script setelah deploy new cron files
-- ============================================================================

-- ============================================================================
-- STEP 1: Backup existing data (optional, untuk safety)
-- ============================================================================

-- CREATE TABLE total_coliform_backup AS SELECT * FROM total_coliform;
-- CREATE TABLE total_coliform_ai_prediction_backup AS SELECT * FROM total_coliform_ai_prediction;

-- ============================================================================
-- STEP 2: Delete duplicate records (KEEP LATEST BY TIMESTAMP)
-- ============================================================================

-- Delete duplicates dari total_coliform
-- Ambil yang paling baru (max timestamp) untuk setiap sensor_data_id
DELETE FROM total_coliform 
WHERE id NOT IN (
  SELECT id FROM (
    SELECT MAX(id) as id 
    FROM total_coliform 
    GROUP BY sensor_data_id
  ) as latest
);

-- Delete duplicates dari total_coliform_ai_prediction
DELETE FROM total_coliform_ai_prediction 
WHERE id NOT IN (
  SELECT id FROM (
    SELECT MAX(id) as id 
    FROM total_coliform_ai_prediction 
    GROUP BY sensor_data_id
  ) as latest
);

-- ============================================================================
-- STEP 3: Add UNIQUE CONSTRAINTS
-- ============================================================================
-- Ini akan prevent duplikat di future (database-level protection)

-- Add unique constraint untuk total_coliform
ALTER TABLE total_coliform 
ADD CONSTRAINT unique_total_coliform_sensor_data 
UNIQUE KEY (sensor_data_id);

-- Add unique constraint untuk total_coliform_ai_prediction
ALTER TABLE total_coliform_ai_prediction 
ADD CONSTRAINT unique_ai_prediction_sensor_data 
UNIQUE KEY (sensor_data_id);

-- ============================================================================
-- STEP 4: Verify (optional)
-- ============================================================================

-- Check total_coliform uniqueness
SELECT sensor_data_id, COUNT(*) as count 
FROM total_coliform 
GROUP BY sensor_data_id 
HAVING count > 1;

-- Check total_coliform_ai_prediction uniqueness
SELECT sensor_data_id, COUNT(*) as count 
FROM total_coliform_ai_prediction 
GROUP BY sensor_data_id 
HAVING count > 1;

-- Count total records after cleanup
SELECT 
  'total_coliform' as table_name,
  COUNT(*) as total_records
FROM total_coliform
UNION ALL
SELECT 
  'total_coliform_ai_prediction' as table_name,
  COUNT(*) as total_records
FROM total_coliform_ai_prediction
UNION ALL
SELECT 
  'sensor_data' as table_name,
  COUNT(*) as total_records
FROM sensor_data;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- Setelah migration ini, duplicate records akan dihapus dan database akan
-- memiliki UNIQUE constraint pada sensor_data_id di kedua table.
--
-- Jika ada INSERT dengan sensor_data_id yang sudah ada, akan error:
-- "Duplicate entry '[id]' for key 'unique_total_coliform_sensor_data'"
--
-- Solusi dalam application code (sudah diimplementasikan):
-- INSERT INTO total_coliform (...) VALUES (...)
-- ON DUPLICATE KEY UPDATE
--   mpn_value = VALUES(mpn_value),
--   status = VALUES(status),
--   timestamp = VALUES(timestamp);
--
-- ============================================================================
