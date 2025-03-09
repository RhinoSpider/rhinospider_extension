// Queue Processor - Scheduled job to process the submission queue
require('./bigint-patch');
const { Actor, HttpAgent, AnonymousIdentity } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const { idlFactory: storageIdlFactory } = require('./declarations/storage/storage.did.js');
const fetch = require('node-fetch');
const dataQueueManager = require('./data-queue-manager');

// Environment variables
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const STORAGE_CANISTER_ID = process.env.STORAGE_CANISTER_ID || 'i2gk7-oyaaa-aaaao-a37cq-cai';

// Create agent with anonymous identity
const createAgent = () => {
  return new HttpAgent({
    host: IC_HOST,
    identity: new AnonymousIdentity(),
    fetch: fetch,
    verifyQuerySignatures: false,
    fetchRootKey: true,
    disableHandshake: true,
  });
};

// Function to submit data to storage canister
const submitToStorageCanister = async (data) => {
  try {
    console.log(`[QueueProcessor] Attempting to submit data with ID: ${data.id}`);
    
    const agent = createAgent();
    const storageActor = Actor.createActor(storageIdlFactory, {
      agent,
      canisterId: STORAGE_CANISTER_ID
    });
    
    // Ensure client_id is a Principal if it's a string
    if (data.client_id && typeof data.client_id === 'string') {
      try {
        data.client_id = Principal.fromText(data.client_id);
      } catch (error) {
        console.log(`[QueueProcessor] Error converting client_id to Principal: ${error.message}`);
        data.client_id = Principal.fromText('2vxsx-fae'); // Use anonymous principal as fallback
      }
    } else if (!data.client_id) {
      data.client_id = Principal.fromText('2vxsx-fae'); // Use anonymous principal if missing
    }
    
    // Ensure timestamp is a BigInt
    if (data.timestamp && typeof data.timestamp !== 'bigint') {
      data.timestamp = BigInt(data.timestamp);
    }
    
    // Ensure scraping_time is a BigInt
    if (data.scraping_time && typeof data.scraping_time !== 'bigint') {
      data.scraping_time = BigInt(data.scraping_time);
    }
    
    // Submit to storage canister
    const result = await storageActor.submitScrapedData(data);
    
    console.log(`[QueueProcessor] Submission result:`, result);
    return result;
  } catch (error) {
    console.error(`[QueueProcessor] Error submitting to storage canister:`, error.message || error);
    throw error;
  }
};

// Process the queue
const processQueue = async () => {
  console.log('[QueueProcessor] Starting queue processing...');
  
  try {
    const result = await dataQueueManager.processQueue(submitToStorageCanister);
    console.log('[QueueProcessor] Queue processing result:', result);
    return result;
  } catch (error) {
    console.error('[QueueProcessor] Error processing queue:', error.message || error);
    return { error: error.message || String(error) };
  }
};

// Run the processor if called directly
if (require.main === module) {
  processQueue()
    .then(() => {
      console.log('[QueueProcessor] Processing complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('[QueueProcessor] Processing failed:', error);
      process.exit(1);
    });
} else {
  // Export for use in other modules
  module.exports = {
    processQueue,
    submitToStorageCanister
  };
}
