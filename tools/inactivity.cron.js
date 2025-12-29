// src/tools/inactivity.cron.js
const cron = require("node-cron");
const pool = require("../src/models/db");
const { sendTelegram, formatInactivityNotif } = require("../src/services/telegram.service");

// waktu inactivity threshold (menit)
const INACTIVITY_THRESHOLD_MINUTES = Number(process.env.INACTIVITY_MINUTES || 5); // 5 menit default

async function checkInactivity() {
  console.log("⏱️ Running inactivity check...");

  try {
    // Ambil data sensor TERAKHIR dari sensor_data
    const [latestData] = await pool.query(`
      SELECT id, timestamp
      FROM sensor_data
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    // Jika tidak ada data sama sekali, skip
    if (latestData.length === 0) {
      console.log("ℹ️  No sensor data found yet");
      return;
    }

    const lastSensor = latestData[0];
    const lastTimestamp = new Date(lastSensor.timestamp);
    const now = new Date();
    const minutesSince = (now - lastTimestamp) / (1000 * 60);

    console.log(`📊 Last sensor data: ${minutesSince.toFixed(1)} minutes ago`);

    // === CASE 1: Sensor dianggap offline (> threshold) ===
    if (minutesSince > INACTIVITY_THRESHOLD_MINUTES) {
      // Cek apakah sudah ada notifikasi 'inactivity' aktif
      const [existing] = await pool.query(
        `SELECT id FROM notifications 
         WHERE sensor_id=? AND type='inactivity' AND active=1 AND status='unread'
         LIMIT 1`,
        [lastSensor.id] // Pakai sensor_data.id
      );

      // Kalau belum ada, buat notifikasi baru
      if (existing.length === 0) {
        const message = `Sensor tidak mengirim data selama ${minutesSince.toFixed(0)} menit terakhir.`;
        
        await pool.query(
          `INSERT INTO notifications 
            (sensor_id, message, type, severity, active, status, created_at, meta) 
           VALUES (?, ?, 'inactivity', 'critical', 1, 'unread', NOW(), ?)`,
          [
            lastSensor.id, // Foreign key ke sensor_data.id
            message,
            JSON.stringify({
              last_seen: lastTimestamp.toISOString(),
              threshold_min: INACTIVITY_THRESHOLD_MINUTES
            })
          ]
        );
        
        console.log(`⚠️ Notifikasi inactivity dibuat - Sensor mati selama ${minutesSince.toFixed(0)} menit`);

        // Kirim Telegram
        const tgText = formatInactivityNotif({
          sensor_name: "Sensor IoT Utama",
          sensor_id: lastSensor.id,
          last_seen: lastTimestamp.toISOString(),
          threshold_min: INACTIVITY_THRESHOLD_MINUTES,
        });
        
        sendTelegram(tgText).catch((err) => {
          console.error("❌ Telegram send failed:", err.message);
        });
      } else {
        console.log("ℹ️  Notifikasi inactivity sudah ada, skip duplicate");
      }
    }

    // === CASE 2: Sensor kembali online (< threshold) ===
    else {
      // Tutup notifikasi inactivity yang masih aktif
      const [resolved] = await pool.query(
        `UPDATE notifications 
         SET active=0, resolved_at=NOW(), status='resolved' 
         WHERE type='inactivity' AND active=1`
      );

      if (resolved.affectedRows > 0) {
        console.log("✅ Sensor kembali online - Notifikasi inactivity ditutup");
        
        // Kirim Telegram bahwa sensor online lagi
        const tgText = `✅ *Sensor Kembali Online*\n\nSensor IoT mulai mengirim data lagi pada ${now.toLocaleString('id-ID')}`;
        sendTelegram(tgText).catch(() => {});
      }
    }
  } catch (err) {
    console.error("❌ Error during inactivity check:", err);
  }
}

// Jalankan setiap 1 menit (untuk deteksi cepat)
cron.schedule("*/1 * * * *", () => {
  checkInactivity();
});

module.exports = { checkInactivity };

