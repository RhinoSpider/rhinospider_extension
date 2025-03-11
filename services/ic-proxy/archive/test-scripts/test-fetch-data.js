// Test script to fetch scraped data from the storage canister
require('./bigint-patch');
const { Actor, HttpAgent, AnonymousIdentity } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const fetch = require('node-fetch');

// Environment variables
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const STORAGE_CANISTER_ID = process.env.STORAGE_CANISTER_ID || 'i2gk7-oyaaa-aaaao-a37cq-cai';
const API_PASSWORD = process.env.API_PASSWORD || 'ffGpA2saNS47qr';

// Define a custom interface for querying data
// Note: This is not in the original interface but we'll try it
const idlFactory = ({ IDL }) => {
  const ScrapedData = IDL.Record({
    'id': IDL.Text,
    'url': IDL.Text,
    'topic': IDL.Text,
    'source': IDL.Text,
    'content': IDL.Text,
    'timestamp': IDL.Int,
    'client_id': IDL.Principal,
    'status': IDL.Text,
    'scraping_time': IDL.Int,
  });

  return IDL.Service({
    // Try some common query method names
    'getScrapedData': IDL.Func([], [IDL.Vec(ScrapedData)], ['query']),
    'getAllScrapedData': IDL.Func([], [IDL.Vec(ScrapedData)], ['query']),
    'getRecentScrapedData': IDL.Func([IDL.Nat], [IDL.Vec(ScrapedData)], ['query']),
    'getScrapedDataByTopic': IDL.Func([IDL.Text], [IDL.Vec(ScrapedData)], ['query']),
    // Add the methods we know exist
    'addAuthorizedCanister': IDL.Func([IDL.Principal], [IDL.Variant({ 'ok': IDL.Null, 'err': IDL.Variant({
      'NotFound': IDL.Null,
      'NotAuthorized': IDL.Null,
      'AlreadyExists': IDL.Null,
      'InvalidInput': IDL.Null,
    }) })], []),
    'submitScrapedData': IDL.Func([ScrapedData], [IDL.Variant({ 'ok': IDL.Null, 'err': IDL.Variant({
      'NotFound': IDL.Null,
      'NotAuthorized': IDL.Null,
      'AlreadyExists': IDL.Null,
      'InvalidInput': IDL.Null,
    }) })], []),
  });
};

async function testFetchData() {
  console.log('=== Testing Fetch Data from Storage Canister ===');
  
  try {
    // Create an anonymous identity for storage canister access
    const anonymousIdentity = new AnonymousIdentity();
    const anonymousAgent = new HttpAgent({
      host: IC_HOST,
      identity: anonymousIdentity,
      fetchRootKey: true
    });
    
    // Create storage actor with anonymous identity
    const storageActor = Actor.createActor(idlFactory, {
      agent: anonymousAgent,
      canisterId: STORAGE_CANISTER_ID
    });
    
    console.log('Trying to fetch data from storage canister...');
    
    // Try different methods to see if any work
    try {
      console.log('Trying getScrapedData...');
      const data = await storageActor.getScrapedData();
      console.log('Data retrieved:', data);
      return;
    } catch (error) {
      console.log('getScrapedData not available:', error.message);
    }
    
    try {
      console.log('Trying getAllScrapedData...');
      const data = await storageActor.getAllScrapedData();
      console.log('Data retrieved:', data);
      return;
    } catch (error) {
      console.log('getAllScrapedData not available:', error.message);
    }
    
    try {
      console.log('Trying getRecentScrapedData...');
      const data = await storageActor.getRecentScrapedData(10n);
      console.log('Data retrieved:', data);
      return;
    } catch (error) {
      console.log('getRecentScrapedData not available:', error.message);
    }
    
    try {
      console.log('Trying getScrapedDataByTopic...');
      const data = await storageActor.getScrapedDataByTopic('test-topic');
      console.log('Data retrieved:', data);
      return;
    } catch (error) {
      console.log('getScrapedDataByTopic not available:', error.message);
    }
    
    console.log('\nNone of the query methods worked. The storage canister might not expose any methods to fetch data directly.');
    console.log('We would need to check the actual storage canister code or documentation to know the correct methods.');
    
    // As a fallback, try to submit data again to see if we get any useful error
    console.log('\nTrying to submit data again to see if we get any useful error...');
    
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
    const submitResult = await storageActor.submitScrapedData(testData);
    console.log('Submit result:', submitResult);
    
    // Try the direct-submit endpoint we created
    console.log('\nTrying the direct-submit endpoint...');
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
    console.error('Error testing fetch data:', error);
  }
}

// Run the test
testFetchData();
