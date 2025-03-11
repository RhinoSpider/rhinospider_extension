const { Actor, HttpAgent, AnonymousIdentity } = require('@dfinity/agent');
const { Ed25519KeyIdentity } = require('@dfinity/identity');
const { Principal } = require('@dfinity/principal');
const { idlFactory: consumerIdlFactory } = require('./declarations/consumer/consumer.did.js');
const { idlFactory: storageIdlFactory } = require('./declarations/storage/storage.did.js');
const fetch = require('node-fetch');

// Configuration
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 'tgyl5-yyaaa-aaaaj-az4wq-cai';
const STORAGE_CANISTER_ID = process.env.STORAGE_CANISTER_ID || 'i2gk7-oyaaa-aaaao-a37cq-cai';
const TEST_URL = 'https://example.com/test-page';
const TEST_TOPIC_ID = 'topic_swsi3j4lj'; // Real topic ID: TechCrunch News Articles

async function testConsumerSubmission() {
  console.log('===========================================');
  console.log('Testing submission via consumer canister');
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
    
    // First, register the device with the consumer canister
    console.log('Registering device with consumer canister...');
    try {
      const deviceId = `test-device-${Date.now()}`;
      const registerResult = await consumerActor.registerDevice(deviceId);
      console.log('Device registration result:', JSON.stringify(registerResult, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value, 2));
    } catch (registerError) {
      console.error('Error registering device:', registerError);
      // Continue anyway for testing
    }
    
    // Generate a unique ID for this test run
    const testId = `test-${Date.now()}`;
    
    // Create test content that's definitely not empty
    const testContent = `
      <html>
        <body>
          <h1>Test Content for RhinoSpider</h1>
          <p>This is a test submission to verify the consumer canister integration.</p>
          <p>Generated at: ${new Date().toISOString()}</p>
        </body>
      </html>
    `;
    
    // Create the data structure exactly as defined in the consumer.did.js
    const scrapedData = {
      id: testId,
      url: TEST_URL,
      topic: TEST_TOPIC_ID,
      content: testContent, // Make sure content is not empty
      source: 'test-script',
      timestamp: BigInt(Math.floor(Date.now() / 1000)), // Convert to seconds as BigInt
      client_id: freshIdentity.getPrincipal(), // Must be a Principal, not a string
      status: 'new',
      scraping_time: BigInt(500) // Must be a BigInt
    };
    
    // Log the exact structure being sent
    console.log('Submitting data with the following structure:');
    console.log(JSON.stringify({
      id: scrapedData.id,
      url: scrapedData.url,
      topic: scrapedData.topic,
      content: `${scrapedData.content.substring(0, 50)}...`, // Show first 50 chars
      source: scrapedData.source,
      timestamp: scrapedData.timestamp.toString(),
      client_id: scrapedData.client_id.toString(),
      status: scrapedData.status,
      scraping_time: scrapedData.scraping_time.toString()
    }, null, 2));
    
    // Submit the data
    console.log('Submitting data to consumer canister...');
    const submitResult = await consumerActor.submitScrapedData(scrapedData);
    
    console.log('Submission result:', JSON.stringify(submitResult, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value, 2));
    
    if (submitResult.ok !== undefined) {
      console.log('✅ SUCCESS: Test submission was successful!');
      
      // Now try to fetch the data back to verify it was saved
      console.log('\nFetching the data back to verify it was saved...');
      try {
        // Wait a moment to ensure data is processed
        console.log('Waiting 2 seconds for data to be processed...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('Fetching data for topic:', TEST_TOPIC_ID);
        const fetchResult = await consumerActor.getScrapedData([TEST_TOPIC_ID]);
        
        if (fetchResult.ok) {
          const items = fetchResult.ok;
          console.log(`Found ${items.length} items for topic ${TEST_TOPIC_ID}`);
          
          // Look for our test item
          const ourItem = items.find(item => item.id === testId);
          if (ourItem) {
            console.log('✅ SUCCESS: Our test item was found in the fetched data!');
            console.log('Item details:', JSON.stringify({
              id: ourItem.id,
              url: ourItem.url,
              topic: ourItem.topic,
              content: `${ourItem.content.substring(0, 50)}...`,
              timestamp: ourItem.timestamp.toString()
            }, null, 2));
          } else {
            console.log('❌ Our test item was not found in the fetched data.');
          }
        } else {
          console.error('Error fetching data:', fetchResult.err);
        }
      } catch (fetchError) {
        console.error('Error fetching data from consumer canister:', fetchError);
      }
      
      // Now try to fetch the data from the storage canister directly
      console.log('\nChecking if data is available in the storage canister...');
      try {
        // Create a storage actor
        const storageActor = Actor.createActor(storageIdlFactory, {
          agent,
          canisterId: STORAGE_CANISTER_ID
        });
        
        console.log('Fetching data from storage canister for topic:', TEST_TOPIC_ID);
        const storageResult = await storageActor.getScrapedData([TEST_TOPIC_ID]);
        
        if (storageResult.ok) {
          const items = storageResult.ok;
          console.log(`Found ${items.length} items in storage canister for topic ${TEST_TOPIC_ID}`);
          
          // Look for our test item
          const ourItem = items.find(item => item.id === testId);
          if (ourItem) {
            console.log('✅ SUCCESS: Our test item was found in the storage canister!');
            console.log('Item details from storage:', JSON.stringify({
              id: ourItem.id,
              url: ourItem.url,
              topic: ourItem.topic,
              content: `${ourItem.content.substring(0, 50)}...`,
              timestamp: ourItem.timestamp.toString()
            }, null, 2));
          } else {
            console.log('❌ Our test item was not found in the storage canister.');
          }
          
          // Also try with ALL_TOPICS parameter to match admin app behavior
          console.log('\nTrying with ALL_TOPICS parameter (like admin app)...');
          const allTopicsResult = await storageActor.getScrapedData(['ALL_TOPICS']);
          
          if (allTopicsResult.ok) {
            const allItems = allTopicsResult.ok;
            console.log(`Found ${allItems.length} items with ALL_TOPICS parameter`);
            
            // Look for our test item
            const ourItemInAll = allItems.find(item => item.id === testId);
            if (ourItemInAll) {
              console.log('✅ Our test item was found with ALL_TOPICS parameter!');
            } else {
              console.log('❌ Our test item was NOT found with ALL_TOPICS parameter.');
              console.log('This explains why the admin app is not seeing the data.');
            }
          } else {
            console.log('Error fetching with ALL_TOPICS:', allTopicsResult.err);
          }
        } else {
          console.error('Error fetching data from storage canister:', storageResult.err);
        }
      } catch (storageError) {
        console.error('Error accessing storage canister:', storageError);
      }
    } else {
      console.log('❌ Test submission failed:', submitResult.err);
    }
  } catch (error) {
    console.error('Unhandled error:', error);
  }
}

// Run the test
testConsumerSubmission().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
