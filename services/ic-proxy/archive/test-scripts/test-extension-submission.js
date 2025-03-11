// Test Extension Submission
// This script simulates how the extension submits data to the server

const fetch = require('node-fetch');

// Configuration
const SERVER_HOST = process.env.SERVER_HOST || '143.244.133.154';
const SERVER_PORT = process.env.SERVER_PORT || '3001';
const API_PASSWORD = process.env.API_PASSWORD || 'ffGpA2saNS47qr';

// Test data
const testData = {
  url: 'https://example.com/extension-test-' + Date.now(),
  content: '<html><body><p>Test content from extension simulation</p></body></html>',
  topicId: 'topic_swsi3j4lj', // TechCrunch News Articles
  deviceId: 'test-device-' + Date.now()
};

// Helper function to make API requests
async function makeRequest(endpoint, method = 'GET', data = null) {
  const url = `http://${SERVER_HOST}:${SERVER_PORT}${endpoint}`;
  console.log(`Making ${method} request to ${url}`);
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_PASSWORD}`,
      'X-Device-ID': testData.deviceId
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');
    
    console.log(`Response status: ${response.status}`);
    console.log(`Content-Type: ${contentType}`);
    
    if (contentType && contentType.includes('application/json')) {
      const jsonResponse = await response.json();
      console.log('JSON Response:', JSON.stringify(jsonResponse, null, 2));
      return { ok: true, data: jsonResponse };
    } else {
      const textResponse = await response.text();
      console.log('Text Response (first 200 chars):', textResponse.substring(0, 200));
      console.log('Response is not JSON. This is likely the issue.');
      return { ok: false, data: textResponse };
    }
  } catch (error) {
    console.error(`Error making request to ${url}:`, error.message);
    return { ok: false, error: error.message };
  }
}

// Test the consumer submit endpoint (what the extension uses)
async function testConsumerSubmit() {
  console.log('\n=== Testing Consumer Submit ===');
  return await makeRequest('/api/consumer-submit', 'POST', {
    url: testData.url,
    content: testData.content,
    topicId: testData.topicId,
    deviceId: testData.deviceId,
    status: 'completed',
    scraping_time: 500
  });
}

// Test the register device endpoint
async function testRegisterDevice() {
  console.log('\n=== Testing Register Device ===');
  return await makeRequest('/api/register-device', 'POST', { 
    deviceId: testData.deviceId 
  });
}

// Run the tests
async function runTests() {
  console.log('=== Starting Extension Submission Tests ===');
  console.log('Server:', `${SERVER_HOST}:${SERVER_PORT}`);
  console.log('Test data:', testData);
  
  // First register the device
  await testRegisterDevice();
  
  // Then submit data
  await testConsumerSubmit();
  
  console.log('\n=== Tests completed ===');
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});
