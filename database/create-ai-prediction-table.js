require('dotenv').config();
const mysql = require('mysql2/promise');

async function createAIPredictionTable() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'colivera_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('🚀 Creating total_coliform_ai_prediction table...\n');

    // Create new table for AI Prediction
    await pool.query(`
      CREATE TABLE IF NOT EXISTS total_coliform_ai_prediction (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        sensor_data_id INT UNSIGNED,
        mpn_value FLOAT NOT NULL,
        status ENUM('Aman', 'Waspada', 'Bahaya'),
        timestamp DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sensor_data_id) REFERENCES sensor_data(id) ON DELETE CASCADE,
        INDEX idx_timestamp (timestamp),
        INDEX idx_sensor_data_id (sensor_data_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ Table total_coliform_ai_prediction created successfully!\n');
    
    // Show structure
    const [columns] = await pool.query(`SHOW COLUMNS FROM total_coliform_ai_prediction`);
    console.log('📋 Table Structure:');
    console.table(columns);
    
    console.log('\n✅ Migration completed!');
    console.log('\n📊 Summary:');
    console.log('   - total_coliform: For sensor data (MPN from sensor millivolt)');
    console.log('   - total_coliform_ai_prediction: For AI prediction data (MPN from AI /predict)');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createAIPredictionTable();
