// Script to verify if data is actually being saved despite NotAuthorized errors
require('./bigint-patch');
const { Actor, HttpAgent, AnonymousIdentity } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const { idlFactory: storageIdlFactory } = require('./declarations/storage/storage.did.js');
const fetch = require('node-fetch');

// Environment variables
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
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

// Create test data with unique ID for submission
const createTestData = () => {
  const submissionId = `test-${Date.now()}`;
  return {
    id: submissionId,
    url: `https://example.com/test-page-${submissionId}`,
    topic: 'test-topic-id',
    content: `This is test content for submission verification with ID ${submissionId}`,
    source: 'extension-test',
    timestamp: BigInt(Math.floor(Date.now() / 1000)),
    client_id: Principal.fromText('2vxsx-fae'), // Anonymous principal
    status: 'new',
    scraping_time: BigInt(0)
  };
};

// Submit test data to storage canister
const submitTestData = async () => {
  console.log('=== Submitting Test Data to Storage Canister ===');
  
  try {
    const agent = createAgent();
    const storageActor = Actor.createActor(storageIdlFactory, {
      agent,
      canisterId: STORAGE_CANISTER_ID
    });
    
    const testData = createTestData();
    console.log('Submitting test data:', testData);
    
    let result;
    try {
      result = await storageActor.submitScrapedData(testData);
      console.log('Submission result:', result);
    } catch (error) {
      console.log('Submission error:', error.message || error);
      result = { err: { NotAuthorized: null } }; // Assume this is the error we get
    }
    
    return {
      success: true,
      testData,
      result
    };
  } catch (error) {
    console.error('Error during submission:', error.message || error);
    return {
      success: false,
      error: error.message || String(error)
    };
  }
};

// Check if data exists in the storage canister
const checkDataExists = async (testData) => {
  console.log('=== Checking if Data Exists in Storage Canister ===');
  
  try {
    const agent = createAgent();
    const storageActor = Actor.createActor(storageIdlFactory, {
      agent,
      canisterId: STORAGE_CANISTER_ID
    });
    
    // Try different query methods to find the data
    console.log('Trying to find data with ID:', testData.id);
    
    // Method 1: Try getScrapedData if it exists
    try {
      console.log('Method 1: Trying getScrapedData...');
      const data = await storageActor.getScrapedData(testData.id);
      console.log('Data found:', data);
      return { found: true, method: 'getScrapedData', data };
    } catch (error1) {
      console.log('Method 1 failed:', error1.message || error1);
      
      // Method 2: Try getAllScrapedData if it exists
      try {
        console.log('Method 2: Trying getAllScrapedData...');
        const allData = await storageActor.getAllScrapedData();
        console.log(`Retrieved ${allData.length} items`);
        
        // Look for our test data in the results
        const foundData = allData.find(item => item.id === testData.id);
        if (foundData) {
          console.log('Data found in getAllScrapedData results:', foundData);
          return { found: true, method: 'getAllScrapedData', data: foundData };
        } else {
          console.log('Data not found in getAllScrapedData results');
        }
      } catch (error2) {
        console.log('Method 2 failed:', error2.message || error2);
        
        // Method 3: Try getScrapedDataByUrl if it exists
        try {
          console.log('Method 3: Trying getScrapedDataByUrl...');
          const urlData = await storageActor.getScrapedDataByUrl(testData.url);
          console.log('Data found by URL:', urlData);
          return { found: true, method: 'getScrapedDataByUrl', data: urlData };
        } catch (error3) {
          console.log('Method 3 failed:', error3.message || error3);
          
          // Method 4: Try getScrapedDataByTopic if it exists
          try {
            console.log('Method 4: Trying getScrapedDataByTopic...');
            const topicData = await storageActor.getScrapedDataByTopic(testData.topic);
            console.log(`Retrieved ${topicData.length} items for topic`);
            
            // Look for our test data in the results
            const foundData = topicData.find(item => item.id === testData.id);
            if (foundData) {
              console.log('Data found in getScrapedDataByTopic results:', foundData);
              return { found: true, method: 'getScrapedDataByTopic', data: foundData };
            } else {
              console.log('Data not found in getScrapedDataByTopic results');
            }
          } catch (error4) {
            console.log('Method 4 failed:', error4.message || error4);
          }
        }
      }
    }
    
    // If we get here, we couldn't find the data
    return { found: false };
  } catch (error) {
    console.error('Error checking if data exists:', error.message || error);
    return { found: false, error: error.message || String(error) };
  }
};

// Run the verification
const verifyDataSaved = async () => {
  // Step 1: Submit test data
  const submissionResult = await submitTestData();
  
  if (!submissionResult.success) {
    console.error('Failed to submit test data');
    return;
  }
  
  // Step 2: Wait a moment for the data to be processed
  console.log('Waiting 5 seconds for data to be processed...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Step 3: Check if the data exists
  const checkResult = await checkDataExists(submissionResult.testData);
  
  // Step 4: Print the conclusion
  console.log('\n=== Verification Results ===');
  
  if (checkResult.found) {
    console.log('SUCCESS: Data was saved to the storage canister despite the NotAuthorized error!');
    console.log('This confirms that the current workaround in proxy-client.js is valid.');
    console.log('The extension can continue to treat NotAuthorized errors as successful submissions.');
  } else {
    console.log('FAILURE: Data was NOT saved to the storage canister.');
    console.log('The current workaround in proxy-client.js is creating "fake success" messages.');
    console.log('The extension needs a different approach to handle this authorization issue.');
    
    // Suggest solutions
    console.log('\n=== Recommended Solutions ===');
    console.log('1. Contact the storage canister administrator to authorize the consumer canister');
    console.log('2. Modify the storage canister to accept submissions from anonymous principals');
    console.log('3. Implement a proper error handling mechanism in the extension to inform users');
    console.log('   that their data is not being saved');
  }
};

// Run the verification
verifyDataSaved().catch(error => {
  console.error('Verification error:', error);
});
