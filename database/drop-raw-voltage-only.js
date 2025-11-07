// Script untuk hapus HANYA kolom raw_voltage dari tabel total_coliform
require('dotenv').config();
const mysql = require('mysql2/promise');

async function dropRawVoltage() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'colivera_db',
  });

  console.log('✅ Connected to database');

  try {
    // Check and drop raw_voltage only
    const [voltageCol] = await connection.query(`
      SHOW COLUMNS FROM total_coliform LIKE 'raw_voltage'
    `);
    
    if (voltageCol.length > 0) {
      await connection.query(`ALTER TABLE total_coliform DROP COLUMN raw_voltage`);
      console.log('✅ Column raw_voltage dropped from total_coliform');
    } else {
      console.log('ℹ️  Column raw_voltage already does not exist');
    }

    // Show current structure
    const [structure] = await connection.query('DESCRIBE total_coliform');
    console.log('\n📋 Current total_coliform structure:');
    console.table(structure);

    console.log('\n🎉 Done! mpn_value tetap ada, raw_voltage dihapus.');
  } catch (error) {
    console.error('❌ Error dropping column:', error);
  } finally {
    await connection.end();
  }
}

dropRawVoltage();
