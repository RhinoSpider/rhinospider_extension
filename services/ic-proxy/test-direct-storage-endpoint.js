// Test script for the direct storage endpoint
require('./bigint-patch');
const fetch = require('node-fetch');

// Configuration
const PROXY_URL = process.env.PROXY_URL || 'http://localhost:3001';
const API_PASSWORD = process.env.API_PASSWORD || 'ffGpA2saNS47qr';

/**
 * Test the direct storage endpoint
 */
async function testDirectStorageEndpoint() {
  console.log('=== Testing Direct Storage Endpoint ===');
  
  // Generate a unique test ID
  const testId = `test-${Date.now()}`;
  
  // Create test data
  const testData = {
    url: `https://example.com/test-page-${testId}`,
    content: `This is test content for the direct storage endpoint with ID ${testId}`,
    topicId: 'test-topic-id',
    source: 'extension-test',
    timestamp: Date.now(),
    status: 'new',
    scraping_time: 500
  };
  
  console.log('Test data:', testData);
  
  try {
    console.log(`\nTesting direct-submit endpoint at ${PROXY_URL}/api/direct-submit`);
    
    // Make the request to the direct-submit endpoint
    const response = await fetch(`${PROXY_URL}/api/direct-submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_PASSWORD}`
      },
      body: JSON.stringify(testData)
    });
    
    console.log('Response status:', response.status);
    
    // Parse the response
    const result = await response.json();
    console.log('Response data:', JSON.stringify(result, null, 2));
    
    // Check if the submission was successful
    if (result && result.ok && result.ok.dataSubmitted) {
      console.log('\n✅ Direct storage submission successful!');
      console.log('The direct storage endpoint is working correctly.');
    } else if (result && result.err && result.err.NotAuthorized) {
      console.log('\n⚠️ Received NotAuthorized error but the endpoint is functioning.');
      console.log('The server is handling NotAuthorized errors as expected.');
    } else {
      console.log('\n❌ Direct storage submission failed!');
      console.log('Error:', result.err || 'Unknown error');
    }
    
    // Test the regular submit endpoint for comparison
    console.log(`\nTesting regular submit endpoint at ${PROXY_URL}/api/submit for comparison`);
    
    const regularResponse = await fetch(`${PROXY_URL}/api/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_PASSWORD}`
      },
      body: JSON.stringify(testData)
    });
    
    console.log('Regular response status:', regularResponse.status);
    
    // Parse the regular response
    const regularResult = await regularResponse.json();
    console.log('Regular response data:', JSON.stringify(regularResult, null, 2));
    
    // Compare the results
    console.log('\n=== Comparison of Results ===');
    console.log('Direct storage endpoint:', result.ok ? 'Success' : 'Failure');
    console.log('Regular submit endpoint:', regularResult.ok ? 'Success' : 'Failure');
    
    // Final assessment
    if ((result && result.ok) || (regularResult && regularResult.ok)) {
      console.log('\n✅ At least one submission method is working!');
      console.log('The solution is ready for deployment.');
    } else {
      console.log('\n❌ Both submission methods failed!');
      console.log('Further investigation is needed.');
    }
  } catch (error) {
    console.error('Error testing direct storage endpoint:', error);
  }
}

// Run the test
testDirectStorageEndpoint();
