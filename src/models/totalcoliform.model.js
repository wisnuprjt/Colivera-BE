const pool = require("./db");

exports.insertColiform = async (sensor_id, mpn_value, raw_voltage, status) => {
  const [result] = await pool.query(
    "INSERT INTO total_coliform (sensor_id, mpn_value, raw_voltage, status) VALUES (?, ?, ?, ?)",
    [sensor_id, mpn_value, raw_voltage, status]
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
