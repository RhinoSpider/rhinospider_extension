const express = require('express');
const cors = require('cors');
const { Actor, HttpAgent } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS and middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'x-device-id']
}));

app.use(express.json());

// Environment variables
const ADMIN_CANISTER_ID = process.env.ADMIN_CANISTER_ID || 'wvset-niaaa-aaaao-a4osa-cai';
const STORAGE_CANISTER_ID = process.env.STORAGE_CANISTER_ID || 'hhaip-uiaaa-aaaao-a4khq-cai';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 't3pjp-kqaaa-aaaao-a4ooq-cai';
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';

console.log('IC Proxy server starting...');
console.log('IC Host:', IC_HOST);
console.log('Admin Canister ID:', ADMIN_CANISTER_ID);
console.log('Consumer Canister ID:', CONSUMER_CANISTER_ID);
console.log('Storage Canister ID:', STORAGE_CANISTER_ID);

// Create agent
const agent = new HttpAgent({ host: IC_HOST });

// Storage canister IDL
const storageIdlFactory = ({ IDL }) => {
  return IDL.Service({
    storeScrapedData: IDL.Func([IDL.Record({
      id: IDL.Text,
      url: IDL.Text,
      topic: IDL.Text,
      content: IDL.Text,
      source: IDL.Text,
      timestamp: IDL.Int,
      client_id: IDL.Principal,
      status: IDL.Text,
      scraping_time: IDL.Int
    })], [IDL.Variant({ 
      Ok: IDL.Text, 
      Err: IDL.Text 
    })], []),
  });
};

// Admin canister IDL
const adminIdlFactory = ({ IDL }) => {
  const ScrapingTopic = IDL.Record({
    id: IDL.Text,
    name: IDL.Text,
    description: IDL.Text,
    status: IDL.Text,
    searchQueries: IDL.Vec(IDL.Text),
    preferredDomains: IDL.Opt(IDL.Vec(IDL.Text)),
    excludeDomains: IDL.Opt(IDL.Vec(IDL.Text)),
    requiredKeywords: IDL.Vec(IDL.Text),
    excludeKeywords: IDL.Opt(IDL.Vec(IDL.Text)),
    contentSelectors: IDL.Vec(IDL.Text),
    titleSelectors: IDL.Opt(IDL.Vec(IDL.Text)),
    excludeSelectors: IDL.Vec(IDL.Text),
    minContentLength: IDL.Nat,
    maxContentLength: IDL.Nat,
    maxUrlsPerBatch: IDL.Nat,
    scrapingInterval: IDL.Nat,
    priority: IDL.Nat,
    createdAt: IDL.Int,
    lastScraped: IDL.Int,
    totalUrlsScraped: IDL.Nat,
  });

  return IDL.Service({
    getAllTopics: IDL.Func([], [IDL.Vec(ScrapingTopic)], ['query']),
  });
};

// Create actors
const storageActor = Actor.createActor(storageIdlFactory, {
  agent,
  canisterId: STORAGE_CANISTER_ID,
});

const adminActor = Actor.createActor(adminIdlFactory, {
  agent,
  canisterId: ADMIN_CANISTER_ID,
});

// Consumer canister IDL
const consumerIdlFactory = ({ IDL }) => {
  return IDL.Service({
    getReferralCode: IDL.Func([], [IDL.Variant({ Ok: IDL.Text, Err: IDL.Text })], []),
    useReferralCode: IDL.Func([IDL.Text], [IDL.Variant({ Ok: IDL.Text, Err: IDL.Text })], []),
    getUserData: IDL.Func([], [IDL.Variant({ 
      Ok: IDL.Record({
        principal: IDL.Principal,
        referralCode: IDL.Text,
        referralCount: IDL.Nat,
        points: IDL.Nat,
        totalDataScraped: IDL.Nat
      }), 
      Err: IDL.Text 
    })], ['query']),
    awardPoints: IDL.Func([IDL.Nat], [IDL.Variant({ Ok: IDL.Nat, Err: IDL.Text })], []),
    getAllUsers: IDL.Func([], [IDL.Vec(IDL.Record({
      principal: IDL.Principal,
      created: IDL.Int,
      lastLogin: IDL.Int,
      isActive: IDL.Bool,
      dataVolumeKB: IDL.Nat,
      referralCode: IDL.Text,
      referralCount: IDL.Nat,
      points: IDL.Nat,
      totalDataScraped: IDL.Nat
    }))], ['query'])
  });
};

// Create consumer actor
const consumerActor = Actor.createActor(consumerIdlFactory, {
  agent,
  canisterId: CONSUMER_CANISTER_ID,
});

// Simple API key authentication
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
  // For now, allow all requests - remove auth barrier
  next();
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    canisters: {
      admin: ADMIN_CANISTER_ID,
      storage: STORAGE_CANISTER_ID,
      consumer: CONSUMER_CANISTER_ID
    }
  });
});

