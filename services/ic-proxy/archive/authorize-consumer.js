// Script to authorize the consumer canister to access the storage canister
require('./bigint-patch');
const { Actor, HttpAgent, Identity } = require('@dfinity/agent');
const { Ed25519KeyIdentity } = require('@dfinity/identity');
const { Principal } = require('@dfinity/principal');
const fs = require('fs');

// Environment variables
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const STORAGE_CANISTER_ID = process.env.STORAGE_CANISTER_ID || 'i2gk7-oyaaa-aaaao-a37cq-cai';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 'tgyl5-yyaaa-aaaaj-az4wq-cai';

// Import the storage canister interface
const { idlFactory } = require('./declarations/storage/storage.did.js');

// Load or create admin identity
function loadOrCreateIdentity() {
  const identityFile = './admin-identity.json';
  
  if (fs.existsSync(identityFile)) {
    console.log('Loading existing admin identity...');
    const identityJson = JSON.parse(fs.readFileSync(identityFile, 'utf8'));
    return Ed25519KeyIdentity.fromJSON(JSON.stringify(identityJson));
  } else {
    console.log('Creating new admin identity...');
    const identity = Ed25519KeyIdentity.generate();
    fs.writeFileSync(identityFile, JSON.stringify(identity.toJSON()));
    console.log('New identity created and saved to admin-identity.json');
    console.log('IMPORTANT: You need to fund this identity with ICP to use it!');
    console.log('Principal ID:', identity.getPrincipal().toString());
    return identity;
  }
}

async function authorizeConsumerCanister() {
  console.log('=== Authorizing Consumer Canister ===');
  console.log('Storage Canister ID:', STORAGE_CANISTER_ID);
  console.log('Consumer Canister ID:', CONSUMER_CANISTER_ID);
  
  try {
    // Load or create admin identity
    const adminIdentity = loadOrCreateIdentity();
    console.log('Using admin identity with principal:', adminIdentity.getPrincipal().toString());
    
    // Create agent with admin identity
    const agent = new HttpAgent({
      host: IC_HOST,
      identity: adminIdentity,
      fetchRootKey: true
    });
    
    // Create storage actor with admin identity
    const storageActor = Actor.createActor(idlFactory, {
      agent,
      canisterId: STORAGE_CANISTER_ID
    });
    
    console.log('Calling addAuthorizedCanister...');
    const consumerPrincipal = Principal.fromText(CONSUMER_CANISTER_ID);
    const result = await storageActor.addAuthorizedCanister(consumerPrincipal);
    
    console.log('Authorization result:', result);
    
    if (result.ok !== undefined) {
      console.log('Consumer canister successfully authorized!');
    } else {
      console.error('Failed to authorize consumer canister:', result.err);
    }
    
  } catch (error) {
    console.error('Error authorizing consumer canister:', error);
  }
}

// Run the authorization
authorizeConsumerCanister();
