// Test the /api/consumer-submit endpoint with all required parameters
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

console.log(`${GREEN}=== Testing /api/consumer-submit Endpoint ===${RESET}`);
console.log(`Server: ${SERVER_HOST}:${SERVER_PORT}`);

// Test data
const testId = Date.now();
const testData = {
  url: `https://example.com/extension-test-${testId}`,
  content: '<html><body><p>Test content from extension simulation</p></body></html>',
  topicId: 'topic_swsi3j4lj',
  principalId: '2vxsx-fae', // Required parameter
  deviceId: `test-device-${testId}`
};

console.log(`Test data:`, testData);

// Make the request
async function testConsumerEndpoint() {
  const url = `http://${SERVER_HOST}:${SERVER_PORT}/api/consumer-submit`;
  console.log(`Making POST request to ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_PASSWORD}`
      },
      body: JSON.stringify(testData)
    });
    
    console.log(`Response status: ${response.status}`);
    
    // Get response headers
    const contentType = response.headers.get('content-type');
    console.log(`Content-Type: ${contentType}`);
    
    // Get response body
    const text = await response.text();
    console.log(`Text Response (first 200 chars): ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
    
    // Try to parse as JSON if it looks like JSON
    if (contentType && contentType.includes('application/json')) {
      try {
        const json = JSON.parse(text);
        console.log(`JSON Response:`, json);
        
        if (response.status === 200) {
          console.log(`${GREEN}✓ Successfully submitted data to the /api/consumer-submit endpoint${RESET}`);
          
          // Check for NotAuthorized error
          if (json.err && json.err.NotAuthorized) {
            console.log(`${RED}✗ Received NotAuthorized error. This indicates an issue with authorization.${RESET}`);
            console.log(`${YELLOW}This is likely due to the consumer canister not being authorized to submit to the storage canister.${RESET}`);
          } else if (json.success || (json.ok && json.ok === true)) {
            console.log(`${GREEN}✓ Server reported successful submission${RESET}`);
          } else {
            console.log(`${YELLOW}Server response does not clearly indicate success or failure${RESET}`);
          }
        } else {
          console.log(`${RED}✗ Failed to submit data. Server returned status ${response.status}${RESET}`);
        }
      } catch (e) {
        console.log(`${RED}Response is not valid JSON:${RESET}`, e.message);
      }
    } else {
      console.log(`${YELLOW}Response is not JSON. This is likely the issue.${RESET}`);
    }
  } catch (error) {
    console.error(`${RED}Error making request:${RESET}`, error.message);
  }
}

// Run the test
testConsumerEndpoint().then(() => {
  console.log(`\n${GREEN}=== Test completed ===${RESET}`);
});
