-- ============================================================================
-- Migration: Add UNIQUE constraints for duplicate prevention
-- ============================================================================
-- Purpose: Memungkinkan ON DUPLICATE KEY UPDATE bekerja dengan baik
-- Timeline: Run ini SETELAH verifikasi 2-cron architecture berjalan stabil
-- Impact: Mencegah INSERT duplikat, membuat system lebih reliable
-- ============================================================================

-- 1. Tambah UNIQUE constraint pada total_coliform (sensor_data_id)
-- Artinya: Hanya boleh 1 record per sensor_data_id
-- Saat INSERt record dengan sensor_data_id yang sama → ON DUPLICATE KEY UPDATE (bukan INSERT baru)

ALTER TABLE total_coliform 
ADD CONSTRAINT uk_total_coliform_sensor_data_id UNIQUE (sensor_data_id);

-- 2. Tambah UNIQUE constraint pada total_coliform_ai_prediction (sensor_data_id)
-- Artinya: Hanya boleh 1 prediction per sensor_data_id
-- Saat INSERT record dengan sensor_data_id yang sama → ON DUPLICATE KEY UPDATE (bukan INSERT baru)

ALTER TABLE total_coliform_ai_prediction 
ADD CONSTRAINT uk_ai_prediction_sensor_data_id UNIQUE (sensor_data_id);

-- ============================================================================
-- Verification SQL (run ini setelah migration untuk verify)
-- ============================================================================
-- SHOW CREATE TABLE total_coliform;
-- SHOW CREATE TABLE total_coliform_ai_prediction;
-- 
-- Keduanya harus menampilkan:
-- UNIQUE KEY `uk_total_coliform_sensor_data_id` (`sensor_data_id`)
-- UNIQUE KEY `uk_ai_prediction_sensor_data_id` (`sensor_data_id`)
