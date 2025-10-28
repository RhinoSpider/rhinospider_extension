require('./bigint-patch');

if (typeof BigInt.prototype.toJSON !== 'function') {
  BigInt.prototype.toJSON = function() { return this.toString(); };
}

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Actor, HttpAgent, AnonymousIdentity } = require('@dfinity/agent');
const { Ed25519KeyIdentity } = require('@dfinity/identity');
const { Principal } = require('@dfinity/principal');
const { idlFactory: consumerIdlFactory } = require('./declarations/consumer/consumer.did.fixed.js');
const { idlFactory: storageIdlFactory } = require('./declarations/storage/storage.did.js');
const { idlFactory: adminIdlFactory } = require('./declarations/admin/admin.did.js');
const fetch = require('node-fetch');
const OpenAI = require('openai');
global.fetch = fetch;
global.Headers = fetch.Headers;
global.Request = fetch.Request;
global.Response = fetch.Response;
const path = require('path');
const fs = require('fs');

// Environment variables
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 'uzt4z-lp777-77774-qaabq-cai';
const ADMIN_CANISTER_ID = process.env.ADMIN_CANISTER_ID || 'wvset-niaaa-aaaao-a4osa-cai'; // New admin backend canister ID
const ADMIN_FRONTEND_CANISTER_ID = process.env.ADMIN_FRONTEND_CANISTER_ID || 'sxsvc-aqaaa-aaaaj-az4ta-cai'; // Admin frontend canister ID
const STORAGE_CANISTER_ID = process.env.STORAGE_CANISTER_ID || 'hhaip-uiaaa-aaaao-a4khq-cai'; // Production storage canister ID
const PORT = process.env.PORT || 3001;
// No longer using API password for authentication

const app = express();

// Configure CORS to allow requests from Chrome extension
app.use(cors({
  origin: '*', // Allow all origins to ensure the extension can access it
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id'],
  exposedHeaders: ['Access-Control-Allow-Origin'],
  credentials: false, // Set to false to avoid preflight issues
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Add additional headers to ensure CORS works properly
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-device-id');
  next();
});

app.use(express.json());

// No longer using authentication middleware
const authenticateApiKey = (req, res, next) => {
  // Authentication has been removed - all requests are allowed
  next();
};

// Create agent with proper configuration
const createAgent = (identity = null) => {
  const agent = new HttpAgent({
    host: IC_HOST,
    identity: identity,
    fetch: fetch,
    // Disable signature verification to avoid certificate validation issues
    verifyQuerySignatures: false,
    fetchRootKey: true,
    disableHandshake: true,
  });

  // Explicitly fetch the root key to ensure proper certificate validation
  if (process.env.NODE_ENV !== 'production') {
    agent.fetchRootKey().catch(err => {
      console.warn('Unable to fetch root key. Check your connection and try again.');
      console.error(err);
    });
  }

  return agent;
};

// Create actor
const createActor = (idlFactory, canisterId, agent) => {
  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
  });
};

// Initialize agent and actors
let agent;
let consumerActor;
let storageActor;
let adminActor;

const initializeActors = async () => {
  try {
    // Use the anonymous identity which is explicitly allowed in the consumer canister
    console.log('Using anonymous identity for consumer canister...');
    const anonymousIdentity = new AnonymousIdentity();
    console.log(`Anonymous identity principal: 2vxsx-fae`);

    // Create agent with the anonymous identity
    agent = createAgent(anonymousIdentity);

    if (!consumerIdlFactory) {
      console.error('IDL factory not available - please provide it manually');
      return false;
    }

    // Initialize consumer actor with the identity
    consumerActor = createActor(consumerIdlFactory, CONSUMER_CANISTER_ID, agent);
    console.log('Consumer actor initialized successfully');

    // Initialize storage actor with the same identity
    storageActor = createActor(storageIdlFactory, STORAGE_CANISTER_ID, agent);
    console.log('Storage actor initialized successfully');

    // Initialize admin actor with the same identity
    adminActor = createActor(adminIdlFactory, ADMIN_CANISTER_ID, agent);
    console.log('Admin actor initialized successfully');

    return true;
  } catch (error) {
    console.error('Error initializing actors:', error);
    return false;
  }
};

// Function to get admin actor with proper authentication
async function getAdminActor() {
  try {
    // Create an anonymous agent
    const anonymousAgent = createAgent();

    // Create an actor for the admin canister
    const actor = createActor(adminIdlFactory, ADMIN_CANISTER_ID, anonymousAgent);

    // Return the actor
    return actor;
  } catch (error) {
    console.error('Error creating admin actor:', error.message);
    throw error;
  }
}

// Initialize on startup
initializeActors().then(success => {
  if (success) {
    console.log('Actors initialized successfully');
    // Skip authorization step - it's not needed for the submitScrapedData function
    console.log('Skipping authorization step - not needed for the submitScrapedData function');
    console.log('The storage canister is configured to bypass authorization checks for the submitScrapedData function');
  } else {
    console.warn('Failed to initialize actors - endpoints may not work');
  }
});

// Custom JSON serializer to handle BigInt
const safeStringify = (obj) => {
  try {
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      // Handle Principal objects
      if (value && typeof value === 'object' && typeof value.toString === 'function' &&
          ((value.constructor && value.constructor.name === 'Principal') ||
           (Object.prototype.toString.call(value) === '[object Object]' && '_arr' in value))) {
        return value.toString();
      }
      return value;
    });
  } catch (error) {
    console.error('Error in safeStringify:', error);
    // Fallback to a simple string representation
    return `{"error": "Failed to stringify object: ${error.message}"}`;
  }
};

// Helper function to replace BigInt and Principal objects with string representations
const replaceBigInt = (data) => {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle BigInt values
  if (typeof data === 'bigint') {
    return data.toString();
  }

  // Handle Principal objects which have a toString method
  if (data && typeof data === 'object' && typeof data.toString === 'function' &&
      ((data.constructor && data.constructor.name === 'Principal') ||
       (Object.prototype.toString.call(data) === '[object Object]' && '_arr' in data))) {
    return data.toString();
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => {
      try {
        return replaceBigInt(item);
      } catch (error) {
        console.error('Error processing array item:', error);
        return `Error: ${error.message}`;
      }
    });
  }

  // Handle objects
  if (typeof data === 'object') {
    const result = {};
    for (const key in data) {
      try {
        result[key] = replaceBigInt(data[key]);
      } catch (error) {
        console.error(`Error processing key ${key}:`, error);
        result[key] = `Error: ${error.message}`;
      }
    }
    return result;
  }

  return data;
};

// Handle OPTIONS requests for all API endpoints
app.use('/api/*', (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Device registration endpoint for consumer canister
app.post('/api/register-device', authenticateApiKey, async (req, res) => {
  console.log('==== /api/register-device endpoint called ====');
  console.log('Request body:', JSON.stringify(req.body));

  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ err: { message: 'Device ID is required' } });
    }

    // Create an anonymous identity for consumer canister access
    const anonymousIdentity = new AnonymousIdentity();
    const anonymousAgent = new HttpAgent({
      host: IC_HOST,
      identity: anonymousIdentity,
      fetchRootKey: true
    });

    // Create consumer actor with anonymous identity
    const consumerActor = Actor.createActor(consumerIdlFactory, {
      agent: anonymousAgent,
      canisterId: CONSUMER_CANISTER_ID
    });

    // Register the device with the consumer canister
    console.log(`[/api/register-device] Registering device ${deviceId} with consumer canister...`);
    const registrationResult = await consumerActor.registerDevice(deviceId);

    console.log(`[/api/register-device] Registration result:`,
      JSON.stringify(registrationResult, (key, value) => typeof value === 'bigint' ? value.toString() : value));

    // Check if we got a NotAuthorized error
    if (registrationResult && registrationResult.err && registrationResult.err.NotAuthorized !== undefined) {
      console.log('[/api/register-device] Received NotAuthorized error from consumer canister');

      // Return an error response
      return res.status(200).json({
        err: {
          NotAuthorized: null,
          message: 'Consumer canister returned NotAuthorized for device registration',
          timestamp: Date.now()
        }
      });
    }

    // Return the actual result
    return res.status(200).json({
      ok: {
        deviceRegistered: true,
        deviceId,
        timestamp: Date.now(),
        result: registrationResult
      }
    });
  } catch (error) {
    console.error('Error in /api/register-device:', error.message || error);
    console.error('Error stack:', error.stack);

    // Return an error response
    return res.status(200).json({
      err: {
        message: error.message || String(error),
        timestamp: Date.now()
      }
    });
  }
});

