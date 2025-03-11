// Script to fetch scraped data from the storage canister
require('./bigint-patch');
const { Actor, HttpAgent } = require('@dfinity/agent');
const { Ed25519KeyIdentity } = require('@dfinity/identity');
const fs = require('fs');

// Environment variables
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const STORAGE_CANISTER_ID = process.env.STORAGE_CANISTER_ID || 'i2gk7-oyaaa-aaaao-a37cq-cai';

// Load admin identity
function loadAdminIdentity() {
  const identityFile = './admin-identity.json';
  
  if (fs.existsSync(identityFile)) {
    console.log('Loading admin identity...');
    const identityJson = JSON.parse(fs.readFileSync(identityFile, 'utf8'));
    return Ed25519KeyIdentity.fromJSON(JSON.stringify(identityJson));
  } else {
    console.error('Admin identity not found. Please run authorize-consumer.js first.');
    process.exit(1);
  }
}

// Define a more complete interface for the storage canister
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
  
  // Try all possible query method names for fetching data
  return IDL.Service({
    'addAuthorizedCanister': IDL.Func([IDL.Principal], [Result], []),
    'removeAuthorizedCanister': IDL.Func([IDL.Principal], [Result], []),
    'submitScrapedData': IDL.Func([ScrapedData], [Result], []),
    
    // Common query methods that might exist
    'getScrapedData': IDL.Func([], [IDL.Vec(ScrapedData)], ['query']),
    'getAllScrapedData': IDL.Func([], [IDL.Vec(ScrapedData)], ['query']),
    'getRecentScrapedData': IDL.Func([IDL.Nat], [IDL.Vec(ScrapedData)], ['query']),
    'getScrapedDataByTopic': IDL.Func([IDL.Text], [IDL.Vec(ScrapedData)], ['query']),
    'listScrapedData': IDL.Func([], [IDL.Vec(ScrapedData)], ['query']),
    'queryScrapedData': IDL.Func([], [IDL.Vec(ScrapedData)], ['query']),
    'fetchScrapedData': IDL.Func([], [IDL.Vec(ScrapedData)], ['query']),
    'getScrapedDataCount': IDL.Func([], [IDL.Nat], ['query']),
    
    // Methods with pagination
    'getScrapedDataPage': IDL.Func([IDL.Nat, IDL.Nat], [IDL.Vec(ScrapedData)], ['query']),
    
    // Admin methods
    'getCanisterStatus': IDL.Func([], [IDL.Record({
      'cycles': IDL.Nat,
      'memory_size': IDL.Nat,
      'heap_size': IDL.Nat,
    })], ['query']),
    'listAuthorizedCanisters': IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
  });
};

async function fetchScrapedData() {
  console.log('=== Fetching Scraped Data from Storage Canister ===');
  console.log('Storage Canister ID:', STORAGE_CANISTER_ID);
  
  try {
    // Load admin identity
    const adminIdentity = loadAdminIdentity();
    console.log('Using admin identity with principal:', adminIdentity.getPrincipal().toString());
    
    // Create agent with admin identity
    const agent = new HttpAgent({
      host: IC_HOST,
      identity: adminIdentity,
      fetchRootKey: true
    });
    
    // Create storage actor with admin identity
    const storageActor = Actor.createActor(storageIdlFactory, {
      agent,
      canisterId: STORAGE_CANISTER_ID
    });
    
    // Try all possible methods to fetch data
    const methods = [
      'getScrapedData',
      'getAllScrapedData',
      'getRecentScrapedData',
      'getScrapedDataByTopic',
      'listScrapedData',
      'queryScrapedData',
      'fetchScrapedData',
      'getScrapedDataCount',
      'getScrapedDataPage',
      'listAuthorizedCanisters',
      'getCanisterStatus'
    ];
    
    let foundMethod = false;
    
    for (const method of methods) {
      try {
        console.log(`Trying method: ${method}...`);
        let result;
        
        if (method === 'getRecentScrapedData') {
          result = await storageActor[method](10n);
        } else if (method === 'getScrapedDataByTopic') {
          result = await storageActor[method]('test-topic');
        } else if (method === 'getScrapedDataPage') {
          result = await storageActor[method](0n, 10n);
        } else {
          result = await storageActor[method]();
        }
        
        console.log(`Success with method: ${method}`);
        console.log('Result:', JSON.stringify(result, (key, value) => 
          typeof value === 'bigint' ? value.toString() : value, 2));
        
        foundMethod = true;
      } catch (error) {
        console.log(`Method ${method} failed:`, error.message);
      }
    }
    
    if (!foundMethod) {
      console.log('\nNone of the query methods worked.');
      console.log('The storage canister might not expose any methods to fetch data directly.');
      console.log('You might need to check the actual storage canister code or documentation.');
    }
    
  } catch (error) {
    console.error('Error fetching scraped data:', error);
  }
}

// Run the fetch
fetchScrapedData();
