// tools/ai-prediction-sync.cron.js
// Cron job untuk fetch AI prediction dari HuggingFace /api/latest, simpan ke total_coliform_ai_prediction
const cron = require("node-cron");
const axios = require("axios");
const pool = require("../src/models/db");
const { syncSensorData } = require("./sensor-data-sync.cron");

// URL HuggingFace API - Ubah ke /api/latest
const HUGGINGFACE_API_LATEST = "https://gary29-water-quality-ai.hf.space/api/latest";

// Interval sync (detik) - 20 detik
const SYNC_INTERVAL_SECONDS = Number(process.env.AI_PREDICTION_SYNC_INTERVAL || 20);

/**
 * Helper function: Hitung status dari MPN value
 * Aman: ≤0.70, Waspada: 0.71-0.99, Bahaya: ≥1.0
 */
const calculateStatusFromMPN = (mpnValue) => {
  if (mpnValue <= 0.70) return 'Aman';
  if (mpnValue >= 0.71 && mpnValue <= 0.99) return 'Waspada';
  return 'Bahaya';
};

/**
 * Fungsi untuk menjalankan AI Prediction dan simpan hasilnya
 */
async function runAIPrediction() {
  try {
    console.log("\n🤖 Starting AI Prediction sync from /api/latest...");

    // 1. Fetch dari HuggingFace /api/latest
    console.log("🔄 Fetching from HuggingFace /api/latest...");
    const response = await axios.get(HUGGINGFACE_API_LATEST, {
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
      }
    });

    const apiData = response.data;
    
    // Validasi response
    if (!apiData || !apiData.prediction || !apiData.sensor_data) {
      console.log("⚠️  Invalid response structure from /api/latest");
      return;
    }

    // 2. Extract data dari response
    const sensorData = apiData.sensor_data;
    const prediction = apiData.prediction;
    
    // Extract Total Coliform MPN dari prediction
    const aiMpnPrediction = prediction.total_coliform_mv ?? null;
    
    if (aiMpnPrediction === null) {
      console.log("⚠️  No AI prediction value found in response");
      return;
    }

    console.log("🧪 Total Coliform MPN (AI Prediction):", aiMpnPrediction);

    // 3. Get atau insert sensor_data_id
    // Cek apakah sensor data dengan timestamp ini sudah ada
    const [existingSensor] = await pool.query(
      `SELECT id FROM sensor_data WHERE timestamp = ? LIMIT 1`,
      [apiData.timestamp]
    );

    let sensorDataId;
    
    if (existingSensor.length > 0) {
      sensorDataId = existingSensor[0].id;
      console.log(`📊 Using existing sensor data ID: ${sensorDataId}`);
    } else {
      // Insert sensor data baru
      const [insertResult] = await pool.query(
        `INSERT INTO sensor_data (timestamp, temp_c, do_mgl, ph, conductivity_uscm, totalcoliform_mv)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          apiData.timestamp,
          sensorData.temp_c,
          sensorData.do_mgl,
          sensorData.ph,
          sensorData.conductivity_uscm,
          sensorData.totalcoliform_mv || 0
        ]
      );
      sensorDataId = insertResult.insertId;
      console.log(`📊 Created new sensor data with ID: ${sensorDataId}`);
    }

    // 4. Cek apakah AI prediction untuk sensor_data_id ini sudah ada
    const [existingPrediction] = await pool.query(
      `SELECT id FROM total_coliform_ai_prediction WHERE sensor_data_id = ? LIMIT 1`,
      [sensorDataId]
    );

    if (existingPrediction.length > 0) {
      console.log(`⚠️  AI Prediction for sensor_data_id ${sensorDataId} already exists, skipping...`);
      return;
    }

    // 5. Simpan ke total_coliform (Sensor) - Raw millivolt
    if (sensorData.totalcoliform_mv !== undefined && sensorData.totalcoliform_mv !== null) {
      const sensorMpnValue = sensorData.totalcoliform_mv;
      const sensorStatus = calculateStatusFromMPN(sensorMpnValue);
      
      // Cek apakah sudah ada entry untuk sensor ini
      const [existingSensorColiform] = await pool.query(
        `SELECT id FROM total_coliform WHERE sensor_data_id = ? LIMIT 1`,
        [sensorDataId]
      );
      
      if (existingSensorColiform.length === 0) {
        await pool.query(
          `INSERT INTO total_coliform (sensor_data_id, mpn_value, status, timestamp)
           VALUES (?, ?, ?, ?)`,
          [sensorDataId, sensorMpnValue, sensorStatus, apiData.timestamp]
        );
        console.log(`📊 Total Coliform (Sensor) saved: ${sensorMpnValue} MPN - ${sensorStatus}`);
      }
    }

    // 6. Simpan ke total_coliform_ai_prediction (AI Prediction) - MPN dari /api/latest
    const aiStatus = calculateStatusFromMPN(aiMpnPrediction);
    
    await pool.query(
      `INSERT INTO total_coliform_ai_prediction (sensor_data_id, mpn_value, status, timestamp)
       VALUES (?, ?, ?, ?)`,
      [sensorDataId, aiMpnPrediction, aiStatus, apiData.timestamp]
    );
    
    console.log(`🤖 Total Coliform (AI Prediction) saved: ${aiMpnPrediction.toFixed(2)} MPN - ${aiStatus}`);
    console.log("✅ AI Prediction sync completed successfully\n");

  } catch (error) {
    console.error("❌ Error during AI prediction sync:", error.message);
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error("⏱️  Timeout - HuggingFace Space might be cold starting");
    }
  }
}

/**
 * Main sync function: Run AI prediction dari /api/latest
 */
async function syncAll() {
  // Langsung jalankan AI prediction dari /api/latest
  // (tidak perlu sync sensor data dulu karena /api/latest sudah include sensor data)
  await runAIPrediction();
}

/**
 * Start cron job
 */
function startAIPredictionSyncCron() {
  console.log("\n🚀 ========================================");
  console.log("🤖 AI PREDICTION SYNC CRON JOB STARTED");
  console.log(`⏱️  Sync interval: Every ${SYNC_INTERVAL_SECONDS} second(s)`);
  console.log(`🔗 API URL: ${HUGGINGFACE_API_LATEST}`);
  console.log("🚀 ========================================\n");

  // Jalankan sekali saat startup
  console.log("🔄 Running initial sync on startup...");
  syncAll();

  // Setup cron schedule dengan detik: */20 * * * * * (setiap 20 detik)
  const cronSchedule = `*/${SYNC_INTERVAL_SECONDS} * * * * *`;

  cron.schedule(cronSchedule, () => {
    syncAll();
  });

  console.log(`✅ Cron job scheduled: ${cronSchedule}\n`);
}

// Jalankan cron job jika file ini dijalankan langsung
if (require.main === module) {
  startAIPredictionSyncCron();
}

// Export untuk dipanggil dari file lain
module.exports = { startAIPredictionSyncCron, runAIPrediction };
