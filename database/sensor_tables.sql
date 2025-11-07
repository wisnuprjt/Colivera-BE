-- =============================
-- TABLE UNTUK SENSOR DATA
-- =============================
CREATE TABLE IF NOT EXISTS sensor_data (
  id INT PRIMARY KEY AUTO_INCREMENT,
  timestamp DATETIME NOT NULL,
  temp_c FLOAT NOT NULL COMMENT 'Suhu dalam Celsius',
  do_mgl FLOAT NOT NULL COMMENT 'Dissolved Oxygen dalam mg/L',
  ph FLOAT NOT NULL COMMENT 'pH air',
  conductivity_uscm FLOAT NOT NULL COMMENT 'Konduktivitas dalam µS/cm',
  totalcoliform_mv FLOAT NOT NULL COMMENT 'Total Coliform dalam mV',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================
-- TABLE UNTUK AI PREDICTIONS
-- =============================
CREATE TABLE IF NOT EXISTS ai_predictions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sensor_data_id INT NOT NULL,
  potable BOOLEAN NOT NULL COMMENT 'TRUE = AMAN, FALSE = BAHAYA',
  confidence FLOAT COMMENT 'Confidence score dari AI (0-1)',
  prediction_timestamp DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sensor_data_id) REFERENCES sensor_data(id) ON DELETE CASCADE,
  INDEX idx_prediction_timestamp (prediction_timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================
-- VIEW UNTUK JOIN SENSOR + PREDICTION
-- =============================
CREATE OR REPLACE VIEW sensor_with_predictions AS
SELECT 
  s.*,
  p.potable,
  p.confidence,
  p.prediction_timestamp,
  CASE 
    WHEN p.potable = TRUE THEN 'AMAN'
    WHEN p.potable = FALSE THEN 'BAHAYA'
    ELSE 'BELUM ADA PREDIKSI'
  END as status
FROM sensor_data s
LEFT JOIN ai_predictions p ON s.id = p.sensor_data_id
ORDER BY s.timestamp DESC;
