const axios = require('axios');

async function testPredict() {
  try {
    const testData = {
      temp_c: 30.5,
      do_mgl: 8.1,
      ph: 8.2,
      conductivity_uscm: 400,
      totalcoliform_mpn_100ml: 0
    };
    
    console.log('📤 Sending to /predict:', testData);
    
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
    
    const mpn = response.data.prediction?.total_coliform_mpn_100ml;
    console.log('\n🧪 Total Coliform MPN:', mpn);
    
    if (mpn <= 0.70) {
      console.log('✅ Status: Aman (≤ 0.70)');
    } else if (mpn >= 0.71 && mpn <= 0.99) {
      console.log('⚠️  Status: Waspada (0.71-0.99)');
    } else {
      console.log('🔴 Status: Bahaya (≥ 1.0)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPredict();
