const { rssSearchForUrls } = require('./rssUrlGenerator');
const { newsApiSearchForUrls } = require('./newsApiGenerator');
const { googleSearchForUrls } = require('./googleSearchGenerator');
const { serpApiSearchForUrls } = require('./serpApiGenerator');
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
 * Using simple generator for now to ensure URLs are returned quickly
 * @param {string} topic - Topic name
 * @param {string[]} keywords - Additional keywords
 * @param {number} page - Page number (0-based)
 * @param {string} userId - User ID for quota tracking
 * @param {string} topicId - Topic ID for URL tracking
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Search results with URLs and quota info
 */
async function searchForUrls(topic, keywords = [], page = 0, userId = 'anonymous', topicId = '', options = {}) {
  try {
    console.log(`Searching for URLs for topic: ${topic} (page ${page}) for user: ${userId}`);
    
    // Use RSS feeds, NewsAPI, Google Search, and SerpAPI for maximum URL variety
    const rssResult = await rssSearchForUrls(topic, keywords, page, userId, topicId, options);
    const newsResult = await newsApiSearchForUrls(topic, keywords, page, userId, topicId, options);
    const googleResult = await googleSearchForUrls(topic, keywords, page, userId, topicId, options);
    const serpResult = await serpApiSearchForUrls(topic, keywords, page, userId, topicId, options);
    
    // Combine URLs from all sources
    const combinedUrls = [...(rssResult.urls || []), ...(newsResult.urls || []), ...(googleResult.urls || []), ...(serpResult.urls || [])];
    // Remove duplicates
    const uniqueUrls = [...new Set(combinedUrls)];
    
    const result = {
      urls: uniqueUrls.slice(0, 20), // Limit to 20 URLs per topic (4 sources now)
      source: `rss+newsapi+google+serp (${rssResult.urls?.length || 0} RSS + ${newsResult.urls?.length || 0} NewsAPI + ${googleResult.urls?.length || 0} Google + ${serpResult.urls?.length || 0} SerpAPI)`,
      quotaInfo: rssResult.quotaInfo || newsResult.quotaInfo || googleResult.quotaInfo || serpResult.quotaInfo
    };
    
    // Track URLs for this user
    if (result.urls && result.urls.length > 0) {
      result.urls.forEach(url => {
        trackUrlForUser(userId, topicId, url);
      });
    }
    
    return result;
    
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