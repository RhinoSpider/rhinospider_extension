/**
 * Test script to verify the deployed search proxy service
 */

const axios = require('axios');

// Configuration
const PROXY_SERVICE_URL = 'http://143.244.133.154:3003/api/search';

// Generate a unique extension ID for testing
const extensionId = 'test-extension-' + Math.random().toString(36).substring(2, 10);

// Sample topics
const sampleTopics = [
  { id: 'js-prog', name: 'JavaScript Programming', keywords: ['tutorial', 'guide', 'examples'] },
  { id: 'ml-ai', name: 'Machine Learning', keywords: ['beginners', 'python', 'tensorflow'] }
];

/**
 * Test the deployed search proxy service
 */
async function testDeployedService() {
  console.log('=== Testing Deployed Search Proxy Service ===');
  console.log(`Service URL: ${PROXY_SERVICE_URL}`);
  console.log(`Test extension ID: ${extensionId}`);
  
  try {
    // Prepare request data
    const requestData = {
      extensionId,
      topics: sampleTopics,
      batchSize: 10,
      reset: false
    };
    
    console.log('\nSending request to fetch URLs...');
    
    // Make request to the search proxy service
    const response = await axios.post(`${PROXY_SERVICE_URL}/urls`, requestData);
    
    if (!response.data || !response.data.urls || !Array.isArray(response.data.urls)) {
      throw new Error('Search proxy service returned invalid data');
    }
    
    console.log(`\n✅ Success! Received ${response.data.urls.length} URLs from deployed service`);
    
    // Display sample URLs
    console.log('\nSample URLs:');
    response.data.urls.slice(0, 5).forEach((urlInfo, index) => {
      console.log(`${index + 1}. [${urlInfo.topicName}] ${urlInfo.url}`);
    });
    
    console.log('\n=== Test Completed Successfully ===');
  } catch (error) {
    console.error('\n❌ Error testing deployed service:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server. Check if the server is accessible and port 3003 is open.');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
  }
}

// Run the test
testDeployedService();
