// Test Production Server
// This script tests the production server's consumer submission endpoint

const fetch = require('node-fetch');

// Configuration - REPLACE WITH YOUR PRODUCTION SERVER
const PRODUCTION_HOST = process.env.PRODUCTION_HOST || 'your-digital-ocean-ip'; // Replace with actual IP
const PRODUCTION_PORT = process.env.PRODUCTION_PORT || '3001';
const API_PASSWORD = process.env.API_PASSWORD || 'ffGpA2saNS47qr';

// Test data
const testData = {
  url: 'https://example.com/test-' + Date.now(),
  content: '<html><body><p>Test content for consumer submission from extension</p></body></html>',
  topicId: 'topic_swsi3j4lj', // Real topic ID: TechCrunch News Articles
  deviceId: 'test-device-' + Date.now()
};

// Helper function to make API requests
async function makeRequest(endpoint, method = 'GET', data = null) {
  const url = `http://${PRODUCTION_HOST}:${PRODUCTION_PORT}${endpoint}`;
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

// Test functions that simulate extension behavior
async function testRegisterDevice() {
  console.log('\n=== Testing Register Device ===');
  return await makeRequest('/api/register-device', 'POST', { deviceId: testData.deviceId });
}

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

async function testDirectSubmit() {
  console.log('\n=== Testing Direct Submit (Fallback) ===');
  return await makeRequest('/api/direct-submit', 'POST', {
    url: testData.url,
    content: testData.content,
    topicId: testData.topicId
  });
}

async function testHealthCheck() {
  console.log('\n=== Testing Health Check ===');
  return await makeRequest('/api/health', 'GET');
}

// Run all tests
async function runTests() {
  console.log('=== Starting production server tests ===');
  console.log('Production server:', `${PRODUCTION_HOST}:${PRODUCTION_PORT}`);
  console.log('Test data:', testData);
  
  // First check if the server is reachable
  const healthResult = await testHealthCheck();
  
  if (!healthResult.ok) {
    console.error('Cannot reach production server. Please check the host and port.');
    console.error('Make sure to replace "your-digital-ocean-ip" with your actual server IP.');
    return;
  }
  
  // Test the device registration
  await testRegisterDevice();
  
  // Test the consumer submission
  const submitResult = await testConsumerSubmit();
  
  // If consumer submit fails, try the direct submit as fallback
  if (!submitResult.ok || (submitResult.data && submitResult.data.err)) {
    console.log('\nConsumer submit had issues, trying direct submit as fallback...');
    await testDirectSubmit();
  }
  
  console.log('\n=== Tests completed ===');
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});
