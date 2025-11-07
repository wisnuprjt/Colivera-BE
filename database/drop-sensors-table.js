// Script untuk hapus tabel sensors (sudah tidak dipakai)
require('dotenv').config();
const mysql = require('mysql2/promise');

async function dropSensorsTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'colivera_db',
  });

  console.log('✅ Connected to database');

  try {
    // Check if table exists
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'sensors'
    `);
    
    if (tables.length > 0) {
      console.log('🗑️  Dropping table sensors...');
      
      await connection.query('DROP TABLE sensors');
      
      console.log('✅ Table sensors dropped successfully!');
    } else {
      console.log('ℹ️  Table sensors does not exist');
    }

    // Show remaining tables
    const [allTables] = await connection.query('SHOW TABLES');
    console.log('\n📋 Remaining tables:');
    allTables.forEach(row => console.log(`  - ${Object.values(row)[0]}`));
    
    console.log('\n🎉 Table sensors removed from database!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

dropSensorsTable();
