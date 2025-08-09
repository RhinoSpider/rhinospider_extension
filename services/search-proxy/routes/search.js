const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const NodeCache = require('node-cache');
const { searchForUrls } = require('../services/searchHandler');
const { getUserQuota, checkUserQuota, updateUserQuota, getUserAnalytics, getAllUserIds, fetchUserDataFromCanister } = require('../services/userQuotaManager');
const { getScrapedUrlsStats } = require('../services/scrapedUrlsTracker');
const { reportScrapingToCanister, isConsumerCanisterAvailable } = require('../services/consumerCanisterService');

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
 *   topics: [{ 
 *     id: string, 
 *     name: string, 
 *     searchQueries: string[],
 *     preferredDomains: string[],
 *     excludeDomains: string[],
 *     requiredKeywords: string[],
 *     excludeKeywords: string[]
 *   }],
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
    
    // Check user quota first
    const quotaCheck = checkUserQuota(extensionId, Math.ceil(batchSize / topics.length));
    if (quotaCheck.quotaExceeded) {
      return res.status(429).json({
        error: 'Daily quota exceeded',
        quotaInfo: quotaCheck
      });
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
        
        // Fetch new URLs for this topic using our search handler with quota management
        console.log(`Fetching new URLs for topic: ${topic.name} (page ${currentPage})`);
        
        // Use searchQueries if available, otherwise fall back to topic name
        const queries = topic.searchQueries && topic.searchQueries.length > 0 
          ? topic.searchQueries 
          : [topic.name];
        
        // Combine all search results
        const allSearchResults = [];
        
        for (const query of queries) {
          // Pass the topic object with all its properties
          const searchResults = await searchForUrls(
            query, 
            topic.requiredKeywords || topic.keywords || [], 
            currentPage, 
            extensionId, 
            topic.id, 
            { 
              domains: topic.preferredDomains || topic.domains || [],
              excludeDomains: topic.excludeDomains || [],
              excludeKeywords: topic.excludeKeywords || []
            }
          );
          
          // Add unique URLs to results
          searchResults.urls.forEach(url => {
            if (!allSearchResults.includes(url)) {
              allSearchResults.push(url);
            }
          });
        }
        
        const searchResults = { urls: allSearchResults };
        
        // Add new unique URLs to the pool
        const existingUrls = new Set(urlPool[topic.id]);
        searchResults.urls.forEach(url => {
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
    // Calculate how many URLs to return per topic, ensuring we return as many as possible
    // while maintaining fairness across topics
    const availableUrls = topics.reduce((sum, topic) => sum + (urlPool[topic.id] ? urlPool[topic.id].length : 0), 0);
    console.log(`Total available URLs across all topics: ${availableUrls}`);
    
    // Determine how many URLs to return per topic
    // If we have fewer URLs than requested, return all available
    // Otherwise, distribute fairly across topics
    const effectiveBatchSize = Math.min(batchSize, availableUrls);
    const urlsPerTopic = Math.ceil(effectiveBatchSize / topics.length);
    
    console.log(`Returning up to ${effectiveBatchSize} URLs (${urlsPerTopic} per topic)`);
    
    let responseBatch = [];
    
    topics.forEach(topic => {
      if (!topic || !topic.id || !urlPool[topic.id]) return;
      
      // Take up to urlsPerTopic URLs from this topic's pool
      const topicUrls = urlPool[topic.id].splice(0, urlsPerTopic);
      console.log(`Taking ${topicUrls.length} URLs for topic: ${topic.name}`);
      
      // Simplify the URL structure to be directly compatible with the extension
      const topicUrlsWithInfo = topicUrls.map(url => ({
        url: url, // This should be a string, not an object
        topicId: topic.id,
        topicName: topic.name
      }));
      
      // Log the URL structure to verify it's correct
      console.log(`URL structure example: ${JSON.stringify(topicUrlsWithInfo[0] || {})}`); 
      
      responseBatch = responseBatch.concat(topicUrlsWithInfo);
    });
    
    // Shuffle the response batch for randomization
    responseBatch.sort(() => Math.random() - 0.5);
    
    // Limit to requested batch size (should already be limited by urlsPerTopic calculation)
    responseBatch = responseBatch.slice(0, batchSize);
    
    // Update URL pool after removing the returned URLs
    urlPoolCache.set(cacheKey, urlPool);
    
    // Update user quota for the URLs we're returning
    const urlsReturned = responseBatch.length;
    if (urlsReturned > 0) {
      const updatedQuota = updateUserQuota(extensionId, urlsReturned);
      
      // Organize URLs by topic ID for the extension
      const urlsByTopic = {};
      
      // Initialize empty arrays for each topic
      topics.forEach(topic => {
        urlsByTopic[topic.id] = [];
      });
      
      // Populate the arrays with URLs - ensure we're using simple string URLs
      responseBatch.forEach(urlObj => {
        if (urlsByTopic[urlObj.topicId]) {
          // Extract the URL string from the nested object structure if needed
          let urlString = urlObj.url;
          if (typeof urlObj.url === 'object' && urlObj.url.url) {
            urlString = urlObj.url.url;
          }
          
          // Create a new object with a simple string URL
          const simplifiedUrlObj = {
            url: urlString,
            topicId: urlObj.topicId,
            topicName: urlObj.topicName
          };
          
          urlsByTopic[urlObj.topicId].push(simplifiedUrlObj);
        }
      });
      
      // Log an example URL structure
      const exampleTopic = Object.keys(urlsByTopic)[0];
      if (exampleTopic && urlsByTopic[exampleTopic].length > 0) {
        console.log(`Example URL structure: ${JSON.stringify(urlsByTopic[exampleTopic][0])}`);
      }
      
      // Return the batch with quota information
      res.status(200).json({
        urls: urlsByTopic,
        totalUrls: responseBatch.length,
        timestamp: new Date().toISOString(),
        quotaInfo: updatedQuota
      });
    } else {
      // Create an empty object with topic IDs as keys
      const emptyUrlsByTopic = {};
      
      // Initialize empty arrays for each topic
      topics.forEach(topic => {
        emptyUrlsByTopic[topic.id] = [];
      });
      
      res.status(200).json({
        urls: emptyUrlsByTopic,
        totalUrls: 0,
        timestamp: new Date().toISOString(),
        quotaInfo: checkUserQuota(extensionId, 0)
      });
    }
    
  } catch (error) {
    console.error('Error in /urls endpoint:', error);
    next(error);
  }
});

