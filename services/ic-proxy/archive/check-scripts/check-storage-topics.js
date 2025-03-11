/**
 * Script to check available topics in the storage canister
 */
const { Actor, HttpAgent } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const { idlFactory } = require('./declarations/storage/storage.did.js');

// Configuration
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const STORAGE_CANISTER_ID = process.env.STORAGE_CANISTER_ID || 'i2gk7-oyaaa-aaaao-a37cq-cai';

async function checkStorageTopics() {
  console.log('===========================================');
  console.log('Checking topics in storage canister');
  console.log('===========================================');
  console.log('IC Host:', IC_HOST);
  console.log('Storage Canister ID:', STORAGE_CANISTER_ID);

  try {
    // Create an HTTP agent
    const agent = new HttpAgent({ host: IC_HOST });
    
    // Fetch the root key in development
    await agent.fetchRootKey();
    
    // Create the storage actor
    const storageActor = Actor.createActor(idlFactory, {
      agent,
      canisterId: STORAGE_CANISTER_ID
    });
    
    console.log('Storage actor created successfully');
    
    // Get topics from the storage canister
    console.log('Fetching topics from storage canister...');
    const result = await storageActor.getTopics();
    
    if ('err' in result) {
      console.error('Error fetching topics:', result.err);
      return;
    }
    
    console.log('Topics found in storage canister:');
    if (result.ok.length === 0) {
      console.log('No topics found in storage canister');
    } else {
      result.ok.forEach((topic, index) => {
        console.log(`${index + 1}. ID: ${topic.id}, Name: ${topic.name}`);
      });
    }
    
    // Now let's try to get data for ALL_TOPICS
    console.log('\nTrying to fetch data with ALL_TOPICS parameter...');
    try {
      const dataResult = await storageActor.getScrapedData(['ALL_TOPICS']);
      
      if ('err' in dataResult) {
        console.error('Error fetching data:', dataResult.err);
      } else {
        console.log(`Found ${dataResult.ok.length} items with ALL_TOPICS parameter`);
        if (dataResult.ok.length > 0) {
          const topicCounts = {};
          dataResult.ok.forEach(item => {
            if (!topicCounts[item.topic]) {
              topicCounts[item.topic] = 0;
            }
            topicCounts[item.topic]++;
          });
          
          console.log('Data by topic:');
          Object.entries(topicCounts).forEach(([topic, count]) => {
            console.log(`- Topic ${topic}: ${count} items`);
          });
        }
      }
    } catch (error) {
      console.error('Error calling getScrapedData:', error.message);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the function
checkStorageTopics()
  .then(() => console.log('Done'))
  .catch(error => console.error('Unhandled error:', error));
