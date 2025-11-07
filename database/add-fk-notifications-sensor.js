// Script untuk update tabel notifications - tambah foreign key ke sensor_data
require('dotenv').config();
const mysql = require('mysql2/promise');

async function addForeignKey() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'colivera_db',
  });

  console.log('✅ Connected to database');

  try {
    // 1. Hapus data lama yang sensor_id-nya invalid (kalo ada)
    const [invalidRows] = await connection.query(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE sensor_id IS NOT NULL 
      AND sensor_id NOT IN (SELECT id FROM sensor_data)
    `);
    
    if (invalidRows[0].count > 0) {
      console.log(`⚠️  Found ${invalidRows[0].count} notifications with invalid sensor_id`);
      console.log('🗑️  Cleaning up invalid notifications...');
      
      await connection.query(`
        DELETE FROM notifications 
        WHERE sensor_id IS NOT NULL 
        AND sensor_id NOT IN (SELECT id FROM sensor_data)
      `);
      
      console.log('✅ Invalid notifications deleted');
    }

    // 2. Ubah tipe sensor_id jadi INT UNSIGNED (sama dengan sensor_data.id)
    console.log('🔧 Changing sensor_id type to INT UNSIGNED...');
    
    await connection.query(`
      ALTER TABLE notifications 
      MODIFY sensor_id INT UNSIGNED
    `);
    
    console.log('✅ Column type changed');

    // 3. Tambah foreign key constraint
    console.log('🔗 Adding foreign key constraint...');
    
    await connection.query(`
      ALTER TABLE notifications 
      ADD CONSTRAINT fk_notifications_sensor_data
      FOREIGN KEY (sensor_id) 
      REFERENCES sensor_data(id) 
      ON DELETE CASCADE
    `);
    
    console.log('✅ Foreign key constraint added!');
    
    // 3. Show table structure
    const [structure] = await connection.query('DESCRIBE notifications');
    console.log('\n📋 Updated notifications structure:');
    console.table(structure);

    console.log('\n🎉 Notifications now linked to sensor_data!');
    
  } catch (error) {
    if (error.code === 'ER_DUP_KEYNAME') {
      console.log('ℹ️  Foreign key already exists');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await connection.end();
  }
}

addForeignKey();
