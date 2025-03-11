// Test endpoints with proper authentication
const fetch = require('node-fetch');

// Configuration
const SERVER_HOST = process.env.SERVER_HOST || '143.244.133.154';
const SERVER_PORT = process.env.SERVER_PORT || '3001';
const API_PASSWORD = process.env.API_PASSWORD || 'ffGpA2saNS47qr';

// Colors for console output
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log(`${GREEN}=== Starting Authenticated Endpoint Tests ===${RESET}`);
console.log(`Server: ${SERVER_HOST}:${SERVER_PORT}`);
console.log(`API Password: ${API_PASSWORD}`);

// Test data
const testDeviceId = `test-device-${Date.now()}`;
const testData = {
  url: `https://example.com/extension-test-${Date.now()}`,
  content: '<html><body><p>Test content from extension simulation</p></body></html>',
  topicId: 'topic_swsi3j4lj',
  deviceId: testDeviceId
};

console.log(`Test data:`, testData);

// Helper function to make an authenticated request
async function makeAuthenticatedRequest(endpoint, data) {
  console.log(`\n${GREEN}=== Testing ${endpoint} ===${RESET}`);
  const url = `http://${SERVER_HOST}:${SERVER_PORT}${endpoint}`;
  console.log(`Making POST request to ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_PASSWORD}`
      },
      body: JSON.stringify(data)
    });
    
    console.log(`Response status: ${response.status}`);
    
    // Get response headers
    const contentType = response.headers.get('content-type');
    console.log(`Content-Type: ${contentType}`);
    
    // Get response body
    const text = await response.text();
    console.log(`Text Response (first 200 chars): ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
    
    // Try to parse as JSON if it looks like JSON
    let json = null;
    if (contentType && contentType.includes('application/json')) {
      try {
        json = JSON.parse(text);
        console.log(`JSON Response:`, json);
        return { success: true, status: response.status, json };
      } catch (e) {
        console.log(`${RED}Response is not valid JSON${RESET}`);
      }
    } else {
      console.log(`${YELLOW}Response is not JSON. This is likely the issue.${RESET}`);
    }
    
    return { success: false, status: response.status, text };
  } catch (error) {
    console.error(`${RED}Error making request:${RESET}`, error.message);
    return { success: false, error: error.message };
  }
}

// Test register-device endpoint
async function testRegisterDevice() {
  return makeAuthenticatedRequest('/api/register-device', { deviceId: testDeviceId });
}

// Test consumer-submit endpoint
async function testConsumerSubmit() {
  return makeAuthenticatedRequest('/api/consumer-submit', testData);
}

// Test submit endpoint (alternative endpoint)
async function testSubmit() {
  return makeAuthenticatedRequest('/api/submit', {
    url: testData.url,
    content: testData.content,
    topicId: testData.topicId,
    deviceId: testData.deviceId
  });
}

// Run all tests
async function runTests() {
  try {
    // Test register-device
    const registerResult = await testRegisterDevice();
    
    // Test consumer-submit
    const consumerSubmitResult = await testConsumerSubmit();
    
    // If both failed, try the /api/submit endpoint as a fallback
    if (!registerResult.success && !consumerSubmitResult.success) {
      console.log(`\n${YELLOW}Both primary endpoints failed. Trying /api/submit as fallback...${RESET}`);
      await testSubmit();
    }
    
    console.log(`\n${GREEN}=== Tests completed ===${RESET}`);
  } catch (error) {
    console.error(`${RED}Error running tests:${RESET}`, error);
  }
}

// Run the tests
runTests();
