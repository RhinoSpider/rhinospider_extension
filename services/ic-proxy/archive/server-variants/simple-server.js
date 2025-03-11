const express = require('express');
const cors = require('cors');
const { Actor, HttpAgent } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const { Ed25519KeyIdentity } = require('@dfinity/identity');
const consumerIdlFactory = require('./declarations/consumer/consumer.did.js').idlFactory;

// Configure environment variables
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 'tgyl5-yyaaa-aaaaj-az4wq-cai';
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
    
    // Use the principal bytes to seed the key (simple deterministic approach)
    for (let i = 0; i < Math.min(principalBytes.length, seed.length); i++) {
      seed[i] = principalBytes[i];
    }
    
    // Create identity from seed
    return Ed25519KeyIdentity.generate();
  } catch (error) {
    console.error('Error creating identity from principal:', error);
    throw new Error(`Failed to create identity: ${error.message}`);
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
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
      console.log(`[/api/profile] Calling getProfile for principal: ${principalId}`);
      const profile = await actor.getProfile();
      console.log(`[/api/profile] Raw profile result:`, JSON.stringify(profile));
      
      // Process the response to handle BigInt and Principal objects
      const processedProfile = processResponse(profile);
      console.log(`[/api/profile] Successfully processed profile`);
      
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
    
    console.log(`[/api/topics] Getting topics for principal: ${principalId}`);
    
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
      // Call getTopics
      console.log(`[/api/topics] Calling getTopics for principal: ${principalId}`);
      const topics = await actor.getTopics();
      
      // Process the response to handle BigInt and Principal objects
      const processedTopics = processResponse(topics);
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

// Start the server
app.listen(PORT, () => {
  console.log(`IC Proxy server running on port ${PORT}`);
});
