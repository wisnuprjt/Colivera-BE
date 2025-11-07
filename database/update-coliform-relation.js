// Script untuk:
// 1. Tambah foreign key sensor_data → total_coliform
// 2. Drop tabel total_coliform_history

require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateColiformRelation() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'colivera_db',
  });

  console.log('✅ Connected to database');

  try {
    // Step 1: Tambah kolom sensor_data_id di total_coliform (jika belum ada)
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM total_coliform LIKE 'sensor_data_id'
    `);
    
    if (columns.length === 0) {
      console.log('📝 Adding sensor_data_id column to total_coliform...');
      
      await connection.query(`
        ALTER TABLE total_coliform 
        ADD COLUMN sensor_data_id INT UNSIGNED AFTER id,
        ADD CONSTRAINT fk_total_coliform_sensor_data
        FOREIGN KEY (sensor_data_id) REFERENCES sensor_data(id) ON DELETE SET NULL
      `);
      
      console.log('✅ Column sensor_data_id added with foreign key');
    } else {
      console.log('ℹ️  Column sensor_data_id already exists');
    }

    // Step 2: Drop tabel total_coliform_history
    const [historyTable] = await connection.query(`
      SHOW TABLES LIKE 'total_coliform_history'
    `);
    
    if (historyTable.length > 0) {
      console.log('🗑️  Dropping table total_coliform_history...');
      
      await connection.query('DROP TABLE total_coliform_history');
      
      console.log('✅ Table total_coliform_history dropped');
    } else {
      console.log('ℹ️  Table total_coliform_history does not exist');
    }

    // Step 3: Drop view sensor_coliform_view (karena pakai total_coliform_history)
    const [view] = await connection.query(`
      SHOW FULL TABLES WHERE TABLE_TYPE = 'VIEW' AND Tables_in_colivera_db = 'sensor_coliform_view'
    `);
    
    if (view.length > 0) {
      console.log('🗑️  Dropping view sensor_coliform_view...');
      await connection.query('DROP VIEW sensor_coliform_view');
      console.log('✅ View sensor_coliform_view dropped');
    }

    // Show current structure
    const [structure] = await connection.query('DESCRIBE total_coliform');
    console.log('\n📋 Current total_coliform structure:');
    console.table(structure);

    // Show remaining tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log('\n📋 Remaining tables:');
    tables.forEach(row => console.log(`  - ${Object.values(row)[0]}`));

    console.log('\n🎉 Done! total_coliform now has foreign key to sensor_data');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

updateColiformRelation();
