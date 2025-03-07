const express = require('express');
const cors = require('cors');
const { Actor, HttpAgent } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const fetch = require('node-fetch');
const { idlFactory: adminIdlFactory } = require('./declarations/admin');
const { idlFactory: consumerIdlFactory } = require('./declarations/consumer');

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

// Cache for actors
const actorCache = new Map();

// Create actor with proper caching
const createActor = (canisterId, idlFactory, type) => {
  console.log(`[createActor] Creating new ${type} actor for canister: ${canisterId}`);
  
  // Check if actor is already in cache
  const cacheKey = `${type}-${canisterId}`;
  if (actorCache.has(cacheKey)) {
    console.log(`[createActor] Using cached ${type} actor for canister: ${canisterId}`);
    return actorCache.get(cacheKey);
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
        console.warn(`[createActor] Unable to fetch root key. Error:`, err);
        console.warn(`[createActor] Proceeding without verification.`);
      });
    }
    
    // Create actor
    console.log(`[createActor] ${type} actor IDL factory:`, typeof idlFactory);
    const actor = Actor.createActor(idlFactory, {
      agent,
      canisterId
    });
    
    console.log(`[createActor] ${type} actor methods:`, Object.keys(actor).join(','));
    
    // Cache actor
    actorCache.set(cacheKey, actor);
    
    return actor;
  } catch (error) {
    console.error(`[createActor] Error creating ${type} actor:`, error);
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
  res.send('IC Proxy Server is running (New Architecture)');
});

// Get topics endpoint - now directly calling admin canister
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
      const adminActor = createActor(adminCanisterId, adminIdlFactory, 'admin');
      
      // Call getTopics method
      console.log(`[/api/topics] Calling getTopics() on admin actor...`);
      const response = await adminActor.getTopics();
      console.log(`[/api/topics] Response type:`, typeof response);
      
      // Handle variant response (ok or err)
      if (response && 'ok' in response) {
        // Map admin topics to consumer-compatible format
        const topics = response.ok.map(topic => ({
          id: topic.id,
          status: topic.status,
          name: topic.name,
          createdAt: topic.createdAt.toString(),
          description: topic.description,
          urlPatterns: topic.urlPatterns,
          scrapingInterval: 3600, // Default value
          maxRetries: 3, // Default value
          activeHours: { start: 0, end: 24 }, // Default value
          extractionRules: {
            fields: (topic.extractionRules && topic.extractionRules.fields) ? 
              topic.extractionRules.fields.map(field => ({
                name: field.name,
                aiPrompt: field.aiPrompt && field.aiPrompt.length > 0 ? field.aiPrompt[0] : "",
                required: field.required,
                fieldType: field.fieldType
              })) : [],
            customPrompt: (topic.extractionRules && topic.extractionRules.customPrompt && 
                         topic.extractionRules.customPrompt.length > 0) ? 
              topic.extractionRules.customPrompt[0] : ""
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
      } else if (response && 'err' in response) {
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
      console.error(`[/api/topics] Error calling admin canister:`, error);
      
      // Try fallback to consumer canister
      try {
        console.log(`[/api/topics] Falling back to consumer canister: ${CONSUMER_CANISTER_ID}`);
        const consumerActor = createActor(CONSUMER_CANISTER_ID, consumerIdlFactory, 'consumer');
        
        const response = await consumerActor.getTopics();
        
        if (response && 'ok' in response) {
          console.log(`[/api/topics] Successfully retrieved topics from consumer canister`);
          return res.json(response.ok);
        } else if (response && 'err' in response) {
          console.error(`[/api/topics] Error from consumer canister:`, response.err);
          return res.status(400).json({
            error: 'Error from consumer canister',
            details: response.err
          });
        } else {
          console.error(`[/api/topics] Unexpected response format from consumer canister:`, response);
          return res.status(500).json({
            error: 'Unexpected response format from consumer canister',
            details: JSON.stringify(response)
          });
        }
      } catch (consumerError) {
        console.error(`[/api/topics] Error calling consumer canister:`, consumerError);
        return res.status(500).json({
          error: 'Failed to get topics from both admin and consumer canisters',
          adminError: error.message,
          consumerError: consumerError.message
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

// Get profile endpoint - directly calling consumer canister
app.post('/api/profile', authenticateApiKey, async (req, res) => {
  try {
    const { principalId } = req.body;
    
    if (!principalId) {
      return res.status(400).json({ error: 'Principal ID is required' });
    }
    
    try {
      // Create consumer actor
      const consumerActor = createActor(CONSUMER_CANISTER_ID, consumerIdlFactory, 'consumer');
      
      // Call getProfile method
      console.log(`[/api/profile] Calling getProfile() on consumer actor...`);
      const response = await consumerActor.getProfile();
      
      // Handle variant response (ok or err)
      if (response && 'ok' in response) {
        // Map profile to expected format
        const profile = {
          id: principalId,
          name: "User", // Default name
          email: "", // Default email
          preferences: {
            theme: response.ok.preferences.theme || "light",
            notifications: response.ok.preferences.notificationsEnabled || false
          }
        };
        
        return res.json(profile);
      } else if (response && 'err' in response) {
        // Handle error response
        console.error(`[/api/profile] Error from consumer canister:`, response.err);
        
        // If profile not found, return a default profile
        if (response.err.NotFound) {
          const defaultProfile = {
            id: principalId,
            name: "New User",
            email: "",
            preferences: {
              theme: "light",
              notifications: true
            }
          };
          
          return res.json(defaultProfile);
        }
        
        return res.status(400).json({
          error: 'Error from consumer canister',
          details: response.err
        });
      } else {
        // Handle unexpected response format
        console.error(`[/api/profile] Unexpected response format:`, response);
        return res.status(500).json({
          error: 'Unexpected response format from consumer canister',
          details: JSON.stringify(response)
        });
      }
    } catch (error) {
      console.error(`[/api/profile] Error calling consumer canister:`, error);
      
      // Return a default profile as fallback
      const defaultProfile = {
        id: principalId,
        name: "Default User",
        email: "",
        preferences: {
          theme: "light",
          notifications: true
        }
      };
      
      return res.json(defaultProfile);
    }
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
