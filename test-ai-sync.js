// Test file untuk manual run AI prediction sync
require("dotenv").config();
const { runAIPrediction } = require("./tools/ai-prediction-sync.cron");

console.log("🧪 Testing AI Prediction Sync manually...\n");

runAIPrediction()
  .then(() => {
    console.log("\n✅ Test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
