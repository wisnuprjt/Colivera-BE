const sensorModel = require("../models/sensor.model");
const axios = require("axios");

// URL HuggingFace API
const HUGGINGFACE_SENSOR_URL = "https://gary29-water-quality-ai.hf.space/iot/latest"; //API SENSOR
const HUGGINGFACE_API_LATEST = "https://gary29-water-quality-ai.hf.space/api/latest"; // API AI dan SENSOR

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

// =============================
// GET /api/sensor/ai-detection
// Ambil data sensor terbaru + prediksi AI lengkap dengan rekomendasi
// =============================
exports.getAIDetection = async (req, res) => {
  try {
    console.log("🤖 Fetching AI Detection data...");
    
    // 1. Fetch BOTH sensor data and AI prediction from HuggingFace in parallel
    const [sensorResponse, predictResponse] = await Promise.all([
      axios.get(HUGGINGFACE_SENSOR_URL, {
        timeout: 15000,
        headers: { 'Accept': 'application/json' }
      }),
      axios.get(HUGGINGFACE_API_LATEST, {
        timeout: 15000,
        headers: { 'Accept': 'application/json' }
      })
    ]);
    
    const sensorApiData = sensorResponse.data;
    const predictionResult = predictResponse.data;
    
    // 2. Validate sensor data
    if (!sensorApiData || sensorApiData.status === "no_data" || !sensorApiData.data) {
      return res.status(200).json({
        status: "no_data",
        message: "Belum ada data sensor dari IoT device"
      });
    }
    
    // 3. Validate prediction data
    if (predictionResult.status === "error") {
      return res.status(500).json({
        status: "error",
        message: predictionResult.message || "Prediction API returned error"
      });
    }
    
    // 4. Extract data from responses
    const sensorData = sensorApiData.data;
    const statusData = predictionResult.status || {};
    const prediction = predictionResult.prediction || {};
    const mpnValue = prediction.total_coliform_mv || 0; //kalo predict dia total_coliform_mv bukan /100ml 
    
    // Determine status 3-tier - gunakan label dari HuggingFace jika tersedia
    let status = 'Aman';
    
    // Priority: gunakan statusData.label dari HuggingFace (paling akurat)
    if (statusData.severity === "faulty" || statusData.label === "RUSAK" || sensorData.temp_c === -1) {
      status = 'Rusak'; // Sensor error/not connected
    } else if (statusData.label === "TIDAK LAYAK MINUM" || statusData.severity === "danger") {
      status = 'Bahaya';
    } else if (statusData.label === "PERLU PERLAKUAN" || statusData.severity === "warning") {
      status = 'Waspada';
    } else if (statusData.label === "PERLU MONITORING" || statusData.severity === "info") {
      status = 'Aman'; // WASPADA juga tapi untuk monitoring, kita set Aman dulu
    }
    
    // Fallback: jika label tidak ada, gunakan mpnValue threshold
    if (!statusData.label && !statusData.severity && status === 'Aman') {
      if (mpnValue >= 1.0) {
        status = 'Bahaya';
      } else if (mpnValue >= 0.71) {
        status = 'Waspada';
      }
    }
    
    // Helper: Clean up text formatting
    const cleanText = (text) => {
      if (!text) return text;
      return text
        .replace(/Â°/g, '°')
        .replace(/â ï¸/g, '⚠️')
        .replace(/ÂµS/g, 'µS')
        .trim();
    };
    
    const cleanArray = (arr) => {
      if (!Array.isArray(arr)) return [];
      return arr.map(item => cleanText(item)).filter(Boolean);
    };
    
    // 4. Return response with data from HuggingFace status object
    return res.status(200).json({
      status: "success",
      data: {
        mpn_value: mpnValue,
        status: status,
        severity: statusData.severity || "info",
        reasons: cleanArray(statusData.reasons),
        recommendations: cleanArray(statusData.recommendations),
        alternative_use: cleanArray(statusData.alternative_use),
        sensor_data: {
          temp_c: sensorData.temp_c,
          do_mgl: sensorData.do_mgl,
          ph: sensorData.ph,
          conductivity_uscm: sensorData.conductivity_uscm,
          timestamp: sensorData.timestamp
        },
        prediction: {
          total_coliform_mpn_100ml: prediction.total_coliform_mpn_100ml,
          ci90_low: prediction.ci90_low,
          ci90_high: prediction.ci90_high,
          disclaimer: prediction.disclaimer
        }
      }
    });
    
  } catch (error) {
    console.error("❌ Error in AI Detection:", error.message);
    
    // Handle timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).json({
        status: "error",
        message: "AI Prediction API timeout"
      });
    }
    
    // Handle network error
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        status: "error",
        message: "Tidak dapat terhubung ke AI Prediction API"
      });
    }
    
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to get AI detection"
    });
  }
};
