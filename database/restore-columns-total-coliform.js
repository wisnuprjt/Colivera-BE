// Script untuk restore kolom raw_voltage dan mpn_value ke tabel total_coliform
require('dotenv').config();
const mysql = require('mysql2/promise');

async function restoreColumns() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'colivera_db',
  });

  console.log('✅ Connected to database');

  try {
    // Add back mpn_value column
    const [mpnCol] = await connection.query(`
      SHOW COLUMNS FROM total_coliform LIKE 'mpn_value'
    `);
    
    if (mpnCol.length === 0) {
      await connection.query(`
        ALTER TABLE total_coliform 
        ADD COLUMN mpn_value FLOAT AFTER id
      `);
      console.log('✅ Column mpn_value restored to total_coliform');
    } else {
      console.log('ℹ️  Column mpn_value already exists');
    }

    // Add back raw_voltage column
    const [voltageCol] = await connection.query(`
      SHOW COLUMNS FROM total_coliform LIKE 'raw_voltage'
    `);
    
    if (voltageCol.length === 0) {
      await connection.query(`
        ALTER TABLE total_coliform 
        ADD COLUMN raw_voltage FLOAT AFTER mpn_value
      `);
      console.log('✅ Column raw_voltage restored to total_coliform');
    } else {
      console.log('ℹ️  Column raw_voltage already exists');
    }

    // Show current structure
    const [structure] = await connection.query('DESCRIBE total_coliform');
    console.log('\n📋 Current total_coliform structure:');
    console.table(structure);

    console.log('\n🎉 Columns restored successfully!');
  } catch (error) {
    console.error('❌ Error restoring columns:', error);
  } finally {
    await connection.end();
  }
}

restoreColumns();
