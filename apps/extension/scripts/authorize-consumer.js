// Script to authorize the consumer canister in the storage canister
const { Actor, HttpAgent } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const fs = require('fs');
const path = require('path');

// Environment variables - can be overridden with command line arguments
let IC_HOST = process.env.IC_HOST || 'https://icp0.io';
let STORAGE_CANISTER_ID = process.env.STORAGE_CANISTER_ID || 'sxhtz-kaaaa-aaaaj-az4wa-cai';
let CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 'tgyl5-yyaaa-aaaaj-az4wq-cai';

// Parse command line arguments
process.argv.forEach((arg, index) => {
  if (arg === '--ic-host' && process.argv[index + 1]) {
    IC_HOST = process.argv[index + 1];
  }
  if (arg === '--storage-canister' && process.argv[index + 1]) {
    STORAGE_CANISTER_ID = process.argv[index + 1];
  }
  if (arg === '--consumer-canister' && process.argv[index + 1]) {
    CONSUMER_CANISTER_ID = process.argv[index + 1];
  }
});

// Storage canister interface
const storageIdlFactory = ({ IDL }) => {
  const Error = IDL.Variant({
    'NotFound' : IDL.Null,
    'NotAuthorized' : IDL.Null,
    'AlreadyExists' : IDL.Null,
    'InvalidInput' : IDL.Null,
  });
  
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : Error });
  
  return IDL.Service({
    'addAuthorizedCanister' : IDL.Func([IDL.Principal], [Result], []),
    'removeAuthorizedCanister' : IDL.Func([IDL.Principal], [Result], []),
  });
};

// Create an agent
const createAgent = () => {
  return new HttpAgent({
    host: IC_HOST
  });
};

// Create an actor
const createActor = (idlFactory, canisterId, agent) => {
  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
  });
};

// Main function to authorize the consumer canister
const authorizeConsumer = async () => {
  try {
    console.log('Authorizing consumer canister in storage canister...');
    console.log(`IC Host: ${IC_HOST}`);
    console.log(`Storage Canister ID: ${STORAGE_CANISTER_ID}`);
    console.log(`Consumer Canister ID: ${CONSUMER_CANISTER_ID}`);
    
    // Create agent and actor
    const agent = createAgent();
    const storageActor = createActor(storageIdlFactory, STORAGE_CANISTER_ID, agent);
    
    // Convert consumer canister ID to Principal
    const consumerPrincipal = Principal.fromText(CONSUMER_CANISTER_ID);
    
    // Call the addAuthorizedCanister method on the storage canister
    console.log('Calling addAuthorizedCanister...');
    const result = await storageActor.addAuthorizedCanister(consumerPrincipal);
    
    if (result.err) {
      console.error('Error authorizing consumer canister:', result.err);
      process.exit(1);
    }
    
    console.log('Consumer canister authorized successfully in storage canister');
    process.exit(0);
  } catch (error) {
    console.error('Error in authorizeConsumer:', error);
    process.exit(1);
  }
};

// Run the main function
authorizeConsumer();
