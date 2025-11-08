require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateAIPredictions3Tier() {
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
    console.log('🚀 Starting AI Predictions 3-Tier Indonesian Migration...\n');

    // Step 1: Backup data
    console.log('📦 Step 1: Creating backup table...');
    await pool.query(`DROP TABLE IF EXISTS ai_predictions_backup_3tier`);
    await pool.query(`CREATE TABLE ai_predictions_backup_3tier LIKE ai_predictions`);
    await pool.query(`INSERT INTO ai_predictions_backup_3tier SELECT * FROM ai_predictions`);
    const [backupCount] = await pool.query(`SELECT COUNT(*) as count FROM ai_predictions_backup_3tier`);
    console.log(`✅ Backup created with ${backupCount[0].count} records\n`);

    // Step 2: Expand ENUM to include both English and Indonesian
    console.log('📝 Step 2: Expanding ENUM to include both languages...');
    await pool.query(`
      ALTER TABLE ai_predictions 
      MODIFY COLUMN risk_level ENUM('Safe', 'Warning', 'Danger', 'Aman', 'Waspada', 'Bahaya')
    `);
    console.log('✅ ENUM expanded\n');

    // Step 3: Convert existing data from English to Indonesian
    console.log('🔄 Step 3: Converting data from English to Indonesian...');
    
    // Safe -> Aman
    const [safeUpdate] = await pool.query(`
      UPDATE ai_predictions 
      SET risk_level = 'Aman' 
      WHERE risk_level = 'Safe'
    `);
    console.log(`   ✅ Converted ${safeUpdate.affectedRows} records: Safe → Aman`);

    // Warning -> Waspada
    const [warningUpdate] = await pool.query(`
      UPDATE ai_predictions 
      SET risk_level = 'Waspada' 
      WHERE risk_level = 'Warning'
    `);
    console.log(`   ✅ Converted ${warningUpdate.affectedRows} records: Warning → Waspada`);

    // Danger -> Bahaya
    const [dangerUpdate] = await pool.query(`
      UPDATE ai_predictions 
      SET risk_level = 'Bahaya' 
      WHERE risk_level = 'Danger'
    `);
    console.log(`   ✅ Converted ${dangerUpdate.affectedRows} records: Danger → Bahaya\n`);

    // Step 4: Remove English values from ENUM
    console.log('🗑️  Step 4: Removing English values from ENUM...');
    await pool.query(`
      ALTER TABLE ai_predictions 
      MODIFY COLUMN risk_level ENUM('Aman', 'Waspada', 'Bahaya')
    `);
    console.log('✅ ENUM now only contains Indonesian values\n');

    // Step 5: Verify migration
    console.log('✅ Step 5: Verifying migration...');
    const [columns] = await pool.query(`SHOW COLUMNS FROM ai_predictions LIKE 'risk_level'`);
    console.log('   New ENUM type:', columns[0].Type);

    const [data] = await pool.query(`
      SELECT risk_level, COUNT(*) as count 
      FROM ai_predictions 
      GROUP BY risk_level
    `);
    console.log('\n📊 Current distribution:');
    console.table(data);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Backup table: ai_predictions_backup_3tier');
    console.log('   - ENUM values: Aman, Waspada, Bahaya (Indonesian)');
    console.log('   - Total records migrated:', safeUpdate.affectedRows + warningUpdate.affectedRows + dangerUpdate.affectedRows);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n🔄 To restore from backup, run:');
    console.error('   DROP TABLE ai_predictions;');
    console.error('   RENAME TABLE ai_predictions_backup_3tier TO ai_predictions;');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateAIPredictions3Tier();
