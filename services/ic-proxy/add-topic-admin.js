// Script to add a sample topic to the admin canister
require('./bigint-patch');

if (typeof BigInt.prototype.toJSON !== 'function') {
  BigInt.prototype.toJSON = function() { return this.toString(); };
}

const { HttpAgent, Actor } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const { Ed25519KeyIdentity } = require('@dfinity/identity');
const fetch = require('node-fetch');
global.Headers = fetch.Headers;
const adminIdlFactory = require('./idl/admin.did.js');

// Constants
const IC_HOST = 'https://icp0.io';
const ADMIN_CANISTER_ID = '444wf-gyaaa-aaaaj-az5sq-cai';

async function addSampleTopic() {
  try {
    console.log('Adding sample topic to admin canister...');

    // Create a random identity
    const identity = Ed25519KeyIdentity.generate();
    console.log(`Using random identity with principal: ${identity.getPrincipal().toString()}`);

    // Create an agent with random identity
    const agent = new HttpAgent({
      host: IC_HOST,
      identity: identity,
      fetch: fetch,
      verifyQuerySignatures: false,
      fetchRootKey: true,
      disableHandshake: true,
    });

    // Create an actor for the admin canister
    const actor = Actor.createActor(adminIdlFactory, {
      agent: agent,
      canisterId: ADMIN_CANISTER_ID,
    });

    console.log(`Admin actor initialized for canister ID: ${ADMIN_CANISTER_ID}`);

    // Create a sample topic request
    const sampleTopicRequest = {
      name: "Sample Topic 1",
      description: "This is a sample topic for testing",
      status: "active",
      urlGenerationStrategy: "manual",
      urlPatterns: ["https://example.com/*"],
      articleUrlPatterns: ["https://example.com/article/*"],
      siteTypeClassification: "blog",
      scrapingInterval: 3600, // 1 hour in seconds
      maxRetries: 3,
      activeHours: { start: 0, end: 24 }, // Add the missing field
      contentIdentifiers: {
        selectors: [".article", ".content"],
        keywords: ["example", "test"]
      },
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

    console.log('Sample topic request created:', JSON.stringify(sampleTopicRequest));

    // Check available methods in the admin canister
    console.log('Available methods in admin canister:');
    for (const method in actor) {
      if (typeof actor[method] === 'function') {
        console.log(`- ${method}`);
      }
    }

    // Add the topic to the admin canister
    console.log('Adding topic to admin canister...');
    try {
      const result = await actor.createTopic(sampleTopicRequest);
      console.log('Result:', JSON.stringify(result));

      if ('ok' in result) {
        console.log('Successfully added topic to admin canister');
      } else if ('err' in result) {
        console.error('Error adding topic to admin canister:', result.err);
      } else {
        console.error('Unknown response format from admin canister');
      }
    } catch (error) {
      console.error('Error calling createTopic:', error.message);
    }

    // Get topics from the admin canister
    console.log('Getting topics from admin canister...');
    try {
      const result = await actor.getTopics();
      console.log('Result:', JSON.stringify(result));

      if ('ok' in result) {
        console.log(`Successfully got topics from admin canister: ${result.ok.length} topics`);
      } else if ('err' in result) {
        console.error('Error getting topics from admin canister:', result.err);
      } else {
        console.error('Unknown response format from admin canister');
      }
    } catch (error) {
      console.error('Error calling getTopics:', error.message);
    }
  } catch (error) {
    console.error('Error adding sample topic:', error.message);
  }
}

// Run the function
addSampleTopic();
