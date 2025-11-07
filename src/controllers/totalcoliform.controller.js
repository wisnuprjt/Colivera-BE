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