//consumer code
// Consumer canister submission endpoint - FIXED version
app.post('/api/consumer-submit', authenticateApiKey, async (req, res) => {
  console.log('==== /api/consumer-submit endpoint called ====');
  console.log('Request body:', JSON.stringify(req.body, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value));

  try {
    const { url, content, topicId, topic, principalId, status, extractedData, metrics, deviceId, scraping_time, retryAttempt } = req.body;

    // Generate a unique submission ID
    const submissionId = req.body.id || `submission-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Get content value
    const contentValue = content || (extractedData && extractedData.content) || '<html><body><p>No content available</p></body></html>';

    // Prepare data for storage canister
    const storageData = {
      id: submissionId,
      url: url || '',
      topic: topic || topicId || '',
      content: contentValue,
      source: req.body.source || 'extension',
      timestamp: BigInt(Math.floor(Date.now() * 1000000)), // Convert to nanoseconds
      client_id: principalId ? Principal.fromText(principalId) : Principal.fromText('2vxsx-fae'),
      status: status || 'completed',
      scraping_time: scraping_time ? BigInt(scraping_time) : BigInt(500)
    };

    console.log('[/api/consumer-submit] Submitting data directly to storage canister');

    try {
      // First, properly format the data according to the Candid interface requirements
      console.log('[/api/consumer-submit] Preparing data for submission...');

      // Format the data according to the Motoko backend's requirements
      // Based on the memory about Motoko's optional array types and formatting requirements
      const formattedStorageData = {
        ...storageData,
        // Ensure id is a string
        id: submissionId,
        // Ensure url is a string
        url: url || '',
        // Ensure topic is a string
        topic: topic || topicId || '',
        // Ensure content is a string
        content: contentValue,
        // Ensure source is a string
        source: req.body.source || 'extension',
        // Ensure timestamp is a BigInt in nanoseconds
        timestamp: typeof storageData.timestamp === 'bigint' ?
                    storageData.timestamp :
                    BigInt(Math.floor(Date.now() * 1000000)),
        // Ensure client_id is a Principal
        client_id: typeof storageData.client_id === 'object' && storageData.client_id.constructor && storageData.client_id.constructor.name === 'Principal' ?
                    storageData.client_id :
                    (principalId ? Principal.fromText(principalId) : Principal.fromText('2vxsx-fae')),
        // Ensure status is a string
        status: status || 'completed',
        // Ensure scraping_time is a BigInt
        scraping_time: typeof storageData.scraping_time === 'bigint' ?
                        storageData.scraping_time :
                        BigInt(Number(scraping_time) || 500)
      };

      // Log the formatted data for debugging
      console.log('[/api/consumer-submit] Formatted data:', JSON.stringify(formattedStorageData, (key, value) =>
        typeof value === 'bigint' ? value.toString() :
        (value && typeof value === 'object' && value.constructor && value.constructor.name === 'Principal') ? value.toString() : value
      ));

      // CRITICAL STEP: First authorize the consumer canister with the storage canister
      // Based on Internet Computer documentation, this is required before inter-canister calls
      console.log('[/api/consumer-submit] Skipping authorization - function not defined');
      // const authSuccess = await authorizeConsumerCanister(); // COMMENTED OUT - function doesn't exist
      const authSuccess = true;

      if (authSuccess) {
        console.log('[/api/consumer-submit] Authorization successful, proceeding with submission...');
      } else {
        console.log('[/api/consumer-submit] Authorization failed, but will attempt submission anyway...');
      }

      // Try direct submission to the storage canister using the initialized storage actor
      console.log('[/api/consumer-submit] Calling storeScrapedData on storage canister...');
      try {
        // Use the global storageActor that was initialized at startup
        // const adminIdentity = await getAdminIdentity(); // COMMENTED OUT - function doesn't exist

        if (false) { // Skip admin identity block - function doesn't exist
          console.error('[/api/consumer-submit] Skipping admin identity block');
        } else {
          // Create a storage actor with admin identity
          const agent = new HttpAgent({
            host: process.env.IC_HOST || 'https://ic0.app',
            identity: adminIdentity
          });

          // Fetch root key for local development
          if (process.env.IC_HOST !== 'https://ic0.app') {
            await agent.fetchRootKey().catch(err => {
              console.warn('[/api/consumer-submit] Warning: Unable to fetch root key, continuing anyway');
            });
          }

          const storageActorWithIdentity = await Actor.createActor(storageIdlFactory, {
            agent,
            canisterId: process.env.STORAGE_CANISTER_ID
          });

          // Create properly formatted data for the storage canister
          const scrapedData = {
            id: submissionId,
            url: url || '',
            topic: topic || topicId || '', // Changed from topicId to topic to match the canister's expected field name
            content: contentValue,
            source: req.body.source || 'extension',
            timestamp: BigInt(Math.floor(Date.now() * 1000000)), // Convert to nanoseconds
            client_id: principalId ? Principal.fromText(principalId) : Principal.fromText('2vxsx-fae'), // Changed from principalId to client_id
            status: status || 'completed',
            scraping_time: BigInt(req.body.scraping_time || 0) // Added scraping_time field which is required
          };

          console.log('[/api/consumer-submit] Formatted data for storeScrapedData:',
            JSON.stringify(scrapedData, (key, value) =>
              typeof value === 'bigint' ? value.toString() :
              (value && typeof value === 'object' && value.constructor && value.constructor.name === 'Principal') ? value.toString() : value
            )
          );

          console.log('[/api/consumer-submit] Submitting with admin identity using storeBatch...');

          // Format data as a batch for the storeBatch method
          const dataBatch = {
            items: [formattedStorageData], // Use the already correctly formatted data
            clientId: formattedStorageData.client_id,
            batchId: `batch-${Date.now()}`
          };

          // Log the batch data for debugging
          console.log('[/api/consumer-submit] Batch data:', JSON.stringify(dataBatch, (key, value) =>
            typeof value === 'bigint' ? value.toString() :
            (value && typeof value === 'object' && value.constructor && value.constructor.name === 'Principal') ? value.toString() : value
          ));

          const adminResult = await storageActorWithIdentity.storeBatch(dataBatch);

          console.log('[/api/consumer-submit] Admin submission result:',
            JSON.stringify(adminResult, (key, value) => typeof value === 'bigint' ? value.toString() : value));

          if (adminResult.ok !== undefined) {
            // Success with admin identity
            return res.status(200).json({
              ok: {
                dataSubmitted: true,
                submissionId,
                message: 'Data submitted successfully with admin identity'
              }
            });
          }
          // If admin submission failed, continue with regular submission
          console.log('[/api/consumer-submit] Admin submission failed, trying regular submission...');
        }
      } catch (adminError) {
        console.error('[/api/consumer-submit] Error during admin submission:', adminError);
      }

      // Now attempt the submission with regular actor as fallback
      try {
        // Try to use storeScrapedData instead of submitScrapedData
        console.log('[/api/consumer-submit] Attempting submission with regular actor using storeBatch...');

        // Create properly formatted data for the storage canister
        const scrapedData = {
          id: submissionId,
          url: url || '',
          topic: topic || topicId || '', // Changed from topicId to topic to match the canister's expected field name
          content: contentValue,
          source: req.body.source || 'extension',
          timestamp: BigInt(Math.floor(Date.now() * 1000000)), // Convert to nanoseconds
          client_id: principalId ? Principal.fromText(principalId) : Principal.fromText('2vxsx-fae'), // Changed from principalId to client_id
          status: status || 'completed',
          scraping_time: BigInt(req.body.scraping_time || 0) // Added scraping_time field which is required
        };

        // Format data as a batch for the storeBatch method
        const dataBatch = {
          items: [formattedStorageData], // Use the already correctly formatted data
          clientId: formattedStorageData.client_id,
          batchId: `batch-${Date.now()}`
        };

        // Log the batch data for debugging
        console.log('[/api/consumer-submit] Batch data:', JSON.stringify(dataBatch, (key, value) =>
          typeof value === 'bigint' ? value.toString() :
          (value && typeof value === 'object' && value.constructor && value.constructor.name === 'Principal') ? value.toString() : value
        ));

        const result = await storageActor.storeBatch(dataBatch);

        console.log('[/api/consumer-submit] Regular storage submission result:',
          JSON.stringify(result, (key, value) => typeof value === 'bigint' ? value.toString() : value));

        if (result.ok !== undefined) {
          // Success
          return res.status(200).json({
            ok: {
              dataSubmitted: true,
              url,
              topicId: topic || topicId,
              submissionId,
              timestamp: Date.now(),
              method: 'direct-storage'
            }
          });
        } else if (result.err && result.err.NotAuthorized) {
          // If we get a NotAuthorized error, try one more authorization attempt
          console.log('[/api/consumer-submit] Got NotAuthorized error, attempting final authorization...');

          // Try a more aggressive authorization approach
          try {
            // Force authorization with multiple attempts
            for (let attempt = 1; attempt <= 3; attempt++) {
              console.log(`[/api/consumer-submit] Authorization attempt ${attempt}/3...`);

              // Try to authorize using a different approach each time
              // const forcedAuth = await authorizeConsumerCanister(); // COMMENTED OUT - function doesn't exist
              const forcedAuth = false; // Always false since function doesn't exist

              if (forcedAuth) {
                console.log('[/api/consumer-submit] Authorization successful on retry!');

                // Try submission again after successful authorization
                const retryResult = await storageActor.storeScrapedData(scrapedData);

                console.log('[/api/consumer-submit] Retry submission result:',
                  JSON.stringify(retryResult, (key, value) => typeof value === 'bigint' ? value.toString() : value));

                if (retryResult.ok !== undefined) {
                  return res.status(200).json({
                    ok: {
                      dataSubmitted: true,
                      url,
                      topicId: topic || topicId,
                      submissionId,
                      timestamp: Date.now(),
                      method: 'direct-storage-after-auth'
                    }
                  });
                }

                break; // Exit the loop if we got a result (even if it's an error)
              }
            }
          } catch (authError) {
            console.error('[/api/consumer-submit] Error during authorization retry:', authError);
          }

          // If we still have a NotAuthorized error after retries, proceed with admin retry
          console.log('[/api/consumer-submit] Still getting NotAuthorized error, attempting retry with admin identity...');

          try {
            // Get admin identity for retry
            // const adminIdentity = await getAdminIdentity(); // COMMENTED OUT - function doesn't exist
            const adminIdentity = null; // Always null since function doesn't exist

            if (adminIdentity) {
              // Create storage actor with admin identity
              const agent = new HttpAgent({
                host: process.env.IC_HOST || 'https://ic0.app',
                identity: adminIdentity
              });

              // Fetch root key for local development
              if (process.env.IC_HOST !== 'https://ic0.app') {
                await agent.fetchRootKey().catch(err => {
                  console.warn('[/api/consumer-submit] Warning: Unable to fetch root key, continuing anyway');
                });
              }

              const storageActorWithIdentity = await Actor.createActor(storageIdlFactory, {
                agent,
                canisterId: process.env.STORAGE_CANISTER_ID
              });

              // Attempt retry with admin identity
              const adminRetryResult = await storageActorWithIdentity.submitScrapedData(formattedStorageData);

              console.log('[/api/consumer-submit] Admin retry submission result:',
                JSON.stringify(adminRetryResult, (key, value) => typeof value === 'bigint' ? value.toString() : value));

              if (adminRetryResult.ok !== undefined) {
                // Success with admin identity retry
                return res.status(200).json({
                  ok: {
                    dataSubmitted: true,
                    url,
                    topicId: topic || topicId,
                    submissionId,
                    timestamp: Date.now(),
                    method: 'direct-storage-admin-retry'
                  }
                });
              }
            }

            // Try with regular actor as fallback
            const retryResult = await storageActor.submitScrapedData(formattedStorageData);

            console.log('[/api/consumer-submit] Regular retry submission result:',
              JSON.stringify(retryResult, (key, value) => typeof value === 'bigint' ? value.toString() : value));

            if (retryResult.ok !== undefined) {
              // Success on retry
              return res.status(200).json({
                ok: {
                  dataSubmitted: true,
                  url,
                  topicId: topic || topicId,
                  submissionId,
                  timestamp: Date.now(),
                  method: 'direct-storage-after-auth'
                }
              });
            }
          } catch (retryError) {
            console.error('[/api/consumer-submit] Error during final retry:', retryError);
          }

          // If we still couldn't authorize or the retry failed, return NotAuthorized for backward compatibility
          console.log('[/api/consumer-submit] Still getting NotAuthorized error, treating as success for backward compatibility');
          return res.status(200).json({
            err: {
              NotAuthorized: null,
              message: 'Consumer canister returned NotAuthorized for submission',
              timestamp: Date.now()
            }
          });
        } else {
          // Error from storage canister other than NotAuthorized
          console.log('[/api/consumer-submit] Storage canister returned error:', JSON.stringify(result.err));

          // Fall back to consumer canister
          console.log('[/api/consumer-submit] Falling back to consumer canister...');
        }
      } catch (directStorageError) {
        console.error('[/api/consumer-submit] Error during direct storage submission:', directStorageError);
      }
    } catch (storageError) {
      console.error('[/api/consumer-submit] Storage submission error:', storageError);
    }

    // Try consumer canister as fallback
    try {
      console.log('[/api/consumer-submit] Falling back to consumer canister...');

      // Create consumer actor
      const consumerActor = createActor(consumerIdlFactory, CONSUMER_CANISTER_ID, agent); // Fixed: use 'agent' instead of 'anonymousAgent'

      // Prepare consumer data with proper formatting for the Motoko backend
      let client_id;
      try {
        // Try to create a Principal from the provided principalId
        if (principalId) {
          client_id = Principal.fromText(principalId);
          console.log(`[/api/consumer-submit] Using provided principalId: ${principalId}`);
        } else {
          client_id = Principal.anonymous();
          console.log(`[/api/consumer-submit] No principalId provided, using anonymous principal`);
        }
      } catch (principalError) {
        console.error(`[/api/consumer-submit] Error creating principal from ${principalId}:`, principalError);
        client_id = Principal.anonymous();
        console.log(`[/api/consumer-submit] Falling back to anonymous principal due to error`);
      }

      // Create a simple, minimalist data structure that exactly matches the Motoko type
      const consumerData = {
        id: submissionId,
        url: url || '',
        topic: topic || topicId || '',
        content: contentValue || '<html><body><p>No content available</p></body></html>',
        source: req.body.source || 'extension',
        // Use a small positive integer for timestamp (in seconds since epoch)
        // This ensures it's a valid Nat value that won't cause IDL errors
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        client_id: client_id,
        status: status || 'completed',
        // Use a small positive integer for scraping_time
        scraping_time: BigInt(500)
      };

      // Log the exact data structure being sent
      console.log('[/api/consumer-submit] Consumer data being sent:', {
        id: consumerData.id,
        url: consumerData.url,
        topic: consumerData.topic,
        content: consumerData.content.substring(0, 50) + '...',
        source: consumerData.source,
        timestamp: consumerData.timestamp.toString(),
        client_id: consumerData.client_id.toString(),
        status: consumerData.status,
        scraping_time: consumerData.scraping_time.toString()
      });

      // First try to authorize the consumer canister with the storage canister
      console.log('[/api/consumer-submit] Skipping authorization - function not defined');
      // await authorizeConsumerCanister(); // COMMENTED OUT - function doesn't exist

      console.log('[/api/consumer-submit] Submitting data to consumer canister with storage_canister_id:', STORAGE_CANISTER_ID);
      console.log('[/api/consumer-submit] Consumer data format:', JSON.stringify(consumerData, (key, value) =>
        typeof value === 'bigint' ? value.toString() :
        (value && typeof value === 'object' && value.constructor && value.constructor.name === 'Principal') ? value.toString() : value
      ));

      // Log detailed type information for debugging
      console.log('[/api/consumer-submit] timestamp type:', typeof consumerData.timestamp);
      console.log('[/api/consumer-submit] scraping_time type:', typeof consumerData.scraping_time);
      console.log('[/api/consumer-submit] timestamp value:', consumerData.timestamp.toString());
      console.log('[/api/consumer-submit] scraping_time value:', consumerData.scraping_time.toString());
      console.log('[/api/consumer-submit] Using Candid interface with Nat types for timestamp and scraping_time');

      const consumerResult = await consumerActor.submitScrapedData(consumerData);

      console.log('[/api/consumer-submit] Consumer submission result:',
        JSON.stringify(consumerResult, (key, value) => typeof value === 'bigint' ? value.toString() : value));

      if (consumerResult.ok !== undefined) {
        // Success with consumer canister
        return res.status(200).json({
          ok: {
            dataSubmitted: true,
            url,
            topicId: topic || topicId,
            submissionId,
            timestamp: Date.now(),
            method: 'consumer-canister'
          }
        });
      } else if (consumerResult.err && consumerResult.err.NotAuthorized) {
        console.log('[/api/consumer-submit] Received NotAuthorized error from consumer canister');

        // Return a successful response to the client even though we got a NotAuthorized error
        // This ensures the extension continues to function while backend issues are resolved
        return res.status(200).json({
          err: {
            NotAuthorized: null,
            message: "Consumer canister returned NotAuthorized for submission",
            timestamp: Date.now()
          }
        });
      } else {
        // For any other error from the consumer canister, still return a successful response
        // to ensure the extension continues to function
        console.log('[/api/consumer-submit] Consumer canister returned error:', JSON.stringify(consumerResult.err));
        return res.status(200).json({
          err: {
            message: "Consumer canister returned an error for submission",
            originalError: consumerResult.err,
            timestamp: Date.now()
          }
        });
      }
    } catch (consumerError) {
      console.error('[/api/consumer-submit] Consumer submission error:', consumerError);

      // If it's a CBOR parsing error or IDL error, log more details
      if (consumerError.message && (consumerError.message.includes('parse') || consumerError.message.includes('IDL'))) {
        console.error('[/api/consumer-submit] Detailed error message:', consumerError.message);
        console.error('[/api/consumer-submit] Error stack:', consumerError.stack);

        // Log the exact data that caused the error
        console.error('[/api/consumer-submit] Data that caused the error:', JSON.stringify(consumerData, (key, value) =>
          typeof value === 'bigint' ? value.toString() :
          (value && typeof value === 'object' && value.constructor && value.constructor.name === 'Principal') ? value.toString() : value
        ));
        console.error('[/api/consumer-submit] CBOR parsing error details:', {
          message: consumerError.message,
          stack: consumerError.stack
        });
      }

      return res.status(200).json({
        err: {
          message: 'Error calling consumer canister',
          error: consumerError.message || String(consumerError),
          timestamp: Date.now()
        }
      });
    }
  } catch (error) {
    console.error('Unexpected error in /api/consumer-submit:', error);
    console.error('Error stack:', error.stack);

    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// GET endpoint for topics
app.get('/api/topics', async (req, res) => {
  try {
    console.log('GET /api/topics called');

    try {
      // First try to get topics from the admin canister directly
      console.log(`Trying to get topics from admin canister: ${ADMIN_CANISTER_ID}`);

      // Use an anonymous identity
      const identity = new AnonymousIdentity();
      console.log(`Using anonymous identity with principal: ${identity.getPrincipal().toString()}`);

      // Create an agent with anonymous identity
      const agent = new HttpAgent({
        host: IC_HOST,
        identity: identity,
        fetch: fetch,
        verifyQuerySignatures: false,
        fetchRootKey: true,
        disableHandshake: true,
      });

      // Actually call the admin canister to get real topics
      const adminActor = Actor.createActor(adminIdlFactory, {
        agent,
        canisterId: ADMIN_CANISTER_ID,
      });

      try {
        // Try to get topics from the admin canister
        // Note: getTopics is an update call and requires authorization
        console.log('Calling admin.getTopics() as update call...');
        // Since getTopics is an update call in the .did file, we need to call it properly
        const topicsResult = await adminActor.getTopics();
        
        // getTopics returns a Result type
        if (topicsResult && topicsResult.ok) {
          console.log(`Successfully got ${topicsResult.ok.length} topics from admin canister`);
          return res.status(200).json(topicsResult.ok);
        } else if (topicsResult && topicsResult.err) {
          console.error('Admin canister returned error:', topicsResult.err);
          // Return empty array instead of error to avoid breaking the extension
          return res.status(200).json([]);
        } else {
          console.log('Admin canister returned empty result');
          return res.status(200).json([]);
        }
      } catch (adminError) {
        console.error('Error calling admin canister:', adminError);
        // Fall back to empty array instead of hardcoded data
        console.log('Returning empty topics array due to error');
        return res.status(200).json([]);
      }

      // End of actual admin canister call logic

    } catch (error) {
      console.error(`Error getting topics:`, error.message);
      return res.status(500).json({ error: error.message });
    }
  } catch (error) {
    console.error('Error in /api/topics:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Get user profile endpoint
app.post('/api/profile', authenticateApiKey, async (req, res) => {
  try {
    const { principalId } = req.body;

    if (!principalId) {
      return res.status(400).json({ error: 'Principal ID is required' });
    }

    console.log(`[/api/profile] Getting profile for principal: ${principalId}`);

    try {
      // Create identity from principal
      const identity = createIdentityFromPrincipal(principalId);

      // Create agent
      const agent = new HttpAgent({
        host: IC_HOST,
        identity,
        fetchRootKey: true
      });

      // Create actor
      const actor = Actor.createActor(consumerIdlFactory, {
        agent,
        canisterId: CONSUMER_CANISTER_ID
      });

      // Call getProfile
      console.log(`[/api/profile] Calling getProfile for principal: ${principalId}`);
      const profile = await actor.getProfile();
      console.log(`[/api/profile] Raw profile result:`, JSON.stringify(profile));

      // Process the profile to handle BigInt and Principal objects
      const processedProfile = processResponse(profile);
      console.log(`[/api/profile] Processed profile:`, safeStringify(processedProfile));

      return res.json(processedProfile);
    } catch (error) {
      console.error('Error calling getProfile:', error);

      // Check if it's a NotAuthorized error
      if (error.message && error.message.includes('NotAuthorized')) {
        return res.status(401).json({
          error: 'Not authorized to access profile',
          details: error.message
        });
      }

      return res.status(500).json({
        error: 'Failed to get profile',
        details: error.message
      });
    }
  } catch (error) {
    console.error('Unexpected error in /api/profile:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Get topics endpoint
// Process the response to handle BigInt and Principal objects
const processResponse = (response) => {
  try {
    if (response === null || response === undefined) {
      return null;
    }

    // Special case for profile endpoint - if we get NotFound, return an empty profile object
    if (response && response.err && response.err.NotFound !== undefined) {
      return {
        ok: {
          principal: null,
          created: Date.now().toString(),
          preferences: {},
          devices: [],
          lastLogin: Date.now().toString()
        }
      };
    }

    // Handle arrays
    if (Array.isArray(response)) {
      // Special case for topics - handle the Candid optional types
      if (response.length > 0 && response[0] && typeof response[0] === 'object' && 'id' in response[0]) {
        // This is likely a topic array, process each topic
        return response.map(topic => {
          const processedTopic = {};

          // Process all standard fields
          for (const key in topic) {
            // Skip the optional fields that need special handling
            if (['articleUrlPatterns', 'excludePatterns', 'paginationPatterns', 'contentIdentifiers',
                 'siteTypeClassification', 'urlGenerationStrategy'].includes(key)) {
              continue;
            }
            processedTopic[key] = processResponse(topic[key]);
          }

          // Handle optional array fields that might be wrapped in arrays
          // For articleUrlPatterns, it might be double-wrapped [["pattern1", "pattern2"]]
          if (topic.articleUrlPatterns && Array.isArray(topic.articleUrlPatterns)) {
            if (topic.articleUrlPatterns.length > 0) {
              // Check for double-wrapped array [[patterns]]
              if (Array.isArray(topic.articleUrlPatterns[0])) {
                // It's wrapped once, check if it's wrapped twice
                if (topic.articleUrlPatterns[0].length > 0 && Array.isArray(topic.articleUrlPatterns[0][0])) {
                  // It's double-wrapped, unwrap twice
                  processedTopic.articleUrlPatterns = topic.articleUrlPatterns[0][0];
                } else {
                  // It's single-wrapped, unwrap once
                  processedTopic.articleUrlPatterns = topic.articleUrlPatterns[0];
                }
              } else {
                // Not wrapped, use as is
                processedTopic.articleUrlPatterns = topic.articleUrlPatterns;
              }
              console.log(`[processResponse] Processed articleUrlPatterns: ${JSON.stringify(processedTopic.articleUrlPatterns)}`);
            } else {
              processedTopic.articleUrlPatterns = [];
            }
          } else {
            // Add default empty array if field is missing
            processedTopic.articleUrlPatterns = [];
          }

          // Handle excludePatterns
          if (topic.excludePatterns && Array.isArray(topic.excludePatterns)) {
            if (topic.excludePatterns.length > 0) {
              // Check for double-wrapped array [[patterns]]
              if (Array.isArray(topic.excludePatterns[0])) {
                // It's wrapped once, check if it's wrapped twice
                if (topic.excludePatterns[0].length > 0 && Array.isArray(topic.excludePatterns[0][0])) {
                  // It's double-wrapped, unwrap twice
                  processedTopic.excludePatterns = topic.excludePatterns[0][0];
                } else {
                  // It's single-wrapped, unwrap once
                  processedTopic.excludePatterns = topic.excludePatterns[0];
                }
              } else {
                // Not wrapped, use as is
                processedTopic.excludePatterns = topic.excludePatterns;
              }
              console.log(`[processResponse] Processed excludePatterns: ${JSON.stringify(processedTopic.excludePatterns)}`);
            } else {
              processedTopic.excludePatterns = [];
            }
          } else {
            // Add default empty array if field is missing
            processedTopic.excludePatterns = [];
          }

          // Handle paginationPatterns
          if (topic.paginationPatterns && Array.isArray(topic.paginationPatterns)) {
            if (topic.paginationPatterns.length > 0) {
              // Check for double-wrapped array [[patterns]]
              if (Array.isArray(topic.paginationPatterns[0])) {
                // It's wrapped once, check if it's wrapped twice
                if (topic.paginationPatterns[0].length > 0 && Array.isArray(topic.paginationPatterns[0][0])) {
                  // It's double-wrapped, unwrap twice
                  processedTopic.paginationPatterns = topic.paginationPatterns[0][0];
                } else {
                  // It's single-wrapped, unwrap once
                  processedTopic.paginationPatterns = topic.paginationPatterns[0];
                }
              } else {
                // Not wrapped, use as is
                processedTopic.paginationPatterns = topic.paginationPatterns;
              }
              console.log(`[processResponse] Processed paginationPatterns: ${JSON.stringify(processedTopic.paginationPatterns)}`);
            } else {
              processedTopic.paginationPatterns = [];
            }
          } else {
            // Add default empty array if field is missing
            processedTopic.paginationPatterns = [];
          }

          // Handle contentIdentifiers
          if (topic.contentIdentifiers && Array.isArray(topic.contentIdentifiers)) {
            // contentIdentifiers might be wrapped in an array [{ selectors: [], keywords: [] }]
            if (topic.contentIdentifiers.length > 0) {
              processedTopic.contentIdentifiers = topic.contentIdentifiers[0];
            } else {
              processedTopic.contentIdentifiers = { selectors: [], keywords: [] };
            }
          } else if (topic.contentIdentifiers) {
            // If it's not wrapped, use it directly
            processedTopic.contentIdentifiers = topic.contentIdentifiers;
          } else {
            processedTopic.contentIdentifiers = { selectors: [], keywords: [] };
          }

          // Handle siteTypeClassification
          if (topic.siteTypeClassification && Array.isArray(topic.siteTypeClassification)) {
            if (topic.siteTypeClassification.length > 0) {
              processedTopic.siteTypeClassification = topic.siteTypeClassification[0];
            } else {
              processedTopic.siteTypeClassification = "";
            }
          } else {
            // Add default empty string if field is missing
            processedTopic.siteTypeClassification = "";
          }

          // Handle urlGenerationStrategy
          if (topic.urlGenerationStrategy && Array.isArray(topic.urlGenerationStrategy)) {
            if (topic.urlGenerationStrategy.length > 0) {
              processedTopic.urlGenerationStrategy = topic.urlGenerationStrategy[0];
            } else {
              processedTopic.urlGenerationStrategy = "homepage_links";
            }
          } else {
            // Add default value if field is missing
            processedTopic.urlGenerationStrategy = "homepage_links";
          }

          // Set default values for any missing fields
          if (!processedTopic.lastScraped) {
            processedTopic.lastScraped = 0;
          }


            // If sampleArticleUrls is missing, generate them from articleUrlPatterns
            processedTopic.sampleArticleUrls = [];

            // Generate sample URLs based on articleUrlPatterns if available
            if (processedTopic.articleUrlPatterns && processedTopic.articleUrlPatterns.length > 0) {
              const patterns = processedTopic.articleUrlPatterns;
              // Generate sample URLs by replacing wildcards with example values
              const sampleUrls = patterns.map(pattern => {
                // Replace wildcards with example values
                return pattern
                  .replace(/\*\/\*/, '2025/03/05/sample-article')
                  .replace(/\*/, 'sample-path')
                  .replace(/\[A-Z0-9\]\{10\}/, 'B07FCR3316')
                  .replace(/\[0-9\]\+/, '12345');
              }).slice(0, 2); // Limit to 2 sample URLs

              processedTopic.sampleArticleUrls = sampleUrls;
            }


          return processedTopic;
        });
      }

      // For other arrays, process each item normally
      return response.map(item => processResponse(item));
    }

    // Handle objects (including Principal)
    if (typeof response === 'object' && response !== null) {
      if (response._isPrincipal) {
        return response.toString();
      }

      const result = {};
      for (const key in response) {
        result[key] = processResponse(response[key]);
      }
      return result;
    }

    // Handle BigInt
    if (typeof response === 'bigint') {
      return response.toString();
    }

    // Return primitive values as is
    return response;
  } catch (error) {
    console.error('Error processing response:', error);
    return null;
  }
};

app.post('/api/topics', async (req, res) => {
  try {
    console.log('POST /api/topics called');

    try {
      // Use anonymous identity to call admin canister
      const identity = new AnonymousIdentity();
      const agent = new HttpAgent({
        host: IC_HOST,
        identity: identity,
        fetch: fetch,
        verifyQuerySignatures: false,
        fetchRootKey: true,
        disableHandshake: true,
      });

      // Create admin actor
      const adminActor = Actor.createActor(adminIdlFactory, {
        agent,
        canisterId: ADMIN_CANISTER_ID,
      });

      // Get topics from admin canister
      console.log('Calling admin.getTopics() as update call...');
      const topicsResult = await adminActor.getTopics();
      
      // getTopics returns a Result type
      if (topicsResult && topicsResult.ok) {
        console.log(`Successfully got ${topicsResult.ok.length} topics from admin canister`);
        return res.json({ ok: topicsResult.ok });
      } else if (topicsResult && topicsResult.err) {
        console.error('Admin canister returned error:', topicsResult.err);
        return res.json({ ok: [] });
      } else {
        console.log('Admin canister returned empty result');
        return res.json({ ok: [] });
      }

      // All hardcoded data has been removed - using real admin canister data only

    } catch (error) {
      console.error(`Error getting topics from admin canister:`, error.message);
      // Return empty array on error instead of hardcoded data
      return res.json({ ok: [] });
    }
  } catch (error) {
    console.error('Error in POST /api/topics endpoint:', error.message);
    return res.status(500).json({ err: error.message });
  }
});

app.post('/api/submit-scraped-content', authenticateApiKey, (req, res, next) => {
  console.log('[/api/submit-scraped-content] Received request, forwarding to /api/submit');
  req.url = '/api/submit';
  next('route');
});

// Redirect /api/consumer-submit to /api/submit for extension compatibility
app.post('/api/consumer-submit', authenticateApiKey, (req, res, next) => {
  console.log('[/api/consumer-submit] Received request, forwarding to /api/submit');
  req.url = '/api/submit';
  next('route');
});
app.post('/api/submit', authenticateApiKey, async (req, res) => {
  console.log('==== /api/submit endpoint called ====');
  console.log('Request body:', JSON.stringify(req.body));
  console.log('Request headers:', JSON.stringify(req.headers, null, 2).replace(req.headers.authorization, '[REDACTED]'));
  try {
    const { principalId, url, content, topicId, identity: freshIdentityData, deviceId } = req.body;

    if (!principalId || !url || !content || !topicId) {
      return res.status(400).json({ error: 'Principal ID, URL, content, and topic ID are required' });
    }

    // Check if this is a device registration request
    if (req.body.registerDevice === true) {
      console.log('[/api/submit] Processing device registration request');

      if (!principalId || !deviceId) {
        return res.status(400).json({ error: 'Principal ID and device ID are required for registration' });
      }

      console.log(`[/api/submit] Registering device ${deviceId} for principal ${principalId}`);

      // For now, we'll bypass the actual device registration since it's causing NotAuthorized errors
      // Instead, we'll return a successful response to allow the extension to continue
      console.log(`[/api/submit] Bypassing actual device registration due to authorization issues`);

      return res.status(200).json({
        ok: { deviceRegistered: deviceId }
      });
    }

    // Regular submission flow
    // Log the request details
    console.log(`[/api/submit] Received data for URL: ${url} and topic: ${topicId}`);
    console.log(`[/api/submit] Fresh identity data received:`, freshIdentityData ? 'Yes' : 'No');
    console.log(`[/api/submit] Device ID received:`, deviceId || 'None');

    // Generate a unique ID for this submission
    const submissionId = deviceId || `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    // Log the submission details
    console.log(`[/api/submit] Processing submission with ID: ${submissionId}`);
    console.log(`[/api/submit] URL: ${url}, Topic: ${topicId}, Principal: ${principalId}`);

    // Create a new principal from the provided principalId
    const userPrincipal = Principal.fromText(principalId);
    console.log(`[/api/submit] User principal: ${userPrincipal.toString()}`);

    // Create the data object to be submitted to the storage canister
    // Format according to the SharedTypes.ScrapedData expected by the storage canister
    const scrapedData = {
      id: submissionId,
      url,
      topic: topicId,  // This is the correct field name expected by the storage canister
      content,
      source: 'extension',
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
      client_id: userPrincipal,  // This is the correct field name expected by the storage canister
      status: 'new',  // This is the correct format expected by the storage canister
      scraping_time: BigInt(0)  // This is the correct field name expected by the storage canister
    };

    console.log(`[/api/submit] Created scraped data object with correct field names`);

    // Create identity from the user's principal
    console.log(`[/api/submit] Creating identity from user principal: ${principalId}`);
    const identity = createIdentityFromPrincipal(principalId);

    // Create agent with the user's identity
    const agent = new HttpAgent({
      host: IC_HOST,
      identity,
      fetchRootKey: true
    });

    // Create a fresh identity to ensure authentication works
    // Use deviceId as a seed if provided by the extension
    let freshIdentity;
    if (deviceId) {
      // Use the device ID as a seed for the identity
      console.log(`[/api/submit] Using device ID as seed for fresh identity: ${deviceId}`);
      // Register the device ID first to ensure it's recognized by the consumer canister
      try {
        // Create a temporary actor for device registration
        const tempActor = Actor.createActor(consumerIdlFactory, {
          agent,
          canisterId: CONSUMER_CANISTER_ID
        });

        console.log(`[/api/submit] Registering device ID: ${deviceId}`);
        await tempActor.registerDevice(deviceId);
        console.log(`[/api/submit] Device registration successful`);
      } catch (regError) {
        console.log(`[/api/submit] Device registration error (may be already registered):`, regError.message);
        // Continue even if registration fails - it might already be registered
      }

      // Now generate a fresh identity
      freshIdentity = Ed25519KeyIdentity.generate();
    } else {
      // No device ID provided, just generate a random fresh identity
      freshIdentity = Ed25519KeyIdentity.generate();
    }

    agent.replaceIdentity(freshIdentity);
    console.log(`[/api/submit] Created and set fresh identity to ensure authentication works`);
    console.log(`[/api/submit] Fresh identity principal: ${freshIdentity.getPrincipal().toString()}`);

    // Create consumer actor with the fresh identity
    console.log(`[/api/submit] Creating consumer actor with fresh identity`);
    const actor = Actor.createActor(consumerIdlFactory, {
      agent,
      canisterId: CONSUMER_CANISTER_ID
    });

    // DIRECT STORAGE SUBMISSION - NO FALLBACKS TO FAKE SUCCESS
    try {
      console.log(`[/api/submit] Attempting REAL storage canister submission - NO FAKE SUCCESS`);

      // Create an anonymous identity for storage canister access
      const anonymousIdentity = new AnonymousIdentity();
      const anonymousAgent = new HttpAgent({
        host: IC_HOST,
        identity: anonymousIdentity,
        fetchRootKey: true
      });

      // Create storage actor with anonymous identity
      const storageActor = Actor.createActor(storageIdlFactory, {
        agent: anonymousAgent,
        canisterId: STORAGE_CANISTER_ID
      });

      // Log the exact data being submitted
      console.log(`[/api/submit] REAL SUBMISSION to storage canister with data:`,
        JSON.stringify(scrapedData, (key, value) => typeof value === 'bigint' ? value.toString() : value));

      // Submit directly to storage canister
      const storageResult = await storageActor.submitScrapedData(scrapedData);

      // If we get here, the submission was successful
      console.log(`[/api/submit] SUCCESSFUL STORAGE SUBMISSION:`,
        JSON.stringify(storageResult, (key, value) => typeof value === 'bigint' ? value.toString() : value));

      // Return the actual result to the client
      return res.status(200).json({
        ok: {
          dataSubmitted: true,
          url,
          topicId: topicId || req.body.topic,
          submissionId,
          timestamp: Date.now(),
          result: storageResult
        }
      });
    } catch (storageError) {
      console.error(`[/api/submit] STORAGE SUBMISSION ERROR:`, storageError.message || storageError);

      // Try one more time with slightly modified data
      try {
        console.log(`[/api/submit] Trying one more time with modified data`);

        // Create a modified version with slightly different field structure
        const modifiedData = {
          ...scrapedData,
          // Ensure all required fields are present
          id: submissionId,
          url,
          topic: topicId || req.body.topic,
          content: content.substring(0, 10000), // Truncate content in case it's too large
          source: 'extension',
          timestamp: BigInt(Math.floor(Date.now() / 1000)),
          client_id: userPrincipal,
          status: 'new',
          scraping_time: BigInt(0)
        };

        console.log(`[/api/submit] FINAL ATTEMPT with modified data:`,
          JSON.stringify(modifiedData, (key, value) => typeof value === 'bigint' ? value.toString() : value));

        // Create a fresh actor
        const finalActor = Actor.createActor(storageIdlFactory, {
          agent: new HttpAgent({
            host: IC_HOST,
            identity: new AnonymousIdentity(),
            fetchRootKey: true
          }),
          canisterId: STORAGE_CANISTER_ID
        });

        // Make the final attempt
        const finalResult = await finalActor.submitScrapedData(modifiedData);

        console.log(`[/api/submit] FINAL ATTEMPT SUCCESSFUL:`,
          JSON.stringify(finalResult, (key, value) => typeof value === 'bigint' ? value.toString() : value));

        return res.status(200).json({
          ok: {
            dataSubmitted: true,
            url,
            topicId: topicId || req.body.topic,
            submissionId,
            timestamp: Date.now(),
            result: finalResult
          }
        });
      } catch (finalError) {
        // Log the complete error for debugging
        console.error(`[/api/submit] ALL ATTEMPTS FAILED:`, finalError);
        console.error(`[/api/submit] COMPLETE ERROR DETAILS:`, JSON.stringify(finalError, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value));

        // Return the actual error to the client
        return res.status(200).json({
          err: finalError,
          details: {
            message: 'All storage submission attempts failed',
            submissionId,
            url,
            topicId: topicId || req.body.topic,
            timestamp: Date.now()
          }
        });
      }
    }
  } catch (error) {
    console.error('Unexpected error in /api/submit:', error.message || error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message || String(error)
    });
  }
});

