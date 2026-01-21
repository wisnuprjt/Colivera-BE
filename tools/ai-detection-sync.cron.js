// ============================================================================
// tools/ai-detection-sync.cron.js
// ============================================================================
// Cron job untuk fetch & simpan AI Detection (AI PREDICTION DATA)
// Purpose: Fetch AI prediction dari /api/latest, simpan ke database
// Interval: Setiap 20 detik
// Responsibility: HANYA total_coliform_ai_prediction
// ============================================================================

const cron = require("node-cron");
const axios = require("axios");
const pool = require("../src/models/db");

// ============================================================================
// CONFIGURATION
// ============================================================================

const HUGGINGFACE_API_LATEST = "https://gary29-water-quality-ai.hf.space/api/latest";
const SYNC_INTERVAL_SECONDS = Number(process.env.AI_DETECTION_SYNC_INTERVAL || 20);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate status based on MPN value
 * Aman: ≤0.70, Waspada: 0.71-0.99, Bahaya: ≥1.0
 */
const calculateStatusFromMPN = (mpnValue) => {
  if (mpnValue <= 0.70) return "Aman";
  if (mpnValue >= 0.71 && mpnValue <= 0.99) return "Waspada";
  return "Bahaya";
};

/**
 * Normalize timestamp to local time (YYYY-MM-DD HH:mm:ss format)
 * Properly parse timezone from API response (e.g., +07:00)
 */
const normalizeTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

/**
 * Sync AI detection data dari HuggingFace API
 * Flow:
 * 1. Fetch dari /api/latest
 * 2. Get atau create sensor_data_id
 * 3. Insert/Update total_coliform_ai_prediction
 */
