const axios = require('axios');

async function testPredictAPI() {
  try {
    console.log('🧪 Testing /predict API endpoint...\n');
    
    const testData = {
      temp_c: 28.5,
      do_mgl: 7.2,
      ph: 7.5,
      conductivity_uscm: 450,
      totalcoliform_mpn_100ml: 0
    };
    
    console.log('📤 Sending data:', testData);
    
    const response = await axios.post(
      'https://gary29-water-quality-ai.hf.space/predict',
      testData,
      {
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      }
    );
    
    console.log('\n📥 Full Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n🔍 Checking for MPN values...');
    const data = response.data;
    
    // Cek semua kemungkinan lokasi MPN
    console.log('\n📊 Possible MPN locations:');
    console.log('  - ecoli_mpn_prediction:', data.ecoli_mpn_prediction);
    console.log('  - ai_detection.ecoli_mpn:', data.ai_detection?.ecoli_mpn);
    console.log('  - ai_detection.ecoli_mpn_prediction:', data.ai_detection?.ecoli_mpn_prediction);
    console.log('  - predicted_ecoli_mpn:', data.predicted_ecoli_mpn);
    console.log('  - ecoli_mpn:', data.ecoli_mpn);
    console.log('  - mpn:', data.mpn);
    console.log('  - mpn_prediction:', data.mpn_prediction);
    
    // List all keys at root level
    console.log('\n🔑 All root-level keys:');
    console.log(Object.keys(data));
    
    // If ai_detection exists, list its keys
    if (data.ai_detection) {
      console.log('\n🔑 Keys in ai_detection:');
      console.log(Object.keys(data.ai_detection));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testPredictAPI();
