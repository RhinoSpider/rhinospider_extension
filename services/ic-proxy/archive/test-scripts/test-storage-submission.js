// Test script to verify storage canister submissions
require('./bigint-patch');
const { Actor, HttpAgent, AnonymousIdentity } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const { idlFactory: storageIdlFactory } = require('./declarations/storage/storage.did.js');
const { idlFactory: consumerIdlFactory } = require('./declarations/consumer/consumer.did.js');
const fetch = require('node-fetch');

// Environment variables
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 'tgyl5-yyaaa-aaaaj-az4wq-cai';
const STORAGE_CANISTER_ID = process.env.STORAGE_CANISTER_ID || 'i2gk7-oyaaa-aaaao-a37cq-cai';

// Create agent with anonymous identity
const createAgent = () => {
  return new HttpAgent({
    host: IC_HOST,
    identity: new AnonymousIdentity(),
    fetch: fetch,
    verifyQuerySignatures: false,
    fetchRootKey: true,
    disableHandshake: true,
  });
};

// Create test data for submission
const createTestData = () => {
  const submissionId = `test-${Date.now()}`;
  return {
    id: submissionId,
    url: 'https://example.com/test-page',
    topic: 'test-topic-id',
    content: 'This is test content for submission verification',
    source: 'extension-test',
    timestamp: BigInt(Math.floor(Date.now() / 1000)),
    client_id: Principal.fromText('2vxsx-fae'), // Anonymous principal
    status: 'new',
    scraping_time: BigInt(0)
  };
};

// Test direct submission to storage canister
const testDirectStorageSubmission = async () => {
  console.log('=== Testing Direct Storage Submission ===');
  
  try {
    const agent = createAgent();
    const storageActor = Actor.createActor(storageIdlFactory, {
      agent,
      canisterId: STORAGE_CANISTER_ID
    });
    
    const testData = createTestData();
    console.log('Submitting test data directly to storage canister:', testData);
    
    const result = await storageActor.submitScrapedData(testData);
    console.log('Direct storage submission result:', result);
    
    return {
      success: true,
      result
    };
  } catch (error) {
    console.error('Direct storage submission error:', error.message || error);
    return {
      success: false,
      error: error.message || String(error)
    };
  }
};

// Test submission through consumer canister
const testConsumerSubmission = async () => {
  console.log('=== Testing Consumer Canister Submission ===');
  
  try {
    const agent = createAgent();
    const consumerActor = Actor.createActor(consumerIdlFactory, {
      agent,
      canisterId: CONSUMER_CANISTER_ID
    });
    
    const testData = createTestData();
    console.log('Submitting test data through consumer canister:', testData);
    
    const result = await consumerActor.submitScrapedData(testData);
    console.log('Consumer submission result:', result);
    
    return {
      success: true,
      result
    };
  } catch (error) {
    console.error('Consumer submission error:', error.message || error);
    return {
      success: false,
      error: error.message || String(error)
    };
  }
};

// Verify if data was actually saved by trying to retrieve it
const verifyDataSaved = async (submissionId) => {
  console.log('=== Verifying Data Was Saved ===');
  
  try {
    // This would require implementing a getScrapedData function
    // For now, we'll just log that verification would happen here
    console.log('Data verification would check if submission ID exists:', submissionId);
    console.log('Note: This verification is not implemented yet');
    
    return {
      verified: false,
      note: 'Verification not implemented yet'
    };
  } catch (error) {
    console.error('Verification error:', error.message || error);
    return {
      verified: false,
      error: error.message || String(error)
    };
  }
};

// Run all tests
const runTests = async () => {
  console.log('Starting storage submission tests...');
  
  // Test direct storage submission
  const directResult = await testDirectStorageSubmission();
  
  // Test consumer submission
  const consumerResult = await testConsumerSubmission();
  
  // Print summary
  console.log('\n=== Test Summary ===');
  console.log('Direct Storage Submission:', directResult.success ? 'SUCCESS' : 'FAILED');
  console.log('Consumer Submission:', consumerResult.success ? 'SUCCESS' : 'FAILED');
  
  // Provide recommendations based on results
  console.log('\n=== Recommendations ===');
  
  if (directResult.success && !consumerResult.success) {
    console.log('The issue appears to be with the consumer canister authorization to the storage canister.');
    console.log('Recommendations:');
    console.log('1. Verify that the consumer canister is authorized to call the storage canister');
    console.log('2. Check if the consumer canister is correctly forwarding the caller\'s principal');
    console.log('3. Consider using the direct storage submission approach in the proxy server');
  } else if (!directResult.success && !consumerResult.success) {
    console.log('Both direct and consumer submissions are failing.');
    console.log('Recommendations:');
    console.log('1. Check if the storage canister is accepting anonymous submissions');
    console.log('2. Verify the structure of the submission data matches what the storage canister expects');
    console.log('3. Consider implementing a temporary workaround to handle NotAuthorized errors');
  } else if (directResult.success && consumerResult.success) {
    console.log('Both submission methods are working! The issue might be elsewhere.');
    console.log('Recommendations:');
    console.log('1. Verify that the extension is correctly sending the data');
    console.log('2. Check for any network or CORS issues between the extension and the proxy');
    console.log('3. Ensure the proxy server is correctly forwarding requests to the canisters');
  }
};

// Run the tests
runTests().catch(error => {
  console.error('Test execution error:', error);
});
