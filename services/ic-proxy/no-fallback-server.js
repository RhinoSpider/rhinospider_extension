const express = require('express');
const cors = require('cors');
const { Actor, HttpAgent } = require('@dfinity/agent');
const fetch = require('node-fetch');
const { idlFactory } = require('./declarations/admin');

// Configure environment variables
const PORT = process.env.PORT || 3001;
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 'tgyl5-yyaaa-aaaaj-az4wq-cai';
const DEFAULT_ADMIN_CANISTER_ID = process.env.DEFAULT_ADMIN_CANISTER_ID || '444wf-gyaaa-aaaaj-az5sq-cai';
const API_PASSWORD = process.env.API_PASSWORD || 'ffGpA2saNS47qr';

// Create Express app
const app = express();

// Configure middleware
app.use(cors());
app.use(express.json());

// Cache for admin actors
const adminActorCache = new Map();

// Create admin actor
const createAdminActor = (canisterId) => {
  console.log(`[createAdminActor] Creating new admin actor for canister: ${canisterId}`);
  
  // Check if actor is already in cache
  if (adminActorCache.has(canisterId)) {
    console.log(`[createAdminActor] Using cached admin actor for canister: ${canisterId}`);
    return adminActorCache.get(canisterId);
  }
  
  try {
    // Create agent
    const agent = new HttpAgent({
      host: IC_HOST,
      fetch
    });
    
    // Skip verification in non-production environments
    if (IC_HOST !== 'https://ic0.app') {
      agent.fetchRootKey().catch(err => {
        console.warn('[createAdminActor] Unable to fetch root key. Error:', err);
        console.warn('[createAdminActor] Proceeding without verification.');
      });
    }
    
    // Create actor
    console.log(`[createAdminActor] Admin actor IDL factory:`, typeof idlFactory);
    const actor = Actor.createActor(idlFactory, {
      agent,
      canisterId
    });
    
    console.log(`[createAdminActor] Admin actor methods:`, Object.keys(actor).join(','));
    
    // Cache actor
    adminActorCache.set(canisterId, actor);
    
    return actor;
  } catch (error) {
    console.error(`[createAdminActor] Error creating admin actor:`, error);
    throw error;
  }
};

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

// Root endpoint
app.get('/', (req, res) => {
  res.send('IC Proxy Server is running (No Fallback Version)');
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
    
    try {
      // Create admin actor
      const adminActor = createAdminActor(adminCanisterId);
      console.log(`[/api/topics] Calling getTopics on admin canister: ${adminCanisterId}`);
      
      // Call getTopics method
      console.log(`[/api/topics] Calling getTopics() on admin actor...`);
      const response = await adminActor.getTopics();
      console.log(`[/api/topics] Raw response from getTopics:`, JSON.stringify(response));
      
      // Check response format
      if (!response) {
        return res.status(500).json({ error: 'Empty response from admin canister' });
      }
      
      // Handle variant response (ok or err)
      if ('ok' in response) {
        // Map topics to expected format
        const topics = response.ok.map(topic => ({
          id: topic.id || 'unknown',
          status: topic.status || 'active',
          name: topic.name || 'Unnamed Topic',
          createdAt: (topic.createdAt || Date.now()).toString(),
          description: topic.description || '',
          urlPatterns: topic.urlPatterns || [],
          scrapingInterval: 3600, // Default value
          maxRetries: 3, // Default value
          activeHours: { start: 0, end: 24 }, // Default value
          extractionRules: {
            fields: (topic.extractionRules && topic.extractionRules.fields) ? 
              topic.extractionRules.fields.map(field => ({
                name: field.name || 'unknown',
                aiPrompt: field.aiPrompt || [],
                required: field.required || false,
                fieldType: field.fieldType || 'text'
              })) : [],
            customPrompt: (topic.extractionRules && topic.extractionRules.customPrompt) || []
          },
          aiConfig: {
            model: "gpt-3.5-turbo",
            apiKey: "",
            costLimits: {
              maxConcurrent: 5,
              maxDailyCost: 1.0,
              maxMonthlyCost: 20.0
            }
          }
        }));
        
        console.log(`[/api/topics] Returning ${topics.length} topics`);
        return res.json(topics);
      } else if ('err' in response) {
        // Handle error response
        console.error(`[/api/topics] Error from admin canister:`, response.err);
        return res.status(400).json({
          error: 'Error from admin canister',
          details: response.err
        });
      } else {
        // Handle unexpected response format
        console.error(`[/api/topics] Unexpected response format:`, response);
        return res.status(500).json({
          error: 'Unexpected response format from admin canister',
          details: JSON.stringify(response)
        });
      }
    } catch (error) {
      console.error(`[/api/topics] Error calling getTopics:`, error);
      
      // Try direct HTTP request as a last resort
      try {
        console.log(`[/api/topics] Making direct HTTP request to: ${IC_HOST}/api/v2/canister/${adminCanisterId}/query`);
        
        // Construct the request body
        const requestBody = {
          methodName: 'getTopics',
          canisterId: adminCanisterId,
          sender: principalId,
          arguments: []
        };
        
        // Make a direct HTTP request to the IC gateway
        const response = await fetch(`${IC_HOST}/api/v2/canister/${adminCanisterId}/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });
        
        // Check if the response is successful
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        // Parse the response
        const data = await response.json();
        console.log(`[/api/topics] Raw response from direct HTTP request:`, JSON.stringify(data));
        
        return res.status(500).json({
          error: 'Failed to get topics using actor, but direct HTTP request succeeded',
          details: 'See server logs for details',
          rawResponse: data
        });
      } catch (httpError) {
        console.error(`[/api/topics] Error in direct HTTP call:`, httpError);
        
        return res.status(500).json({
          error: 'Failed to get topics',
          details: error.message,
          directHttpError: httpError.message
        });
      }
    }
  } catch (error) {
    console.error('Error in topics endpoint:', error);
    return res.status(500).json({
      error: 'Failed to process request',
      details: error.message
    });
  }
});

// Get profile endpoint
app.post('/api/profile', authenticateApiKey, async (req, res) => {
  try {
    const { principalId } = req.body;
    
    if (!principalId) {
      return res.status(400).json({ error: 'Principal ID is required' });
    }
    
    // Return a hardcoded profile for now
    const hardcodedProfile = {
      id: principalId,
      name: "Test User",
      email: "test@example.com",
      preferences: {
        theme: "light",
        notifications: true
      }
    };
    
    return res.json(hardcodedProfile);
  } catch (error) {
    console.error('Error in profile endpoint:', error);
    return res.status(500).json({
      error: 'Failed to process request',
      details: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`IC Host: ${IC_HOST}`);
  console.log(`Consumer Canister ID: ${CONSUMER_CANISTER_ID}`);
  console.log(`Default Admin Canister ID: ${DEFAULT_ADMIN_CANISTER_ID}`);
});
