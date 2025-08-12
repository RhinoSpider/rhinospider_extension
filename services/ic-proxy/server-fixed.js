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

// Load dotenv first
require('dotenv').config();

// Environment variables with correct defaults
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

// Storage canister IDL - EXACT match to deployed canister
const storageIdlFactory = ({ IDL }) => {
  const Error = IDL.Variant({
    'NotFound': IDL.Null,
    'AlreadyExists': IDL.Null,
    'NotAuthorized': IDL.Null,
    'InvalidInput': IDL.Text,
    'SystemError': IDL.Text
  });
  
  const Result = IDL.Variant({
    'ok': IDL.Null,
    'err': Error
  });
  
  const ScrapedData = IDL.Record({
    'client_id': IDL.Principal,
    'content': IDL.Text,
    'id': IDL.Text,
    'scraping_time': IDL.Int,
    'source': IDL.Text,
    'status': IDL.Text,
    'timestamp': IDL.Int,
    'topic': IDL.Text,
    'url': IDL.Text
  });
  
  return IDL.Service({
    'storeScrapedData': IDL.Func([ScrapedData], [Result], [])
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
    geolocationFilter: IDL.Opt(IDL.Text),
    percentageNodes: IDL.Opt(IDL.Nat),
    randomizationMode: IDL.Opt(IDL.Text),
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

// Consumer canister IDL - Fixed to match deployed canister
const consumerIdlFactory = ({ IDL }) => {
  // Define Result types using lowercase 'ok' and 'err' to match Motoko
  const ResultText = IDL.Variant({ ok: IDL.Text, err: IDL.Text });
  const ResultNat = IDL.Variant({ ok: IDL.Nat, err: IDL.Text });
  
  const UserProfile = IDL.Record({
    principal: IDL.Principal,
    devices: IDL.Vec(IDL.Text),
    created: IDL.Int,
    lastLogin: IDL.Int,
    ipAddress: IDL.Opt(IDL.Text),
    country: IDL.Opt(IDL.Text),
    region: IDL.Opt(IDL.Text),
    city: IDL.Opt(IDL.Text),
    latitude: IDL.Opt(IDL.Float64),
    longitude: IDL.Opt(IDL.Float64),
    lastActive: IDL.Int,
    isActive: IDL.Bool,
    dataVolumeKB: IDL.Nat,
    referralCode: IDL.Text,
    referralCount: IDL.Nat,
    points: IDL.Nat,
    totalDataScraped: IDL.Nat,
    referredBy: IDL.Opt(IDL.Principal),
    scrapedUrls: IDL.Vec(IDL.Text),
    preferences: IDL.Record({
      notificationsEnabled: IDL.Bool,
      theme: IDL.Text
    })
  });
  
  const ResultUserProfile = IDL.Variant({ 
    ok: UserProfile,
    err: IDL.Text 
  });
  
  const ResultUnit = IDL.Variant({
    ok: IDL.Null,
    err: IDL.Text
  });

  const ScrapedData = IDL.Record({
    id: IDL.Text,
    url: IDL.Text,
    topic: IDL.Text,
    content: IDL.Text,
    source: IDL.Text,
    timestamp: IDL.Int,
    client_id: IDL.Principal,
    status: IDL.Text,
    scraping_time: IDL.Int
  });
  
  return IDL.Service({
    getReferralCode: IDL.Func([], [ResultText], []),
    useReferralCode: IDL.Func([IDL.Text], [ResultText], []),
    getUserData: IDL.Func([], [ResultUserProfile], []),
    getProfile: IDL.Func([], [ResultUserProfile], []),
    updateUserLogin: IDL.Func([IDL.Text], [ResultUnit], []),
    getAllUsers: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, UserProfile))], ['query']),
    submitScrapedData: IDL.Func([ScrapedData], [ResultUnit], [])
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

// Get topics from admin canister (supports both GET and POST)
// POST version accepts nodeCharacteristics for geo-distribution filtering
app.post('/api/topics', async (req, res) => {
  try {
    const { nodeCharacteristics } = req.body;
    console.log('Fetching topics with node characteristics:', nodeCharacteristics);
    
    // Fetch all topics from admin canister
    const allTopics = await adminActor.getAllTopics();
    console.log(`Fetched ${allTopics.length} total topics`);
    
    // Filter topics based on node characteristics
    let filteredTopics = allTopics;
    
    if (nodeCharacteristics) {
      const { ipAddress, region } = nodeCharacteristics;
      
      // Filter based on geo-distribution settings
      filteredTopics = allTopics.filter(topic => {
        // Handle optional arrays from Motoko - geolocationFilter might be [value] or []
        const geoFilter = (topic.geolocationFilter && topic.geolocationFilter.length > 0) 
          ? topic.geolocationFilter[0] 
          : null;
          
        // If no geolocationFilter is set, topic is available globally
        if (!geoFilter || geoFilter === '') {
          return true;
        }
        
        // Check if node's location matches the topic's geolocation filter
        // For now, this is a simple check - can be enhanced with actual geo-IP lookup
        const allowedLocations = geoFilter.split(',').map(loc => loc.trim().toUpperCase());
        
        // TODO: Implement actual geo-IP lookup to determine country/region from IP
        // For now, accept all if we can't determine location
        if (ipAddress === 'unknown' || region === 'unknown') {
          return true; // Allow unknown locations for now
        }
        
        return allowedLocations.includes(region.toUpperCase());
      });
      
      // Apply percentage-based filtering if needed
      filteredTopics = filteredTopics.filter(topic => {
        // Handle optional arrays from Motoko
        const percentage = (topic.percentageNodes && topic.percentageNodes.length > 0) 
          ? Number(topic.percentageNodes[0]) 
          : 100;
        const randomizationMode = (topic.randomizationMode && topic.randomizationMode.length > 0)
          ? topic.randomizationMode[0]
          : 'none';
          
        if (percentage >= 100) {
          return true; // All nodes should process this
        }
        
        // Apply randomization based on the mode
        if (randomizationMode === 'random') {
          // Random selection based on percentage
          return Math.random() * 100 < percentage;
        } else if (randomizationMode === 'round_robin') {
          // TODO: Implement round-robin selection (needs state management)
          return true;
        } else if (randomizationMode === 'weighted') {
          // TODO: Implement weighted selection based on node performance
          return true;
        }
        
        return true; // Default to including the topic
      });
      
      console.log(`Filtered to ${filteredTopics.length} topics based on node characteristics`);
    }
    
    // Convert BigInt values to strings for JSON serialization
    const serializedTopics = filteredTopics.map(topic => ({
      ...topic,
      createdAt: topic.createdAt ? topic.createdAt.toString() : '0',
      lastScraped: topic.lastScraped ? topic.lastScraped.toString() : '0',
      minContentLength: topic.minContentLength ? Number(topic.minContentLength) : 100,
      maxContentLength: topic.maxContentLength ? Number(topic.maxContentLength) : 10000,
      maxUrlsPerBatch: topic.maxUrlsPerBatch ? Number(topic.maxUrlsPerBatch) : 50,
      scrapingInterval: topic.scrapingInterval ? Number(topic.scrapingInterval) : 3600,
      priority: topic.priority ? Number(topic.priority) : 1,
      totalUrlsScraped: topic.totalUrlsScraped ? Number(topic.totalUrlsScraped) : 0,
      // Include geo-distribution settings in response - handle optional arrays from Motoko
      geolocationFilter: (topic.geolocationFilter && topic.geolocationFilter.length > 0) ? topic.geolocationFilter[0] : '',
      percentageNodes: (topic.percentageNodes && topic.percentageNodes.length > 0) ? Number(topic.percentageNodes[0]) : 100,
      randomizationMode: (topic.randomizationMode && topic.randomizationMode.length > 0) ? topic.randomizationMode[0] : 'none'
    }));
    
    res.json({
      success: true,
      topics: serializedTopics,
      count: serializedTopics.length,
      nodeCharacteristics: nodeCharacteristics || {}
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

// Keep the GET endpoint for backward compatibility
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

// CONSUMER SUBMIT - Submit to both storage and consumer canisters
app.post('/api/consumer-submit', authenticateApiKey, async (req, res) => {
  console.log('==== /api/consumer-submit endpoint called ====');
  
  try {
    const { id, url, content, topic, topicId, client_id, principalId, status, extractedData, scraping_time, timestamp } = req.body;
    
    // Handle user stats tracking - skip data storage
    if (req.body.type === 'user_stats_update') {
      console.log('[/api/consumer-submit] User stats update received, acknowledging');
      return res.status(200).json({
        success: true,
        message: 'User stats received',
        timestamp: Date.now()
      });
    }

    // Use the provided ID or generate one
    const submissionId = id || `submission-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const contentValue = content || (extractedData && extractedData.content) || '<html><body><p>No content available</p></body></html>';

    // Use client_id or fallback to principalId 
    const clientPrincipal = client_id || principalId;

    // Prepare data for storage canister - SIMPLE and CLEAN
    const storageData = {
      id: submissionId,
      url: url || '',
      topic: topic || topicId || '',
      content: contentValue,
      source: 'extension',
      timestamp: Number(timestamp || Math.floor(Date.now() / 1000)), // Use seconds timestamp as Int
      client_id: clientPrincipal ? Principal.fromText(clientPrincipal) : Principal.anonymous(),
      status: status || 'completed',
      scraping_time: Number(scraping_time || 500) // Use Int not BigInt
    };

    // Prepare data for consumer canister (for points tracking)
    const consumerData = {
      id: submissionId,
      url: url || '',
      topic: topic || topicId || '',
      content: contentValue,
      source: 'extension',
      timestamp: BigInt(Date.now() * 1000000), // Nanoseconds for consumer
      client_id: clientPrincipal ? Principal.fromText(clientPrincipal) : Principal.anonymous(),
      status: status || 'completed',
      scraping_time: BigInt(scraping_time || 500)
    };

    console.log('[/api/consumer-submit] Submitting to both storage and consumer canisters');
    console.log('[DEBUG] Storage data structure:', JSON.stringify(storageData, (key, value) => 
      typeof value === 'bigint' ? value.toString() + 'n' : 
      (value && typeof value === 'object' && value.constructor?.name === 'Principal') ? value.toString() : value
    ));

    // Submit to BOTH canisters in parallel
    const [storageResult, consumerResult] = await Promise.allSettled([
      storageActor.storeScrapedData(storageData),
      consumerActor.submitScrapedData(consumerData)
    ]);

    console.log('[/api/consumer-submit] Storage submission result:', storageResult);
    console.log('[/api/consumer-submit] Consumer submission result:', consumerResult);

    // Check results
    const storageSuccess = storageResult.status === 'fulfilled' && storageResult.value?.ok !== undefined;
    const consumerSuccess = consumerResult.status === 'fulfilled' && consumerResult.value?.ok !== undefined;

    if (storageSuccess || consumerSuccess) {
      // At least one succeeded
      return res.status(200).json({
        success: true,
        submissionId,
        message: 'Data submitted successfully',
        url,
        topic: topic || topicId,
        timestamp: Date.now(),
        method: 'dual-canister',
        storage: storageSuccess ? 'success' : 'failed',
        consumer: consumerSuccess ? 'success' : 'failed',
        pointsAwarded: consumerSuccess // Points are awarded if consumer submission succeeded
      });
    } else {
      // Both failed
      console.error('[/api/consumer-submit] Both submissions failed');
      return res.status(200).json({
        success: false,
        submissionId,
        message: 'Submission failed',
        storage_error: storageResult.status === 'rejected' ? storageResult.reason?.message : storageResult.value?.err,
        consumer_error: consumerResult.status === 'rejected' ? consumerResult.reason?.message : consumerResult.value?.err,
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
    
    // Convert BigInt values to strings
    if (result.ok) {
      const serialized = {
        ok: {
          ...result.ok,
          created: result.ok.created ? result.ok.created.toString() : '0',
          lastLogin: result.ok.lastLogin ? result.ok.lastLogin.toString() : '0',
          lastActive: result.ok.lastActive ? result.ok.lastActive.toString() : '0',
          dataVolumeKB: result.ok.dataVolumeKB ? Number(result.ok.dataVolumeKB) : 0,
          referralCount: result.ok.referralCount ? Number(result.ok.referralCount) : 0,
          points: result.ok.points ? Number(result.ok.points) : 0,
          totalDataScraped: result.ok.totalDataScraped ? Number(result.ok.totalDataScraped) : 0,
          principal: result.ok.principal ? result.ok.principal.toString() : '',
          referredBy: result.ok.referredBy ? result.ok.referredBy.toString() : null
        }
      };
      res.json(serialized);
    } else {
      res.json(result);
    }
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

app.post('/api/consumer-update-login', authenticateApiKey, async (req, res) => {
  console.log('[/api/consumer-update-login] Updating login with IP:', req.body.ipAddress);
  try {
    const result = await consumerActor.updateUserLogin(req.body.ipAddress || '');
    console.log('[/api/consumer-update-login] Result:', result);
    res.json(result);
  } catch (error) {
    console.error('[/api/consumer-update-login] Error:', error);
    res.status(500).json({ err: error.message });
  }
});

// Get user profile endpoint for extension dashboard
app.post('/api/user-profile', async (req, res) => {
  console.log('[/api/user-profile] Getting user profile');
  const { principalId, referralCode } = req.body;
  
  try {
    // Get all users and find the one with matching referral code
    const users = await consumerActor.getAllUsers();
    
    // Find user by referral code (more reliable than principal)
    const userEntry = users.find(([_, profile]) => profile.referralCode === referralCode);
    
    if (userEntry) {
      const [principal, profile] = userEntry;
      
      // Convert BigInt values for JSON serialization
      const serializedProfile = {
        principal: principal.toString(),
        referralCode: profile.referralCode,
        points: profile.points ? Number(profile.points) : 0,
        totalDataScraped: profile.totalDataScraped ? Number(profile.totalDataScraped) : 0,
        dataVolumeKB: profile.dataVolumeKB ? Number(profile.dataVolumeKB) : 0,
        referralCount: profile.referralCount ? Number(profile.referralCount) : 0,
        isActive: profile.isActive,
        country: profile.country?.[0] || null,
        city: profile.city?.[0] || null,
        lastActive: profile.lastActive ? profile.lastActive.toString() : '0'
      };
      
      console.log(`[/api/user-profile] Found user: ${referralCode} with ${serializedProfile.points} points`);
      res.json(serializedProfile);
    } else {
      console.log(`[/api/user-profile] User not found: ${referralCode}`);
      res.status(404).json({ error: 'User profile not found' });
    }
  } catch (error) {
    console.error('[/api/user-profile] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all users endpoint for admin dashboard
app.get('/api/consumer-users', authenticateApiKey, async (req, res) => {
  console.log('[/api/consumer-users] Getting all users');
  try {
    const users = await consumerActor.getAllUsers();
    console.log(`[/api/consumer-users] Found ${users.length} users`);
    
    // Convert BigInt values to strings for JSON serialization
    // Users are returned as tuples [Principal, UserProfile]
    const serializedUsers = users.map(([principal, profile]) => ({
      ...profile,
      principal: principal.toString(),
      created: profile.created ? profile.created.toString() : '0',
      lastLogin: profile.lastLogin ? profile.lastLogin.toString() : '0',
      lastActive: profile.lastActive ? profile.lastActive.toString() : '0',
      dataVolumeKB: profile.dataVolumeKB ? Number(profile.dataVolumeKB) : 0,
      referralCount: profile.referralCount ? Number(profile.referralCount) : 0,
      points: profile.points ? Number(profile.points) : 0,
      totalDataScraped: profile.totalDataScraped ? Number(profile.totalDataScraped) : 0,
      referredBy: profile.referredBy && profile.referredBy.length > 0 ? profile.referredBy[0].toString() : null
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