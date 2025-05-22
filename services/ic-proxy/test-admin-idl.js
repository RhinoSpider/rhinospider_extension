/**
 * Test script to try different IDL definitions for the admin canister
 */

// Import required modules
const { Actor, HttpAgent, AnonymousIdentity, IDL } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const fetch = require('node-fetch');

// Set up global fetch for node environment
global.fetch = fetch;
global.Headers = fetch.Headers;
global.Request = fetch.Request;
global.Response = fetch.Response;

// IC Host
const IC_HOST = 'https://icp0.io';
const ADMIN_CANISTER_ID = '444wf-gyaaa-aaaaj-az5sq-cai';

// Create a custom IDL factory
const createIdlFactory = () => {
  return ({ IDL }) => {
    const ContentIdentifiers = IDL.Record({
      'selectors': IDL.Vec(IDL.Text),
      'keywords': IDL.Vec(IDL.Text),
    });
    
    const ExtractionRules = IDL.Record({
      'fields': IDL.Vec(
        IDL.Record({
          'name': IDL.Text,
          'aiPrompt': IDL.Opt(IDL.Text),
          'required': IDL.Bool,
          'fieldType': IDL.Text,
        })
      ),
      'customPrompt': IDL.Opt(IDL.Text),
    });
    
    const Topic = IDL.Record({
      'id': IDL.Text,
      'status': IDL.Text,
      'name': IDL.Text,
      'createdAt': IDL.Int,
      'description': IDL.Text,
      'urlGenerationStrategy': IDL.Text,
      'urlPatterns': IDL.Vec(IDL.Text),
      'articleUrlPatterns': IDL.Opt(IDL.Vec(IDL.Text)),
      'paginationPatterns': IDL.Opt(IDL.Vec(IDL.Text)),
      'excludePatterns': IDL.Opt(IDL.Vec(IDL.Text)),
      'contentIdentifiers': IDL.Opt(ContentIdentifiers),
      'extractionRules': ExtractionRules,
      'siteTypeClassification': IDL.Opt(IDL.Text),
    });
    
    const TopicError = IDL.Variant({
      'InvalidInput': IDL.Text,
      'SystemError': IDL.Text,
      'NotFound': IDL.Null,
      'NotAuthorized': IDL.Null,
      'AlreadyExists': IDL.Null,
    });
    
    const Result = IDL.Variant({ 'ok': IDL.Vec(Topic), 'err': TopicError });
    
    return IDL.Service({
      'getTopics': IDL.Func([], [Result], ['query']),
    });
  };
};

// Create agent with proper configuration
const createAgent = () => {
  const agent = new HttpAgent({
    host: IC_HOST,
    identity: new AnonymousIdentity(),
    fetch,
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

// Test function to get topics from the admin canister
async function testGetTopics() {
  try {
    console.log(`Testing getTopics with canister ID ${ADMIN_CANISTER_ID}`);
    
    // Create an anonymous agent
    const anonymousAgent = createAgent();
    
    // Create a custom IDL factory
    const idlFactory = createIdlFactory();
    
    // Create an actor for the admin canister
    const actor = Actor.createActor(idlFactory, {
      agent: anonymousAgent,
      canisterId: ADMIN_CANISTER_ID,
    });
    
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
    console.error(`Error getting topics from ${ADMIN_CANISTER_ID}:`, error.message);
    return { err: error.message };
  }
}

// Main function to run all tests
async function runTests() {
  console.log('Starting tests...');
  
  // Test getTopics
  await testGetTopics();
  
  console.log('\nAll tests completed.');
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});
