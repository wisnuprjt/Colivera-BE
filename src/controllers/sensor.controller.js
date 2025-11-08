const sensorModel = require("../models/sensor.model");
const axios = require("axios");

// URL HuggingFace API
const HUGGINGFACE_SENSOR_URL = "https://gary29-water-quality-ai.hf.space/iot/latest";
const HUGGINGFACE_PREDICT_URL = "https://gary29-water-quality-ai.hf.space/predict";
const HUGGINGFACE_HISTORY_URL = "https://gary29-water-quality-ai.hf.space/iot/history"; // API Gary untuk history

// =============================
// GET /api/sensor/latest
// Ambil data sensor terbaru dari HuggingFace & simpan ke DB
// =============================
exports.getLatestSensor = async (req, res) => {
  try {
    console.log("🔄 Fetching sensor data from HuggingFace...");
    
    // 1. Fetch dari HuggingFace API
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
      return res.status(200).json({
        status: "no_data",
        message: "Belum ada data sensor dari IoT device"
      });
    }
    
    if (apiData.status !== "success" || !apiData.data) {
      return res.status(500).json({
        status: "error",
        message: "Invalid data format from HuggingFace API"
      });
    }
    
    const sensorData = apiData.data;
    
    // 3. Simpan ke database
    const insertId = await sensorModel.insertSensorData({
      timestamp: sensorData.timestamp,
      temp_c: sensorData.temp_c,
      do_mgl: sensorData.do_mgl,
      ph: sensorData.ph,
      conductivity_uscm: sensorData.conductivity_uscm,
      totalcoliform_mv: sensorData.totalcoliform_mv
    });
    
    console.log(`✅ Sensor data saved to DB with ID: ${insertId}`);
    
    // 4. Return data ke frontend
    return res.status(200).json({
      status: "success",
      data: {
        id: insertId,
        ...sensorData
      }
    });
    
  } catch (error) {
    console.error("❌ Error fetching sensor data:", error.message);
    
    // Handle timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).json({
        status: "error",
        message: "HuggingFace API timeout - Space mungkin sedang cold start"
      });
    }
    
    // Handle network error
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        status: "error",
        message: "Tidak dapat terhubung ke HuggingFace API"
      });
    }
    
    return res.status(500).json({
      status: "error",
      message: error.message || "Internal server error"
    });
  }
};

// =============================
// GET /api/sensor/cached
// Ambil data sensor terakhir dari DATABASE (lebih cepat, tanpa hit HuggingFace)
// =============================
exports.getCachedSensor = async (req, res) => {
  try {
    const latestData = await sensorModel.getLatestSensorData();
    
    if (!latestData) {
      return res.status(200).json({
        status: "no_data",
        message: "Belum ada data sensor di database"
      });
    }
    
    return res.status(200).json({
      status: "success",
      data: latestData
    });
    
  } catch (error) {
    console.error("❌ Error getting cached sensor data:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve cached data"
    });
  }
};

