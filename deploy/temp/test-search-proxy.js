// Test script for the search proxy service
const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:3003/api/search';
const EXTENSION_ID = 'test-extension-' + Math.random().toString(36).substring(2, 10);

// Sample topics
const sampleTopics = [
  {
    id: 'topic-1',
    name: 'JavaScript Programming',
    keywords: ['tutorial', 'guide', 'examples']
  },
  {
    id: 'topic-2',
    name: 'Machine Learning',
    keywords: ['beginners', 'python', 'tensorflow']
  },
  {
    id: 'topic-3',
    name: 'Web Development',
    keywords: ['html', 'css', 'responsive']
  }
];

// Test getting URLs for topics
async function testGetUrls() {
  console.log('\n===== Testing URL Retrieval =====');
  console.log(`Using extension ID: ${EXTENSION_ID}`);
  
  try {
    console.log(`\nRequesting URLs for ${sampleTopics.length} topics...`);
    
    const response = await axios.post(`${API_URL}/urls`, {
      extensionId: EXTENSION_ID,
      topics: sampleTopics,
      batchSize: 20, // Smaller batch for testing
      reset: true
    });
    
    console.log(`\n✅ Success! Received ${response.data.urls.length} URLs`);
    
    // Print the first 5 URLs
    console.log('\nSample URLs:');
    response.data.urls.slice(0, 5).forEach((urlInfo, index) => {
      console.log(`${index + 1}. [${urlInfo.topicName}] ${urlInfo.url}`);
    });
    
    return response.data;
  } catch (error) {
    console.error('\n❌ Error fetching URLs:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return null;
  }
}

// Test resetting URL pool
async function testResetUrlPool() {
  console.log('\n===== Testing URL Pool Reset =====');
  
  try {
    const response = await axios.post(`${API_URL}/reset`, {
      extensionId: EXTENSION_ID
    });
    
    console.log(`\n✅ Success! ${response.data.message}`);
    return response.data;
  } catch (error) {
    console.error('\n❌ Error resetting URL pool:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return null;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting search proxy service tests...');
  
  // Test URL retrieval
  const urlsData = await testGetUrls();
  
  // Test URL pool reset
  if (urlsData) {
    await testResetUrlPool();
  }
  
  console.log('\nTests completed!');
}

// Run the tests
runTests().catch(console.error);
