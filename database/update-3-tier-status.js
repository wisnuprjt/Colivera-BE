// database/update-3-tier-status.js
// Migration untuk update status dari 2-tier (Normal/Critical) ke 3-tier (Safe/Warning/Danger)

const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate3TierStatus() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'colivera_db',
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('🚀 Starting 3-Tier Status Migration...\n');

    // Step 1: Backup existing data
    console.log('📦 Step 1: Creating backup...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS total_coliform_backup_${Date.now()} 
      SELECT * FROM total_coliform
    `);
    console.log('✅ Backup created\n');

    // Step 2a: Expand ENUM dulu (add Indonesian values)
    console.log('🔧 Step 2a: Expanding ENUM to include Indonesian values...');
    await connection.query(`
      ALTER TABLE total_coliform 
      MODIFY COLUMN status ENUM('Normal', 'Warning', 'Critical', 'Aman', 'Waspada', 'Bahaya') DEFAULT 'Normal'
    `);
    console.log('✅ ENUM expanded\n');
    
    // Step 2b: Convert existing data dari English ke Indonesia
    console.log('🔄 Step 2b: Converting existing data to Bahasa Indonesia...');
    
    // Update Normal → Aman
    await connection.query(`
      UPDATE total_coliform SET status = 'Aman' WHERE status = 'Normal'
    `);
    
    // Update Critical → Bahaya
    await connection.query(`
      UPDATE total_coliform SET status = 'Bahaya' WHERE status = 'Critical'
    `);
    
    // Update Warning → Waspada (kalau ada)
    await connection.query(`
      UPDATE total_coliform SET status = 'Waspada' WHERE status = 'Warning'
    `);
    
    console.log('✅ Data converted to Indonesian\n');
    
    // Step 2c: Remove English values dari ENUM
    console.log('🔧 Step 2c: Removing English values from ENUM...');
    await connection.query(`
      ALTER TABLE total_coliform 
      MODIFY COLUMN status ENUM('Aman', 'Waspada', 'Bahaya') DEFAULT 'Aman'
    `);
    console.log('✅ total_coliform status column updated (Bahasa Indonesia only)\n');

    // Step 3: Add risk_level column to ai_predictions (Bahasa Indonesia)
    console.log('🔧 Step 3: Adding risk_level to ai_predictions...');
    
    // Check if column exists
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM ai_predictions LIKE 'risk_level'
    `);
    
    if (columns.length === 0) {
      await connection.query(`
        ALTER TABLE ai_predictions 
        ADD COLUMN risk_level ENUM('Aman', 'Waspada', 'Bahaya') 
        AFTER confidence
      `);
      console.log('✅ risk_level column added (Bahasa Indonesia)\n');
    } else {
      console.log('ℹ️  risk_level column already exists\n');
    }

    // Step 4: Update existing data based on logic
    console.log('🔄 Step 4: Updating existing records...');
    
    // Get all ai_predictions with confidence
    const [predictions] = await connection.query(`
      SELECT ap.id, ap.sensor_data_id, ap.potable, ap.confidence, tc.id as coliform_id
      FROM ai_predictions ap
      LEFT JOIN total_coliform tc ON ap.sensor_data_id = tc.sensor_data_id
      WHERE ap.risk_level IS NULL
    `);

    let updateCount = 0;
    for (const pred of predictions) {
      let riskLevel;
      let coliformStatus;
      
      // Apply 3-tier logic (Bahasa Indonesia)
      if (!pred.potable) {
        riskLevel = 'Bahaya';
        coliformStatus = 'Bahaya';
      } else if (pred.potable && pred.confidence < 0.7) {
        riskLevel = 'Waspada';
        coliformStatus = 'Waspada';
      } else {
        riskLevel = 'Aman';
        coliformStatus = 'Aman';
      }

      // Update ai_predictions
      await connection.query(`
        UPDATE ai_predictions 
        SET risk_level = ? 
        WHERE id = ?
      `, [riskLevel, pred.id]);

      // Update total_coliform
      if (pred.coliform_id) {
        await connection.query(`
          UPDATE total_coliform 
          SET status = ? 
          WHERE id = ?
        `, [coliformStatus, pred.coliform_id]);
      }

      updateCount++;
    }

    console.log(`✅ Updated ${updateCount} records\n`);

    // Step 5: Show summary
    console.log('📊 Migration Summary:');
    const [summary] = await connection.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM total_coliform
      GROUP BY status
    `);
    
    console.table(summary);

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart backend server');
    console.log('   2. Test the 3-tier status display');
    console.log('   3. Update frontend to show Safe/Warning/Danger badges\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n⚠️  Please check the error and try again.');
    console.error('   Database backup was created before migration started.\n');
  } finally {
    await connection.end();
  }
}

// Run migration
if (require.main === module) {
  migrate3TierStatus();
}

module.exports = { migrate3TierStatus };
