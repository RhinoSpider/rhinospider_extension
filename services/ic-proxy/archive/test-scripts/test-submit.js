const fetch = require('node-fetch');
const { Principal } = require('@dfinity/principal');

// Configuration
const API_URL = 'http://localhost:3001/api/submit';
const API_PASSWORD = 'ffGpA2saNS47qr'; // Using the default password from server.js

// Test data
const testData = {
  principalId: 'aaaaa-aa', // Default anonymous principal
  url: 'https://example.com/test-page',
  content: '<html><body><h1>Test Content</h1><p>This is a test submission.</p></body></html>',
  topicId: 'test-topic-123'
};

async function testSubmitEndpoint() {
  console.log('Testing /api/submit endpoint...');
  console.log('Sending test data:', {
    ...testData,
    content: testData.content.substring(0, 30) + '...' // Truncate content for logging
  });

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_PASSWORD}`
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Submit test PASSED');
    } else {
      console.log('❌ Submit test FAILED');
    }
  } catch (error) {
    console.error('Error during test:', error);
    console.log('❌ Submit test FAILED due to error');
  }
}

// Run the test
testSubmitEndpoint();
