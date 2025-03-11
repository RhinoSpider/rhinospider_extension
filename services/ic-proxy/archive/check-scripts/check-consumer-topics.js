/**
 * Script to check available topics in the consumer canister
 */
const { Actor, HttpAgent } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const { idlFactory } = require('./declarations/consumer/consumer.did.js');

// Configuration
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 'tgyl5-yyaaa-aaaaj-az4wq-cai';

async function checkConsumerTopics() {
  console.log('===========================================');
  console.log('Checking topics in consumer canister');
  console.log('===========================================');
  console.log('IC Host:', IC_HOST);
  console.log('Consumer Canister ID:', CONSUMER_CANISTER_ID);

  try {
    // Create an HTTP agent
    const agent = new HttpAgent({ host: IC_HOST });
    
    // Fetch the root key in development
    await agent.fetchRootKey();
    
    // Create the consumer actor
    const consumerActor = Actor.createActor(idlFactory, {
      agent,
      canisterId: CONSUMER_CANISTER_ID
    });
    
    console.log('Consumer actor created successfully');
    
    // Get topics from the consumer canister
    console.log('Fetching topics from consumer canister...');
    const result = await consumerActor.getTopics();
    
    if ('err' in result) {
      console.error('Error fetching topics:', result.err);
      return;
    }
    
    console.log('Topics found in consumer canister:');
    if (result.ok.length === 0) {
      console.log('No topics found in consumer canister');
    } else {
      result.ok.forEach((topic, index) => {
        console.log(`${index + 1}. ID: ${topic.id}, Name: ${topic.name}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the function
checkConsumerTopics()
  .then(() => console.log('Done'))
  .catch(error => console.error('Unhandled error:', error));
