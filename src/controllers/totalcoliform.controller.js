const coliformModel = require("../models/totalcoliform.model");

// POST /api/coliform
exports.create = async (req, res) => {
  try {
    const { sensor_data_id, mpn_value, status } = req.body;
    if (!sensor_data_id || !mpn_value)
      return res.status(400).json({ message: "Missing sensor_data_id or mpn_value" });

    const id = await coliformModel.insertColiform(
      sensor_data_id,
      mpn_value,
      status || "Normal"
    );
    res.status(201).json({ message: "Data inserted", id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/coliform/latest
exports.getLatest = async (req, res) => {
  try {
    const data = await coliformModel.getLatestData(10);
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/coliform/ai-prediction/history
// Ambil riwayat AI prediction dari total_coliform_ai_prediction
exports.getAIPredictionHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await coliformModel.getAIPredictionHistory(limit);
    
    res.json({
      status: "success",
      message: "AI Prediction history retrieved successfully",
      data: data,
      count: data.length
    });
  } catch (err) {
    console.error("Error fetching AI prediction history:", err);
    res.status(500).json({ 
      status: "error",
      message: "Server error" 
    });
  }
};
