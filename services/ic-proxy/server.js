require('./bigint-patch');
const { convertToPlainObject } = require('./bigint-patch');

if (typeof BigInt.prototype.toJSON !== 'function') {
  BigInt.prototype.toJSON = function() { return this.toString(); };
}

const express = require('express');
const cors = require('cors');
const { Actor, HttpAgent } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const { Ed25519KeyIdentity } = require('@dfinity/identity');
const { idlFactory: consumerIdlFactory } = require('./declarations/consumer/consumer.did.js');
const { idlFactory: adminIdlFactory } = require('./declarations/admin/admin.did.js');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

// Environment variables
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 'tgyl5-yyaaa-aaaaj-az4wq-cai';
const ADMIN_CANISTER_ID = process.env.ADMIN_CANISTER_ID || '444wf-gyaaa-aaaaj-az5sq-cai';
const PORT = process.env.PORT || 3001;
const API_PASSWORD = process.env.API_PASSWORD || 'ffGpA2saNS47qr';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware
const authenticateApiKey = (req, res, next) => {
  // Skip authentication for health check endpoint
  if (req.path === '/health') {
    return next();
  }
  
  // Get authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header is required' });
  }
  
  // Check if the header is in the correct format
  const [type, token] = authHeader.split(' ');
  
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Invalid authorization format. Use Bearer token' });
  }
  
  // Verify the token
  if (token !== API_PASSWORD) {
    return res.status(401).json({ error: 'Invalid API password' });
  }
  
  // If we get here, the request is authenticated
  next();
};

// Create agent with proper configuration
const createAgent = () => {
  return new HttpAgent({
    host: IC_HOST,
    fetch: fetch,
    verifyQuerySignatures: false,
    fetchRootKey: true,
    disableHandshake: true,
  });
};

// Create actor
const createActor = (idlFactory, canisterId, agent) => {
  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
  });
};

// Initialize agent and actor
let agent;
let consumerActor;

const initializeActors = async () => {
  try {
    agent = createAgent();
    
    if (!consumerIdlFactory) {
      console.error('IDL factory not available - please provide it manually');
      return false;
    }
    
    consumerActor = createActor(consumerIdlFactory, CONSUMER_CANISTER_ID, agent);
    console.log('Consumer actor initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing actors:', error);
    return false;
  }
};

// Initialize on startup
initializeActors().then(success => {
  if (success) {
    console.log('Actors initialized successfully');
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  // Allow CORS for health check
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

app.post('/api/topics', authenticateApiKey, async (req, res) => {
  try {
    const { principalId } = req.body;
    
    if (!principalId) {
      return res.status(400).json({ error: 'Principal ID is required' });
    }
    
    console.log(`[/api/topics] Getting topics for principal: ${principalId}`);
    console.log(`[/api/topics] Using consumer canister ID: ${CONSUMER_CANISTER_ID}`);
    console.log(`[/api/topics] Using admin canister ID: ${ADMIN_CANISTER_ID}`);
    console.log(`[/api/topics] Using IC host: ${IC_HOST}`);
    
    // Create identity from principal
    const identity = createIdentityFromPrincipal(principalId);
    console.log(`[/api/topics] Created identity from principal`);
    
    // Create agent
    const agent = new HttpAgent({
      host: IC_HOST,
      identity,
      fetchRootKey: true
    });
    console.log(`[/api/topics] Created HTTP agent with fetchRootKey: true`);
    
    // Create actor
    const actor = Actor.createActor(consumerIdlFactory, {
      agent,
      canisterId: CONSUMER_CANISTER_ID
    });
    console.log(`[/api/topics] Created actor for consumer canister`);
    
    try {
      // Call getTopics with timestamp to avoid any caching
      const timestamp = Date.now();
      console.log(`[/api/topics] Calling getTopics for principal: ${principalId} at timestamp: ${timestamp}`);
      
      // Force a fresh call by invalidating any potential cache
      agent.invalidateIdentity();
      console.log(`[/api/topics] Invalidated identity to ensure fresh call`);
      
      const topics = await actor.getTopics();
      
      // Log the response for debugging
      console.log(`[/api/topics] Raw response type: ${typeof topics}`);
      console.log(`[/api/topics] Raw response: ${JSON.stringify(topics, (key, value) => typeof value === 'bigint' ? value.toString() : value)}`);
      
      // Process the response to handle BigInt and Principal objects
      const processedTopics = processResponse(topics);
      console.log(`[/api/topics] Successfully processed topics with ${processedTopics.ok ? processedTopics.ok.length : 0} items`);
      
      // Log individual topics for debugging
      if (processedTopics.ok && processedTopics.ok.length > 0) {
        console.log(`[/api/topics] Topic details:`);
        processedTopics.ok.forEach((topic, index) => {
          console.log(`[/api/topics] Topic ${index + 1}: ID=${topic.id}, Name=${topic.name}, CreatedAt=${topic.createdAt}`);
        });
      }
      
      return res.json(processedTopics);
    } catch (error) {
      console.error('[/api/topics] Error calling getTopics:', error);
      console.error('[/api/topics] Error stack:', error.stack);
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

// Note: convertToPlainObject is imported from bigint-patch.js

// Submit scraped data endpoint
app.post('/api/submit', authenticateApiKey, async (req, res) => {
  try {
    const { principalId, url, content, topicId } = req.body;
    
    if (!principalId || !url || !content || !topicId) {
      return res.status(400).json({ error: 'Principal ID, URL, content, and topic ID are required' });
    }
    
    console.log(`[/api/submit] Submitting scraped data for principal: ${principalId}`);
    
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
      
      // Create scraped data object
      const scrapedData = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
        url,
        status: 'new',
        topic: topicId,
        content,
        source: 'extension',
        timestamp: Math.floor(Date.now() / 1000),
        client_id: Principal.fromText(principalId),
        scraping_time: 0
      };
      
      // Call submitScrapedData
      console.log(`[/api/submit] Calling submitScrapedData for principal: ${principalId}`);
      const result = await actor.submitScrapedData(scrapedData);
      console.log(`[/api/submit] Raw submit result:`, JSON.stringify(result));
      
      // Process the result to handle BigInt and Principal objects
      const processedResult = replaceBigInt(result);
      console.log(`[/api/submit] Processed result:`, safeStringify(processedResult));
      
      return res.json(processedResult);
    } catch (error) {
      console.error('Error calling submitScrapedData:', error);
      
      // Check if it's a NotAuthorized error
      if (error.message && error.message.includes('NotAuthorized')) {
        return res.status(401).json({
          error: 'Not authorized to submit scraped data',
          details: error.message
        });
      }
      
      return res.status(500).json({
        error: 'Failed to submit scraped data',
        details: error.message
      });
    }
  } catch (error) {
    console.error('Unexpected error in /api/submit:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

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

// Start the server
app.listen(PORT, () => {
  console.log(`IC Proxy server running on port ${PORT}`);
});
