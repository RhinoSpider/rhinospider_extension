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
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

// Environment variables
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 'tgyl5-yyaaa-aaaaj-az4wq-cai';
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
app.get('/health', (req, res) => {
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
      
      // Check if profile.principal exists and log its type
      if (profile && profile.principal) {
        console.log(`[/api/profile] Principal type: ${typeof profile.principal}`);
        console.log(`[/api/profile] Principal constructor: ${profile.principal.constructor ? profile.principal.constructor.name : 'No constructor'}`);
        if (typeof profile.principal === 'object') {
          console.log(`[/api/profile] Principal toString result: ${profile.principal.toString()}`);
          console.log(`[/api/profile] Principal keys: ${Object.keys(profile.principal).join(', ')}`);
        }
      }
      
      // Process the profile to handle BigInt and Principal objects
      const processedProfile = replaceBigInt(profile);
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
    
    // Call getTopics
    console.log(`[/api/topics] Calling getTopics for principal: ${principalId}`);
    
    try {
      const result = await actor.getTopics();
      console.log(`[/api/topics] Raw result type:`, typeof result);
      
      // Send an empty array as a fallback
      if (!result) {
        console.log(`[/api/topics] No topics found, returning empty array`);
        return res.json([]);
      }
      
      // Handle the case where result is an object with 'ok' property
      if (result && typeof result === 'object' && 'ok' in result) {
        const okValue = result.ok;
        
        // If ok is an array, convert each item
        if (Array.isArray(okValue)) {
          const processedArray = okValue.map(item => {
            const processed = {};
            
            // Process each property in the item
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
        
        // If ok is not an array, just return it
        console.log(`[/api/topics] Result ok is not an array, returning as is`);
        return res.json(okValue);
      }
      
      // If result is an array, convert each item
      if (Array.isArray(result)) {
        const processedArray = result.map(item => {
          const processed = {};
          
          // Process each property in the item
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
      
    } catch (error) {
      console.error(`Error calling getTopics:`, error);
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
function convertToPlainObject(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Handle BigInt
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  // Handle Principal objects
  if (obj && typeof obj === 'object' && typeof obj.toString === 'function' && 
      ((obj.constructor && obj.constructor.name === 'Principal') || 
       (Object.prototype.toString.call(obj) === '[object Object]' && '_arr' in obj))) {
    return obj.toString();
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => convertToPlainObject(item));
  }
  
  // Handle objects
  if (typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      result[key] = convertToPlainObject(obj[key]);
    }
    return result;
  }
  
  return obj;
}

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

// Start the server
app.listen(PORT, () => {
  console.log(`IC Proxy server running on port ${PORT}`);
});

// Helper function to create identity from principal
const createIdentityFromPrincipal = (principalId) => {
  const principal = Principal.fromText(principalId);
  const identity = Ed25519KeyIdentity.generate();
  return identity;
};
