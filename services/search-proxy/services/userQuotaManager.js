const NodeCache = require('node-cache');
const fs = require('fs');
const path = require('path');
const { syncUserDataToCanister, getUserDataFromCanister } = require('./consumerCanisterService');

// Cache for user quotas (24 hour TTL in memory)
const userQuotaCache = new NodeCache({ stdTTL: 86400, checkperiod: 600 });

// Path for persistent storage
const DATA_DIR = path.join(__dirname, '../data');
const QUOTA_FILE = path.join(DATA_DIR, 'user_quotas.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Tier configuration
const tierConfig = {
  basic: { dailyLimit: 50, pointsPerUrl: 1 },
  silver: { dailyLimit: 100, pointsPerUrl: 2 },
  gold: { dailyLimit: 200, pointsPerUrl: 3 },
  platinum: { dailyLimit: 300, pointsPerUrl: 5 }
};

// Analytics tracking
const userAnalytics = {};

/**
 * Load user quotas from persistent storage
 */
function loadUserQuotas() {
  try {
    if (fs.existsSync(QUOTA_FILE)) {
      const data = fs.readFileSync(QUOTA_FILE, 'utf8');
      const quotas = JSON.parse(data);
      
      // Load quotas into cache
      Object.keys(quotas).forEach(userId => {
        userQuotaCache.set(userId, quotas[userId]);
      });
      
      console.log(`Loaded ${Object.keys(quotas).length} user quotas from persistent storage`);
    }
  } catch (error) {
    console.error('Error loading user quotas:', error.message);
  }
}

/**
 * Save user quotas to persistent storage
 */
function saveUserQuotas() {
  try {
    const quotas = {};
    const userIds = userQuotaCache.keys();
    
    userIds.forEach(userId => {
      quotas[userId] = userQuotaCache.get(userId);
    });
    
    fs.writeFileSync(QUOTA_FILE, JSON.stringify(quotas, null, 2), 'utf8');
    console.log(`Saved ${userIds.length} user quotas to persistent storage`);
  } catch (error) {
    console.error('Error saving user quotas:', error.message);
  }
}

/**
 * Initialize background save process
 */
function initBackgroundSave() {
  // Save user quotas every 5 minutes
  setInterval(saveUserQuotas, 5 * 60 * 1000);
  console.log('Background save initialized');
  
  // Load existing quotas on startup
  loadUserQuotas();
}

/**
 * Track user analytics
 * @param {string} userId - User ID
 * @param {string} action - Action performed
 * @param {Object} data - Additional data
 */
function trackUserAnalytics(userId, action, data = {}) {
  if (!userId || userId === 'anonymous') return;
  
  if (!userAnalytics[userId]) {
    userAnalytics[userId] = {
      userId,
      actions: [],
      sessionStart: Date.now(),
      lastActive: Date.now()
    };
  }
  
  // Update last active time
  userAnalytics[userId].lastActive = Date.now();
  
  // Add action to history (limit to last 100 actions)
  userAnalytics[userId].actions.push({
    action,
    timestamp: Date.now(),
    ...data
  });
  
  // Keep only the last 100 actions
  if (userAnalytics[userId].actions.length > 100) {
    userAnalytics[userId].actions = userAnalytics[userId].actions.slice(-100);
  }
}

/**
 * Get user quota information
 * @param {string} userId - User ID
 * @returns {Object} - User quota information
 */
function getUserQuota(userId) {
  // Get user quota from cache
  let userQuota = userQuotaCache.get(userId);
  
  if (!userQuota) {
    // Create new user quota if not exists
    userQuota = {
      userId,
      dailyUrlsScraped: 0,
      totalUrlsScraped: 0,
      totalPointsEarned: 0,
      lastReset: Date.now(),
      tier: 'basic',
      // Additional analytics data
      bandwidthUsed: 0, // in bytes
      requestsMade: 0,
      topicsSearched: {},
      urlsByHour: Array(24).fill(0), // URLs scraped by hour of day
      pointsByDay: {}, // Points earned by day
      lastSync: 0 // Last time synced with consumer canister
    };
    userQuotaCache.set(userId, userQuota);
    
    // Track new user
    trackUserAnalytics(userId, 'new_user');
  }
  
  // Check if daily quota reset is needed
  const today = new Date();
  const lastReset = new Date(userQuota.lastReset);
  
  if (today.getDate() !== lastReset.getDate() || 
      today.getMonth() !== lastReset.getMonth() || 
      today.getFullYear() !== lastReset.getFullYear()) {
    // Reset daily quota at midnight
    userQuota.dailyUrlsScraped = 0;
    userQuota.lastReset = Date.now();
    userQuotaCache.set(userId, userQuota);
    
    // Track daily reset
    trackUserAnalytics(userId, 'daily_reset');
  }
  
  return userQuota;
}

/**
 * Check if user has remaining quota
 * @param {string} userId - User ID
 * @param {number} requestedCount - Number of URLs requested
 * @returns {Object} - Quota check result
 */
function checkUserQuota(userId, requestedCount = 1) {
  const userQuota = getUserQuota(userId);
  const tier = userQuota.tier;
  const dailyLimit = tierConfig[tier].dailyLimit;
  const remaining = Math.max(0, dailyLimit - userQuota.dailyUrlsScraped);
  const count = Math.min(remaining, requestedCount);
  
  // Track quota check
  trackUserAnalytics(userId, 'quota_check', { requestedCount, allowed: count });
  
  // Increment request counter
  userQuota.requestsMade++;
  userQuotaCache.set(userId, userQuota);
  
  return {
    userId,
    tier,
    dailyLimit,
    used: userQuota.dailyUrlsScraped,
    remaining,
    allowed: count,
    quotaExceeded: count === 0,
    totalPoints: userQuota.totalPointsEarned,
    totalUrlsScraped: userQuota.totalUrlsScraped
  };
}

/**
 * Update user quota after URL scraping
 * @param {string} userId - User ID
 * @param {number} urlsScraped - Number of URLs scraped
 * @param {string} topicId - Topic ID (optional)
 * @param {string} topicName - Topic name (optional)
 * @param {number} bandwidthUsed - Bandwidth used in bytes (optional)
 * @returns {Promise<Object>} - Updated user quota
 */
async function updateUserQuota(userId, urlsScraped, topicId = '', topicName = '', bandwidthUsed = 0) {
  const userQuota = getUserQuota(userId);
  const tier = userQuota.tier;
  const pointsPerUrl = tierConfig[tier].pointsPerUrl;
  const pointsEarned = urlsScraped * pointsPerUrl;
  
  // Update quota
  userQuota.dailyUrlsScraped += urlsScraped;
  userQuota.totalUrlsScraped += urlsScraped;
  userQuota.totalPointsEarned += pointsEarned;
  userQuota.bandwidthUsed += bandwidthUsed;
  
  // Update hour-based stats
  const currentHour = new Date().getHours();
  userQuota.urlsByHour[currentHour] += urlsScraped;
  
  // Update day-based stats
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  if (!userQuota.pointsByDay[today]) {
    userQuota.pointsByDay[today] = 0;
  }
  userQuota.pointsByDay[today] += pointsEarned;
  
  // Update topic stats if provided
  if (topicId && topicName) {
    if (!userQuota.topicsSearched[topicId]) {
      userQuota.topicsSearched[topicId] = {
        name: topicName,
        count: 0,
        points: 0
      };
    }
    userQuota.topicsSearched[topicId].count += urlsScraped;
    userQuota.topicsSearched[topicId].points += pointsEarned;
  }
  
  // Check for tier upgrade
  let newTier = 'basic';
  if (userQuota.totalPointsEarned >= 10000) {
    newTier = 'platinum';
  } else if (userQuota.totalPointsEarned >= 5000) {
    newTier = 'gold';
  } else if (userQuota.totalPointsEarned >= 1000) {
    newTier = 'silver';
  }
  
  // Update tier if changed
  const tierUpgraded = newTier !== userQuota.tier;
  userQuota.tier = newTier;
  
  // Track points earned
  trackUserAnalytics(userId, 'points_earned', { 
    urlsScraped, 
    pointsEarned, 
    topicId, 
    topicName,
    tierUpgraded,
    newTier: tierUpgraded ? newTier : undefined
  });
  
  // Save updated quota
  userQuotaCache.set(userId, userQuota);
  
  // Sync with consumer canister if it's been more than 2 hours since last sync
  // or if the tier was upgraded
  const now = Date.now();
  if (tierUpgraded || (now - userQuota.lastSync > 2 * 60 * 60 * 1000)) {
    userQuota.lastSync = now;
    userQuotaCache.set(userId, userQuota);
    
    // Sync with consumer canister in background
    syncUserDataToCanister(userId, userQuota).then(result => {
      if (result.success) {
        console.log(`Successfully synced user data to consumer canister for user ${userId}`);
        
        // If we got updated data from the canister, update our local cache
        if (result.data && result.data.userData) {
          const canisterData = result.data.userData;
          
          // Only update fields that the canister knows about and we don't
          if (canisterData.additionalPoints && !userQuota.additionalPoints) {
            userQuota.additionalPoints = canisterData.additionalPoints;
            userQuota.totalPointsEarned += canisterData.additionalPoints;
            console.log(`Added ${canisterData.additionalPoints} additional points from canister for user ${userId}`);
          }
          
          // Update local cache
          userQuotaCache.set(userId, userQuota);
        }
      } else {
        console.error(`Failed to sync with consumer canister for user ${userId}: ${result.reason}`);
      }
    }).catch(error => {
      console.error(`Error syncing with consumer canister for user ${userId}:`, error.message);
    });
  }
  
  return {
    userId,
    tier: userQuota.tier,
    dailyLimit: tierConfig[userQuota.tier].dailyLimit,
    used: userQuota.dailyUrlsScraped,
    remaining: Math.max(0, tierConfig[userQuota.tier].dailyLimit - userQuota.dailyUrlsScraped),
    totalPoints: userQuota.totalPointsEarned,
    totalUrlsScraped: userQuota.totalUrlsScraped,
    pointsEarned,
    tierUpgraded
  };
}

/**
 * Get analytics for a user
 * @param {string} userId - User ID
 * @returns {Object} - User analytics
 */
function getUserAnalytics(userId) {
  if (!userId || userId === 'anonymous') {
    return { error: 'Invalid user ID' };
  }
  
  const userQuota = getUserQuota(userId);
  const analytics = userAnalytics[userId] || { actions: [] };
  
  return {
    userId,
    tier: userQuota.tier,
    totalPoints: userQuota.totalPointsEarned,
    totalUrlsScraped: userQuota.totalUrlsScraped,
    dailyUrlsScraped: userQuota.dailyUrlsScraped,
    bandwidthUsed: userQuota.bandwidthUsed,
    requestsMade: userQuota.requestsMade,
    topicsSearched: userQuota.topicsSearched,
    urlsByHour: userQuota.urlsByHour,
    pointsByDay: userQuota.pointsByDay,
    recentActions: analytics.actions.slice(-10), // Last 10 actions
    lastActive: analytics.lastActive,
    sessionStart: analytics.sessionStart
  };
}

/**
 * Get all user IDs with quota information
 * @returns {string[]} - Array of user IDs
 */
function getAllUserIds() {
  return userQuotaCache.keys();
}

/**
 * Fetch user data from the consumer canister
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User data from consumer canister
 */
async function fetchUserDataFromCanister(userId) {
  try {
    const result = await getUserDataFromCanister(userId);
    
    if (result.success && result.data) {
      const canisterData = result.data;
      const userQuota = getUserQuota(userId);
      
      // Update user quota with data from canister
      if (canisterData.totalPoints) {
        userQuota.totalPointsEarned = Math.max(userQuota.totalPointsEarned, canisterData.totalPoints);
      }
      
      if (canisterData.tier) {
        userQuota.tier = canisterData.tier;
      }
      
      if (canisterData.additionalPoints) {
        userQuota.additionalPoints = canisterData.additionalPoints;
        userQuota.totalPointsEarned += canisterData.additionalPoints;
      }
      
      // Save updated quota
      userQuotaCache.set(userId, userQuota);
      console.log(`Updated user quota for ${userId} from consumer canister`);
      
      return userQuota;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching user data from consumer canister for ${userId}:`, error.message);
    return null;
  }
}

/**
 * Initialize the user quota system
 */
async function initUserQuotaSystem() {
  // Initialize background save
  initBackgroundSave();
  
  // Schedule periodic cleanup of old analytics data
  setInterval(() => {
    const now = Date.now();
    const cutoff = now - 30 * 24 * 60 * 60 * 1000; // 30 days
    
    Object.keys(userAnalytics).forEach(userId => {
      // Remove users inactive for 30 days
      if (userAnalytics[userId].lastActive < cutoff) {
        delete userAnalytics[userId];
      } else {
        // Clean up old actions
        userAnalytics[userId].actions = userAnalytics[userId].actions.filter(
          action => action.timestamp > cutoff
        );
      }
    });
    
    console.log('Cleaned up old analytics data');
  }, 24 * 60 * 60 * 1000); // Once per day
  
  // Schedule periodic sync with consumer canister for all users
  setInterval(async () => {
    try {
      console.log('Starting periodic sync with consumer canister...');
      const userIds = userQuotaCache.keys();
      let syncCount = 0;
      
      for (const userId of userIds) {
        const userQuota = getUserQuota(userId);
        const result = await syncUserDataToCanister(userId, userQuota);
        
        if (result.success) {
          syncCount++;
        }
      }
      
      console.log(`Completed periodic sync for ${syncCount}/${userIds.length} users`);
    } catch (error) {
      console.error('Error in periodic sync with consumer canister:', error.message);
    }
  }, 6 * 60 * 60 * 1000); // Every 6 hours
  
  console.log('User quota system initialized');
  return { userCount: userQuotaCache.keys().length };
}

module.exports = {
  getUserQuota,
  checkUserQuota,
  updateUserQuota,
  getUserAnalytics,
  getAllUserIds,
  initUserQuotaSystem,
  fetchUserDataFromCanister,
  tierConfig
};
