// Script untuk create tabel sensor_data dan ai_predictions
require('dotenv').config();
const mysql = require('mysql2/promise');

async function createTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'colivera_db',
  });

  console.log('✅ Connected to database');

  try {
    // Drop existing tables if exist
    await connection.query('DROP TABLE IF EXISTS ai_predictions');
    console.log('🗑️  Dropped ai_predictions (if existed)');
    
    await connection.query('DROP TABLE IF EXISTS sensor_data');
    console.log('🗑️  Dropped sensor_data (if existed)');

    // Create sensor_data table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sensor_data (
        id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        timestamp DATETIME NOT NULL,
        temp_c FLOAT NOT NULL COMMENT 'Suhu dalam Celsius',
        do_mgl FLOAT NOT NULL COMMENT 'Dissolved Oxygen dalam mg/L',
        ph FLOAT NOT NULL COMMENT 'pH air',
        conductivity_uscm FLOAT NOT NULL COMMENT 'Konduktivitas dalam µS/cm',
        totalcoliform_mv FLOAT NOT NULL COMMENT 'Total Coliform dalam mV',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table sensor_data created');

    // Create ai_predictions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ai_predictions (
        id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        sensor_data_id INT UNSIGNED NOT NULL,
        potable BOOLEAN NOT NULL COMMENT 'TRUE = AMAN, FALSE = BAHAYA',
        confidence FLOAT COMMENT 'Confidence score dari AI (0-1)',
        prediction_timestamp DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sensor_data_id) REFERENCES sensor_data(id) ON DELETE CASCADE,
        INDEX idx_prediction_timestamp (prediction_timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table ai_predictions created');

    // Create view
    await connection.query(`
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
      ORDER BY s.timestamp DESC
    `);
    console.log('✅ View sensor_with_predictions created');

    console.log('\n🎉 All tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
  } finally {
    await connection.end();
  }
}

createTables();
