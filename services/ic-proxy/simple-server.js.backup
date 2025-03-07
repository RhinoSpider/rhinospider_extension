const express = require('express');
const cors = require('cors');
const { Actor, HttpAgent } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const { Ed25519KeyIdentity } = require('@dfinity/identity');
const consumerIdlFactory = require('./declarations/consumer/consumer.did.js').idlFactory;
const adminIdlFactory = require('./declarations/admin/admin.did.js').idlFactory;

// Configure environment variables
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 'tgyl5-yyaaa-aaaaj-az4wq-cai';
const DEFAULT_ADMIN_CANISTER_ID = process.env.ADMIN_CANISTER_ID || '444wf-gyaaa-aaaaj-az5sq-cai';
const PORT = process.env.PORT || 3001;
const API_PASSWORD = process.env.API_PASSWORD || 'ffGpA2saNS47qr';

// Add BigInt serialization support
if (typeof BigInt.prototype.toJSON !== 'function') {
  BigInt.prototype.toJSON = function() { return this.toString(); };
}

// Create Express app
const app = express();

// Configure middleware
app.use(cors());
app.use(express.json());

// Cache for actors to improve performance
const actorsCache = {};

// API key authentication middleware
const authenticateApiKey = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid API key' });
  }

  const apiKey = authHeader.split(' ')[1];

  if (apiKey !== API_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }

  next();
};

// Helper function to create identity from principal
const createIdentityFromPrincipal = (principalId) => {
  try {
    // Convert principal string to Principal object
    const principal = Principal.fromText(principalId);

    // Generate a deterministic key based on the principal
    const seed = new Uint8Array(32);
    const principalBytes = principal.toUint8Array();
    
    // Copy principal bytes to seed (with wrapping if necessary)
    for (let i = 0; i < 32; i++) {
      seed[i] = principalBytes[i % principalBytes.length];
    }

    // Create identity from seed
    return Ed25519KeyIdentity.generate(seed);
  } catch (error) {
    console.error('Error creating identity from principal:', error);
    throw new Error(`Failed to create identity: ${error.message}`);
  }
};

// Root endpoint
app.get('/', (req, res) => {
  res.send('IC Proxy Server is running');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Get profile endpoint
app.post('/api/profile', authenticateApiKey, async (req, res) => {
  try {
    const { principalId } = req.body;
    
    if (!principalId) {
      return res.status(400).json({ error: 'Principal ID is required' });
    }
    
    console.log(`[/api/profile] Getting profile for principal: ${principalId}`);
    
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
    
    try {
      // Call getProfile
      const profile = await actor.getProfile();
      
      // Process the response to handle BigInt and Principal objects
      const processedProfile = processResponse(profile);
      
      return res.json(processedProfile);
    } catch (error) {
      console.error('Error calling getProfile:', error);
      
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
app.post('/api/topics', authenticateApiKey, async (req, res) => {
  try {
    const { principalId } = req.body;
    
    if (!principalId) {
      return res.status(400).json({ error: 'Principal ID is required' });
    }
    
    // Get admin canister ID from header or use default
    const adminCanisterId = req.headers['x-admin-canister-id'] || DEFAULT_ADMIN_CANISTER_ID;
    console.log(`[/api/topics] Using admin canister ID: ${adminCanisterId}`);
    console.log(`[/api/topics] Getting topics for principal: ${principalId}`);
    
    // Clear the actors cache for this canister to ensure we get fresh data
    const cacheKey = `admin-${adminCanisterId}`;
    if (actorsCache[cacheKey]) {
      console.log(`[/api/topics] Clearing cached admin actor for canister: ${adminCanisterId}`);
      delete actorsCache[cacheKey];
    }
    
    // Create identity from principal
    const identity = createIdentityFromPrincipal(principalId);
    
    // Create agent
    const agent = new HttpAgent({
      host: IC_HOST,
      identity,
      fetchRootKey: true
    });
    
    // Always create a new admin actor to ensure we get fresh data
    console.log(`[/api/topics] Creating new admin actor for canister: ${adminCanisterId}`);
    const adminActor = Actor.createActor(adminIdlFactory, {
      agent,
      canisterId: adminCanisterId
    });
    actorsCache[cacheKey] = adminActor;
    console.log(`[/api/topics] Admin actor created with IDL factory:`, typeof adminIdlFactory);
    console.log(`[/api/topics] Admin actor methods:`, Object.keys(adminActor));
    
    try {
      // Call getTopics on the admin canister
      console.log(`[/api/topics] Calling getTopics on admin canister: ${adminCanisterId}`);
      console.log(`[/api/topics] Calling getTopics() on admin actor...`);
      const result = await adminActor.getTopics();
      console.log(`[/api/topics] Raw result type:`, typeof result);
      console.log(`[/api/topics] Raw result:`, JSON.stringify(result, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      ));
      
      // Send an empty array as a fallback
      if (!result) {
        console.log(`[/api/topics] No result from getTopics, returning empty array`);
        return res.json([]);
      }
      
      // Check if the result is an object with 'ok' property (variant type)
      if (result.ok !== undefined) {
        console.log(`[/api/topics] Result is a variant with 'ok' property`);
        
        if (Array.isArray(result.ok)) {
          console.log(`[/api/topics] Result.ok is an array with ${result.ok.length} items`);
          
          // Process the array of topics
          const processedArray = result.ok.map(item => {
            const processed = {};
            
            for (const key in item) {
              if (typeof item[key] === 'bigint') {
                processed[key] = item[key].toString();
              } else if (item[key] && typeof item[key] === 'object' && item[key].constructor && item[key].constructor.name === 'Principal') {
                processed[key] = item[key].toString();
              } else {
                processed[key] = item[key];
              }
            }
            
            return processed;
          });
          
          console.log(`[/api/topics] Processed ${processedArray.length} topics`);
          return res.json(processedArray);
        }
        
        // Fallback: just return an empty array
        console.log(`[/api/topics] Unhandled result type, returning empty array`);
        return res.json([]);
      }
      
      // Process the response to handle BigInt and Principal objects
      const processedTopics = processResponse(result);
      console.log(`[/api/topics] Successfully processed topics`);
      
      return res.json(processedTopics);
    } catch (error) {
      console.error('Error calling getTopics:', error);
      return res.status(500).json({
        error: 'Failed to get topics',
        details: error.message
      });
    }
  } catch (error) {
    console.error('Error in topics endpoint:', error);
    return res.status(500).json({
      error: 'Failed to process request',
      details: error.message
    });
  }
});

// Helper function to convert objects with BigInt to plain objects
function processResponse(response) {
  if (response === null || response === undefined) {
    return response;
  }
  
  if (typeof response === 'bigint') {
    return response.toString();
  }
  
  if (response && typeof response === 'object' && response.constructor && response.constructor.name === 'Principal') {
    return response.toString();
  }
  
  if (Array.isArray(response)) {
    return response.map(item => processResponse(item));
  }
  
  if (typeof response === 'object') {
    const result = {};
    for (const key in response) {
      result[key] = processResponse(response[key]);
    }
    return result;
  }
  
  return response;
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`IC Host: ${IC_HOST}`);
  console.log(`Consumer Canister ID: ${CONSUMER_CANISTER_ID}`);
  console.log(`Default Admin Canister ID: ${DEFAULT_ADMIN_CANISTER_ID}`);
});
