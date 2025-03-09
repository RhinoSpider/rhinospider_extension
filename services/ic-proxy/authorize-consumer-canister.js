// Script to authorize the consumer canister to call the storage canister
require('./bigint-patch');
const { Actor, HttpAgent, Identity } = require('@dfinity/agent');
const { Ed25519KeyIdentity } = require('@dfinity/identity');
const { Principal } = require('@dfinity/principal');
const { idlFactory: storageIdlFactory } = require('./declarations/storage/storage.did.js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Environment variables
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 'tgyl5-yyaaa-aaaaj-az4wq-cai';
const STORAGE_CANISTER_ID = process.env.STORAGE_CANISTER_ID || 'i2gk7-oyaaa-aaaao-a37cq-cai';

// Path to identity file
const IDENTITY_FILE = path.join(__dirname, 'admin-identity.pem');

// Check if we have a stored identity
const hasStoredIdentity = () => {
  try {
    return fs.existsSync(IDENTITY_FILE);
  } catch (error) {
    return false;
  }
};

// Load or create admin identity
const getAdminIdentity = () => {
  if (hasStoredIdentity()) {
    try {
      console.log('Loading existing admin identity...');
      const pemData = fs.readFileSync(IDENTITY_FILE, 'utf8');
      return Ed25519KeyIdentity.fromPem(pemData);
    } catch (error) {
      console.error('Error loading identity:', error);
      console.log('Creating new identity instead...');
    }
  }
  
  // Create new identity
  console.log('Creating new admin identity...');
  const identity = Ed25519KeyIdentity.generate();
  
  // Save identity for future use
  try {
    const pemData = identity.toPem();
    fs.writeFileSync(IDENTITY_FILE, pemData);
    console.log('Admin identity saved to admin-identity.pem');
  } catch (error) {
    console.error('Error saving identity:', error);
  }
  
  return identity;
};

// Authorize the consumer canister to call the storage canister
const authorizeConsumerCanister = async () => {
  try {
    console.log('=== Authorizing Consumer Canister to Call Storage Canister ===');
    
    // Get admin identity
    const adminIdentity = getAdminIdentity();
    console.log(`Admin principal: ${adminIdentity.getPrincipal().toString()}`);
    
    // Create agent with admin identity
    const agent = new HttpAgent({
      host: IC_HOST,
      identity: adminIdentity,
      fetch: fetch,
      verifyQuerySignatures: false,
      fetchRootKey: true
    });
    
    // Create storage actor
    const storageActor = Actor.createActor(storageIdlFactory, {
      agent,
      canisterId: STORAGE_CANISTER_ID
    });
    
    // Get the consumer canister principal
    const consumerPrincipal = Principal.fromText(CONSUMER_CANISTER_ID);
    console.log(`Consumer canister principal: ${consumerPrincipal.toString()}`);
    
    console.log('Attempting to authorize consumer canister...');
    
    // Call the addAuthorizedCanister method
    const result = await storageActor.addAuthorizedCanister(consumerPrincipal);
    
    console.log('Authorization result:', result);
    
    if (result && result.ok !== undefined) {
      console.log('Consumer canister authorized successfully!');
      return true;
    } else if (result && result.err) {
      if (result.err.AlreadyExists) {
        console.log('Consumer canister is already authorized.');
        return true;
      } else if (result.err.NotAuthorized) {
        console.error('Not authorized to add authorized canisters. You need admin rights on the storage canister.');
        return false;
      } else {
        console.error('Error authorizing consumer canister:', result.err);
        return false;
      }
    } else {
      console.error('Unexpected result format:', result);
      return false;
    }
  } catch (error) {
    console.error('Error authorizing consumer canister:', error.message || error);
    return false;
  }
};

// Run the authorization
authorizeConsumerCanister().then(success => {
  if (success) {
    console.log('\n=== Authorization Successful ===');
    console.log('The consumer canister should now be authorized to call the storage canister.');
    console.log('Try submitting data from the extension again.');
    
    // Test the authorization
    console.log('\n=== Testing Authorization ===');
    console.log('Running test-storage-submission.js to verify the fix...');
    
    const { execSync } = require('child_process');
    try {
      const testOutput = execSync('node test-storage-submission.js', { encoding: 'utf8' });
      console.log(testOutput);
    } catch (error) {
      console.error('Error running test:', error.message);
    }
  } else {
    console.log('\n=== Authorization Failed ===');
    console.log('Could not authorize the consumer canister to call the storage canister.');
    console.log('You may need to contact the storage canister administrator for assistance.');
  }
});
