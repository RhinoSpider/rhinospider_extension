/**
 * Test script to check if we can connect to the admin canister and retrieve topics
 */

const { Actor, HttpAgent, AnonymousIdentity } = require('@dfinity/agent');
const fetch = require('node-fetch');
const fs = require('fs');

// Try both admin canister IDs
const ADMIN_CANISTER_IDS = [
  '444wf-gyaaa-aaaaj-az5sq-cai', // From IC Proxy
  's6r66-wyaaa-aaaaj-az4sq-cai'  // From extension
];

// Try both IC hosts
const IC_HOSTS = [
  'https://icp0.io',
  'https://ic0.app'
];

// Load the admin canister IDL
const idlFactory = require('./services/ic-proxy/declarations/admin/admin.did.fixed.js').idlFactory;

// Create agent with proper configuration
const createAgent = (host, identity = null) => {
  const agent = new HttpAgent({
    host,
    identity: identity || new AnonymousIdentity(),
    fetch,
    // Disable signature verification to avoid certificate validation issues
    verifyQuerySignatures: false,
    fetchRootKey: true,
    disableHandshake: true,
  });
  
  // Explicitly fetch the root key to ensure proper certificate validation
  agent.fetchRootKey().catch(err => {
    console.warn(`Unable to fetch root key for ${host}. Check your connection and try again.`);
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

// Function to get admin actor with proper authentication
async function getAdminActor(host, canisterId) {
  try {
    // Create an anonymous agent
    const anonymousAgent = createAgent(host);
    
    // Create an actor for the admin canister
    const actor = createActor(idlFactory, canisterId, anonymousAgent);
    
    // Return the actor
    return actor;
  } catch (error) {
    console.error(`Error creating admin actor for ${host} and ${canisterId}:`, error.message);
    throw error;
  }
}

// Test function to get topics from the admin canister
async function testGetTopics(host, canisterId) {
  try {
    console.log(`Testing getTopics with host ${host} and canister ID ${canisterId}`);
    
    // Get the admin actor
    const adminActor = await getAdminActor(host, canisterId);
    
    // Call getTopics
    console.log('Calling getTopics...');
    const result = await adminActor.getTopics();
    
    // Log the result
    console.log('getTopics result:', JSON.stringify(result, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    }, 2));
    
    return result;
  } catch (error) {
    console.error(`Error getting topics from ${host} and ${canisterId}:`, error.message);
    return { err: error.message };
  }
}

// Test function to get topics with caller from the admin canister
async function testGetTopicsWithCaller(host, canisterId) {
  try {
    console.log(`Testing getTopics_with_caller with host ${host} and canister ID ${canisterId}`);
    
    // Get the admin actor
    const adminActor = await getAdminActor(host, canisterId);
    
    // Create an anonymous identity
    const anonymousIdentity = new AnonymousIdentity();
    const principal = anonymousIdentity.getPrincipal();
    
    // Call getTopics_with_caller
    console.log(`Calling getTopics_with_caller with principal ${principal.toString()}...`);
    const result = await adminActor.getTopics_with_caller(principal);
    
    // Log the result
    console.log('getTopics_with_caller result:', JSON.stringify(result, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    }, 2));
    
    return result;
  } catch (error) {
    console.error(`Error getting topics with caller from ${host} and ${canisterId}:`, error.message);
    return { err: error.message };
  }
}

// Main function to run all tests
async function runTests() {
  console.log('Starting tests...');
  
  // Test all combinations of hosts and canister IDs
  for (const host of IC_HOSTS) {
    for (const canisterId of ADMIN_CANISTER_IDS) {
      console.log(`\n=== Testing ${host} with ${canisterId} ===\n`);
      
      // Test getTopics
      await testGetTopics(host, canisterId);
      
      // Test getTopics_with_caller
      await testGetTopicsWithCaller(host, canisterId);
    }
  }
  
  console.log('\nAll tests completed.');
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});
