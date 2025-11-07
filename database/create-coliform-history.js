// Script untuk create tabel total_coliform_history
require('dotenv').config();
const mysql = require('mysql2/promise');

async function createColiformHistoryTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'colivera_db',
  });

  console.log('✅ Connected to database');

  try {
    // Create total_coliform_history table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS total_coliform_history (
        id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        sensor_data_id INT UNSIGNED NOT NULL COMMENT 'Relasi ke sensor_data.id',
        mpn_value FLOAT NOT NULL COMMENT 'Total Coliform dalam MPN/100ml',
        raw_voltage FLOAT NOT NULL COMMENT 'Raw voltage dari sensor (mV)',
        timestamp DATETIME NOT NULL COMMENT 'Timestamp dari API Gary',
        status ENUM('AMAN', 'BAHAYA') NOT NULL COMMENT 'Status berdasarkan prediksi AI',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sensor_data_id) REFERENCES sensor_data(id) ON DELETE CASCADE,
        INDEX idx_timestamp (timestamp),
        INDEX idx_sensor_data_id (sensor_data_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table total_coliform_history created');

    // Create view untuk join sensor_data + coliform history
    await connection.query(`
      CREATE OR REPLACE VIEW sensor_coliform_view AS
      SELECT 
        s.id as sensor_id,
        s.timestamp as sensor_timestamp,
        s.temp_c,
        s.do_mgl,
        s.ph,
        s.conductivity_uscm,
        s.totalcoliform_mv,
        c.id as coliform_history_id,
        c.mpn_value,
        c.raw_voltage,
        c.timestamp as coliform_timestamp,
        c.status,
        c.created_at
      FROM sensor_data s
      LEFT JOIN total_coliform_history c ON s.id = c.sensor_data_id
      ORDER BY s.timestamp DESC
    `);
    console.log('✅ View sensor_coliform_view created');

    console.log('\n🎉 Total coliform history table created successfully!');
  } catch (error) {
    console.error('❌ Error creating table:', error);
  } finally {
    await connection.end();
  }
}

createColiformHistoryTable();