async function syncAIDetection() {
  const executionTime = new Date().toISOString();
  console.log(`\n🤖 [${executionTime}] Starting AI Detection sync...`);

  let connection;

  try {
    // ========================================================================
    // STEP 1: Fetch dari HuggingFace API  /api/latest...
    // ========================================================================

    console.log("🔄 Fetching AI Detection from HuggingFace");

    const response = await axios.get(HUGGINGFACE_API_LATEST, {
      timeout: 15000,
      headers: {
        Accept: "application/json",
      },
    });

    const apiData = response.data;

    // Validasi response structure
    if (!apiData || !apiData.prediction || !apiData.sensor_data) {
      console.log("⚠️  Invalid response structure from /api/latest");
      return;
    }

    const prediction = apiData.prediction;
    const sensorData = apiData.sensor_data;
    const apiTimestamp = apiData.timestamp;
    const normalizedTimestamp = normalizeTimestamp(apiTimestamp);

    // Extract AI prediction value
    const aiMpnPrediction = prediction.total_coliform_mv ?? null;

    if (aiMpnPrediction === null) {
      console.log("⚠️  No AI prediction value found in response");
      return;
    }

    console.log("✅ Data received from API:", {
      prediction_mpn: aiMpnPrediction,
      timestamp: apiTimestamp,
    });

    // ========================================================================
    // STEP 2: Get database connection
    // ========================================================================

    connection = await pool.getConnection();

    // ========================================================================
    // STEP 3: Get atau create sensor_data_id
    // ========================================================================

    console.log("📊 Checking sensor_data...");

    const [existingSensor] = await connection.query(
      `SELECT id FROM sensor_data WHERE timestamp = ? LIMIT 1`,
      [normalizedTimestamp]
    );

    let sensorDataId;

    if (existingSensor.length > 0) {
      sensorDataId = existingSensor[0].id;
      console.log(`✓ Using existing AI Detection sensor data ID: ${sensorDataId}`);
    } else {
      // Create sensor_data jika belum ada (jadi ai_prediction punya foreign key)
      // Use INSERT ... ON DUPLICATE KEY UPDATE untuk handle race condition antar cron jobs
      const [result] = await connection.query(
        `INSERT INTO sensor_data (timestamp, temp_c, do_mgl, ph, conductivity_uscm, totalcoliform_mv)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         temp_c = VALUES(temp_c),
         do_mgl = VALUES(do_mgl),
         ph = VALUES(ph),
         conductivity_uscm = VALUES(conductivity_uscm),
         totalcoliform_mv = VALUES(totalcoliform_mv)`,
        [
          normalizedTimestamp,
          sensorData.temp_c || 0,
          sensorData.do_mgl || 0,
          sensorData.ph || 0,
          sensorData.conductivity_uscm || 0,
          sensorData.totalcoliform_mv || 0,
        ]
      );

      // Jika INSERT menghasilkan affectedRows, berarti baru di-insert
      if (result.affectedRows === 1) {
        sensorDataId = result.insertId;
        console.log(
          `✓ Created new sensor data (for AI prediction) with ID: ${sensorDataId}`
        );
      } else {
        // Jika UPDATE (duplicate), ambil ID dari query baru
        const [freshSensor] = await connection.query(
          `SELECT id FROM sensor_data WHERE timestamp = ? LIMIT 1`,
          [normalizedTimestamp]
        );
        sensorDataId = freshSensor[0].id;
        console.log(
          `✓ Using existing sensor data (updated) with ID: ${sensorDataId}`
        );
      }
    }

    // ========================================================================
    // STEP 4: Insert/Update total_coliform_ai_prediction
    // ========================================================================

    const aiStatus = calculateStatusFromMPN(aiMpnPrediction);

    console.log(
      `🤖 Syncing AI Detection: ${aiMpnPrediction.toFixed(2)} MPN - ${aiStatus}`
    );

    // Use INSERT ... ON DUPLICATE KEY UPDATE untuk avoid race condition
    const [result] = await connection.query(
      `INSERT INTO total_coliform_ai_prediction (sensor_data_id, mpn_value, status, timestamp)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       mpn_value = VALUES(mpn_value),
       status = VALUES(status),
       timestamp = VALUES(timestamp)`,
      [sensorDataId, aiMpnPrediction, aiStatus, normalizedTimestamp]
    );

    if (result.affectedRows > 0) {
      console.log(
        `✓ AI Detection (Prediction) saved: ${aiMpnPrediction.toFixed(
          2
        )} MPN - ${aiStatus}`
      );
    } else {
      console.log(`⚠️  AI Detection (Prediction) already up-to-date`);
    }

    console.log("✅ AI Detection sync completed successfully\n");
  } catch (error) {
    console.error("❌ Error during AI Detection sync:", error.message);

    if (
      error.code === "ECONNABORTED" ||
      error.message.includes("timeout")
    ) {
      console.error(
        "⏱️  Timeout - HuggingFace Space might be cold starting or network issue"
      );
    } else if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      console.error("🔌 Connection error - Cannot reach HuggingFace API");
    } else if (error.code === "ER_DUP_ENTRY") {
      console.error(
        "🔄 Duplicate entry detected (handled by ON DUPLICATE KEY UPDATE)"
      );
    }
  } finally {
    // ========================================================================
    // STEP 5: Release database connection
    // ========================================================================

    if (connection) {
      await connection.release();
    }
  }
}

// ============================================================================
// CRON JOB STARTER
// ============================================================================

/**
 * Start the cron job untuk AI detection sync
 */
function startAIDetectionSyncCron() {
  console.log("\n🚀 ========================================");
  console.log("🤖 AI DETECTION SYNC CRON JOB STARTED");
  console.log(`⏱️  Sync interval: Every ${SYNC_INTERVAL_SECONDS} second(s)`);
  console.log(`🔗 API URL: ${HUGGINGFACE_API_LATEST}`);
  console.log("📋 Responsibility: total_coliform_ai_prediction");
  console.log("🚀 ========================================\n");

  // Run initial sync on startup
  console.log("🔄 Running initial sync on startup...");
  syncAIDetection().catch((err) => {
    console.error("❌ Initial sync failed:", err.message);
  });

  // Setup cron schedule (setiap X detik)
  const cronSchedule = `*/${SYNC_INTERVAL_SECONDS} * * * * *`;

  cron.schedule(cronSchedule, () => {
    syncAIDetection().catch((err) => {
      console.error("❌ Scheduled sync failed:", err.message);
    });
  });

  console.log(`✅ Cron job scheduled: ${cronSchedule}\n`);
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

// Export untuk dipanggil dari index.js
module.exports = { startAIDetectionSyncCron, syncAIDetection };

// Run jika file dijalankan langsung (untuk testing)
if (require.main === module) {
  startAIDetectionSyncCron();
}