// =============================
// POST /api/sensor/predict
// Prediksi AI E.coli berdasarkan data sensor terbaru
// =============================
exports.predictEcoli = async (req, res) => {
  try {
    console.log("🤖 Running AI prediction...");
    
    // 1. Ambil data sensor terbaru dari database
    let sensorData = await sensorModel.getLatestSensorData();
    
    // Jika tidak ada data di DB, fetch dari HuggingFace dulu
    if (!sensorData) {
      console.log("📡 No sensor data in DB, fetching from HuggingFace first...");
      
      const sensorResponse = await axios.get(HUGGINGFACE_SENSOR_URL, {
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      
      if (sensorResponse.data.status === "success" && sensorResponse.data.data) {
        const apiData = sensorResponse.data.data;
        
        // Simpan ke DB
        const insertId = await sensorModel.insertSensorData({
          timestamp: apiData.timestamp,
          temp_c: apiData.temp_c,
          do_mgl: apiData.do_mgl,
          ph: apiData.ph,
          conductivity_uscm: apiData.conductivity_uscm,
          totalcoliform_mv: apiData.totalcoliform_mv
        });
        
        sensorData = { id: insertId, ...apiData };
      } else {
        return res.status(400).json({
          status: "error",
          message: "Belum ada data sensor untuk prediksi"
        });
      }
    }
    
    // 2. Kirim ke HuggingFace Prediction API
    const requestData = {
      temp_c: sensorData.temp_c,
      do_mgl: sensorData.do_mgl,
      ph: sensorData.ph,
      conductivity_uscm: sensorData.conductivity_uscm,
      totalcoliform_mpn_100ml: 0 // Default value
    };
    
    console.log("📤 Sending to HuggingFace Predict API:", requestData);
    
    const predictResponse = await axios.post(HUGGINGFACE_PREDICT_URL, requestData, {
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
    
    const predictionResult = predictResponse.data;
    
    if (predictionResult.status === "error") {
      return res.status(500).json({
        status: "error",
        message: predictionResult.message || "Prediction API returned error"
      });
    }
    
    // 3. Simpan hasil prediksi ke database
    const potable = predictionResult.ai_detection?.potable ?? true;
    const confidence = predictionResult.ai_detection?.confidence ?? 0;
    
    await sensorModel.insertAIPrediction({
      sensor_data_id: sensorData.id,
      potable: potable,
      confidence: confidence,
      prediction_timestamp: new Date()
    });
    
    console.log(`✅ AI Prediction saved: ${potable ? "AMAN" : "BAHAYA"}`);
    
    // 4. Return hasil prediksi
    return res.status(200).json({
      status: "success",
      ai_detection: {
        potable: potable,
        confidence: confidence,
        status: potable ? "AMAN" : "BAHAYA"
      },
      sensor_data: {
        temp_c: sensorData.temp_c,
        do_mgl: sensorData.do_mgl,
        ph: sensorData.ph,
        conductivity_uscm: sensorData.conductivity_uscm,
        timestamp: sensorData.timestamp
      }
    });
    
  } catch (error) {
    console.error("❌ Error in AI prediction:", error.message);
    
    // Handle timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).json({
        status: "error",
        message: "Prediction API timeout - HuggingFace Space sedang cold start"
      });
    }
    
    // Handle network error
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        status: "error",
        message: "Tidak dapat terhubung ke Prediction API"
      });
    }
    
    return res.status(500).json({
      status: "error",
      message: error.message || "Internal server error"
    });
  }
};

// =============================
// GET /api/sensor/history
// Ambil history data sensor untuk grafik
// =============================
exports.getSensorHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const history = await sensorModel.getSensorHistory(limit);
    
    return res.status(200).json({
      status: "success",
      data: history
    });
    
  } catch (error) {
    console.error("❌ Error getting sensor history:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve sensor history"
    });
  }
};

