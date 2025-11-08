// database/drop-backup-tables.js
// Script untuk menghapus tabel backup yang sudah tidak diperlukan

const mysql = require('mysql2/promise');

async function dropBackupTables() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'colivera_db'
  });

  try {
    console.log('🗑️  Starting cleanup of obsolete tables...\n');

    // 1. Drop ai_predictions_backup_3tier (backup lama)
    console.log('Dropping table: ai_predictions_backup_3tier');
    await connection.query('DROP TABLE IF EXISTS ai_predictions_backup_3tier');
    console.log('✅ Table ai_predictions_backup_3tier dropped\n');

    // 2. Drop total_coliform_backup_split (backup sebelum split)
    console.log('Dropping table: total_coliform_backup_split');
    await connection.query('DROP TABLE IF EXISTS total_coliform_backup_split');
    console.log('✅ Table total_coliform_backup_split dropped\n');

    // 3. Drop ai_predictions (data potable/confidence obsolete, semua ada di total_coliform_ai_prediction)
    console.log('Dropping table: ai_predictions');
    await connection.query('DROP TABLE IF EXISTS ai_predictions');
    console.log('✅ Table ai_predictions dropped (data obsolete: potable/confidence tidak lagi direturn oleh API)\n');

    console.log('✅ All obsolete tables cleaned up successfully!');

  } catch (error) {
    console.error('❌ Error dropping backup tables:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run the script
dropBackupTables()
  .then(() => {
    console.log('\n✅ Cleanup complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Cleanup failed:', err);
    process.exit(1);
  });
