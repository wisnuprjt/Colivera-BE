// database/delete-backups.js
// Script untuk hapus backup tables otomatis

const mysql = require('mysql2/promise');
require('dotenv').config();

async function deleteBackupTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'colivera_db',
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('🗑️  Starting cleanup of backup tables...\n');

    // Get all backup tables
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'total_coliform_backup_%'
    `);

    if (tables.length === 0) {
      console.log('✅ No backup tables found. Database is clean!\n');
      return;
    }

    console.log(`📋 Found ${tables.length} backup table(s):\n`);
    
    let deletedCount = 0;
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      console.log(`   🗑️  Dropping: ${tableName}`);
      
      await connection.query(`DROP TABLE IF EXISTS ${tableName}`);
      deletedCount++;
    }

    console.log(`\n✅ Successfully deleted ${deletedCount} backup table(s)!`);
    console.log('🎉 Database cleanup completed!\n');

  } catch (error) {
    console.error('❌ Error deleting backup tables:', error.message);
  } finally {
    await connection.end();
  }
}

// Run cleanup
if (require.main === module) {
  deleteBackupTables();
}

module.exports = { deleteBackupTables };
