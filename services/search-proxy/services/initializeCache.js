const { searchForUrls } = require('./searchHandler');
const NodeCache = require('node-cache');

// Cache to store pre-fetched URLs
const urlCache = new NodeCache({ stdTTL: 86400, checkperiod: 600 });

/**
 * Initialize URL cache system
 * We don't pre-cache any topics - we'll cache them as they're requested by the extension
 */
async function initializeUrlCache() {
  console.log('Initializing URL cache system...');
  console.log('The cache will store URLs as they are requested by the extension');
  console.log('No pre-caching of example topics - only real topics from the extension will be cached');
  console.log('URL cache system initialized and ready');
  return urlCache;
}

/**
 * Get cached URLs for a topic
 * @param {string} topicId - Topic ID
 * @returns {string[]} - Array of URLs or empty array if none found
 */
function getCachedUrls(topicId) {
  return urlCache.get(topicId) || [];
}

module.exports = {
  initializeUrlCache,
  getCachedUrls,
  urlCache
};
