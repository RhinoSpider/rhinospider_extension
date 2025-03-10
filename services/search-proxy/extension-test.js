/**
 * Test script to simulate the extension's interaction with the search proxy service
 * This helps verify that the search proxy service works correctly with the extension
 */

const axios = require('axios');

// Configuration
const PROXY_SERVICE_URL = 'http://localhost:3003/api/search';

// Generate a unique extension ID for testing
const extensionId = 'test-extension-' + Math.random().toString(36).substring(2, 10);

// Sample topics that might come from the extension
const sampleTopics = [
  { id: 'js-prog', name: 'JavaScript Programming', keywords: ['tutorial', 'guide', 'examples'] },
  { id: 'ml-ai', name: 'Machine Learning', keywords: ['beginners', 'python', 'tensorflow'] },
  { id: 'web-dev', name: 'Web Development', keywords: ['html', 'css', 'responsive'] }
];

/**
 * Get URLs for topics from the search proxy service
 * This simulates the extension's getUrlsForTopics function
 */
async function getUrlsForTopics(topics, batchSize = 20, reset = false) {
  try {
    console.log(`Fetching URLs for ${topics.length} topics (batchSize: ${batchSize}, reset: ${reset})`);
    
    // Prepare request data
    const requestData = {
      extensionId,
      topics: topics.map(topic => ({
        id: topic.id,
        name: topic.name,
        keywords: topic.keywords || []
      })),
      batchSize,
      reset
    };
    
    // Make request to the search proxy service
    const response = await axios.post(`${PROXY_SERVICE_URL}/urls`, requestData);
    
    if (!response.data || !response.data.urls || !Array.isArray(response.data.urls)) {
      console.error('Search proxy service returned invalid data');
      return [];
    }
    
    console.log(`Received ${response.data.urls.length} URLs from search proxy service`);
    
    return response.data.urls;
  } catch (error) {
    console.error('Failed to fetch URLs from search proxy service:', error.message);
    return [];
  }
}

/**
 * Reset the URL pool for this extension instance
 * This simulates the extension's resetUrlPool function
 */
async function resetUrlPool() {
  try {
    // Make request to reset URL pool
    const response = await axios.post(`${PROXY_SERVICE_URL}/reset`, { extensionId });
    
    if (!response.data) {
      throw new Error('Search proxy service returned invalid data');
    }
    
    console.log('URL pool reset successfully');
    return true;
  } catch (error) {
    console.error('Failed to reset URL pool:', error.message);
    return false;
  }
}

/**
 * Run the extension simulation test
 */
async function runTest() {
  console.log('=== Starting Extension Simulation Test ===');
  console.log(`Using extension ID: ${extensionId}`);
  
  try {
    // First, get URLs for all topics
    console.log('\n--- Test 1: Get URLs for all topics ---');
    const allUrls = await getUrlsForTopics(sampleTopics);
    
    if (allUrls.length > 0) {
      console.log('✅ Success! Received URLs for all topics');
      
      // Display sample URLs
      console.log('\nSample URLs:');
      allUrls.slice(0, 5).forEach((urlInfo, index) => {
        console.log(`${index + 1}. [${urlInfo.topicName}] ${urlInfo.url}`);
      });
    } else {
      console.log('❌ Failed to receive URLs');
    }
    
    // Next, get URLs for a single topic
    console.log('\n--- Test 2: Get URLs for a single topic ---');
    const singleTopicUrls = await getUrlsForTopics([sampleTopics[0]], 5);
    
    if (singleTopicUrls.length > 0) {
      console.log(`✅ Success! Received ${singleTopicUrls.length} URLs for topic: ${sampleTopics[0].name}`);
      
      // Display all URLs for this topic
      console.log('\nTopic URLs:');
      singleTopicUrls.forEach((urlInfo, index) => {
        console.log(`${index + 1}. ${urlInfo.url}`);
      });
    } else {
      console.log(`❌ Failed to receive URLs for topic: ${sampleTopics[0].name}`);
    }
    
    // Finally, reset the URL pool
    console.log('\n--- Test 3: Reset URL pool ---');
    const resetResult = await resetUrlPool();
    
    if (resetResult) {
      console.log('✅ Success! URL pool reset successfully');
    } else {
      console.log('❌ Failed to reset URL pool');
    }
    
    console.log('\n=== Extension Simulation Test Completed ===');
  } catch (error) {
    console.error('Error during test:', error.message);
  }
}

// Run the test
runTest();
