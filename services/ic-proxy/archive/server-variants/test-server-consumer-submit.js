/**
 * Test script for testing the /api/consumer-submit endpoint
 * This script sends a request to the local server to test the consumer submission endpoint
 */
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const SERVER_URL = 'http://localhost:3001';
const TEST_URL = 'https://example.com/test-server-page';
const TEST_TOPIC_ID = 'topic_swsi3j4lj'; // Real topic ID: TechCrunch News Articles

// Generate a unique submission ID and device ID
const submissionId = `test-server-${Date.now()}`;
const deviceId = `test-device-${uuidv4()}`;

async function registerDevice() {
  console.log('Registering device with the server...');
  console.log('Device ID:', deviceId);
  
  try {
    const response = await axios.post(`${SERVER_URL}/api/register-device`, { deviceId }, {
      headers: {
        'Authorization': 'Bearer ffGpA2saNS47qr'
      }
    });
    
    console.log('Device registration response:', JSON.stringify(response.data, null, 2));
    return response.data.ok;
  } catch (error) {
    console.error('Error registering device:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

async function testServerConsumerSubmit() {
  console.log('===========================================');
  console.log('Testing server /api/consumer-submit endpoint');
  console.log('===========================================');
  console.log('Server URL:', SERVER_URL);
  console.log('Test URL:', TEST_URL);
  console.log('Test Topic ID:', TEST_TOPIC_ID);
  console.log('Submission ID:', submissionId);

  // First register the device
  const registrationResult = await registerDevice();
  if (!registrationResult) {
    console.error('❌ ERROR: Device registration failed, cannot proceed with test');
    return false;
  }
  
  console.log('✅ SUCCESS: Device registration successful, proceeding with submission test');
  
  // Create test data that matches what the extension would send
  const testData = {
    id: submissionId,
    url: TEST_URL,
    topic: TEST_TOPIC_ID,
    content: `
      <html>
        <body>
          <h1>Test Content from Server Test</h1>
          <p>This is a test submission via the server endpoint.</p>
        </body>
      </html>
    `,
    source: 'test-script',
    // Note: We're sending timestamp as seconds (server will convert to BigInt)
    timestamp: Math.floor(Date.now() / 1000),
    // Include the device ID for authorization
    deviceId: deviceId,
    status: 'new',
    scraping_time: 500,
    useConsumerCanister: true
  };

  try {
    console.log('Sending request to server endpoint...');
    console.log('Request payload:', JSON.stringify(testData, null, 2));
    
    // Send the request to the server with authorization header
    const response = await axios.post(`${SERVER_URL}/api/consumer-submit`, testData, {
      headers: {
        'Authorization': 'Bearer ffGpA2saNS47qr'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.ok) {
      console.log('✅ SUCCESS: Server submission was successful!');
      return true;
    } else if (response.data.err) {
      console.error('❌ ERROR: Server returned an error:', response.data.err);
      return false;
    }
  } catch (error) {
    console.error('❌ ERROR: Exception during server test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Run the test
testServerConsumerSubmit()
  .then(success => {
    console.log('Test completed, success:', success);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error in test:', error);
    process.exit(1);
  });
