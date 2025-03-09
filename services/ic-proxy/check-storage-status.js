// Script to check the status of the storage canister
require('./bigint-patch');
const { Actor, HttpAgent } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const fetch = require('node-fetch');

// Environment variables
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const STORAGE_CANISTER_ID = process.env.STORAGE_CANISTER_ID || 'i2gk7-oyaaa-aaaao-a37cq-cai';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 'tgyl5-yyaaa-aaaaj-az4wq-cai';
const API_PASSWORD = process.env.API_PASSWORD || 'ffGpA2saNS47qr';

// Import the storage canister interface
const { idlFactory } = require('./declarations/storage/storage.did.js');

async function checkStorageStatus() {
  console.log('=== Checking Storage Canister Status ===');
  console.log('Storage Canister ID:', STORAGE_CANISTER_ID);
  console.log('Consumer Canister ID:', CONSUMER_CANISTER_ID);
  
  try {
    // Create an anonymous agent
    const agent = new HttpAgent({
      host: IC_HOST,
      fetchRootKey: true
    });
    
    // Create storage actor with anonymous identity
    const storageActor = Actor.createActor(idlFactory, {
      agent,
      canisterId: STORAGE_CANISTER_ID
    });
    
    // Try to submit data to test authorization
    console.log('\nTesting submission with anonymous identity...');
    
    // Generate a unique submission ID
    const submissionId = `test-${Date.now()}`;
    
    // Create test data
    const testData = {
      id: submissionId,
      url: 'https://example.com/test',
      topic: 'test-topic',
      content: 'Test content for verification',
      source: 'test-script',
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
      client_id: Principal.fromText('2vxsx-fae'),
      status: 'test',
      scraping_time: BigInt(100)
    };
    
    // Submit directly to storage canister
    try {
      const submitResult = await storageActor.submitScrapedData(testData);
      console.log('Direct submission result:', submitResult);
    } catch (error) {
      console.log('Direct submission error:', error.message);
    }
    
    // Try the direct-submit endpoint we created
    console.log('\nTesting the direct-submit endpoint...');
    try {
      const response = await fetch('http://143.244.133.154:3001/api/direct-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_PASSWORD}`
        },
        body: JSON.stringify({
          url: 'https://example.com/test-endpoint',
          content: 'Test content from endpoint',
          topicId: 'test-topic'
        })
      });
      
      const result = await response.json();
      console.log('Direct endpoint result:', result);
    } catch (error) {
      console.log('Direct endpoint error:', error.message);
    }
    
    // Test the proxy endpoint
    console.log('\nTesting the proxy endpoint...');
    try {
      const response = await fetch('http://143.244.133.154:3000/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_PASSWORD}`
        },
        body: JSON.stringify({
          url: 'https://example.com/test-proxy',
          content: 'Test content from proxy',
          topicId: 'test-topic'
        })
      });
      
      const result = await response.json();
      console.log('Proxy endpoint result:', result);
    } catch (error) {
      console.log('Proxy endpoint error:', error.message);
    }
    
  } catch (error) {
    console.error('Error checking storage status:', error);
  }
}

// Run the check
checkStorageStatus();
