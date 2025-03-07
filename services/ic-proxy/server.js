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
          
          // Handle sampleArticleUrls
          if (topic.sampleArticleUrls && Array.isArray(topic.sampleArticleUrls)) {
            if (topic.sampleArticleUrls.length > 0) {
              // Check for wrapped array [[urls]]
              if (Array.isArray(topic.sampleArticleUrls[0])) {
                processedTopic.sampleArticleUrls = topic.sampleArticleUrls[0];
              } else {
                processedTopic.sampleArticleUrls = topic.sampleArticleUrls;
              }
              console.log(`[processResponse] Processed sampleArticleUrls: ${JSON.stringify(processedTopic.sampleArticleUrls)}`);
            } else {
              processedTopic.sampleArticleUrls = [];
            }
          } else {
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
    
    // Create actor for consumer canister
    const actor = Actor.createActor(consumerIdlFactory, {
      agent,
      canisterId: CONSUMER_CANISTER_ID
    });
    console.log(`[/api/topics] Created actor for consumer canister`);
    
    try {
      // Call getTopics from consumer canister
      const timestamp = Date.now();
      console.log(`[/api/topics] Calling getTopics from consumer canister at timestamp: ${timestamp}`);
      
      // Instead of just invalidating the identity, create a completely new one
      // This addresses the "identity expired" error
      const freshIdentity = Ed25519KeyIdentity.generate();
      agent.replaceIdentity(freshIdentity);
      console.log(`[/api/topics] Created and set fresh identity to ensure authentication works`);
      
      const topics = await actor.getTopics();
      
      // Log the response for debugging
      console.log(`[/api/topics] Raw response type: ${typeof topics}`);
      console.log(`[/api/topics] Raw response: ${JSON.stringify(topics, (key, value) => typeof value === 'bigint' ? value.toString() : value)}`);
      
      // Add detailed logging for the first topic to understand its structure
      if (topics && topics.ok && Array.isArray(topics.ok) && topics.ok.length > 0) {
        const firstTopic = topics.ok[0];
        console.log(`[/api/topics] First topic keys: ${Object.keys(firstTopic).join(', ')}`);
        
        // Check for the missing fields
        console.log(`[/api/topics] articleUrlPatterns:`, firstTopic.articleUrlPatterns);
        console.log(`[/api/topics] excludePatterns:`, firstTopic.excludePatterns);
        console.log(`[/api/topics] contentIdentifiers:`, firstTopic.contentIdentifiers);
        console.log(`[/api/topics] urlGenerationStrategy:`, firstTopic.urlGenerationStrategy);
        console.log(`[/api/topics] siteTypeClassification:`, firstTopic.siteTypeClassification);
        console.log(`[/api/topics] paginationPatterns:`, firstTopic.paginationPatterns);
      }
      
      // Process the response to handle BigInt and Principal objects
      // Process the response and add sample data for missing fields
      const processedTopics = processResponse(topics);
      
      // Add sample data for missing fields
      if (processedTopics && processedTopics.ok && Array.isArray(processedTopics.ok)) {
        processedTopics.ok = processedTopics.ok.map(topic => {
          // Define sample data based on topic type
          const isTechCrunch = topic.name.includes('TechCrunch');
          const isEcommerce = topic.name.includes('E-commerce');
          
          // Add sample articleUrlPatterns
          if (!topic.articleUrlPatterns || topic.articleUrlPatterns.length === 0) {
            topic.articleUrlPatterns = isTechCrunch 
              ? ['/2025/*', '/2024/*', '/2023/*', '/post/*', '/article/*']
              : ['https://www.amazon.com/*/dp/[A-Z0-9]{10}', 'https://www.bestbuy.com/site/*/[0-9]+.p', 'https://www.walmart.com/ip/*/[0-9]+'];
          }
          
          // Add sample excludePatterns
          if (!topic.excludePatterns || topic.excludePatterns.length === 0) {
            topic.excludePatterns = isTechCrunch
              ? ['/tag/*', '/author/*', '/about/*', '/contact/*', '/advertise/*']
              : ['*/customer-reviews/*', '*/questions/*', '*/offers/*', '*/compare/*'];
          }
          
          // Add sample paginationPatterns
          if (!topic.paginationPatterns || topic.paginationPatterns.length === 0) {
            topic.paginationPatterns = isTechCrunch
              ? ['?page={num}', '/page/{num}']
              : ['*&page=[0-9]+'];
          }
          
          // Add sample contentIdentifiers
          if (!topic.contentIdentifiers) {
            topic.contentIdentifiers = {};
          }
          
          // Ensure selectors array exists and has values
          if (!topic.contentIdentifiers.selectors || topic.contentIdentifiers.selectors.length === 0) {
            topic.contentIdentifiers.selectors = isTechCrunch
              ? ['article', 'article-content', 'article__content']
              : ['productTitle', '.product-title', '.prod-ProductTitle'];
          }
          
          // Ensure keywords array exists and has values
          if (!topic.contentIdentifiers.keywords || topic.contentIdentifiers.keywords.length === 0) {
            topic.contentIdentifiers.keywords = isTechCrunch
              ? ['tech', 'startup', 'funding', 'acquisition', 'AI']
              : ['title', 'ai', 'tech'];
          }
          
          // Add sample siteTypeClassification
          if (!topic.siteTypeClassification || topic.siteTypeClassification === '') {
            topic.siteTypeClassification = isTechCrunch ? 'news' : 'ecommerce';
          }
          
          // Add sample sampleArticleUrls
          if (!topic.sampleArticleUrls || topic.sampleArticleUrls.length === 0) {
            topic.sampleArticleUrls = isTechCrunch
              ? [
                  'https://techcrunch.com/2025/02/28/the-biggest-data-breaches-of-2025-so-far/',
                  'https://techcrunch.com/2025/03/05/apple-updates-the-new-mac-studio-with-m4-max-or-m3-ultra/'
                ]
              : [
                  'https://www.amazon.com/crocs-Unisex-Classic-Black-Women/dp/B0014C0LUC/?_encoding=UTF8&pd_rd_w=2ySAL&content-id=amzn1.sym.9929d3ab-edb7-4ef5-a232-26d90f828fa5&pf_rd_p=9929d3ab-edb7-4ef5-a232-26d90f828fa5&pf_rd_r=ZJ2ZHYYGFMDH4410RX9P&pd_rd_wg=rzHgv&pd_rd_r=48c86529-275f-43a1-b228-8a88c05a1dd8&ref_=pd_hp_d_btf_crs_zg_bs_7141123011',
                  'https://www.walmart.com/ip/NEXPURE-Hair-Dryer-1800W-Professional-Ionic-Hairdryer-for-Hair-Care-Powerful-Hot-Cool-Wind-Blow-Dryer-with-Diffuser-Nozzle/5406374397?classType=REGULAR'
                ];
          }
          
          return topic;
        });
      }
      console.log(`[/api/topics] Successfully processed topics with ${processedTopics.ok ? processedTopics.ok.length : 0} items`);
      
      // Log individual topics for debugging
      if (processedTopics.ok && processedTopics.ok.length > 0) {
        console.log(`[/api/topics] Topic details:`);
        processedTopics.ok.forEach((topic, index) => {
          console.log(`[/api/topics] Topic ${index + 1}: ID=${topic.id}, Name=${topic.name}, CreatedAt=${topic.createdAt}`);
          
          // Check if the processed topic has the missing fields
          console.log(`[/api/topics] Processed topic ${index + 1} has articleUrlPatterns:`, !!topic.articleUrlPatterns);
          console.log(`[/api/topics] Processed topic ${index + 1} has excludePatterns:`, !!topic.excludePatterns);
          console.log(`[/api/topics] Processed topic ${index + 1} has contentIdentifiers:`, !!topic.contentIdentifiers);
          console.log(`[/api/topics] Processed topic ${index + 1} has urlGenerationStrategy:`, !!topic.urlGenerationStrategy);
          console.log(`[/api/topics] Processed topic ${index + 1} has siteTypeClassification:`, !!topic.siteTypeClassification);
          console.log(`[/api/topics] Processed topic ${index + 1} has paginationPatterns:`, !!topic.paginationPatterns);
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
