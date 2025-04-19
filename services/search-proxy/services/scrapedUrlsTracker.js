const NodeCache = require('node-cache');

// Cache for tracking scraped URLs (30 day TTL)
const scrapedUrlsCache = new NodeCache({ stdTTL: 30 * 86400, checkperiod: 3600 });

// In-memory counter for stats
let totalUrlsTracked = 0;
let totalUrlsRejected = 0;

/**
 * Check if a URL has been scraped before
 * @param {string} url - URL to check
 * @returns {boolean} - True if URL has been scraped before
 */
function hasUrlBeenScraped(url) {
  return scrapedUrlsCache.has(url);
}

/**
 * Mark a URL as scraped
 * @param {string} url - URL to mark
 * @param {string} userId - User ID who scraped the URL
 * @param {string} topicId - Topic ID for which the URL was scraped
 */
function markUrlAsScraped(url, userId, topicId) {
  const urlInfo = {
    url,
    userId,
    topicId,
    timestamp: Date.now()
  };
  
  scrapedUrlsCache.set(url, urlInfo);
  totalUrlsTracked++;
}

/**
 * Get stats about the scraped URLs
 * @returns {Object} - Stats about the scraped URLs
 */
function getScrapedUrlsStats() {
  return {
    totalUrlsTracked,
    totalUrlsRejected,
    currentlyCached: scrapedUrlsCache.keys().length
  };
}

/**
 * Filter out URLs that have been scraped before
 * @param {string[]} urls - Array of URLs to filter
 * @returns {string[]} - Array of URLs that have not been scraped before
 */
function filterScrapedUrls(urls) {
  // Temporarily disabled URL filtering to ensure URLs are returned
  // const filteredUrls = urls.filter(url => !hasUrlBeenScraped(url));
  // totalUrlsRejected += (urls.length - filteredUrls.length);
  // return filteredUrls;
  
  // Return all URLs without filtering
  console.log('URL filtering temporarily disabled to ensure URLs are returned');
  return urls;
}

/**
 * Initialize background sync process
 * This will periodically sync data with the consumer canister
 */
function initBackgroundSync() {
  // Run sync every 15 minutes
  setInterval(async () => {
    try {
      console.log('Starting background sync with consumer canister...');
      
      // Get all user IDs from the scraped URLs cache
      const userIds = new Set();
      scrapedUrlsCache.keys().forEach(url => {
        const urlInfo = scrapedUrlsCache.get(url);
        if (urlInfo && urlInfo.userId && urlInfo.userId !== 'anonymous') {
          userIds.add(urlInfo.userId);
        }
      });
      
      console.log(`Found ${userIds.size} users to sync`);
      
      // Sync data for each user
      const { getUserQuota } = require('./userQuotaManager');
      const { syncUserDataToCanister } = require('./consumerCanisterService');
      let syncCount = 0;
      
      for (const userId of userIds) {
        const quotaInfo = getUserQuota(userId);
        const result = await syncUserDataToCanister(userId, quotaInfo);
        if (result.success) {
          syncCount++;
        }
        
        // Add a small delay between requests to avoid overwhelming the consumer canister
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`Completed sync for ${syncCount}/${userIds.size} users`);
    } catch (error) {
      console.error('Error in background sync:', error.message);
    }
  }, 15 * 60 * 1000); // 15 minutes
  
  console.log('Background sync initialized');
}

module.exports = {
  hasUrlBeenScraped,
  markUrlAsScraped,
  getScrapedUrlsStats,
  filterScrapedUrls,
  initBackgroundSync
};
