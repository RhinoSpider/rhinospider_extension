const { searchDuckDuckGo } = require('./duckduckgoSearch');
const { searchGoogle } = require('./googleSearch');
const { searchCommonCrawl } = require('./commonCrawlSearch');
const { searchWithRotation } = require('./searchEngineRotation');
const { checkUserQuota, updateUserQuota } = require('./userQuotaManager');
const { hasUrlBeenScraped, markUrlAsScraped, filterScrapedUrls } = require('./scrapedUrlsTracker');
const NodeCache = require('node-cache');

// Cache for URL tracking (7 day TTL)
const urlTrackingCache = new NodeCache({ stdTTL: 7 * 86400, checkperiod: 3600 });

/**
 * Track URLs that have been sent to a user
 * @param {string} userId - User ID
 * @param {string} topicId - Topic ID
 * @param {string} url - URL
 */
function trackUrlForUser(userId, topicId, url) {
  const key = `${userId}_${topicId}_${url}`;
  urlTrackingCache.set(key, Date.now());
}

/**
 * Check if URL has been sent to a user recently
 * @param {string} userId - User ID
 * @param {string} topicId - Topic ID
 * @param {string} url - URL
 * @returns {boolean} - True if URL has been sent recently
 */
function hasUrlBeenSentRecently(userId, topicId, url) {
  const key = `${userId}_${topicId}_${url}`;
  return urlTrackingCache.has(key);
}

/**
 * Search for URLs based on a topic
 * First tries Common Crawl, then falls back to search engine rotation
 * @param {string} topic - Topic name
 * @param {string[]} keywords - Additional keywords
 * @param {number} page - Page number (0-based)
 * @param {string} userId - User ID for quota tracking
 * @param {string} topicId - Topic ID for URL tracking
 * @returns {Promise<Object>} - Search results with URLs and quota info
 */
async function searchForUrls(topic, keywords = [], page = 0, userId = 'anonymous', topicId = '') {
  try {
    console.log(`Searching for URLs for topic: ${topic} (page ${page}) for user: ${userId}`);
    
    // Check user quota
    const quotaCheck = checkUserQuota(userId, 10); // Request up to 10 URLs
    
    if (quotaCheck.quotaExceeded) {
      console.log(`User ${userId} has exceeded their quota`);
      return {
        urls: [],
        source: 'quota_exceeded',
        quotaInfo: quotaCheck
      };
    }
    
    // Try Common Crawl first
    console.log(`Trying Common Crawl for topic: ${topic}`);
    let urls = [];
    let source = '';
    let responseSize = 0; // Track response size for bandwidth calculation
    
    try {
      urls = await searchCommonCrawl(topic, keywords, page);
      if (urls && urls.length > 0) {
        console.log(`Found ${urls.length} URLs from Common Crawl for topic: ${topic}`);
        source = 'common_crawl';
        // Estimate response size (rough calculation)
        responseSize = JSON.stringify(urls).length;
      } else {
        console.log(`No results from Common Crawl for topic: ${topic}`);
      }
    } catch (error) {
      console.error(`Error searching Common Crawl: ${error.message}`);
    }
    
    // If no results from Common Crawl, try search engine rotation
    if (urls.length === 0) {
      console.log(`No results from Common Crawl for topic: ${topic}, trying search engine rotation`);
      try {
        urls = await searchWithRotation(topic, keywords, page);
        if (urls && urls.length > 0) {
          console.log(`Found ${urls.length} URLs from search engine rotation for topic: ${topic}`);
          source = 'search_engines';
          // Estimate response size (rough calculation)
          responseSize = JSON.stringify(urls).length;
        } else {
          console.log(`No results from search engine rotation for topic: ${topic}`);
        }
      } catch (error) {
        console.error(`Error searching with search engine rotation: ${error.message}`);
      }
    }
    
    // Filter out URLs that have already been scraped globally
    const notPreviouslyScraped = filterScrapedUrls(urls);
    console.log(`Filtered out ${urls.length - notPreviouslyScraped.length} previously scraped URLs`);
    
    // Filter out URLs that have been sent to this user recently
    const filteredUrls = notPreviouslyScraped.filter(url => !hasUrlBeenSentRecently(userId, topicId, url));
    console.log(`Filtered out ${notPreviouslyScraped.length - filteredUrls.length} URLs recently sent to user`);
    
    // Limit URLs to user quota
    const allowedUrls = filteredUrls.slice(0, quotaCheck.allowed);
    
    // Track URLs for this user and mark them as scraped globally
    const urlObjects = allowedUrls.map(url => {
      // Track URL for this user
      trackUrlForUser(userId, topicId, url);
      
      // Mark URL as scraped globally
      markUrlAsScraped(url, userId, topicId);
      
      // Return URL with topic information - use a simple string for the URL
      // This is critical for compatibility with the extension
      return {
        url: url, // Ensure this is a simple string, not an object
        topicId,
        topicName: topic
      };
    });
    
    // Log the URL structure to verify it's correct
    console.log(`URL object structure example: ${JSON.stringify(urlObjects[0] || {})}`);
    
    
    // Update user quota with topic information and bandwidth used
    const quotaInfo = await updateUserQuota(
      userId, 
      allowedUrls.length, 
      topicId, 
      topic, 
      responseSize
    );
    
    console.log(`Using ${allowedUrls.length} URLs from ${source} for topic: ${topic}`);
    
    return {
      urls: urlObjects,
      totalUrls: urlObjects.length,
      source,
      quotaInfo,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error in searchForUrls: ${error.message}`);
    return {
      urls: [],
      totalUrls: 0,
      source: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  searchForUrls,
  trackUrlForUser,
  hasUrlBeenSentRecently
};
