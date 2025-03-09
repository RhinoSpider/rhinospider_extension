// Script to compare different approaches to interacting with the storage canister
require('./bigint-patch');
const fetch = require('node-fetch');

// Environment variables
const API_PASSWORD = process.env.API_PASSWORD || 'ffGpA2saNS47qr';
const SERVER_HOST = process.env.SERVER_HOST || '143.244.133.154';
const PROXY_PORT = process.env.PROXY_PORT || '3001';
const DIRECT_PORT = process.env.DIRECT_PORT || '3002';

async function compareApproaches() {
  console.log('=== Comparing Different Approaches to Storage Canister Access ===');
  const testUrl = 'https://example.com/compare-test-' + Date.now();
  const testContent = 'Test content for comparison ' + Date.now();
  const testTopicId = 'test-topic';
  
  try {
    // 1. Test the proxy server approach (through consumer canister)
    console.log('\n1. Testing the proxy server approach (through consumer canister)...');
    try {
      const proxyResponse = await fetch(`http://${SERVER_HOST}:${PROXY_PORT}/api/submit-scraped-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_PASSWORD}`
        },
        body: JSON.stringify({
          url: testUrl + '-proxy',
          content: testContent + ' (proxy)',
          topicId: testTopicId
        })
      });
      
      const proxyResult = await proxyResponse.json();
      console.log('Proxy submission result:', JSON.stringify(proxyResult, null, 2));
    } catch (error) {
      console.error('Error with proxy approach:', error.message);
    }
    
    // 2. Test the direct storage server approach
    console.log('\n2. Testing the direct storage server approach...');
    try {
      const directResponse = await fetch(`http://${SERVER_HOST}:${DIRECT_PORT}/api/direct-submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_PASSWORD}`
        },
        body: JSON.stringify({
          url: testUrl + '-direct',
          content: testContent + ' (direct)',
          topicId: testTopicId
        })
      });
      
      const directResult = await directResponse.json();
      console.log('Direct submission result:', JSON.stringify(directResult, null, 2));
    } catch (error) {
      console.error('Error with direct approach:', error.message);
    }
    
    // 3. Test fetching data through proxy
    console.log('\n3. Testing fetching data through proxy...');
    try {
      // Wait a moment for data to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const fetchProxyResponse = await fetch(`http://${SERVER_HOST}:${PROXY_PORT}/api/get-scraped-data?url=${encodeURIComponent(testUrl + '-proxy')}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_PASSWORD}`
        }
      });
      
      const fetchProxyResult = await fetchProxyResponse.json();
      console.log('Fetch proxy result:', JSON.stringify(fetchProxyResult, null, 2));
    } catch (error) {
      console.error('Error fetching through proxy:', error.message);
    }
    
    // 4. Test fetching data through direct storage server
    console.log('\n4. Testing fetching data through direct storage server...');
    try {
      const fetchDirectResponse = await fetch(`http://${SERVER_HOST}:${DIRECT_PORT}/api/fetch-data?url=${encodeURIComponent(testUrl + '-direct')}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_PASSWORD}`
        }
      });
      
      const fetchDirectResult = await fetchDirectResponse.json();
      console.log('Fetch direct result:', JSON.stringify(fetchDirectResult, null, 2));
    } catch (error) {
      console.error('Error fetching through direct storage server:', error.message);
    }
    
    console.log('\n=== Comparison Complete ===');
    console.log('Check the results above to understand the differences between approaches.');
    
  } catch (error) {
    console.error('Error during comparison:', error);
  }
}

// Run the comparison
compareApproaches().catch(console.error);
