const { Actor, HttpAgent } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const { createAgent } = require('@dfinity/agent');
const fetch = require('node-fetch');

// Import the storage canister interface
const { idlFactory: storageIdlFactory } = require('./declarations/storage/storage.did.js');

// Constants
const IC_HOST = 'https://icp0.io';
const STORAGE_CANISTER_ID = 'i2gk7-oyaaa-aaaao-a37cq-cai';

// Create test data
const testData = {
  id: `test-${Date.now()}`,
  url: 'https://example.com/test-page',
  status: 'new',
  topic: 'test-topic-123',
  content: '<html><body><h1>Test Content</h1><p>This is a test page for RhinoSpider</p></body></html>',
  source: 'extension',
  timestamp: BigInt(Math.floor(Date.now() / 1000)),
  client_id: Principal.fromText('aaaaa-aa'),
  scraping_time: BigInt(0)
};

// Test direct interaction with the storage canister
async function testStorageCanister() {
  console.log('Testing direct interaction with the storage canister...');
  console.log('Storage Canister ID:', STORAGE_CANISTER_ID);
  console.log('Test data:', {
    ...testData,
    content: testData.content.substring(0, 30) + '...',
    timestamp: testData.timestamp.toString(),
    scraping_time: testData.scraping_time.toString(),
    client_id: testData.client_id.toString()
  });
  
  // Try with anonymous identity
  try {
    console.log('\nApproach 1: Using anonymous identity');
    
    // Create an anonymous agent (no identity parameter means anonymous)
    const anonymousAgent = new HttpAgent({
      host: IC_HOST,
      fetch
    });
    
    // Get the principal of the anonymous identity
    const anonymousPrincipal = await anonymousAgent.getPrincipal();
    console.log('Anonymous identity principal:', anonymousPrincipal.toString());
    
    // Fetch the root key for the agent
    console.log('Fetching root key for agent...');
    await anonymousAgent.fetchRootKey().catch(err => {
      console.log(`Warning: Unable to fetch root key - ${err.message || err}`);
    });
    
    // Create a storage actor with anonymous identity
    console.log('Creating storage actor with anonymous identity...');
    const anonymousStorageActor = Actor.createActor(storageIdlFactory, {
      agent: anonymousAgent,
      canisterId: STORAGE_CANISTER_ID
    });
    
    console.log('Submitting data with anonymous identity...');
    try {
      const result = await anonymousStorageActor.submitScrapedData(testData);
      console.log('Result:', JSON.stringify(result, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value, 2));
      
      if (result && 'ok' in result) {
        console.log('✅ Anonymous identity test PASSED');
      } else {
        console.log('❌ Anonymous identity test FAILED');
        console.log('Error details:', JSON.stringify(result.err || 'Unknown error'));
      }
    } catch (submitError) {
      console.error('Error during submission:', submitError.message || submitError);
      console.error('Error stack:', submitError.stack);
      console.log('❌ Anonymous identity test FAILED due to error');
    }
  } catch (error) {
    console.error('Error with anonymous identity:', error.message);
    console.log('❌ Anonymous identity test FAILED');
  }

  console.log('\n=================================================');
  console.log('Test completed. Summary of findings:');
  console.log('=================================================');
  console.log('1. The storage canister is configured to bypass authorization checks for the submitScrapedData function');
  console.log('2. However, we are still getting NotAuthorized errors when trying to submit data');
  console.log('3. This suggests there might be an issue with how the canister is handling the anonymous identity');
  console.log('4. The anonymous identity principal is always 2vxsx-fae');
  console.log('5. Check the canister logs to see if there are any clues about why the authorization is failing');
}

// Run the test
testStorageCanister().catch(error => {
  console.error('Unhandled error:', error);
});
