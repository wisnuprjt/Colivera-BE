// database/add-ecoli-mpn-prediction.js
// Tambah kolom ecoli_mpn_prediction ke ai_predictions table

const mysql = require('mysql2/promise');
require('dotenv').config();

async function addEcoliMPNColumn() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'colivera_db',
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('🚀 Adding ecoli_mpn_prediction column to ai_predictions...\n');

    // Check if column already exists
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM ai_predictions LIKE 'ecoli_mpn_prediction'
    `);

    if (columns.length > 0) {
      console.log('ℹ️  Column ecoli_mpn_prediction already exists!');
      console.log('✅ No migration needed.\n');
      return;
    }

    // Add new column
    await connection.query(`
      ALTER TABLE ai_predictions 
      ADD COLUMN ecoli_mpn_prediction FLOAT AFTER risk_level
    `);

    console.log('✅ Column ecoli_mpn_prediction added successfully!');
    console.log('📊 Column details:');
    console.log('   - Type: FLOAT');
    console.log('   - Purpose: Store E.coli MPN prediction from AI');
    console.log('   - Nullable: Yes (untuk backward compatibility)\n');

    // Show updated structure
    const [structure] = await connection.query(`
      DESCRIBE ai_predictions
    `);

    console.log('📋 Updated ai_predictions structure:');
    console.table(structure);

    console.log('\n🎉 Migration completed successfully!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await connection.end();
  }
}

// Run migration
if (require.main === module) {
  addEcoliMPNColumn();
}

module.exports = { addEcoliMPNColumn };
