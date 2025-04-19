const axios = require('axios');
const NodeCache = require('node-cache');

// Cache for Common Crawl index data (24 hour TTL)
const indexCache = new NodeCache({ stdTTL: 86400, checkperiod: 600 });
const urlCache = new NodeCache({ stdTTL: 86400, checkperiod: 600 });

// Constants
const COMMON_CRAWL_INDEX_URL = 'https://index.commoncrawl.org/collinfo.json';
const MAX_RESULTS_PER_QUERY = 50;
const CACHE_KEY_PREFIX = 'cc_';

// Common Crawl API endpoints (multiple indices for fallback)
const CC_API_ENDPOINTS = [
  'https://index.commoncrawl.org/CC-MAIN-2023-50-index',
  'https://index.commoncrawl.org/CC-MAIN-2023-40-index',
  'https://index.commoncrawl.org/CC-MAIN-2023-23-index',
  'https://index.commoncrawl.org/CC-MAIN-2023-14-index',
  'https://index.commoncrawl.org/CC-MAIN-2023-06-index'
];

/**
 * Get the latest Common Crawl index
 * @returns {Promise<string>} - URL of the latest index
 */
async function getLatestIndex() {
  try {
    // Check cache first
    const cachedIndex = indexCache.get('latest_index');
    if (cachedIndex) {
      return cachedIndex;
    }

    // Fetch latest index
    const response = await axios.get(COMMON_CRAWL_INDEX_URL);
    const indexes = response.data;
    
    if (!indexes || indexes.length === 0) {
      throw new Error('No Common Crawl indexes found');
    }
    
    // Get the latest index URL
    const latestIndex = indexes[0]['cdx-api'];
    
    // Cache the result
    indexCache.set('latest_index', latestIndex);
    
    return latestIndex;
  } catch (error) {
    console.error('Error fetching Common Crawl index:', error.message);
    // Fallback to a known index if we can't fetch the latest
    return 'https://index.commoncrawl.org/CC-MAIN-2023-50-index';
  }
}

/**
 * Search Common Crawl for URLs matching a topic
 * @param {string} topic - Topic name
 * @param {string[]} keywords - Additional keywords
 * @param {number} page - Page number (0-based)
 * @returns {Promise<string[]>} - Array of URLs
 */
async function searchCommonCrawl(topic, keywords = [], page = 0) {
  try {
    // Generate cache key
    const cacheKey = `${CACHE_KEY_PREFIX}${topic}_${keywords.join('_')}_${page}`;
    
    // Check cache first
    const cachedUrls = urlCache.get(cacheKey);
    if (cachedUrls) {
      console.log(`Using ${cachedUrls.length} cached URLs from Common Crawl for topic: ${topic}`);
      return cachedUrls;
    }
    
    // Generate search query
    let query = topic;
    if (keywords && keywords.length > 0) {
      query += ' ' + keywords.join(' ');
    }
    
    // Convert query to search terms for Common Crawl
    const searchTerms = query.split(' ').filter(term => term.length > 2);
    
    // Create URL patterns for the search
    // We'll search for URLs that contain any of the search terms
    const urlPatterns = searchTerms.map(term => `*${encodeURIComponent(term.toLowerCase())}*`);
    
    // Calculate offset based on page
    const offset = page * MAX_RESULTS_PER_QUERY;
    
    console.log(`Searching Common Crawl for: ${query} (page ${page})`);
    
    // Try each endpoint until we get results
    let results = null;
    
    for (const endpoint of CC_API_ENDPOINTS) {
      try {
        // Prepare search URL for this endpoint
        const searchUrl = `${endpoint}/cdx?url=${urlPatterns.join('|')}&output=json&fl=url,status,mime&filter=status:200&filter=mime:text/html&limit=${MAX_RESULTS_PER_QUERY}&offset=${offset}`;
        
        console.log(`Trying Common Crawl endpoint: ${endpoint}`);
        
        // Make the request
        const response = await axios.get(searchUrl, {
          timeout: 10000, // Shorter timeout to try multiple endpoints
          headers: {
            'User-Agent': 'RhinoSpider-SearchProxy/1.0'
          }
        });
        
        // Process the results
        results = response.data;
        
        if (results && Array.isArray(results) && results.length > 1) {
          console.log(`Got results from endpoint: ${endpoint}`);
          break; // We got results, stop trying endpoints
        }
      } catch (endpointError) {
        console.log(`Error with endpoint ${endpoint}: ${endpointError.message}`);
        // Continue to next endpoint
      }
    }
    
    if (!results || !Array.isArray(results) || results.length <= 1) {
      console.log(`No results from any Common Crawl endpoint for topic: ${topic}`);
      return [];
    }
    
    // First row contains column headers, skip it
    const urls = [];
    const seenUrls = new Set();
    
    for (let i = 1; i < results.length; i++) {
      const row = results[i];
      const url = row[0]; // URL is the first column
      
      // Skip unwanted domains
      if (
        url && 
        url.startsWith('http') && 
        !url.includes('google.com') && 
        !url.includes('youtube.com') && 
        !url.includes('bing.com') && 
        !url.includes('yahoo.com') && 
        !url.includes('baidu.com') &&
        !url.includes('facebook.com') &&
        !url.includes('twitter.com') &&
        !url.includes('instagram.com') &&
        !url.includes('linkedin.com')
      ) {
        // Add URL if not already in the list
        if (!seenUrls.has(url)) {
          urls.push(url);
          seenUrls.add(url);
        }
      }
    }
    
    console.log(`Found ${urls.length} URLs from Common Crawl for topic: ${topic}`);
    
    // Cache the results
    urlCache.set(cacheKey, urls);
    
    return urls;
  } catch (error) {
    console.error(`Error searching Common Crawl for topic ${topic}:`, error.message);
    return [];
  }
}

module.exports = {
  searchCommonCrawl
};