// =============================
// POST /api/sensor/coliform/sync
// Fetch history dari API Gary, proses, dan simpan ke total_coliform
// =============================
exports.syncColiformHistory = async (req, res) => {
  try {
    console.log("🔄 Fetching coliform history from HuggingFace API Gary...");
    
    // 1. Fetch history dari API Gary
    const response = await axios.get(HUGGINGFACE_HISTORY_URL, {
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
    
    const apiData = response.data;
    
    // 2. Validasi response
    if (apiData.status !== "success" || !apiData.data || !Array.isArray(apiData.data)) {
      return res.status(500).json({
        status: "error",
        message: "Invalid history data format from API"
      });
    }
    
    const historyData = apiData.data;
    console.log(`📊 Received ${historyData.length} history records from API`);
    
    let syncedCount = 0;
    let skippedCount = 0;
    
    // 3. Loop setiap data history
    for (const record of historyData) {
      try {
        // a. Simpan sensor data dulu
        const sensorId = await sensorModel.insertSensorData({
          timestamp: record.timestamp,
          temp_c: record.temperature || record.temp_c,
          do_mgl: record.do || record.do_mgl,
          ph: record.ph,
          conductivity_uscm: record.conductivity || record.conductivity_uscm,
          totalcoliform_mv: record.totalcoliform_mv || record.raw_voltage || 0
        });
        
        console.log(`✅ Sensor data inserted with ID: ${sensorId}`);
        
        // b. Tentukan status berdasarkan prediksi AI
        let status = 'AMAN'; // default
        
        if (record.prediction !== undefined) {
          // Jika ada field prediction dari API
          status = record.prediction === true || record.prediction === 'potable' ? 'AMAN' : 'BAHAYA';
        } else if (record.potable !== undefined) {
          // Atau field potable
          status = record.potable === true ? 'AMAN' : 'BAHAYA';
        } else if (record.status) {
          // Atau sudah ada status langsung
          status = record.status.toUpperCase() === 'AMAN' ? 'AMAN' : 'BAHAYA';
        }
        
        // c. Simpan ke total_coliform
        await sensorModel.insertColiform(
          sensorId,
          record.totalcoliform_mpn || record.mpn_value || 0,
          status
        );
        
        console.log(`✅ Coliform data inserted for sensor ${sensorId} with status: ${status}`);
        syncedCount++;
        
      } catch (innerError) {
        console.error(`❌ Error processing record:`, innerError.message);
        skippedCount++;
        continue; // Skip record yang error
      }
    }
    
    // 4. Return summary
    return res.status(200).json({
      status: "success",
      message: `Synced ${syncedCount} records, skipped ${skippedCount} records`,
      synced: syncedCount,
      skipped: skippedCount,
      total: historyData.length
    });
    
  } catch (error) {
    console.error("❌ Error syncing coliform history:", error.message);
    
    // Handle timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).json({
        status: "error",
        message: "API timeout - HuggingFace Space mungkin sedang cold start"
      });
    }
    
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to sync coliform history"
    });
  }
};

// =============================
// GET /api/sensor/coliform/history?source=sensor|ai_prediction
// Ambil history total coliform dari database
// Query params: limit (default: 100), source (optional: 'sensor' or 'ai_prediction')
// =============================
exports.getColiformHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const source = req.query.source; // 'sensor', 'ai_prediction', atau undefined (ambil semua)
    
    const history = await sensorModel.getColiformHistory(limit, source);
    
    // Format data untuk tabel (terbaru → terlama) dengan formatted timestamp
    const formattedData = history.map(item => ({
      id: item.id,
      sensor_data_id: item.sensor_data_id,
      mpn_value: item.mpn_value,
      status: item.status,
      timestamp: item.timestamp, // Raw timestamp
      formatted_timestamp: new Date(item.timestamp).toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }));
    
    // Reverse untuk urutkan dari lama → baru (untuk grafik)
    const sortedHistory = [...history].reverse();
    
    // Format untuk chart
    const chartData = sortedHistory.map(item => ({
      timestamp: item.timestamp,
      mpn_value: item.mpn_value,
      status: item.status,
      // Format timestamp untuk display dengan tanggal
      time_label: new Date(item.timestamp).toLocaleString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }));
    
    return res.status(200).json({
      status: "success",
      data: formattedData, // Data untuk tabel dengan formatted timestamp (terbaru → terlama)
      chartData: chartData // Data untuk grafik (terlama → terbaru)
    });
    
  } catch (error) {
    console.error("❌ Error getting coliform history:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve coliform history"
    });
  }
};

// =============================
// GET /api/sensor/coliform/latest
// Ambil data coliform terbaru
// =============================
exports.getLatestColiform = async (req, res) => {
  try {
    const latestData = await sensorModel.getLatestColiform();
    
    if (!latestData) {
      return res.status(200).json({
        status: "no_data",
        message: "Belum ada data coliform di database"
      });
    }
    
    return res.status(200).json({
      status: "success",
      data: latestData
    });
    
  } catch (error) {
    console.error("❌ Error getting latest coliform:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve latest coliform data"
    });
  }
};
