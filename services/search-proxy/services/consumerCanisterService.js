const axios = require('axios');
const { setTimeout } = require('timers/promises');

// Config for IC proxy (which communicates with the consumer canister)
// In production, this would be ic-proxy.rhinospider.com:3001
// For local development, we can use a mock or the actual IC proxy URL
const IC_PROXY_URL = process.env.IC_PROXY_URL || 'http://ic-proxy.rhinospider.com';
const IC_PROXY_PORT = process.env.IC_PROXY_PORT || '3001';
const IC_PROXY_API = `${IC_PROXY_URL}:${IC_PROXY_PORT}/api`;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Send user quota and analytics data to the IC proxy, which will forward it to the consumer canister
 * Note: This doesn't directly deploy anything to the consumer canister on ICP.
 * It simply sends data to the IC proxy, which is responsible for the actual ICP integration.
 * 
 * @param {string} userId - User ID
 * @param {Object} userData - User data to sync
 * @returns {Promise<Object>} - Response from IC proxy
 */
async function syncUserDataToCanister(userId, userData) {
  if (!userId || userId === 'anonymous') {
    console.log('Skipping sync for anonymous user');
    return { success: false, reason: 'Anonymous user' };
  }

  const payload = {
    userId,
    type: 'user_stats_update',
    data: {
      urlsScraped: userData.totalUrlsScraped || 0,
      pointsEarned: userData.totalPointsEarned || 0,
      tier: userData.tier || 'basic',
      dailyUrlsScraped: userData.dailyUrlsScraped || 0,
      bandwidthUsed: userData.bandwidthUsed || 0,
      topicsSearched: Object.keys(userData.topicsSearched || {}).length,
      lastUpdated: Date.now()
    }
  };

  console.log(`Syncing user data to consumer canister for user ${userId}`);
  
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const response = await axios.post(`${IC_PROXY_API}/consumer-submit`, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log(`Successfully synced data for user ${userId} to consumer canister`);
      return { 
        success: true, 
        data: response.data 
      };
    } catch (error) {
      retries++;
      console.error(`Error syncing with consumer canister (attempt ${retries}/${MAX_RETRIES}):`, error.message);
      
      if (retries < MAX_RETRIES) {
        // Exponential backoff
        const delay = RETRY_DELAY_MS * Math.pow(2, retries - 1);
        console.log(`Retrying in ${delay}ms...`);
        await setTimeout(delay);
      }
    }
  }
  
  return { 
    success: false, 
    reason: `Failed after ${MAX_RETRIES} attempts` 
  };
}

/**
 * Get user data from the IC proxy, which retrieves it from the consumer canister
 * Note: This doesn't directly interact with the consumer canister on ICP.
 * It requests data from the IC proxy, which handles the actual ICP communication.
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User data from IC proxy
 */
async function getUserDataFromCanister(userId) {
  if (!userId || userId === 'anonymous') {
    return { success: false, reason: 'Anonymous user' };
  }
  
  try {
    const response = await axios.post(`${IC_PROXY_API}/profile`, {
      userId
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error(`Error getting user data from consumer canister:`, error.message);
    return {
      success: false,
      reason: error.message
    };
  }
}

/**
 * Report successful URL scraping to the IC proxy, which will forward it to the consumer canister
 * Note: This doesn't directly deploy anything to the consumer canister on ICP.
 * It sends a report to the IC proxy, which handles the actual ICP communication.
 * 
 * @param {string} userId - User ID
 * @param {number} urlsScraped - Number of URLs scraped
 * @param {number} pointsEarned - Points earned
 * @returns {Promise<Object>} - Response from IC proxy
 */
async function reportScrapingToCanister(userId, urlsScraped, pointsEarned) {
  if (!userId || userId === 'anonymous') {
    return { success: false, reason: 'Anonymous user' };
  }
  
  try {
    const payload = {
      userId,
      type: 'scraping_report',
      data: {
        urlsScraped,
        pointsEarned,
        timestamp: Date.now()
      }
    };
    
    const response = await axios.post(`${IC_PROXY_API}/consumer-submit`, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error(`Error reporting scraping to consumer canister:`, error.message);
    return {
      success: false,
      reason: error.message
    };
  }
}

/**
 * Check if the IC proxy is available for consumer canister integration
 * Note: This doesn't check the actual consumer canister on ICP.
 * It only verifies if the IC proxy is accessible, which is the gateway to the ICP.
 * 
 * @returns {Promise<boolean>} - True if IC proxy is available
 */
async function isConsumerCanisterAvailable() {
  try {
    const response = await axios.get(`${IC_PROXY_API}/health`, {
      timeout: 3000
    });
    
    return response.status === 200;
  } catch (error) {
    console.error('Consumer canister health check failed:', error.message);
    return false;
  }
}

module.exports = {
  syncUserDataToCanister,
  getUserDataFromCanister,
  reportScrapingToCanister,
  isConsumerCanisterAvailable
};
