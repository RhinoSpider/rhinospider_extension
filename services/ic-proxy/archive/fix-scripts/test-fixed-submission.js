// Test Fixed Submission Method
// This script tests the fixed consumer submission endpoint

const fetch = require('node-fetch');

// Configuration
const API_PASSWORD = process.env.API_PASSWORD || 'ffGpA2saNS47qr';
const PROXY_HOST = process.env.PROXY_HOST || 'localhost';
const FIX_PORT = process.env.FIX_PORT || 3004;

// Test data
const testData = {
  url: 'https://example.com/test-' + Date.now(),
  content: '<html><body><p>Test content for consumer submission</p></body></html>',
  topicId: 'test-topic-' + Date.now(),
  deviceId: 'test-device-' + Date.now()
};

// Helper function to make API requests
async function makeRequest(endpoint, method = 'GET', data = null) {
  const url = `http://${PROXY_HOST}:${FIX_PORT}${endpoint}`;
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

// Test consumer submit with fixed method
async function testFixedConsumerSubmit() {
  console.log('\n=== Testing Fixed Consumer Submit ===');
  return await makeRequest('/api/consumer-submit', 'POST', testData);
}

// Test health check
async function testHealthCheck() {
  console.log('\n=== Testing Health Check ===');
  return await makeRequest('/api/health', 'GET');
}

// Run tests
async function runTests() {
  console.log('=== Starting fixed submission tests ===');
  console.log('Test data:', testData);
  
  await testHealthCheck();
  await testFixedConsumerSubmit();
  
  console.log('\n=== Tests completed ===');
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});
