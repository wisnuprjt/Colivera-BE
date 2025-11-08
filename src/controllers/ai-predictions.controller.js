// =============================
// GET /api/sensor/ai-predictions/history
// Ambil history AI predictions dari database
// =============================
exports.getAIPredictionsHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    
    const [history] = await pool.query(`
      SELECT 
        ap.id,
        ap.sensor_data_id,
        ap.potable,
        ap.confidence,
        ap.risk_level,
        ap.ecoli_mpn_prediction,
        ap.prediction_timestamp,
        ap.created_at,
        sd.temp_c,
        sd.do_mgl,
        sd.ph,
        sd.conductivity_uscm,
        sd.totalcoliform_mv,
        sd.timestamp as sensor_timestamp
      FROM ai_predictions ap
      LEFT JOIN sensor_data sd ON ap.sensor_data_id = sd.id
      ORDER BY ap.prediction_timestamp DESC
      LIMIT ?
    `, [limit]);
    
    // Format data dengan timestamp Indonesia
    const formattedData = history.map(item => ({
      ...item,
      formatted_timestamp: new Date(item.prediction_timestamp).toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      status_label: item.risk_level === 'Aman' ? '🟢 Aman' : 
                    item.risk_level === 'Waspada' ? '🟡 Waspada' : 
                    '🔴 Bahaya'
    }));
    
    return res.status(200).json({
      status: "success",
      data: formattedData
    });
    
  } catch (error) {
    console.error("❌ Error getting AI predictions history:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve AI predictions history"
    });
  }
};

// =============================
// GET /api/sensor/ai-predictions/latest
// Ambil AI prediction terbaru
// =============================
exports.getLatestAIPrediction = async (req, res) => {
  try {
    const [latest] = await pool.query(`
      SELECT 
        ap.*,
        sd.temp_c,
        sd.do_mgl,
        sd.ph,
        sd.conductivity_uscm,
        sd.totalcoliform_mv
      FROM ai_predictions ap
      LEFT JOIN sensor_data sd ON ap.sensor_data_id = sd.id
      ORDER BY ap.prediction_timestamp DESC
      LIMIT 1
    `);
    
    if (latest.length === 0) {
      return res.status(200).json({
        status: "no_data",
        message: "Belum ada AI prediction"
      });
    }
    
    const data = latest[0];
    return res.status(200).json({
      status: "success",
      data: {
        ...data,
        formatted_timestamp: new Date(data.prediction_timestamp).toLocaleString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        status_label: data.risk_level === 'Aman' ? '🟢 Aman' : 
                      data.risk_level === 'Waspada' ? '🟡 Waspada' : 
                      '🔴 Bahaya'
      }
    });
    
  } catch (error) {
    console.error("❌ Error getting latest AI prediction:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve latest AI prediction"
    });
  }
};
