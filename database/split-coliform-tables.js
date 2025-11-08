require('dotenv').config();
const mysql = require('mysql2/promise');

async function splitColiformTables() {
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
    console.log('🚀 Starting Total Coliform tables split...\n');

    // ===================================
    // Step 1: Backup existing table
    // ===================================
    console.log('📦 Step 1: Creating backup...');
    await pool.query(`DROP TABLE IF EXISTS total_coliform_backup_split`);
    await pool.query(`CREATE TABLE total_coliform_backup_split LIKE total_coliform`);
    await pool.query(`INSERT INTO total_coliform_backup_split SELECT * FROM total_coliform`);
    
    const [backupCount] = await pool.query(`SELECT COUNT(*) as count FROM total_coliform_backup_split`);
    console.log(`✅ Backup created: ${backupCount[0].count} records\n`);

    // ===================================
    // Step 2: Create new table for AI Prediction
    // ===================================
    console.log('📝 Step 2: Creating total_coliform_ai_prediction table...');
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
    console.log('✅ Table total_coliform_ai_prediction created\n');

    // ===================================
    // Step 3: Copy AI prediction data to new table
    // ===================================
    console.log('📊 Step 3: Migrating AI prediction data...');
    const [aiData] = await pool.query(`
      SELECT sensor_data_id, mpn_value, status, timestamp
      FROM total_coliform
      WHERE source = 'ai_prediction'
      ORDER BY timestamp ASC
    `);
    
    if (aiData.length > 0) {
      for (const row of aiData) {
        await pool.query(`
          INSERT INTO total_coliform_ai_prediction (sensor_data_id, mpn_value, status, timestamp)
          VALUES (?, ?, ?, ?)
        `, [row.sensor_data_id, row.mpn_value, row.status, row.timestamp]);
      }
      console.log(`✅ Migrated ${aiData.length} AI prediction records\n`);
    } else {
      console.log('ℹ️  No AI prediction data to migrate\n');
    }

    // ===================================
    // Step 4: Delete AI prediction data from original table
    // ===================================
    console.log('🗑️  Step 4: Removing AI prediction data from total_coliform...');
    const [deleteResult] = await pool.query(`
      DELETE FROM total_coliform WHERE source = 'ai_prediction'
    `);
    console.log(`✅ Deleted ${deleteResult.affectedRows} AI prediction records\n`);

    // ===================================
    // Step 5: Remove source column from total_coliform
    // ===================================
    console.log('🔧 Step 5: Removing source column...');
    await pool.query(`ALTER TABLE total_coliform DROP COLUMN source`);
    console.log('✅ Column "source" removed\n');

    // ===================================
    // Step 6: Verify results
    // ===================================
    console.log('✅ Step 6: Verification...\n');
    
    const [sensorCount] = await pool.query(`SELECT COUNT(*) as count FROM total_coliform`);
    const [aiCount] = await pool.query(`SELECT COUNT(*) as count FROM total_coliform_ai_prediction`);
    
    console.log('📊 Final counts:');
    console.log(`   - total_coliform (sensor only): ${sensorCount[0].count} records`);
    console.log(`   - total_coliform_ai_prediction: ${aiCount[0].count} records`);
    
    // Show sample data
    console.log('\n📋 Sample from total_coliform (Sensor):');
    const [sensorSample] = await pool.query(`SELECT * FROM total_coliform ORDER BY timestamp DESC LIMIT 3`);
    console.table(sensorSample);
    
    console.log('\n📋 Sample from total_coliform_ai_prediction:');
    const [aiSample] = await pool.query(`SELECT * FROM total_coliform_ai_prediction ORDER BY timestamp DESC LIMIT 3`);
    console.table(aiSample);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📦 Backup table: total_coliform_backup_split');
    console.log('   To restore: DROP TABLE total_coliform; RENAME TABLE total_coliform_backup_split TO total_coliform;');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n🔄 To restore from backup:');
    console.error('   DROP TABLE total_coliform;');
    console.error('   DROP TABLE IF EXISTS total_coliform_ai_prediction;');
    console.error('   RENAME TABLE total_coliform_backup_split TO total_coliform;');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

splitColiformTables();
