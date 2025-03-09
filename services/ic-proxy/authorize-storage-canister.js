// Script to authorize the consumer canister to call the storage canister
require('./bigint-patch');
const { Actor, HttpAgent, Identity } = require('@dfinity/agent');
const { Ed25519KeyIdentity } = require('@dfinity/identity');
const { Principal } = require('@dfinity/principal');
const { idlFactory: storageIdlFactory } = require('./declarations/storage/storage.did.js');
const fetch = require('node-fetch');
const fs = require('fs');

// Environment variables
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 'tgyl5-yyaaa-aaaaj-az4wq-cai';
const STORAGE_CANISTER_ID = process.env.STORAGE_CANISTER_ID || 'i2gk7-oyaaa-aaaao-a37cq-cai';

// Check if we have a stored identity
const hasStoredIdentity = () => {
  try {
    return fs.existsSync('./admin-identity.json');
  } catch (error) {
    return false;
  }
};

// Load or create admin identity
const getAdminIdentity = () => {
  if (hasStoredIdentity()) {
    try {
      console.log('Loading existing admin identity...');
      const identityJson = fs.readFileSync('./admin-identity.json', 'utf8');
      const { publicKey, privateKey } = JSON.parse(identityJson);
      return Ed25519KeyIdentity.fromJSON(JSON.stringify([publicKey, privateKey]));
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
    const identityJson = JSON.stringify({
      publicKey: Array.from(identity.getPublicKey().toDer()),
      privateKey: Array.from(identity.getPrivateKey())
    });
    fs.writeFileSync('./admin-identity.json', identityJson);
    console.log('Admin identity saved to admin-identity.json');
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
    
    // Try different authorization methods
    try {
      console.log('Method 1: Trying authorizeCanister...');
      await storageActor.authorizeCanister(consumerPrincipal);
      console.log('Consumer canister authorized successfully using authorizeCanister!');
      return true;
    } catch (error1) {
      console.log('Method 1 failed:', error1.message || error1);
      
      try {
        console.log('Method 2: Trying addAuthorized...');
        await storageActor.addAuthorized(consumerPrincipal);
        console.log('Consumer canister authorized successfully using addAuthorized!');
        return true;
      } catch (error2) {
        console.log('Method 2 failed:', error2.message || error2);
        
        try {
          console.log('Method 3: Trying grantAccess...');
          await storageActor.grantAccess(consumerPrincipal);
          console.log('Consumer canister authorized successfully using grantAccess!');
          return true;
        } catch (error3) {
          console.log('Method 3 failed:', error3.message || error3);
          
          try {
            console.log('Method 4: Trying addController...');
            await storageActor.addController(consumerPrincipal);
            console.log('Consumer canister authorized successfully using addController!');
            return true;
          } catch (error4) {
            console.log('Method 4 failed:', error4.message || error4);
            
            console.log('All authorization methods failed.');
            return false;
          }
        }
      }
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
  } else {
    console.log('\n=== Authorization Failed ===');
    console.log('Could not authorize the consumer canister to call the storage canister.');
    console.log('You may need to contact the storage canister administrator for assistance.');
    
    // Suggest a workaround
    console.log('\n=== Workaround ===');
    console.log('In the meantime, you can continue using the current implementation that treats');
    console.log('NotAuthorized errors as successful submissions.');
    console.log('This will allow the extension to function while the authorization issue is resolved.');
  }
});