/**
 * Get user quota information
 * GET /api/search/quota?extensionId=<extensionId>
 */
router.get('/quota', (req, res) => {
  try {
    const { extensionId } = req.query;
    
    if (!extensionId) {
      return res.status(400).json({ error: 'Missing extensionId parameter' });
    }
    
    const userQuota = getUserQuota(extensionId);
    res.json(userQuota);
  } catch (error) {
    console.error('Error in /quota endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get detailed user analytics
 * GET /api/search/analytics?extensionId=<extensionId>
 */
router.get('/analytics', (req, res) => {
  try {
    const { extensionId } = req.query;
    
    if (!extensionId) {
      return res.status(400).json({ error: 'Missing extensionId parameter' });
    }
    
    const userAnalytics = getUserAnalytics(extensionId);
    res.json(userAnalytics);
  } catch (error) {
    console.error('Error in /analytics endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Report URLs scraped by the extension
 * POST /api/search/report-scrape
 * Request body: {
 *   extensionId: string,
 *   urlsScraped: number,
 *   topicId: string (optional),
 *   topicName: string (optional),
 *   bandwidthUsed: number (optional)
 * }
 */
router.post('/report-scrape', async (req, res) => {
  try {
    const { extensionId, urlsScraped, topicId, topicName, bandwidthUsed } = req.body;
    
    if (!extensionId) {
      return res.status(400).json({ error: 'Missing extensionId' });
    }
    
    if (!urlsScraped || typeof urlsScraped !== 'number' || urlsScraped <= 0) {
      return res.status(400).json({ error: 'Invalid urlsScraped value' });
    }
    
    // Update local user quota
    const quotaInfo = await updateUserQuota(
      extensionId, 
      urlsScraped, 
      topicId || '', 
      topicName || '', 
      bandwidthUsed || 0
    );
    
    // Also report to consumer canister in background
    if (extensionId !== 'anonymous') {
      reportScrapingToCanister(extensionId, urlsScraped, quotaInfo.pointsEarned)
        .then(result => {
          if (result.success) {
            console.log(`Successfully reported scraping to consumer canister for user ${extensionId}`);
          } else {
            console.warn(`Failed to report scraping to consumer canister: ${result.reason}`);
          }
        })
        .catch(error => {
          console.error('Error reporting to consumer canister:', error.message);
        });
    }
    
    res.json(quotaInfo);
  } catch (error) {
    console.error('Error in /report-scrape endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get system stats about scraped URLs
 * GET /api/search/system-stats
 */
router.get('/system-stats', (req, res) => {
  try {
    const scrapedUrlsStats = getScrapedUrlsStats();
    const userCount = getAllUserIds().length;
    
    res.json({
      scrapedUrlsStats,
      userCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in /system-stats endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Fetch user data from consumer canister
 * GET /api/search/canister-data?extensionId=<extensionId>
 */
router.get('/canister-data', async (req, res) => {
  try {
    const { extensionId } = req.query;
    
    if (!extensionId) {
      return res.status(400).json({ error: 'Missing extensionId parameter' });
    }
    
    // Check if consumer canister is available
    const canisterAvailable = await isConsumerCanisterAvailable();
    
    if (!canisterAvailable) {
      return res.status(503).json({ 
        error: 'Consumer canister unavailable',
        localData: getUserQuota(extensionId)
      });
    }
    
    // Fetch data from consumer canister
    const canisterData = await fetchUserDataFromCanister(extensionId);
    
    if (canisterData) {
      res.json({
        source: 'canister',
        userData: canisterData,
        timestamp: new Date().toISOString()
      });
    } else {
      // Fall back to local data
      res.json({
        source: 'local',
        userData: getUserQuota(extensionId),
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error in /canister-data endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      localData: getUserQuota(req.query.extensionId || 'anonymous')
    });
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

/**
 * Get user quota information
 * GET /api/search/quota?extensionId=<extensionId>
 */
router.get('/quota', (req, res) => {
  const { extensionId } = req.query;
  
  if (!extensionId) {
    return res.status(400).json({ error: 'Missing extensionId' });
  }
  
  const quotaInfo = getUserQuota(extensionId);
  res.json(quotaInfo);
});

/**
 * Report successful URL scraping to earn points
 * POST /api/search/report-scrape
 * Request body: { extensionId: string, urlsScraped: number, topicId: string }
 */
router.post('/report-scrape', (req, res) => {
  const { extensionId, urlsScraped = 1, topicId } = req.body;
  
  if (!extensionId) {
    return res.status(400).json({ error: 'Missing extensionId' });
  }
  
  // Validate urlsScraped is a reasonable number
  const validUrlCount = Math.min(Math.max(1, parseInt(urlsScraped) || 1), 20);
  
  // Update user quota and return updated information
  const updatedQuota = updateUserQuota(extensionId, validUrlCount);
  
  // If tier was upgraded, send special notification
  if (updatedQuota.tierUpgraded) {
    return res.json({
      ...updatedQuota,
      message: `Congratulations! You've been upgraded to ${updatedQuota.tier.toUpperCase()} tier!`
    });
  }
  
  res.json(updatedQuota);
});

module.exports = router;
