// tools/ai-prediction-sync.cron.js
// Cron job untuk fetch AI prediction, simpan ke ai_predictions dan total_coliform tables
const cron = require("node-cron");
const axios = require("axios");
const pool = require("../src/models/db");
const { syncSensorData } = require("./sensor-data-sync.cron");

// URL HuggingFace API
const HUGGINGFACE_PREDICT_URL = "https://gary29-water-quality-ai.hf.space/predict";

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
    console.log("\n🤖 Starting AI Prediction sync...");

    // 1. Get latest sensor data dari database
    const [latestSensor] = await pool.query(`
      SELECT * FROM sensor_data 
      ORDER BY timestamp DESC 
      LIMIT 1
    `);

    if (latestSensor.length === 0) {
      console.log("⚠️  No sensor data available for prediction");
      return;
    }

    const sensorData = latestSensor[0];
    const sensorDataId = sensorData.id;

    console.log(`📊 Using sensor data ID: ${sensorDataId}`);

    // 2. Kirim data ke HuggingFace Prediction API
    const requestData = {
      temp_c: sensorData.temp_c,
      do_mgl: sensorData.do_mgl,
      ph: sensorData.ph,
      conductivity_uscm: sensorData.conductivity_uscm,
      totalcoliform_mpn_100ml: 0 // Default value
    };

    console.log("🔄 Sending to prediction API...");
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

    // 3. Extract Total Coliform MPN prediction dari API
    // Pakai ?? (nullish coalescing) bukan || agar nilai 0 tidak jadi null
    const ecoliMpnPrediction = predictionResult.prediction?.total_coliform_mpn_100ml ?? null;
    
    console.log("🧪 Total Coliform MPN extracted:", ecoliMpnPrediction);

    // 4. Simpan ke total_coliform (Sensor) - Raw millivolt dengan REAL-TIME timestamp
    if (sensorData.totalcoliform_mv !== undefined && sensorData.totalcoliform_mv !== null) {
      const sensorMpnValue = sensorData.totalcoliform_mv;
      const sensorStatus = calculateStatusFromMPN(sensorMpnValue);
      const currentTimestamp = new Date();
      
      await pool.query(
        `INSERT INTO total_coliform (sensor_data_id, mpn_value, status, timestamp)
         VALUES (?, ?, ?, ?)`,
        [sensorDataId, sensorMpnValue, sensorStatus, currentTimestamp]
      );
      
      console.log(`📊 Total Coliform (Sensor) saved: ${sensorMpnValue} MPN - ${sensorStatus}`);
    }

    // 5. Simpan ke total_coliform_ai_prediction (AI Prediction) - MPN dari AI dengan REAL-TIME timestamp
    if (ecoliMpnPrediction !== null) {
      const aiStatus = calculateStatusFromMPN(ecoliMpnPrediction);
      const aiTimestamp = new Date();
      
      await pool.query(
        `INSERT INTO total_coliform_ai_prediction (sensor_data_id, mpn_value, status, timestamp)
         VALUES (?, ?, ?, ?)`,
        [sensorDataId, ecoliMpnPrediction, aiStatus, aiTimestamp]
      );
      
      console.log(`🤖 Total Coliform (AI Prediction) saved: ${ecoliMpnPrediction.toFixed(2)} MPN - ${aiStatus}`);
    }

    console.log("✅ AI Prediction sync completed successfully\n");

  } catch (error) {
    console.error("❌ Error during AI prediction:", error.message);
  }
}

/**
 * Main sync function: Sensor data + AI prediction
 */
async function syncAll() {
  // 1. Sync sensor data first
  const sensorData = await syncSensorData();
  
  // 2. If new sensor data available, run AI prediction
  if (sensorData) {
    await runAIPrediction();
  }
}

/**
 * Start cron job
 */
function startAIPredictionSyncCron() {
  console.log("\n🚀 ========================================");
  console.log("🤖 AI PREDICTION SYNC CRON JOB STARTED");
  console.log(`⏱️  Sync interval: Every ${SYNC_INTERVAL_SECONDS} second(s)`);
  console.log(`🔗 API URL: ${HUGGINGFACE_PREDICT_URL}`);
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
