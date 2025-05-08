const { searchDuckDuckGo } = require('./duckduckgoSearch');
const { searchGoogle } = require('./googleSearch');
const { searchCommonCrawl } = require('./commonCrawlSearch');
const { searchWithRotation } = require('./searchEngineRotation');
const { searchRssAndSitemaps } = require('./rssAndSitemapSearch');
const { searchWaybackMachine } = require('./waybackMachineSearch');
const { searchWikimedia, searchGovSitemaps } = require('./wikimediaSearch');
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
 * Enhanced algorithm that prioritizes high-quality sources and uses multiple methods in parallel
 * @param {string} topic - Topic name
 * @param {string[]} keywords - Additional keywords
 * @param {number} page - Page number (0-based)
 * @param {string} userId - User ID for quota tracking
 * @param {string} topicId - Topic ID for URL tracking
 * @param {Object} options - Additional options
 * @param {string[]} options.domains - Domain list for RSS/Sitemap search
 * @returns {Promise<Object>} - Search results with URLs and quota info
 */
async function searchForUrls(topic, keywords = [], page = 0, userId = 'anonymous', topicId = '', options = {}) {
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
    
    // Extract domains from options if available
    let domains = [];
    if (options && options.domains) {
      domains = Array.isArray(options.domains) ? options.domains : [options.domains];
    }
    
    // Use parallel search approach to maximize URL discovery
    console.log(`Starting parallel search for topic: ${topic}`);
    let urls = [];
    let source = '';
    let responseSize = 0; // Track response size for bandwidth calculation
    
    // Run multiple search methods in parallel for better performance and more results
    const searchPromises = [];
    const searchResults = {};
    
    // 1. RSS and Sitemap search if domains are available
    if (domains && domains.length > 0 && process.env.ENABLE_RSS_FEEDS === 'true') {
      console.log(`Adding RSS/Sitemap search for topic: ${topic}`);
      searchPromises.push(
        searchRssAndSitemaps(topic, domains, page)
          .then(results => {
            searchResults.rss_sitemap = results || [];
            console.log(`Found ${searchResults.rss_sitemap.length} URLs from RSS/Sitemap for topic: ${topic}`);
          })
          .catch(error => {
            console.error(`Error searching RSS/Sitemap: ${error.message}`);
            searchResults.rss_sitemap = [];
          })
      );
    } else {
      console.log(`No domains available for RSS/Sitemap search or RSS feeds disabled for topic: ${topic}`);
      searchResults.rss_sitemap = [];
    }
    
    // 2. Common Crawl search (run in parallel)
    if (process.env.ENABLE_COMMON_CRAWL === 'true') {
      console.log(`Adding Common Crawl search for topic: ${topic}`);
      searchPromises.push(
        searchCommonCrawl(topic, keywords, page)
          .then(results => {
            searchResults.common_crawl = results || [];
            console.log(`Found ${searchResults.common_crawl.length} URLs from Common Crawl for topic: ${topic}`);
          })
          .catch(error => {
            console.error(`Error searching Common Crawl: ${error.message}`);
            searchResults.common_crawl = [];
          })
      );
    } else {
      console.log(`Common Crawl search disabled for topic: ${topic}`);
      searchResults.common_crawl = [];
    }
    
    // 3. Wayback Machine search (run in parallel)
    if (process.env.ENABLE_WAYBACK_MACHINE === 'true') {
      console.log(`Adding Wayback Machine search for topic: ${topic}`);
      searchPromises.push(
        searchWaybackMachine(topic, domains, page)
          .then(results => {
            searchResults.wayback_machine = results || [];
            console.log(`Found ${searchResults.wayback_machine.length} URLs from Wayback Machine for topic: ${topic}`);
          })
          .catch(error => {
            console.error(`Error searching Wayback Machine: ${error.message}`);
            searchResults.wayback_machine = [];
          })
      );
    } else {
      console.log(`Wayback Machine search disabled for topic: ${topic}`);
      searchResults.wayback_machine = [];
    }
    
    // 4. Wikimedia API search (run in parallel)
    if (process.env.ENABLE_WIKIMEDIA_API === 'true') {
      console.log(`Adding Wikimedia API search for topic: ${topic}`);
      searchPromises.push(
        searchWikimedia(topic, keywords, page)
          .then(results => {
            searchResults.wikimedia = results || [];
            console.log(`Found ${searchResults.wikimedia.length} URLs from Wikimedia API for topic: ${topic}`);
          })
          .catch(error => {
            console.error(`Error searching Wikimedia API: ${error.message}`);
            searchResults.wikimedia = [];
          })
      );
    } else {
      console.log(`Wikimedia API search disabled for topic: ${topic}`);
      searchResults.wikimedia = [];
    }
    
    // 5. Government sitemaps search (run in parallel)
    if (process.env.ENABLE_GOV_SITEMAPS === 'true') {
      console.log(`Adding government sitemaps search for topic: ${topic}`);
      searchPromises.push(
        searchGovSitemaps(topic, keywords, page)
          .then(results => {
            searchResults.gov_sitemaps = results || [];
            console.log(`Found ${searchResults.gov_sitemaps.length} URLs from government sitemaps for topic: ${topic}`);
          })
          .catch(error => {
            console.error(`Error searching government sitemaps: ${error.message}`);
            searchResults.gov_sitemaps = [];
          })
      );
    } else {
      console.log(`Government sitemaps search disabled for topic: ${topic}`);
      searchResults.gov_sitemaps = [];
    }
    
    // 6. Search engine rotation (run in parallel)
    console.log(`Adding search engine rotation for topic: ${topic}`);
    searchPromises.push(
      searchWithRotation(topic, keywords, page)
        .then(results => {
          searchResults.search_engines = results || [];
          console.log(`Found ${searchResults.search_engines.length} URLs from search engine rotation for topic: ${topic}`);
        })
        .catch(error => {
          console.error(`Error searching with search engine rotation: ${error.message}`);
          searchResults.search_engines = [];
        })
    );
    
    // Wait for all search promises to complete
    console.log(`Waiting for all search methods to complete for topic: ${topic}`);
    await Promise.all(searchPromises);
    console.log(`All search methods completed for topic: ${topic}`);
    
    // Merge and deduplicate URLs from all sources
    const allUrls = [];
    const urlSet = new Set(); // For deduplication
    let bestSource = '';
    
    // Process results in priority order
    const sourcePriority = ['rss_sitemap', 'common_crawl', 'wayback_machine', 'wikimedia', 'gov_sitemaps', 'search_engines'];
    
    for (const source of sourcePriority) {
      if (searchResults[source] && searchResults[source].length > 0) {
        if (!bestSource) bestSource = source; // Set the best source to the first one with results
        
        for (const url of searchResults[source]) {
          if (!urlSet.has(url)) {
            urlSet.add(url);
            allUrls.push(url);
          }
        }
      }
    }
    
    // Use the merged results
    urls = allUrls;
    source = bestSource || 'combined';
    responseSize = JSON.stringify(urls).length;
    
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
