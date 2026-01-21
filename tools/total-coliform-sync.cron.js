// ============================================================================
// tools/total-coliform-sync.cron.js
// ============================================================================
// Cron job untuk fetch & simpan Total Coliform (RAW SENSOR DATA)
// Purpose: Fetch sensor data dari /api/latest, simpan ke database
// Interval: Setiap 20 detik
// Responsibility: HANYA total_coliform & sensor_data
// ============================================================================

const cron = require("node-cron");
const axios = require("axios");
const pool = require("../src/models/db");

// ============================================================================
// CONFIGURATION
// ============================================================================

const HUGGINGFACE_API_LATEST = "https://gary29-water-quality-ai.hf.space/api/latest";
const SYNC_INTERVAL_SECONDS = Number(process.env.TOTAL_COLIFORM_SYNC_INTERVAL || 20);

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
 * Sync total coliform data dari HuggingFace API
 * Flow:
 * 1. Fetch dari /api/latest
 * 2. Insert/Update sensor_data
 * 3. Insert/Update total_coliform
 */
async function syncTotalColiform() {
  const executionTime = new Date().toISOString();
  console.log(`\n📊 [${executionTime}] Starting Total Coliform sync...`);

  let connection;

  try {
    // ========================================================================
    // STEP 1: Fetch dari HuggingFace API /api/latest...
    // ========================================================================

    console.log("🔄 Fetching Total Coliform from HuggingFace");

    const response = await axios.get(HUGGINGFACE_API_LATEST, {
      timeout: 15000,
      headers: {
        Accept: "application/json",
      },
    });

    const apiData = response.data;

    // Validasi response structure
    if (!apiData || !apiData.sensor_data) {
      console.log("⚠️  Invalid response structure from /api/latest");
      return;
    }

    const sensorData = apiData.sensor_data;
    const apiTimestamp = apiData.timestamp;
    const normalizedTimestamp = normalizeTimestamp(apiTimestamp);

    console.log("✅ Data received from API:", {
      temp_c: sensorData.temp_c,
      do_mgl: sensorData.do_mgl,
      ph: sensorData.ph,
      conductivity_uscm: sensorData.conductivity_uscm,
      totalcoliform_mv: sensorData.totalcoliform_mv,
      timestamp: apiTimestamp,
    });

    // ========================================================================
    // STEP 2: Get database connection
    // ========================================================================

    connection = await pool.getConnection();

    // ========================================================================
    // STEP 3: Check & Insert/Update sensor_data
    // ========================================================================

    console.log("📊 Checking sensor_data...");

    const [existingSensor] = await connection.query(
      `SELECT id FROM sensor_data WHERE timestamp = ? LIMIT 1`,
      [normalizedTimestamp]
    );

    let sensorDataId;

    if (existingSensor.length > 0) {
      sensorDataId = existingSensor[0].id;
      console.log(`✓ Using existing Total Coliform sensor data ID: ${sensorDataId}`);

      // Update sensor data jika ada perubahan
      await connection.query(
        `UPDATE sensor_data 
         SET temp_c = ?, do_mgl = ?, ph = ?, conductivity_uscm = ?, totalcoliform_mv = ?
         WHERE id = ?`,
        [
          sensorData.temp_c,
          sensorData.do_mgl,
          sensorData.ph,
          sensorData.conductivity_uscm,
          sensorData.totalcoliform_mv || 0,
          sensorDataId,
        ]
      );
    } else {
      // Insert sensor data baru dengan ON DUPLICATE KEY UPDATE untuk handle race condition
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
          sensorData.temp_c,
          sensorData.do_mgl,
          sensorData.ph,
          sensorData.conductivity_uscm,
          sensorData.totalcoliform_mv || 0,
        ]
      );

      // Jika INSERT menghasilkan affectedRows, berarti baru di-insert
      if (result.affectedRows === 1) {
        sensorDataId = result.insertId;
        console.log(`✓ Created new sensor data with ID: ${sensorDataId}`);
      } else {
        // Jika UPDATE (duplicate), ambil ID dari query baru
        const [freshSensor] = await connection.query(
          `SELECT id FROM sensor_data WHERE timestamp = ? LIMIT 1`,
          [normalizedTimestamp]
        );
        sensorDataId = freshSensor[0].id;
        console.log(`✓ Using existing sensor data (updated) with ID: ${sensorDataId}`);
      }
    }

    // ========================================================================
    // STEP 4: Insert/Update total_coliform (RAW SENSOR)
    // ========================================================================

    if (
      sensorData.totalcoliform_mv !== undefined &&
      sensorData.totalcoliform_mv !== null
    ) {
      const sensorMpnValue = sensorData.totalcoliform_mv;
      const sensorStatus = calculateStatusFromMPN(sensorMpnValue);

      console.log(
        `📊 Syncing Total Coliform (Sensor): ${sensorMpnValue} MPN - ${sensorStatus}`
      );

      // Use INSERT ... ON DUPLICATE KEY UPDATE untuk avoid race condition
      const [result] = await connection.query(
        `INSERT INTO total_coliform (sensor_data_id, mpn_value, status, timestamp)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         mpn_value = VALUES(mpn_value),
         status = VALUES(status),
         timestamp = VALUES(timestamp)`,
        [sensorDataId, sensorMpnValue, sensorStatus, normalizedTimestamp]
      );

      if (result.affectedRows > 0) {
        console.log(
          `✓ Total Coliform (Sensor) saved: ${sensorMpnValue} MPN - ${sensorStatus}`
        );
      } else {
        console.log(`⚠️  Total Coliform (Sensor) already up-to-date`);
      }
    }

    console.log("✅ Total Coliform sync completed successfully\n");
  } catch (error) {
    console.error("❌ Error during Total Coliform sync:", error.message);

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
 * Start the cron job untuk total coliform sync
 */
function startTotalColiformSyncCron() {
  console.log("\n🚀 ========================================");
  console.log("📊 TOTAL COLIFORM SYNC CRON JOB STARTED");
  console.log(`⏱️  Sync interval: Every ${SYNC_INTERVAL_SECONDS} second(s)`);
  console.log(`🔗 API URL: ${HUGGINGFACE_API_LATEST}`);
  console.log("📋 Responsibility: sensor_data + total_coliform");
  console.log("🚀 ========================================\n");

  // Run initial sync on startup
  console.log("🔄 Running initial sync on startup...");
  syncTotalColiform().catch((err) => {
    console.error("❌ Initial sync failed:", err.message);
  });

  // Setup cron schedule (setiap X detik)
  const cronSchedule = `*/${SYNC_INTERVAL_SECONDS} * * * * *`;

  cron.schedule(cronSchedule, () => {
    syncTotalColiform().catch((err) => {
      console.error("❌ Scheduled sync failed:", err.message);
    });
  });

  console.log(`✅ Cron job scheduled: ${cronSchedule}\n`);
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

// Export untuk dipanggil dari index.js
module.exports = { startTotalColiformSyncCron, syncTotalColiform };

// Run jika file dijalankan langsung (untuk testing)
if (require.main === module) {
  startTotalColiformSyncCron();
}
