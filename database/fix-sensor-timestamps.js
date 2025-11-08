require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixSensorTimestamps() {
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
    console.log('🔧 Fixing sensor timestamps in total_coliform table...\n');

    // Update timestamp untuk semua sensor data yang source = 'sensor'
    // Ambil timestamp dari tabel sensor_data yang di-join
    const [updateResult] = await pool.query(`
      UPDATE total_coliform tc
      INNER JOIN sensor_data sd ON tc.sensor_data_id = sd.id
      SET tc.timestamp = sd.timestamp
      WHERE tc.source = 'sensor'
    `);

    console.log(`✅ Updated ${updateResult.affectedRows} sensor records with correct timestamps\n`);

    // Show sample of updated data
    const [sampleData] = await pool.query(`
      SELECT tc.id, tc.sensor_data_id, tc.mpn_value, tc.status, tc.timestamp, tc.source, sd.timestamp as sensor_timestamp
      FROM total_coliform tc
      INNER JOIN sensor_data sd ON tc.sensor_data_id = sd.id
      WHERE tc.source = 'sensor'
      ORDER BY tc.id DESC
      LIMIT 10
    `);

    console.log('📊 Sample of updated data:');
    console.table(sampleData);

    console.log('\n✅ Timestamps fixed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixSensorTimestamps();
