// Script to add a sample topic to the consumer canister
require('./bigint-patch');

if (typeof BigInt.prototype.toJSON !== 'function') {
  BigInt.prototype.toJSON = function() { return this.toString(); };
}

const { HttpAgent, Actor } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const { Ed25519KeyIdentity } = require('@dfinity/identity');
const fetch = require('node-fetch');
global.Headers = fetch.Headers;
const consumerIdlFactory = require('./idl/consumer.did.js');

// Constants
const IC_HOST = 'https://icp0.io';
const CONSUMER_CANISTER_ID = 'tgyl5-yyaaa-aaaaj-az4wq-cai';

async function addSampleTopic() {
  try {
    console.log('Adding sample topic to consumer canister...');

    // Create a random identity
    const identity = Ed25519KeyIdentity.generate();
    console.log(`Using random identity with principal: ${identity.getPrincipal().toString()}`);

    // Create an agent with anonymous identity
    const agent = new HttpAgent({
      host: IC_HOST,
      identity: identity,
      fetch: fetch,
      verifyQuerySignatures: false,
      fetchRootKey: true,
      disableHandshake: true,
    });

    // Create an actor for the consumer canister
    const actor = Actor.createActor(consumerIdlFactory, {
      agent: agent,
      canisterId: CONSUMER_CANISTER_ID,
    });

    console.log(`Consumer actor initialized for canister ID: ${CONSUMER_CANISTER_ID}`);

    // Create a sample topic
    const sampleTopic = {
      id: "topic_sample_1",
      name: "Sample Topic 1",
      description: "This is a sample topic for testing",
      status: "active",
      createdAt: BigInt(Date.now()),
      urlGenerationStrategy: "manual",
      urlPatterns: ["https://example.com/*"],
      extractionRules: {
        fields: [
          {
            name: "title",
            fieldType: "text",
            required: true,
            aiPrompt: "Extract the title of the article"
          },
          {
            name: "content",
            fieldType: "text",
            required: true,
            aiPrompt: "Extract the main content of the article"
          }
        ],
        customPrompt: "Extract information from this webpage"
      }
    };

    console.log('Sample topic created:', JSON.stringify(sampleTopic));

    // Check available methods in the consumer canister
    console.log('Available methods in consumer canister:');
    for (const method in actor) {
      if (typeof actor[method] === 'function') {
        console.log(`- ${method}`);
      }
    }

    // Add the topic to the consumer canister
    console.log('Adding topic to consumer canister...');
    try {
      const result = await actor.addTopic(sampleTopic);
      console.log('Result:', JSON.stringify(result));

      if ('ok' in result) {
        console.log('Successfully added topic to consumer canister');
      } else if ('err' in result) {
        console.error('Error adding topic to consumer canister:', result.err);
      } else {
        console.error('Unknown response format from consumer canister');
      }
    } catch (error) {
      console.error('Error calling addTopic:', error.message);
    }
  } catch (error) {
    console.error('Error adding sample topic:', error.message);
  }
}

// Run the function
addSampleTopic();
