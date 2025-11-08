require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkTotalColiformStructure() {
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
    console.log('📊 Checking total_coliform table structure...\n');
    
    // Get table structure
    const [columns] = await pool.query(`SHOW COLUMNS FROM total_coliform`);
    
    console.log('📋 Table Structure:');
    console.table(columns);
    
    // Check current data
    const [data] = await pool.query(`SELECT * FROM total_coliform ORDER BY id DESC LIMIT 10`);
    console.log('\n📊 Latest 10 records:');
    console.table(data);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTotalColiformStructure();
