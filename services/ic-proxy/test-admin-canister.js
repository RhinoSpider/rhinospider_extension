/**
 * Test script to check if we can connect to the admin canister and retrieve topics
 */

// Import required modules
const { Actor, HttpAgent, AnonymousIdentity } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const fetch = require('node-fetch');

// Set up global fetch for node environment
global.fetch = fetch;
global.Headers = fetch.Headers;
global.Request = fetch.Request;
global.Response = fetch.Response;

// Import the admin canister IDL
const { idlFactory } = require('./declarations/admin/admin.did.js');

// Try both admin canister IDs
const adminCanisterIds = [
  '444wf-gyaaa-aaaaj-az5sq-cai', // From IC Proxy
  's6r66-wyaaa-aaaaj-az4sq-cai'  // From extension
];

// IC Host
const IC_HOST = 'https://icp0.io';

// Create agent with proper configuration
const createAgent = (identity = null) => {
  const agent = new HttpAgent({
    host: IC_HOST,
    identity: identity || new AnonymousIdentity(),
    fetch,
    // Disable signature verification to avoid certificate validation issues
    verifyQuerySignatures: false,
    fetchRootKey: true,
    disableHandshake: true,
  });
  
  // Explicitly fetch the root key to ensure proper certificate validation
  agent.fetchRootKey().catch(err => {
    console.warn(`Unable to fetch root key for ${IC_HOST}. Check your connection and try again.`);
    console.error(err);
  });
  
  return agent;
};

// Create actor
const createActor = (idlFactory, canisterId, agent) => {
  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
  });
};

// Test function to get topics from the admin canister
async function testGetTopics(canisterId) {
  try {
    console.log(`Testing getTopics with canister ID ${canisterId}`);
    
    // Create an anonymous agent
    const anonymousAgent = createAgent();
    
    // Create an actor for the admin canister
    const actor = createActor(idlFactory, canisterId, anonymousAgent);
    
    // Call getTopics
    console.log('Calling getTopics...');
    const result = await actor.getTopics();
    
    // Log the result
    console.log('getTopics result:', JSON.stringify(result, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    }, 2));
    
    return result;
  } catch (error) {
    console.error(`Error getting topics from ${canisterId}:`, error.message);
    return { err: error.message };
  }
}

// Main function to run all tests
async function runTests() {
  console.log('Starting tests...');
  
  // Test all canister IDs
  for (const canisterId of adminCanisterIds) {
    console.log(`\n=== Testing ${canisterId} ===\n`);
    
    // Test getTopics
    await testGetTopics(canisterId);
  }
  
  console.log('\nAll tests completed.');
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});
