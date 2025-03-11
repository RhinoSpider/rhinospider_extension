// Test script for the direct storage endpoints
require('./bigint-patch');
const fetch = require('node-fetch');

// Environment variables
const API_PASSWORD = process.env.API_PASSWORD || 'ffGpA2saNS47qr';
const SERVER_HOST = process.env.SERVER_HOST || '143.244.133.154';
const PROXY_PORT = process.env.PROXY_PORT || '3001';

async function testDirectStorage() {
  console.log('=== Testing Direct Storage Endpoints ===');
  const testUrl = 'https://example.com/test-direct-' + Date.now();
  const testContent = 'Test content from direct storage endpoint ' + Date.now();
  const testTopicId = 'test-topic';
  
  try {
    
    // Now test the direct storage endpoint
    console.log('\nTesting the direct storage endpoint...');
    const response = await fetch(`http://${SERVER_HOST}:${PROXY_PORT}/api/direct-submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_PASSWORD}`
      },
      body: JSON.stringify({
        url: testUrl,
        content: testContent,
        topicId: testTopicId
      })
    });
    
    const result = await response.json();
    console.log('Direct storage endpoint result:', result);
    
    if (result.ok) {
      console.log('\n✅ Direct storage endpoint is working correctly!');
      console.log('The extension is now able to submit scraped data directly to the storage canister.');
      
      // Try to fetch the data we just submitted
      console.log('\nTrying to fetch the data we just submitted...');
      try {
        const fetchResponse = await fetch(`http://${SERVER_HOST}:${PROXY_PORT}/api/fetch-data?url=${encodeURIComponent(testUrl)}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${API_PASSWORD}`
          }
        });
        
        const fetchResult = await fetchResponse.json();
        console.log('Fetch result:', fetchResult);
        
        if (fetchResult.ok) {
          console.log('\n✅ Successfully fetched the data we just submitted!');
        } else {
          console.log('\n❌ Failed to fetch the data:', fetchResult.err);
          console.log('This may be expected if the storage canister does not expose a fetch method.');
        }
      } catch (error) {
        console.log('Error fetching data:', error.message);
        console.log('This may be expected if the endpoint does not exist yet.');
      }
    } else {
      console.log('\n❌ Direct storage endpoint returned an error:', result.err);
    }
    
  } catch (error) {
    console.error('Error testing direct storage endpoint:', error);
  }
}

// Run the test
testDirectStorage();
