/**
 * Test script for topic operations in the RhinoSpider proxy server
 * This script tests the createTopic and updateTopic operations with proper formatting
 */

// Using built-in fetch API

// Configuration
const PROXY_URL = 'http://143.244.133.154:3001';
const API_PASSWORD = 'password123'; // Replace with actual API password if needed

// Sample topic data for testing
const sampleTopic = {
  name: "Test Topic",
  description: "A test topic for verifying formatting",
  status: "active",
  urlPatterns: ["https://example.com/*"],
  scrapingInterval: "3600",
  maxRetries: "3",
  activeHours: {
    start: "0",
    end: "24"
  },
  articleUrlPatterns: ["https://example.com/article/*", "https://example.com/news/*"],
  excludePatterns: ["https://example.com/private/*"],
  paginationPatterns: ["https://example.com/page/*"],
  urlGenerationStrategy: "homepage_links",
  siteTypeClassification: "blog",
  contentIdentifiers: {
    selectors: [".article", ".news-item"],
    keywords: ["news", "article"]
  },
  extractionRules: {
    fields: [
      {
        name: "title",
        aiPrompt: ["Extract the title"],
        required: true,
        fieldType: "text"
      }
    ],
    customPrompt: ["Extract the content"]
  },
  aiConfig: {
    model: "gpt-3.5-turbo",
    costLimits: {
      maxConcurrent: "5",
      maxDailyCost: 1,
      maxMonthlyCost: 10
    },
    apiKey: ""
  }
};

// Helper function to make API requests
async function makeRequest(endpoint, method, data) {
  try {
    const response = await fetch(`${PROXY_URL}${endpoint}`, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-password': API_PASSWORD
      },
      body: JSON.stringify(data)
    });

    const responseData = await response.json();
    return {
      status: response.status,
      data: responseData
    };
  } catch (error) {
    console.error(`Error making request to ${endpoint}:`, error);
    return {
      status: 500,
      error: error.message
    };
  }
}

// Test create topic operation
async function testCreateTopic() {
  console.log('\nTesting createTopic operation...');
  
  // Add debug mode to see the formatted request
  const createData = {
    topic: sampleTopic,
    debug: true // This will make the server return the formatted data without actually creating the topic
  };
  
  const response = await makeRequest('/api/create-topic', 'POST', createData);
  
  console.log('Create topic response status:', response.status);
  console.log('Create topic formatted data:', JSON.stringify(response.data, null, 2));
  
  // Check if the formatting is correct according to our memories
  if (response.data && response.data.formattedData) {
    const formattedData = response.data.formattedData;
    
    // Check articleUrlPatterns (should be double-wrapped for createTopic)
    console.log('\nChecking formatting for createTopic:');
    
    if (formattedData.articleUrlPatterns && 
        Array.isArray(formattedData.articleUrlPatterns) && 
        formattedData.articleUrlPatterns.length > 0 && 
        Array.isArray(formattedData.articleUrlPatterns[0])) {
      console.log('✅ articleUrlPatterns is correctly double-wrapped');
    } else {
      console.log('❌ articleUrlPatterns is NOT correctly double-wrapped');
    }
    
    // Check excludePatterns (should be single-wrapped for createTopic)
    if (formattedData.excludePatterns && 
        Array.isArray(formattedData.excludePatterns) && 
        formattedData.excludePatterns.length > 0 && 
        !Array.isArray(formattedData.excludePatterns[0])) {
      console.log('✅ excludePatterns is correctly single-wrapped');
    } else {
      console.log('❌ excludePatterns is NOT correctly single-wrapped');
    }
    
    // Check contentIdentifiers (should NOT be wrapped for createTopic)
    if (formattedData.contentIdentifiers && 
        !Array.isArray(formattedData.contentIdentifiers) && 
        typeof formattedData.contentIdentifiers === 'object') {
      console.log('✅ contentIdentifiers is correctly NOT wrapped in an array');
    } else {
      console.log('❌ contentIdentifiers is incorrectly wrapped in an array');
    }
  }
  
  return response;
}

// Test update topic operation
async function testUpdateTopic() {
  console.log('\nTesting updateTopic operation...');
  
  // Add debug mode to see the formatted request
  const updateData = {
    id: "test_topic_id",
    topic: sampleTopic,
    debug: true // This will make the server return the formatted data without actually updating the topic
  };
  
  const response = await makeRequest('/api/update-topic', 'POST', updateData);
  
  console.log('Update topic response status:', response.status);
  console.log('Update topic formatted data:', JSON.stringify(response.data, null, 2));
  
  // Check if the formatting is correct according to our memories
  if (response.data && response.data.formattedData) {
    const formattedData = response.data.formattedData;
    
    // Check formatting for updateTopic
    console.log('\nChecking formatting for updateTopic:');
    
    // Check articleUrlPatterns (should be single-wrapped for updateTopic)
    if (formattedData.articleUrlPatterns && 
        Array.isArray(formattedData.articleUrlPatterns) && 
        formattedData.articleUrlPatterns.length > 0 && 
        !Array.isArray(formattedData.articleUrlPatterns[0])) {
      console.log('✅ articleUrlPatterns is correctly single-wrapped');
    } else {
      console.log('❌ articleUrlPatterns is NOT correctly single-wrapped');
    }
    
    // Check contentIdentifiers (should be single-wrapped for updateTopic)
    if (formattedData.contentIdentifiers && 
        Array.isArray(formattedData.contentIdentifiers) && 
        formattedData.contentIdentifiers.length > 0 && 
        typeof formattedData.contentIdentifiers[0] === 'object') {
      console.log('✅ contentIdentifiers is correctly single-wrapped');
    } else {
      console.log('❌ contentIdentifiers is NOT correctly single-wrapped');
    }
    
    // Check optional text fields (should be single-wrapped for updateTopic)
    if (formattedData.name && 
        Array.isArray(formattedData.name) && 
        formattedData.name.length > 0 && 
        typeof formattedData.name[0] === 'string') {
      console.log('✅ Optional text fields are correctly single-wrapped');
    } else {
      console.log('❌ Optional text fields are NOT correctly single-wrapped');
    }
  }
  
  return response;
}

// Run the tests
async function runTests() {
  console.log('Testing topic operations with the RhinoSpider proxy server');
  console.log('Proxy URL:', PROXY_URL);
  
  try {
    // Test create topic
    await testCreateTopic();
    
    // Test update topic
    await testUpdateTopic();
    
    console.log('\nTests completed');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests();
