const pool = require("./db");

exports.insertColiform = async (sensor_data_id, mpn_value, status) => {
  const [result] = await pool.query(
    "INSERT INTO total_coliform (sensor_data_id, mpn_value, status) VALUES (?, ?, ?)",
    [sensor_data_id, mpn_value, status || 'Normal']
  );
  return result.insertId;
};

exports.getLatestData = async (limit = 10) => {
  const [rows] = await pool.query(
    "SELECT * FROM total_coliform ORDER BY timestamp DESC LIMIT ?",
    [limit]
  );
  return rows;
};

// Get AI Prediction history dari total_coliform_ai_prediction
exports.getAIPredictionHistory = async (limit = 10) => {
  const [rows] = await pool.query(
    `SELECT 
      id,
      timestamp,
      mpn_value,
      status
    FROM total_coliform_ai_prediction 
    ORDER BY timestamp DESC 
    LIMIT ?`,
    [limit]
  );
  return rows;
};
