require('dotenv').config();
const mysql = require('mysql2/promise');

async function addSourceColumn() {
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
    console.log('🚀 Adding source column to total_coliform table...\n');

    // Check if column already exists
    const [columns] = await pool.query(`
      SHOW COLUMNS FROM total_coliform LIKE 'source'
    `);

    if (columns.length > 0) {
      console.log('✅ Column "source" already exists, skipping...');
      return;
    }

    // Add source column
    await pool.query(`
      ALTER TABLE total_coliform 
      ADD COLUMN source ENUM('sensor', 'ai_prediction') DEFAULT 'sensor' AFTER status
    `);

    console.log('✅ Column "source" added successfully!');
    
    // Update existing records to have default source
    const [updateResult] = await pool.query(`
      UPDATE total_coliform 
      SET source = 'sensor' 
      WHERE source IS NULL
    `);
    
    console.log(`✅ Updated ${updateResult.affectedRows} existing records with default source`);
    
    // Show updated structure
    const [updatedColumns] = await pool.query(`SHOW COLUMNS FROM total_coliform`);
    console.log('\n📋 Updated table structure:');
    console.table(updatedColumns);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addSourceColumn();
