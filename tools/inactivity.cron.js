// src/tools/inactivity.cron.js
const cron = require("node-cron");
const pool = require("../src/models/db");

// waktu inactivity threshold (menit)
const INACTIVITY_THRESHOLD_MINUTES = Number(process.env.INACTIVITY_MINUTES || 60);

async function checkInactivity() {
  console.log("⏱️ Running inactivity check...");

  try {
    // ambil semua sensor dari tabel sensors
    const [sensors] = await pool.query(`
      SELECT id, name, last_seen, status, offline_since
      FROM sensors
    `);

    const now = new Date();

    for (const s of sensors) {
      const lastSeen = s.last_seen ? new Date(s.last_seen) : null;
      const minutesSince = lastSeen ? (now - lastSeen) / (1000 * 60) : Infinity;

      // === CASE 1: Sensor dianggap offline ===
      if (minutesSince > INACTIVITY_THRESHOLD_MINUTES) {
        if (s.status !== "offline") {
          // Update status sensor ke offline
          await pool.query(
            `UPDATE sensors 
             SET status='offline', offline_since=NOW() 
             WHERE id=?`,
            [s.id]
          );

          // Cek apakah sudah ada notifikasi 'inactivity' aktif untuk sensor ini
          const [existing] = await pool.query(
            `SELECT id FROM notifications 
             WHERE sensor_id=? AND type='inactivity' AND active=1 LIMIT 1`,
            [s.id]
          );

          // Kalau belum ada, buat notifikasi baru
          if (existing.length === 0) {
            const message = `Sensor ${s.name || s.id} tidak mengirim data selama ${INACTIVITY_THRESHOLD_MINUTES} menit terakhir.`;
            await pool.query(
              `INSERT INTO notifications 
                (sensor_id, message, type, severity, active, status, created_at, meta) 
               VALUES (?, ?, 'inactivity', 'critical', 1, 'unread', NOW(), JSON_OBJECT('last_seen', ?, 'threshold_min', ?))`,
              [s.id, message, s.last_seen, INACTIVITY_THRESHOLD_MINUTES]
            );
            console.log(`⚠️ Notifikasi inactivity dibuat untuk sensor ID ${s.id}`);
          }
        }
      }

      // === CASE 2: Sensor kembali online ===
      else {
        if (s.status !== "online") {
          await pool.query(
            `UPDATE sensors 
             SET status='online', offline_since=NULL 
             WHERE id=?`,
            [s.id]
          );
        }

        // Tutup notifikasi yang masih aktif
        await pool.query(
          `UPDATE notifications 
           SET active=0, resolved_at=NOW(), status='resolved' 
           WHERE sensor_id=? AND type='inactivity' AND active=1`,
          [s.id]
        );
      }
    }
  } catch (err) {
    console.error("❌ Error during inactivity check:", err);
  }
}

// Jalankan setiap 5 menit
cron.schedule("*/5 * * * *", () => {
  checkInactivity();
});

module.exports = { checkInactivity };
