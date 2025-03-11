// Script to authorize the consumer canister to call the storage canister
require('./bigint-patch');
const { Actor, HttpAgent } = require('@dfinity/agent');
const { Ed25519KeyIdentity } = require('@dfinity/identity');
const { Principal } = require('@dfinity/principal');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Define the storage canister interface
const storageIdlFactory = ({ IDL }) => {
  const Error = IDL.Variant({
    'NotFound': IDL.Null,
    'NotAuthorized': IDL.Null,
    'AlreadyExists': IDL.Null,
    'InvalidInput': IDL.Null,
  });
  
  const Result = IDL.Variant({ 'ok': IDL.Null, 'err': Error });
  
  const ScrapedData = IDL.Record({
    'id': IDL.Text,
    'url': IDL.Text,
    'topic': IDL.Text,
    'source': IDL.Text,
    'content': IDL.Text,
    'timestamp': IDL.Int,
    'client_id': IDL.Principal,
    'status': IDL.Text,
    'scraping_time': IDL.Int,
  });
  
  return IDL.Service({
    'addAuthorizedCanister': IDL.Func([IDL.Principal], [Result], []),
    'removeAuthorizedCanister': IDL.Func([IDL.Principal], [Result], []),
    'submitScrapedData': IDL.Func([ScrapedData], [Result], []),
  });
};

// Environment variables
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 'tgyl5-yyaaa-aaaaj-az4wq-cai';
const STORAGE_CANISTER_ID = process.env.STORAGE_CANISTER_ID || 'i2gk7-oyaaa-aaaao-a37cq-cai';

// Path to identity file
const IDENTITY_FILE = path.join(__dirname, 'admin-identity.json');

// Function to create or load admin identity
const getAdminIdentity = () => {
  try {
    if (fs.existsSync(IDENTITY_FILE)) {
      console.log('Loading existing admin identity...');
      const identityJson = JSON.parse(fs.readFileSync(IDENTITY_FILE, 'utf8'));
      return Ed25519KeyIdentity.fromJSON(JSON.stringify(identityJson));
    }
  } catch (error) {
    console.log('Error loading identity:', error.message);
  }
  
  console.log('Creating new admin identity...');
  const identity = Ed25519KeyIdentity.generate();
  
  try {
    fs.writeFileSync(IDENTITY_FILE, JSON.stringify(identity.toJSON()));
    console.log('Admin identity saved to', IDENTITY_FILE);
  } catch (error) {
    console.log('Error saving identity:', error);
  }
  
  return identity;
};

// Authorize the consumer canister to call the storage canister
const authorizeConsumerCanister = async () => {
  console.log('=== Authorizing Consumer Canister to Call Storage Canister ===');
  
  // Get admin identity
  const identity = getAdminIdentity();
  const adminPrincipal = identity.getPrincipal().toString();
  console.log('Admin principal:', adminPrincipal);
  
  // Create an agent with the admin identity
  const agent = new HttpAgent({
    host: IC_HOST,
    identity: identity,
    fetch
  });
  
  // When not in production, we need to fetch the root key
  if (IC_HOST !== 'https://ic0.app') {
    await agent.fetchRootKey();
  }
  
  // Create actor for storage canister
  const storageActor = Actor.createActor(storageIdlFactory, {
    agent,
    canisterId: STORAGE_CANISTER_ID,
  });
  
  // Get consumer canister principal
  const consumerPrincipal = Principal.fromText(CONSUMER_CANISTER_ID);
  console.log('Consumer canister principal:', CONSUMER_CANISTER_ID);
  
  // Authorize consumer canister
  console.log('Attempting to authorize consumer canister...');
  try {
    const result = await storageActor.addAuthorizedCanister(consumerPrincipal);
    console.log('Authorization result:', result);
    
    if (result.ok !== undefined) {
      console.log('\n=== Authorization Successful ===');
      console.log('The consumer canister has been authorized to call the storage canister.');
      return true;
    } else if (result.err && result.err.AlreadyExists) {
      console.log('\n=== Already Authorized ===');
      console.log('The consumer canister is already authorized to call the storage canister.');
      return true;
    } else {
      console.log('\n=== Authorization Failed ===');
      console.log('Could not authorize the consumer canister to call the storage canister.');
      console.log('You may need to contact the storage canister administrator for assistance.');
      console.log('Error authorizing consumer canister:', result.err);
      return false;
    }
  } catch (error) {
    console.log('\n=== Authorization Error ===');
    console.log('An error occurred while trying to authorize the consumer canister:');
    console.log(error.message);
    return false;
  }
};

// Run the authorization process
authorizeConsumerCanister()
  .then((success) => {
    if (success) {
      console.log('Authorization process completed successfully.');
    } else {
      console.log('Authorization process failed.');
    }
  })
  .catch((error) => {
    console.error('Unhandled error during authorization:', error);
  });
