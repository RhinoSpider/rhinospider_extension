const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const NodeCache = require('node-cache');
const { searchForUrls } = require('../services/searchHandler');
const { getCachedUrls } = require('../services/initializeCache');

// Cache to store extension-specific URL pools
// TTL: 24 hours (in seconds)
const urlPoolCache = new NodeCache({ stdTTL: 86400, checkperiod: 600 });

// Cache to store extension-specific pagination state
const paginationCache = new NodeCache({ stdTTL: 86400, checkperiod: 600 });

/**
 * Generate a unique cache key for an extension instance
 * @param {string} extensionId - Unique identifier for the extension instance
 * @returns {string} - Cache key
 */
function getCacheKey(extensionId) {
  return `ext_${extensionId}`;
}

/**
 * Get URLs for topics
 * POST /api/search/urls
 * Request body: {
 *   extensionId: string,
 *   topics: [{ id: string, name: string, keywords: string[] }],
 *   batchSize: number (default: 500),
 *   reset: boolean (optional, resets pagination)
 * }
 */
router.post('/urls', async (req, res, next) => {
  try {
    const { extensionId, topics, batchSize = 500, reset = false } = req.body;
    
    if (!extensionId) {
      return res.status(400).json({ error: 'Missing extensionId' });
    }
    
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid topics array' });
    }
    
    const cacheKey = getCacheKey(extensionId);
    
    // Get or initialize URL pool for this extension instance
    let urlPool = urlPoolCache.get(cacheKey);
    if (!urlPool || reset) {
      urlPool = {};
      urlPoolCache.set(cacheKey, urlPool);
    }
    
    // Get or initialize pagination state
    let paginationState = paginationCache.get(cacheKey);
    if (!paginationState || reset) {
      paginationState = {};
      topics.forEach(topic => {
        paginationState[topic.id] = { page: 0 };
      });
      paginationCache.set(cacheKey, paginationState);
    }
    
    // Process each topic to ensure we have enough URLs
    const fetchPromises = topics.map(async (topic) => {
      // Skip invalid topics
      if (!topic || !topic.id) {
        console.log('Skipping invalid topic:', topic);
        return [];
      }
      
      // Initialize topic in URL pool if not exists
      if (!urlPool[topic.id]) {
        urlPool[topic.id] = [];
      }
      
      // If we need more URLs for this topic, fetch them
      if (urlPool[topic.id].length < Math.ceil(batchSize / topics.length)) {
        // Ensure pagination state exists for this topic
        if (!paginationState) {
          paginationState = {};
        }
        if (!paginationState[topic.id]) {
          paginationState[topic.id] = { page: 0 };
        }
        const currentPage = paginationState[topic.id].page;
        
        // Try to get URLs from cache first
        let newUrls = [];
        
        // Check if we have cached URLs for this topic
        const cachedUrls = getCachedUrls(topic.id);
        if (cachedUrls && cachedUrls.length > 0 && currentPage === 0) {
          // Use cached URLs for the first page
          console.log(`Using ${cachedUrls.length} cached URLs for topic: ${topic.name}`);
          newUrls = [...cachedUrls];
        } else {
          // Fetch new URLs for this topic using our search handler
          console.log(`Fetching new URLs for topic: ${topic.name} (page ${currentPage})`);
          newUrls = await searchForUrls(topic.name, topic.keywords, currentPage);
        }
        
        // Add new unique URLs to the pool
        const existingUrls = new Set(urlPool[topic.id]);
        newUrls.forEach(url => {
          if (!existingUrls.has(url)) {
            urlPool[topic.id].push(url);
            existingUrls.add(url);
          }
        });
        
        // Update pagination state
        paginationState[topic.id].page = currentPage + 1;
        paginationCache.set(cacheKey, paginationState);
      }
      
      return {
        topicId: topic.id,
        topicName: topic.name,
        availableUrls: urlPool[topic.id].length
      };
    });
    
    // Wait for all fetch operations to complete
    await Promise.all(fetchPromises);
    
    // Save updated URL pool
    urlPoolCache.set(cacheKey, urlPool);
    
    // Prepare response batch with fair distribution across topics
    const urlsPerTopic = Math.ceil(batchSize / topics.length);
    let responseBatch = [];
    
    topics.forEach(topic => {
      // Take up to urlsPerTopic URLs from this topic's pool
      const topicUrls = urlPool[topic.id].splice(0, urlsPerTopic);
      
      // Add topic info to each URL
      const topicUrlsWithInfo = topicUrls.map(url => ({
        url,
        topicId: topic.id,
        topicName: topic.name
      }));
      
      responseBatch = responseBatch.concat(topicUrlsWithInfo);
    });
    
    // Shuffle the response batch for randomization
    responseBatch.sort(() => Math.random() - 0.5);
    
    // Limit to requested batch size
    responseBatch = responseBatch.slice(0, batchSize);
    
    // Update URL pool after removing the returned URLs
    urlPoolCache.set(cacheKey, urlPool);
    
    // Return the batch
    res.status(200).json({
      urls: responseBatch,
      totalUrls: responseBatch.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Reset URL pool for an extension instance
 * POST /api/search/reset
 * Request body: { extensionId: string }
 */
router.post('/reset', (req, res) => {
  const { extensionId } = req.body;
  
  if (!extensionId) {
    return res.status(400).json({ error: 'Missing extensionId' });
  }
  
  const cacheKey = getCacheKey(extensionId);
  
  // Clear caches for this extension
  urlPoolCache.del(cacheKey);
  paginationCache.del(cacheKey);
  
  res.status(200).json({
    message: 'URL pool reset successfully',
    extensionId
  });
});

module.exports = router;
