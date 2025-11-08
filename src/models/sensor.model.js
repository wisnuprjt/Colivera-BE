const pool = require("./db");

// =============================
// CREATE TABLE SENSOR DATA
// =============================
// Run query ini di MySQL:
/*
CREATE TABLE sensor_data (
  id INT PRIMARY KEY AUTO_INCREMENT,
  timestamp DATETIME NOT NULL,
  temp_c FLOAT NOT NULL,
  do_mgl FLOAT NOT NULL,
  ph FLOAT NOT NULL,
  conductivity_uscm FLOAT NOT NULL,
  totalcoliform_mv FLOAT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_timestamp (timestamp)
);

CREATE TABLE ai_predictions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sensor_data_id INT,
  potable BOOLEAN NOT NULL,
  confidence FLOAT,
  prediction_timestamp DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sensor_data_id) REFERENCES sensor_data(id) ON DELETE CASCADE
);
*/

// =============================
// INSERT SENSOR DATA
// =============================
exports.insertSensorData = async (data) => {
  const { timestamp, temp_c, do_mgl, ph, conductivity_uscm, totalcoliform_mv } = data;
  
  const sql = `
    INSERT INTO sensor_data (timestamp, temp_c, do_mgl, ph, conductivity_uscm, totalcoliform_mv)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  const [result] = await pool.query(sql, [
    timestamp, 
    temp_c, 
    do_mgl, 
    ph, 
    conductivity_uscm, 
    totalcoliform_mv
  ]);
  
  return result.insertId;
};

// =============================
// GET LATEST SENSOR DATA
// =============================
exports.getLatestSensorData = async () => {
  const sql = `
    SELECT * FROM sensor_data 
    ORDER BY timestamp DESC 
    LIMIT 1
  `;
  
  const [rows] = await pool.query(sql);
  return rows[0] || null;
};

// =============================
// INSERT AI PREDICTION
// =============================
exports.insertAIPrediction = async (data) => {
  const { sensor_data_id, potable, confidence, prediction_timestamp } = data;
  
  const sql = `
    INSERT INTO ai_predictions (sensor_data_id, potable, confidence, prediction_timestamp)
    VALUES (?, ?, ?, ?)
  `;
  
  const [result] = await pool.query(sql, [
    sensor_data_id,
    potable,
    confidence,
    prediction_timestamp
  ]);
  
  return result.insertId;
};

// =============================
// GET LATEST AI PREDICTION
// =============================
exports.getLatestPrediction = async () => {
  const sql = `
    SELECT 
      p.*,
      s.temp_c,
      s.do_mgl,
      s.ph,
      s.conductivity_uscm,
      s.totalcoliform_mv,
      s.timestamp as sensor_timestamp
    FROM ai_predictions p
    JOIN sensor_data s ON p.sensor_data_id = s.id
    ORDER BY p.prediction_timestamp DESC
    LIMIT 1
  `;
  
  const [rows] = await pool.query(sql);
  return rows[0] || null;
};

// =============================
// GET SENSOR HISTORY (untuk grafik)
// =============================
exports.getSensorHistory = async (limit = 100) => {
  const sql = `
    SELECT * FROM sensor_data 
    ORDER BY timestamp DESC 
    LIMIT ?
  `;
  
  const [rows] = await pool.query(sql, [limit]);
  return rows;
};

// =============================
// INSERT TOTAL COLIFORM
// =============================
exports.insertColiform = async (data) => {
  const { sensor_data_id, mpn_value, status } = data;
  
  const sql = `
    INSERT INTO total_coliform (sensor_data_id, mpn_value, status)
    VALUES (?, ?, ?)
  `;
  
  const [result] = await pool.query(sql, [
    sensor_data_id,
    mpn_value,
    status || 'Normal'
  ]);
  
  return result.insertId;
};

// =============================
// GET COLIFORM HISTORY
// Params: limit (default: 100), source (optional: 'sensor' or 'ai_prediction')
// Sekarang tabel sudah terpisah:
//   - source='sensor' → query dari total_coliform
//   - source='ai_prediction' → query dari total_coliform_ai_prediction
// =============================
exports.getColiformHistory = async (limit = 100, source = null) => {
  let tableName = 'total_coliform'; // Default: sensor data
  
  // Pilih tabel berdasarkan source
  if (source === 'ai_prediction') {
    tableName = 'total_coliform_ai_prediction';
  }
  
  const sql = `SELECT * FROM ${tableName} ORDER BY timestamp DESC LIMIT ?`;
  const [rows] = await pool.query(sql, [limit]);
  return rows;
};

// =============================
// GET LATEST COLIFORM DATA
// =============================
exports.getLatestColiform = async () => {
  const sql = `
    SELECT * FROM total_coliform 
    ORDER BY timestamp DESC 
    LIMIT 1
  `;
  
  const [rows] = await pool.query(sql);
  return rows[0] || null;
};

// =============================
// GET SENSOR WITH COLIFORM (JOIN)
// =============================
exports.getSensorWithColiform = async (limit = 100) => {
  const sql = `
    SELECT 
      s.*,
      c.id as coliform_id,
      c.mpn_value,
      c.status as coliform_status,
      c.timestamp as coliform_timestamp
    FROM sensor_data s
    LEFT JOIN total_coliform c ON s.id = c.sensor_data_id
    ORDER BY s.timestamp DESC
    LIMIT ?
  `;
  
  const [rows] = await pool.query(sql, [limit]);
  return rows;
};
