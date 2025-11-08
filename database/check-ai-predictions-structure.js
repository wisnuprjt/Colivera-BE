require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkStructure() {
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
    console.log('📊 Checking ai_predictions table structure...\n');
    
    // Get table structure
    const [columns] = await pool.query(`SHOW COLUMNS FROM ai_predictions`);
    
    console.log('📋 Table Structure:');
    console.table(columns);
    
    // Find risk_level column
    const riskLevelColumn = columns.find(col => col.Field === 'risk_level');
    if (riskLevelColumn) {
      console.log('\n🎯 risk_level column details:');
      console.log('   Type:', riskLevelColumn.Type);
      console.log('   Null:', riskLevelColumn.Null);
      console.log('   Default:', riskLevelColumn.Default);
    }
    
    // Check current data
    const [data] = await pool.query(`SELECT * FROM ai_predictions ORDER BY id DESC LIMIT 5`);
    console.log('\n📊 Latest 5 records:');
    console.table(data);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkStructure();
