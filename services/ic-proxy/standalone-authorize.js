// Standalone script to authorize the consumer canister to call the storage canister
// This script handles its own dependencies

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 'tgyl5-yyaaa-aaaaj-az4wq-cai';
const STORAGE_CANISTER_ID = process.env.STORAGE_CANISTER_ID || 'i2gk7-oyaaa-aaaao-a37cq-cai';

// Create a temporary directory for our authorization script
const tempDir = path.join(__dirname, 'temp-auth');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Create package.json
const packageJson = {
  "name": "auth-script",
  "version": "1.0.0",
  "description": "Authorization script for RhinoSpider",
  "main": "auth.js",
  "dependencies": {
    "@dfinity/agent": "0.15.6",
    "@dfinity/identity": "0.15.6",
    "@dfinity/principal": "0.15.6",
    "node-fetch": "2.6.7"
  }
};

fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

// Create the authorization script
const authScript = `
// BigInt serialization patch
if (typeof BigInt.prototype.toJSON !== 'function') {
  BigInt.prototype.toJSON = function() { 
    return this.toString(); 
  };
}

const { Actor, HttpAgent, AnonymousIdentity } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const fetch = require('node-fetch');

// Environment variables
const IC_HOST = '${IC_HOST}';
const CONSUMER_CANISTER_ID = '${CONSUMER_CANISTER_ID}';
const STORAGE_CANISTER_ID = '${STORAGE_CANISTER_ID}';

// Define the storage canister interface with just the authorization method
const storageIdlFactory = ({ IDL }) => {
  const Error = IDL.Variant({
    'NotFound': IDL.Null,
    'NotAuthorized': IDL.Null,
    'AlreadyExists': IDL.Null,
    'InvalidInput': IDL.Null,
  });
  
  const Result = IDL.Variant({ 'ok': IDL.Null, 'err': Error });
  
  return IDL.Service({
    'addAuthorizedCanister': IDL.Func([IDL.Principal], [Result], []),
  });
};

// Authorize the consumer canister to call the storage canister
const authorizeConsumerCanister = async () => {
  try {
    console.log('=== Authorizing Consumer Canister to Call Storage Canister ===');
    console.log('Consumer Canister ID:', CONSUMER_CANISTER_ID);
    console.log('Storage Canister ID:', STORAGE_CANISTER_ID);
    
    // Convert consumer canister ID to Principal
    const consumerPrincipal = Principal.fromText(CONSUMER_CANISTER_ID);
    console.log('Consumer Principal:', consumerPrincipal.toString());
    
    // Use anonymous identity for authorization
    const anonymousIdentity = new AnonymousIdentity();
    
    // Create a new agent with the anonymous identity
    const agent = new HttpAgent({
      host: IC_HOST,
      identity: anonymousIdentity,
      fetch
    });
    
    // Fetch the root key for non-production environment
    if (IC_HOST !== 'https://ic0.app') {
      await agent.fetchRootKey().catch(err => {
        console.warn('Warning: Unable to fetch root key');
        console.error(err);
      });
    }
    
    // Log the principal ID being used - the anonymous identity principal is always 2vxsx-fae
    console.log('Using anonymous identity with principal: 2vxsx-fae for authorization');
    
    // Create a new storage actor with the anonymous identity
    const storageActor = Actor.createActor(storageIdlFactory, {
      agent,
      canisterId: STORAGE_CANISTER_ID
    });
    
    // Call the addAuthorizedCanister method on the storage canister
    console.log('Calling addAuthorizedCanister method...');
    const result = await storageActor.addAuthorizedCanister(consumerPrincipal);
    console.log('Authorization result:', JSON.stringify(result));
    
    if (result.err) {
      if (result.err.AlreadyExists) {
        console.log('\\n=== Already Authorized ===');
        console.log('The consumer canister is already authorized to call the storage canister.');
        return true;
      } else {
        console.error('Error authorizing consumer canister:', JSON.stringify(result.err));
        return false;
      }
    }
    
    console.log('\\n=== Authorization Successful ===');
    console.log('The consumer canister has been authorized to call the storage canister.');
    return true;
  } catch (error) {
    console.error('Error authorizing consumer canister:', error.message || error);
    console.error('Error stack:', error.stack);
    return false;
  }
};

// Run the authorization process
authorizeConsumerCanister()
  .then((success) => {
    if (success) {
      console.log('Authorization process completed successfully.');
      process.exit(0);
    } else {
      console.log('Authorization process failed.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Unhandled error during authorization:', error);
    process.exit(1);
  });
`;

fs.writeFileSync(path.join(tempDir, 'auth.js'), authScript);

console.log('=== Setting up authorization script ===');
console.log('Created temporary directory:', tempDir);
console.log('Installing dependencies...');

try {
  // Install dependencies
  execSync('npm install --no-fund --no-audit', { cwd: tempDir, stdio: 'inherit' });
  
  console.log('\n=== Running authorization script ===');
  // Run the authorization script
  execSync('node auth.js', { cwd: tempDir, stdio: 'inherit' });
  
  console.log('\n=== Cleanup ===');
  // Clean up
  // fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('Authorization process completed.');
} catch (error) {
  console.error('Error during authorization process:', error.message);
  process.exit(1);
}
