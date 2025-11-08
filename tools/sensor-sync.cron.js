// tools/sensor-sync.cron.js
// Cron job untuk otomatis fetch data sensor dari HuggingFace API dan simpan ke database
const cron = require("node-cron");
const axios = require("axios");
const pool = require("../src/models/db");

// URL HuggingFace API
const HUGGINGFACE_SENSOR_URL = "https://gary29-water-quality-ai.hf.space/iot/latest";
const HUGGINGFACE_PREDICT_URL = "https://gary29-water-quality-ai.hf.space/predict";

// Interval sync (menit) - bisa diatur via environment variable
const SYNC_INTERVAL_MINUTES = Number(process.env.SENSOR_SYNC_INTERVAL || 1); // Default 1 menit

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
      return;
    }

    if (apiData.status !== "success" || !apiData.data) {
      console.log("⚠️  Invalid data format from HuggingFace API");
      return;
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
      return;
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

    // 5. Jalankan AI Prediction untuk data baru ini
    await runAIPrediction(insertedId, sensorData);

    console.log("✅ Sensor sync completed successfully\n");

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
  }
}

/**
 * Fungsi untuk menjalankan AI Prediction dan simpan hasilnya
 */
async function runAIPrediction(sensorDataId, sensorData) {
  try {
    console.log("🤖 Running AI prediction...");

    // Kirim data ke HuggingFace Prediction API
    const requestData = {
      temp_c: sensorData.temp_c,
      do_mgl: sensorData.do_mgl,
      ph: sensorData.ph,
      conductivity_uscm: sensorData.conductivity_uscm,
      totalcoliform_mpn_100ml: 0 // Default value
    };

    const predictResponse = await axios.post(HUGGINGFACE_PREDICT_URL, requestData, {
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    const predictionResult = predictResponse.data;

    if (predictionResult.status === "error") {
      console.log("⚠️  Prediction API returned error:", predictionResult.message);
      return;
    }

    // Simpan hasil prediksi ke ai_predictions table
    const potable = predictionResult.ai_detection?.potable ?? true;
    const confidence = predictionResult.ai_detection?.confidence ?? 0;

    await pool.query(
      `INSERT INTO ai_predictions (sensor_data_id, potable, confidence, prediction_timestamp)
       VALUES (?, ?, ?, ?)`,
      [sensorDataId, potable, confidence, new Date()]
    );

    console.log(`🎯 AI Prediction saved: ${potable ? "AMAN ✅" : "BAHAYA ⚠️"} (confidence: ${(confidence * 100).toFixed(1)}%)`);

    // Simpan ke total_coliform table juga
    const status = potable ? 'Normal' : 'Critical';
    const mpnValue = sensorData.totalcoliform_mv || 0; // Bisa dikonversi kalau ada formula

    await pool.query(
      `INSERT INTO total_coliform (sensor_data_id, mpn_value, status, timestamp)
       VALUES (?, ?, ?, ?)`,
      [sensorDataId, mpnValue, status, sensorData.timestamp]
    );

    console.log(`📊 Total coliform data saved with status: ${status}`);

  } catch (error) {
    console.error("❌ Error during AI prediction:", error.message);
  }
}

/**
 * Start cron job
 */
function startSensorSyncCron() {
  console.log("\n🚀 ========================================");
  console.log("🤖 SENSOR SYNC CRON JOB STARTED");
  console.log(`⏱️  Sync interval: Every ${SYNC_INTERVAL_MINUTES} minute(s)`);
  console.log(`🔗 API URL: ${HUGGINGFACE_SENSOR_URL}`);
  console.log("🚀 ========================================\n");

  // Jalankan sekali saat startup
  console.log("🔄 Running initial sync on startup...");
  syncSensorData();

  // Setup cron schedule
  // Format: */minute * * * * (every X minutes)
  const cronSchedule = `*/${SYNC_INTERVAL_MINUTES} * * * *`;

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
