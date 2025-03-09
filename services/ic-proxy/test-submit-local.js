const fetch = require('node-fetch');

// Test data
const testData = {
  principalId: 'aaaaa-aa',
  url: 'https://example.com/test-page',
  content: '<html><body><h1>Test Content</h1><p>This is a test page for RhinoSpider</p></body></html>',
  topicId: 'test-topic-123'
};

// API password from environment or default
const API_PASSWORD = process.env.API_PASSWORD || 'ffGpA2saNS47qr';

// Local server URL
const LOCAL_SERVER_URL = 'http://localhost:3001';

// First, let's check if the server is running
async function checkServerStatus() {
  console.log(`Checking if server is running at ${LOCAL_SERVER_URL}...`);
  try {
    const response = await fetch(`${LOCAL_SERVER_URL}/api/health`);
    if (response.ok) {
      console.log('✅ Server is running');
      return true;
    } else {
      console.log(`❌ Server returned status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('Error connecting to server:', error.message);
    return false;
  }
}

async function testSubmitEndpoint() {
  console.log('\n======================================');
  console.log('Testing local /api/submit endpoint...');
  console.log('======================================');
  console.log('Server URL:', LOCAL_SERVER_URL);
  console.log('API Password (partial):', API_PASSWORD.substring(0, 3) + '...' + API_PASSWORD.substring(API_PASSWORD.length - 3));
  console.log('Sending test data:', {
    ...testData,
    content: testData.content.substring(0, 30) + '...'
  });

  try {
    console.log('\nMaking request to /api/submit...');
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_PASSWORD}`
      },
      body: JSON.stringify(testData)
    };
    
    console.log('Request headers:', requestOptions.headers);
    console.log('Request method:', requestOptions.method);
    
    const response = await fetch(`${LOCAL_SERVER_URL}/api/submit`, requestOptions);
    console.log('Response received with status:', response.status);
    
    let responseData;
    try {
      responseData = await response.json();
      console.log('Response parsed as JSON successfully');
    } catch (parseError) {
      console.error('Error parsing response as JSON:', parseError.message);
      const textResponse = await response.text();
      console.log('Raw response text:', textResponse);
      throw new Error('Failed to parse response as JSON');
    }
    
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(responseData, null, 2));
    
    // Check for success
    // Note: The response from the consumer canister is {"ok":null} when successful
    if (response.status === 200 && responseData.ok !== undefined) {
      console.log('✅ Submit test PASSED');
      console.log('Success! Data was submitted to the storage canister via the consumer canister.');
    } else if (response.status === 200) {
      console.log('⚠️ Submit test PARTIALLY PASSED (200 status but with error response)');
      console.log('Error details:', JSON.stringify(responseData.err || responseData.error || responseData.details || 'Unknown error'));
    } else {
      console.log('❌ Submit test FAILED');
    }
  } catch (error) {
    console.error('Error testing submit endpoint:', error.message);
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
    console.log('❌ Submit test FAILED');
  }
}

// Run the tests
async function runTests() {
  const serverRunning = await checkServerStatus();
  if (serverRunning) {
    await testSubmitEndpoint();
  } else {
    console.log('Skipping submit test because server is not running');
  }
}

runTests();
