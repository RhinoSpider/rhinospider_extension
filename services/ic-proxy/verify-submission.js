const { Actor, HttpAgent, AnonymousIdentity } = require('@dfinity/agent');
const { Ed25519KeyIdentity } = require('@dfinity/identity');
const { idlFactory: consumerIdlFactory } = require('./declarations/consumer/consumer.did.js');
const fetch = require('node-fetch');

// Configuration
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 'tgyl5-yyaaa-aaaaj-az4wq-cai';
const TEST_URL = 'https://example.com/test-page';
const TEST_TOPIC_ID = 'test-topic-123';

async function verifySubmission() {
  console.log('===========================================');
  console.log('Verifying submission via consumer canister');
  console.log('===========================================');
  console.log('IC Host:', IC_HOST);
  console.log('Consumer Canister ID:', CONSUMER_CANISTER_ID);
  console.log('Test URL:', TEST_URL);
  console.log('Test Topic ID:', TEST_TOPIC_ID);
  
  try {
    // Create a fresh identity (similar to what we did in the server.js file)
    const freshIdentity = Ed25519KeyIdentity.generate();
    console.log('Created fresh identity');
    console.log('Fresh identity principal:', freshIdentity.getPrincipal().toString());
    
    // Create an agent with the fresh identity
    const agent = new HttpAgent({
      host: IC_HOST,
      identity: freshIdentity,
      fetchRootKey: true,
      fetch
    });
    console.log('Created HTTP agent with fresh identity');
    
    // Create a consumer actor
    const consumerActor = Actor.createActor(consumerIdlFactory, {
      agent,
      canisterId: CONSUMER_CANISTER_ID
    });
    console.log('Created consumer actor');
    
    // First, let's try to get the user profile to confirm we can interact with the consumer canister
    console.log('Checking if we can get a profile from the consumer canister...');
    try {
      const profileResult = await consumerActor.getProfile();
      console.log('Profile result:', JSON.stringify(profileResult, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value, 2));
      console.log('Successfully retrieved profile from consumer canister');
    } catch (profileError) {
      console.log('Could not retrieve profile:', profileError.message);
      // Continue anyway, as we're mainly interested in the submission verification
    }
    
    // Generate a unique ID for this test run
    const testId = `verify-${Date.now()}`;
    
    // Now let's try to submit the same data again to see if it works
    console.log('Submitting test data with ID:', testId);
    
    // Create the same data structure as in the test-submit-local.js script
    const scrapedData = {
      id: testId,
      url: TEST_URL,
      topic: TEST_TOPIC_ID,
      content: '<html><body><h1>Verification Test Content</h1><p>This is a test page for RhinoSpider verification</p></body></html>',
      source: 'verification-test',
      timestamp: BigInt(Date.now()),
      client_id: freshIdentity.getPrincipal(),
      status: 'new',
      scraping_time: BigInt(0)
    };
    
    try {
      console.log('Submitting data to consumer canister...');
      const submitResult = await consumerActor.submitScrapedData(scrapedData);
      console.log('Submit result:', JSON.stringify(submitResult, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value, 2));
      
      if (submitResult.ok !== undefined) {
        console.log('✅ SUCCESS: Verification submission was successful!');
        console.log('This confirms that our approach in server.js is working correctly.');
        console.log('The data is being successfully submitted to the storage canister via the consumer canister.');
        
        // Now let's try to fetch the data back to verify it was saved
        console.log('\nNow fetching the data back to verify it was saved...');
        try {
          // Wait a moment to ensure data is processed
          console.log('Waiting 2 seconds for data to be processed...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          console.log('Fetching data for topic:', TEST_TOPIC_ID);
          const fetchResult = await consumerActor.getScrapedData([TEST_TOPIC_ID]);
          
          console.log('Fetch result:', JSON.stringify(fetchResult, (key, value) => 
            typeof value === 'bigint' ? value.toString() : value, 2));
          
          if (fetchResult.ok) {
            const items = fetchResult.ok;
            console.log(`Found ${items.length} items for topic ${TEST_TOPIC_ID}`);
            
            // Look for our test ID in the results
            const foundItem = items.find(item => item.id === testId);
            
            if (foundItem) {
              console.log('✅ SUCCESS: Our submitted data was found in the storage canister!');
              console.log('Data details:');
              console.log('- ID:', foundItem.id);
              console.log('- URL:', foundItem.url);
              console.log('- Topic:', foundItem.topic);
              console.log('- Source:', foundItem.source);
              console.log('- Status:', foundItem.status);
              console.log('- Content length:', foundItem.content.length, 'characters');
            } else {
              console.log('⚠ WARNING: Our specific test data was not found, but we did get data back.');
              console.log('This could be due to timing issues or data processing delays.');
              console.log('Available IDs:', items.map(item => item.id).join(', '));
            }
          } else {
            console.log('❌ ERROR: Failed to fetch data from the storage canister');
            console.log('Error details:', JSON.stringify(fetchResult.err));
          }
        } catch (fetchError) {
          console.log('❌ ERROR: Exception while fetching data');
          console.log('Error details:', fetchError.message);
          console.log('This could be because the getScrapedData function was just added and needs to be deployed.');
        }
      } else if (submitResult.err) {
        console.log('❌ ERROR: Verification submission failed');
        console.log('Error details:', JSON.stringify(submitResult.err));
      } else {
        console.log('❓ UNKNOWN: Unexpected response format for submission');
        console.log('Response:', JSON.stringify(submitResult));
      }
    } catch (submitError) {
      console.log('❌ ERROR: Exception during verification submission');
      console.log('Error details:', submitError.message);
    }
  } catch (error) {
    console.error('Error verifying submission:', error.message);
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
  }
}

// Run the verification
verifySubmission().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