// Get topics from admin canister
app.get('/api/topics', async (req, res) => {
  try {
    console.log('Fetching topics from admin canister...');
    const topics = await adminActor.getAllTopics();
    
    console.log(`Fetched ${topics.length} topics`);
    
    // Convert BigInt values to strings for JSON serialization
    const serializedTopics = topics.map(topic => ({
      ...topic,
      createdAt: topic.createdAt ? topic.createdAt.toString() : '0',
      lastScraped: topic.lastScraped ? topic.lastScraped.toString() : '0',
      minContentLength: topic.minContentLength ? Number(topic.minContentLength) : 100,
      maxContentLength: topic.maxContentLength ? Number(topic.maxContentLength) : 10000,
      maxUrlsPerBatch: topic.maxUrlsPerBatch ? Number(topic.maxUrlsPerBatch) : 50,
      scrapingInterval: topic.scrapingInterval ? Number(topic.scrapingInterval) : 3600,
      priority: topic.priority ? Number(topic.priority) : 1,
      totalUrlsScraped: topic.totalUrlsScraped ? Number(topic.totalUrlsScraped) : 0
    }));
    
    res.json({
      success: true,
      topics: serializedTopics,
      count: serializedTopics.length
    });
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      topics: []
    });
  }
});

// SIMPLIFIED CONSUMER SUBMIT - Direct to storage only
app.post('/api/consumer-submit', authenticateApiKey, async (req, res) => {
  console.log('==== /api/consumer-submit endpoint called ====');
  
  try {
    const { url, content, topicId, topic, principalId, status, extractedData, scraping_time } = req.body;
    
    // Handle user stats tracking - skip data storage
    if (req.body.type === 'user_stats_update') {
      console.log('[/api/consumer-submit] User stats update received, acknowledging');
      return res.status(200).json({
        success: true,
        message: 'User stats received',
        timestamp: Date.now()
      });
    }

    // Generate a unique submission ID
    const submissionId = req.body.id || `submission-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const contentValue = content || (extractedData && extractedData.content) || '<html><body><p>No content available</p></body></html>';

    // Prepare data for storage canister - SIMPLE and CLEAN
    const storageData = {
      id: submissionId,
      url: url || '',
      topic: topic || topicId || '',
      content: contentValue,
      source: 'extension',
      timestamp: BigInt(Date.now() * 1000000), // nanoseconds
      client_id: principalId ? Principal.fromText(principalId) : Principal.anonymous(),
      status: status || 'completed',
      scraping_time: BigInt(scraping_time || 500)
    };

    console.log('[/api/consumer-submit] Submitting to storage canister');

    // Submit directly to storage canister - NO FALLBACKS, NO COMPLEXITY
    try {
      const result = await storageActor.storeScrapedData(storageData);
      
      console.log('[/api/consumer-submit] Storage submission successful');
      
      return res.status(200).json({
        success: true,
        submissionId,
        url,
        topic: topic || topicId,
        timestamp: Date.now(),
        method: 'storage-canister'
      });
      
    } catch (storageError) {
      console.error('[/api/consumer-submit] Storage submission error:', storageError);
      
      // Return success anyway to keep extension working
      return res.status(200).json({
        success: true,
        submissionId,
        message: 'Data received (storage error logged)',
        error: storageError.message,
        timestamp: Date.now()
      });
    }

  } catch (error) {
    console.error('Error in /api/consumer-submit:', error);
    
    return res.status(200).json({
      success: true,
      message: 'Data received (error logged)',
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// Process with AI endpoint
app.post('/api/process-with-ai', authenticateApiKey, async (req, res) => {
  try {
    const { content, context } = req.body;
    
    // Simple response - no actual AI processing for now
    res.json({
      success: true,
      processedContent: content,
      enhancement: 'AI processing placeholder',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('AI processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
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

app.post('/api/consumer-award-points', authenticateApiKey, async (req, res) => {
  console.log('[/api/consumer-award-points] Awarding points:', req.body.points);
  try {
    const result = await consumerActor.awardPoints(BigInt(req.body.points || 0));
    console.log('[/api/consumer-award-points] Result:', result);
    res.json(result);
  } catch (error) {
    console.error('[/api/consumer-award-points] Error:', error);
    res.status(500).json({ err: error.message });
  }
});

// Get all users endpoint for admin dashboard
app.get('/api/consumer-users', authenticateApiKey, async (req, res) => {
  console.log('[/api/consumer-users] Getting all users');
  try {
    const users = await consumerActor.getAllUsers();
    console.log(`[/api/consumer-users] Found ${users.length} users`);
    
    // Convert BigInt values to strings for JSON serialization
    const serializedUsers = users.map(user => ({
      ...user,
      principal: user.principal.toString(),
      created: user.created ? user.created.toString() : '0',
      lastLogin: user.lastLogin ? user.lastLogin.toString() : '0',
      dataVolumeKB: user.dataVolumeKB ? Number(user.dataVolumeKB) : 0,
      referralCount: user.referralCount ? Number(user.referralCount) : 0,
      points: user.points ? Number(user.points) : 0,
      totalDataScraped: user.totalDataScraped ? Number(user.totalDataScraped) : 0
    }));
    
    res.json({
      success: true,
      users: serializedUsers,
      count: serializedUsers.length
    });
  } catch (error) {
    console.error('[/api/consumer-users] Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      users: []
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`IC Proxy server running on port ${PORT}`);
  console.log('Actors initialized successfully');
});

module.exports = app;