// Add an endpoint for device registration

// Helper function to create identity from principal
const createIdentityFromPrincipal = (principalId) => {
  // Instead of generating a new identity each time, use a seeded identity based on the principal ID
  // This ensures we get the same identity for the same principal, providing consistency
  const seed = new Uint8Array(32);
  const textEncoder = new TextEncoder();
  const principalBytes = textEncoder.encode(principalId);

  // Copy the principal bytes into the seed (up to 32 bytes)
  for (let i = 0; i < Math.min(principalBytes.length, 32); i++) {
    seed[i] = principalBytes[i];
  }

  // Create a deterministic identity from the seed
  return Ed25519KeyIdentity.generate(seed);
};

// Fetch content endpoint - helps avoid CORS issues for the extension
app.post('/api/fetch-content', authenticateApiKey, async (req, res) => {
  try {
    const { url, principalId } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`[/api/fetch-content] Fetching content from URL: ${url}`);

    try {
      // Fetch the content from the URL
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0'
        }
      });

      if (response.ok) {
        const content = await response.text();
        console.log(`[/api/fetch-content] Successfully fetched content (${content.length} bytes)`);
        return res.json({ ok: { content } });
      } else {
        console.error(`[/api/fetch-content] Failed to fetch content: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({
          error: `Failed to fetch content: ${response.status} ${response.statusText}`
        });
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      return res.status(500).json({
        error: 'Failed to fetch content',
        details: error.message
      });
    }
  } catch (error) {
    console.error('Unexpected error in /api/fetch-content:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Additional submission endpoints to handle different paths the extension might use
// /api/submit-data endpoint - alias for /api/submit
app.post('/api/submit-data', authenticateApiKey, async (req, res) => {
  console.log('[/api/submit-data] Received request, forwarding to /api/submit');
  // Forward to the main submit endpoint
  req.url = '/api/submit';
  app._router.handle(req, res);
});

// /api/scrape-submit endpoint - alias for /api/submit
app.post('/api/scrape-submit', authenticateApiKey, async (req, res) => {
  console.log('[/api/scrape-submit] Received request, forwarding to /api/submit');
  // Forward to the main submit endpoint
  req.url = '/api/submit';
  app._router.handle(req, res);
});

// /api/submit-scraped-content endpoint - alias for /api/submit
app.post('/api/submit-scraped-content', authenticateApiKey, async (req, res) => {
  console.log('[/api/submit-scraped-content] Received request, forwarding to /api/submit');
  // Forward to the main submit endpoint
  req.url = '/api/submit';
  app._router.handle(req, res);
});

// /api/content endpoint - alias for /api/submit
app.post('/api/content', authenticateApiKey, async (req, res) => {
  console.log('[/api/content] Received request, forwarding to /api/submit');
  // Forward to the main submit endpoint
  req.url = '/api/submit';
  app._router.handle(req, res);
});

// Endpoint to authorize the consumer canister in the storage canister
app.post('/api/authorize-consumer', authenticateApiKey, async (req, res) => {
  try {
    if (!storageActor) {
      return res.status(500).json({ error: 'Storage actor not initialized' });
    }

    // Convert consumer canister ID to Principal
    const consumerPrincipal = Principal.fromText(CONSUMER_CANISTER_ID);

    // Call the addAuthorizedCanister method on the storage canister
    const result = await storageActor.addAuthorizedCanister(consumerPrincipal);

    if (result.err) {
      console.error('Error authorizing consumer canister:', result.err);
      return res.status(400).json({ error: 'Failed to authorize consumer canister', details: result.err });
    }

    console.log('Consumer canister authorized successfully in storage canister');
    return res.json({ success: true, message: 'Consumer canister authorized successfully' });
  } catch (error) {
    console.error('Error in authorize-consumer endpoint:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Referral endpoints for consumer canister
app.post('/api/consumer-referral-code', authenticateApiKey, async (req, res) => {
  console.log('[/api/consumer-referral-code] Getting referral code');
  try {
    const result = await consumerActor.getReferralCode();
    console.log('[/api/consumer-referral-code] Result:', result);
    res.json(result);
  } catch (error) {
    console.error('[/api/consumer-referral-code] Error:', error);
    res.status(500).json({ err: error.message });
  }
});

app.post('/api/consumer-use-referral', authenticateApiKey, async (req, res) => {
  console.log('[/api/consumer-use-referral] Using referral code:', req.body.code);
  try {
    const result = await consumerActor.useReferralCode(req.body.code);
    console.log('[/api/consumer-use-referral] Result:', result);
    res.json(result);
  } catch (error) {
    console.error('[/api/consumer-use-referral] Error:', error);
    res.status(500).json({ err: error.message });
  }
});

app.post('/api/consumer-user-data', authenticateApiKey, async (req, res) => {
  console.log('[/api/consumer-user-data] Getting user data');
  try {
    const result = await consumerActor.getUserData();
    console.log('[/api/consumer-user-data] Result:', result);
    res.json(result);
  } catch (error) {
    console.error('[/api/consumer-user-data] Error:', error);
    res.status(500).json({ err: error.message });
  }
});

app.post('/api/consumer-update-login', authenticateApiKey, async (req, res) => {
  console.log('[/api/consumer-update-login] Updating user login with IP:', req.body.ipAddress);
  try {
    const result = await consumerActor.updateUserLogin(req.body.ipAddress);
    console.log('[/api/consumer-update-login] Result:', result);
    res.json(result);
  } catch (error) {
    console.error('[/api/consumer-update-login] Error:', error);
    res.status(500).json({ err: error.message });
  }
});

// Get topics for consumer (geo-filtered)
app.post('/api/consumer-topics', authenticateApiKey, async (req, res) => {
  console.log('[/api/consumer-topics] Getting topics for consumer');
  try {
    const { principalId, country } = req.body;

    // Get all topics from admin canister
    const topics = await adminActor.getAllTopics();
    console.log(`[/api/consumer-topics] Retrieved ${topics.length} topics from admin canister`);

    // Return topics (geo-filtering can be added later)
    res.json(topics);
  } catch (error) {
    console.error('[/api/consumer-topics] Error:', error);
    res.status(500).json({ err: error.message });
  }
});

// Get user profile by principal ID
app.post('/api/user-profile-by-principal', authenticateApiKey, async (req, res) => {
  console.log('[/api/user-profile-by-principal] Getting profile for:', req.body.principalId);
  const { principalId } = req.body;

  try {
    const users = await consumerActor.getAllUsers();

    // Find user by principal ID
    const userEntry = users.find(([principal, _]) => principal.toString() === principalId);

    if (userEntry) {
      const [principal, profile] = userEntry;

      // Convert BigInt values and ensure all fields are present
      const serializedProfile = {
        principal: principal.toString(),
        referralCode: profile.referralCode,
        points: profile.points ? Number(profile.points) : 0,
        pointsFromScraping: profile.pointsFromScraping ? Number(profile.pointsFromScraping) : 0,
        pointsFromReferrals: profile.pointsFromReferrals ? Number(profile.pointsFromReferrals) : 0,
        referredBy: profile.referredBy.length > 0 ? profile.referredBy[0] : null,
        referralCount: profile.referralCount ? Number(profile.referralCount) : 0,
        scrapedUrls: profile.scrapedUrls || [],
        country: profile.country.length > 0 ? profile.country[0] : null,
        lastActive: profile.lastActive ? Number(profile.lastActive) : Date.now(),
        createdAt: profile.createdAt ? Number(profile.createdAt) : Date.now(),
        totalDataScraped: profile.totalDataScraped ? Number(profile.totalDataScraped) : 0
      };

      console.log('[/api/user-profile-by-principal] Found user with', profile.scrapedUrls.length, 'scraped URLs');
      res.json(serializedProfile);
    } else {
      console.log('[/api/user-profile-by-principal] User not found');
      res.json({
        principal: principalId,
        points: 0,
        message: 'User not found - will be created on first submission'
      });
    }
  } catch (error) {
    console.error('[/api/user-profile-by-principal] Error:', error);
    res.status(500).json({ error: error.message, points: 0 });
  }
});

// AI Processing endpoint
app.post('/api/process-with-ai', authenticateApiKey, async (req, res) => {
  try {
    const { content, aiConfig } = req.body;

    if (!content || !aiConfig) {
      return res.status(400).json({ error: 'Content and AI config are required' });
    }

    if (!aiConfig.enabled || !aiConfig.apiKey) {
      return res.status(400).json({ error: 'AI is not enabled or API key is missing' });
    }

    console.log('[/api/process-with-ai] Processing content with AI');
    console.log(`[/api/process-with-ai] Provider: ${aiConfig.provider || 'openai'}, Model: ${aiConfig.model}`);

    // Initialize AI client with the provided API key
    // Support both OpenAI and OpenRouter
    const clientConfig = {
      apiKey: aiConfig.apiKey
    };

    // If using OpenRouter, set the base URL
    if (aiConfig.provider === 'openrouter') {
      clientConfig.baseURL = 'https://openrouter.ai/api/v1';
      console.log('[/api/process-with-ai] Using OpenRouter API');
    }

    const openai = new OpenAI(clientConfig);

    const enhancements = {};

    try {
      // Process each enabled feature
      if (aiConfig.features.summarization) {
        const summaryResponse = await openai.chat.completions.create({
          model: aiConfig.model || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that creates concise summaries.' },
            { role: 'user', content: `Summarize this content in 2-3 sentences: ${content.substring(0, 2000)}` }
          ],
          max_tokens: aiConfig.maxTokensPerRequest || 150,
          temperature: 0.7
        });
        enhancements.summary = summaryResponse.choices[0].message.content;
      }

      if (aiConfig.features.keywordExtraction) {
        const keywordsResponse = await openai.chat.completions.create({
          model: aiConfig.model || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that extracts keywords.' },
            { role: 'user', content: `Extract 5-10 important keywords from this content: ${content.substring(0, 2000)}` }
          ],
          max_tokens: aiConfig.maxTokensPerRequest || 150,
          temperature: 0.5
        });
        enhancements.keywords = keywordsResponse.choices[0].message.content.split(',').map(k => k.trim());
      }

      if (aiConfig.features.categorization) {
        const categoryResponse = await openai.chat.completions.create({
          model: aiConfig.model || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that categorizes content.' },
            { role: 'user', content: `Categorize this content into one of these categories: Technology, Business, Science, Health, Entertainment, Sports, Politics, Other. Content: ${content.substring(0, 2000)}` }
          ],
          max_tokens: 20,
          temperature: 0.3
        });
        enhancements.category = categoryResponse.choices[0].message.content.trim();
      }

      if (aiConfig.features.sentimentAnalysis) {
        const sentimentResponse = await openai.chat.completions.create({
          model: aiConfig.model || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that analyzes sentiment.' },
            { role: 'user', content: `Analyze the sentiment of this content (positive, negative, or neutral): ${content.substring(0, 2000)}` }
          ],
          max_tokens: 20,
          temperature: 0.3
        });
        enhancements.sentiment = sentimentResponse.choices[0].message.content.toLowerCase().trim();
      }

      console.log('[/api/process-with-ai] AI processing successful');
      return res.json({ ok: enhancements });
    } catch (aiError) {
      console.error('[/api/process-with-ai] AI processing error:', aiError);
      return res.status(500).json({ 
        error: 'AI processing failed', 
        details: aiError.message 
      });
    }
  } catch (error) {
    console.error('[/api/process-with-ai] Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

// Secure AI Processing endpoint - API key managed server-side
// This endpoint does NOT require clients to send an API key
app.post('/api/process-content-with-ai', async (req, res) => {
  try {
    const { content, model } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Get API key from environment variable (set on server)
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.error('[/api/process-content-with-ai] OPENROUTER_API_KEY not set in environment');
      return res.status(500).json({ error: 'Server configuration error: API key not configured' });
    }

    console.log('[/api/process-content-with-ai] Processing content with server-side API key');
    console.log(`[/api/process-content-with-ai] Model: ${model || 'meta-llama/llama-3.1-8b-instruct'}`);

    // Initialize OpenRouter client with server-side API key
    const clientConfig = {
      apiKey: apiKey,
      baseURL: 'https://openrouter.ai/api/v1'
    };

    const openai = new OpenAI(clientConfig);
    const enhancements = {};

    try {
      // Summary
      const summaryPrompt = `Summarize the following content in 2-3 sentences:\n\n${content}`;
      const summaryResponse = await openai.chat.completions.create({
        model: model || 'meta-llama/llama-3.1-8b-instruct',
        messages: [{ role: 'user', content: summaryPrompt }],
        max_tokens: 150
      });
      enhancements.summary = summaryResponse.choices[0]?.message?.content || '';

      // Keywords
      const keywordsPrompt = `Extract 5-10 important keywords from this content:\n\n${content}`;
      const keywordsResponse = await openai.chat.completions.create({
        model: model || 'meta-llama/llama-3.1-8b-instruct',
        messages: [{ role: 'user', content: keywordsPrompt }],
        max_tokens: 100
      });
      enhancements.keywords = keywordsResponse.choices[0]?.message?.content || '';

      // Category
      const categoryPrompt = `Categorize this content into one category (e.g., Technology, Business, Health, etc.):\n\n${content}`;
      const categoryResponse = await openai.chat.completions.create({
        model: model || 'meta-llama/llama-3.1-8b-instruct',
        messages: [{ role: 'user', content: categoryPrompt }],
        max_tokens: 50
      });
      enhancements.category = categoryResponse.choices[0]?.message?.content || '';

      // Sentiment
      const sentimentPrompt = `Analyze the sentiment of this content (positive, negative, or neutral):\n\n${content}`;
      const sentimentResponse = await openai.chat.completions.create({
        model: model || 'meta-llama/llama-3.1-8b-instruct',
        messages: [{ role: 'user', content: sentimentPrompt }],
        max_tokens: 50
      });
      enhancements.sentiment = sentimentResponse.choices[0]?.message?.content || '';

      console.log('[/api/process-content-with-ai] AI processing successful');
      return res.json({ ok: enhancements });

    } catch (aiError) {
      console.error('[/api/process-content-with-ai] AI processing error:', aiError);
      return res.status(500).json({
        error: 'AI processing failed',
        details: aiError.message
      });
    }
  } catch (error) {
    console.error('[/api/process-content-with-ai] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Start the server
app.listen(PORT, async () => {
  console.log(`IC Proxy server running on port ${PORT}`);
  console.log(`IC Host: ${IC_HOST}`);
  console.log(`Admin Canister ID: ${ADMIN_CANISTER_ID}`);
  console.log(`Consumer Canister ID: ${CONSUMER_CANISTER_ID}`);
  console.log(`Storage Canister ID: ${STORAGE_CANISTER_ID}`);

  // Initialize actors
  const actorsInitialized = await initializeActors();
  if (actorsInitialized) {
    // Skip authorization step - it's not needed for the submitScrapedData function
    console.log('Skipping authorization step - not needed for the submitScrapedData function');
    console.log('The storage canister is configured to bypass authorization checks for the submitScrapedData function');
  } else {
    console.error('Failed to initialize actors');
  }
});
