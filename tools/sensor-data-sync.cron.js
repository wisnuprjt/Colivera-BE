// tools/sensor-sync.cron.js
// Cron job untuk fetch sensor data dari HuggingFace API dan simpan ke database
const cron = require("node-cron");
const axios = require("axios");
const pool = require("../src/models/db");

// URL HuggingFace API
const HUGGINGFACE_SENSOR_URL = "https://gary29-water-quality-ai.hf.space/iot/latest";

// Interval sync (detik) - 20 detik
const SYNC_INTERVAL_SECONDS = Number(process.env.SENSOR_SYNC_INTERVAL || 20); // Default 20 detik

/**
 * Fungsi untuk fetch data sensor dari HuggingFace API dan simpan ke database
 */
async function syncSensorData() {
  const timestamp = new Date().toISOString();
  console.log(`\n📡 [${timestamp}] Starting sensor data sync...`);

  try {
    // 1. Fetch data dari HuggingFace API
    console.log("🔄 Fetching data from HuggingFace API...");
    const response = await axios.get(HUGGINGFACE_SENSOR_URL, {
      timeout: 15000, // 15 detik timeout
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    const apiData = response.data;

    // 2. Validasi response
    if (apiData.status === "no_data") {
      console.log("ℹ️  No data available from IoT device yet");
      return null;
    }

    if (apiData.status !== "success" || !apiData.data) {
      console.log("⚠️  Invalid data format from HuggingFace API");
      return null;
    }

    const sensorData = apiData.data;
    console.log("✅ Data received from API:", {
      temp_c: sensorData.temp_c,
      do_mgl: sensorData.do_mgl,
      ph: sensorData.ph,
      conductivity_uscm: sensorData.conductivity_uscm,
      totalcoliform_mv: sensorData.totalcoliform_mv,
      timestamp: sensorData.timestamp
    });

    // 3. Cek apakah data dengan timestamp ini sudah ada di database
    const [existing] = await pool.query(
      `SELECT id FROM sensor_data WHERE timestamp = ? LIMIT 1`,
      [sensorData.timestamp]
    );

    if (existing.length > 0) {
      console.log("ℹ️  Data with this timestamp already exists, skipping...");
      console.log("    Sensor belum mengirim data baru, menunggu update berikutnya...\n");
      return null;
    }

    // 4. Simpan ke database
    const [result] = await pool.query(
      `INSERT INTO sensor_data (timestamp, temp_c, do_mgl, ph, conductivity_uscm, totalcoliform_mv)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        sensorData.timestamp,
        sensorData.temp_c,
        sensorData.do_mgl,
        sensorData.ph,
        sensorData.conductivity_uscm,
        sensorData.totalcoliform_mv
      ]
    );

    const insertedId = result.insertId;
    console.log(`💾 Sensor data saved to database with ID: ${insertedId}`);
    console.log("✅ Sensor sync completed successfully\n");

    // Return sensor data untuk digunakan cron job lain
    return {
      id: insertedId,
      ...sensorData
    };

  } catch (error) {
    console.error("❌ Error during sensor sync:", error.message);

    // Log error type untuk debugging
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error("⏱️  Timeout: HuggingFace Space might be in cold start");
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error("🔌 Connection error: Cannot reach HuggingFace API");
    } else if (error.code) {
      console.error(`🔧 Error code: ${error.code}`);
    }
    
    console.log(""); // Empty line untuk readability
    return null;
  }
}

/**
 * Start cron job
 */
function startSensorSyncCron() {
  console.log("\n🚀 ========================================");
  console.log("🤖 SENSOR DATA SYNC CRON JOB STARTED");
  console.log(`⏱️  Sync interval: Every ${SYNC_INTERVAL_SECONDS} second(s)`);
  console.log(`🔗 API URL: ${HUGGINGFACE_SENSOR_URL}`);
  console.log("🚀 ========================================\n");

  // Jalankan sekali saat startup
  console.log("🔄 Running initial sync on startup...");
  syncSensorData();

  // Setup cron schedule dengan detik: */20 * * * * * (setiap 20 detik)
  const cronSchedule = `*/${SYNC_INTERVAL_SECONDS} * * * * *`;

  cron.schedule(cronSchedule, () => {
    syncSensorData();
  });

  console.log(`✅ Cron job scheduled: ${cronSchedule}\n`);
}

// Jalankan cron job jika file ini dijalankan langsung
if (require.main === module) {
  startSensorSyncCron();
}

// Export untuk dipanggil dari file lain
module.exports = { startSensorSyncCron, syncSensorData };
