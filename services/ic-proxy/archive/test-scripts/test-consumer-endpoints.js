// Test Consumer Endpoints
// This script tests the consumer endpoints to diagnose submission issues

const fetch = require('node-fetch');

// Configuration
const API_PASSWORD = process.env.API_PASSWORD || 'ffGpA2saNS47qr';
const PROXY_HOST = process.env.PROXY_HOST || 'localhost';
const PROXY_PORT = process.env.PROXY_PORT || 3001;
const FIX_PORT = process.env.FIX_PORT || 3003;

// Test data
const testData = {
  url: 'https://example.com/test-' + Date.now(),
  content: '<html><body><p>Test content for consumer submission</p></body></html>',
  topicId: 'test-topic-' + Date.now(),
  deviceId: 'test-device-' + Date.now()
};

// Helper function to make API requests
async function makeRequest(endpoint, method = 'GET', data = null, port = PROXY_PORT) {
  const url = `http://${PROXY_HOST}:${port}${endpoint}`;
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

// Test functions
async function testRegisterDevice(port = PROXY_PORT) {
  console.log(`\n=== Testing Register Device on port ${port} ===`);
  return await makeRequest('/api/register-device', 'POST', { deviceId: testData.deviceId }, port);
}

async function testConsumerSubmit(port = PROXY_PORT) {
  console.log(`\n=== Testing Consumer Submit on port ${port} ===`);
  return await makeRequest('/api/consumer-submit', 'POST', testData, port);
}

async function testHealthCheck(port = PROXY_PORT) {
  console.log(`\n=== Testing Health Check on port ${port} ===`);
  return await makeRequest('/api/health', 'GET', null, port);
}

// Run all tests
async function runTests() {
  console.log('=== Starting endpoint tests ===');
  console.log('Test data:', testData);
  
  // Test original proxy server
  console.log('\n\n=== TESTING ORIGINAL PROXY SERVER ===');
  await testHealthCheck();
  await testRegisterDevice();
  await testConsumerSubmit();
  
  // Test fix server if it's running
  try {
    console.log('\n\n=== TESTING FIX SERVER ===');
    const healthResult = await testHealthCheck(FIX_PORT);
    if (healthResult.ok) {
      await testRegisterDevice(FIX_PORT);
      await testConsumerSubmit(FIX_PORT);
    } else {
      console.log('Fix server not running or not responding. Skipping tests.');
    }
  } catch (error) {
    console.log('Error testing fix server:', error.message);
  }
  
  console.log('\n=== Tests completed ===');
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});
