/**
 * Wikimedia API Search Service
 * Discovers URLs by querying the MediaWiki API for Wikipedia and other Wikimedia projects
 * No API key required - this is a public API
 */

const axios = require('axios');
const NodeCache = require('node-cache');

// Cache for Wikimedia results (24 hour TTL)
const wikiCache = new NodeCache({ stdTTL: 86400, checkperiod: 600 });
const CACHE_KEY_PREFIX = 'wiki_';

// Constants
const WIKIMEDIA_APIS = [
  'https://en.wikipedia.org/w/api.php',
  'https://commons.wikimedia.org/w/api.php',
  'https://en.wiktionary.org/w/api.php',
  'https://en.wikisource.org/w/api.php',
  'https://en.wikinews.org/w/api.php'
];

const MAX_RESULTS_PER_QUERY = 50;

/**
 * Search Wikimedia APIs for URLs related to a topic
 * @param {string} topic - Topic name
 * @param {string[]} keywords - Additional keywords to refine the search
 * @param {number} page - Page number (0-based)
 * @returns {Promise<string[]>} - Array of URLs
 */
async function searchWikimedia(topic, keywords = [], page = 0) {
  try {
    console.log(`Searching Wikimedia for topic: ${topic} (page ${page})`);
    
    // Combine topic and keywords for search
    const searchTerms = [topic, ...keywords].filter(Boolean).join(' ');
    
    // Generate cache key
    const cacheKey = `${CACHE_KEY_PREFIX}${searchTerms}_${page}`;
    
    // Check cache first
    const cachedResults = wikiCache.get(cacheKey);
    if (cachedResults) {
      console.log(`Using cached Wikimedia results for: ${searchTerms}`);
      return cachedResults;
    }
    
    const allUrls = [];
    
    // Calculate offset based on page
    const offset = page * MAX_RESULTS_PER_QUERY;
    
    // Process each Wikimedia API
    for (const apiUrl of WIKIMEDIA_APIS) {
      try {
        console.log(`Querying Wikimedia API: ${apiUrl} for: ${searchTerms}`);
        
        // Query parameters for the MediaWiki API
        const params = {
          action: 'query',
          list: 'search',
          srsearch: searchTerms,
          format: 'json',
          srlimit: Math.min(MAX_RESULTS_PER_QUERY, 50), // API limit is 50
          sroffset: offset,
          origin: '*' // Required for CORS
        };
        
        // Make the request to the MediaWiki API
        const response = await axios.get(apiUrl, { params });
        
        // Check if we got valid data
        if (!response.data || !response.data.query || !response.data.query.search) {
          console.log(`No results from Wikimedia API: ${apiUrl}`);
          continue;
        }
        
        // Extract page IDs from the search results
        const pages = response.data.query.search;
        
        // For each page, construct the URL
        for (const page of pages) {
          const title = encodeURIComponent(page.title.replace(/ /g, '_'));
          const baseUrl = apiUrl.replace('/w/api.php', '/wiki/');
          const url = `${baseUrl}${title}`;
          
          if (!allUrls.includes(url)) {
            allUrls.push(url);
          }
        }
        
        console.log(`Found ${pages.length} pages from Wikimedia API: ${apiUrl}`);
      } catch (error) {
        console.error(`Error searching Wikimedia API ${apiUrl}:`, error.message);
      }
    }
    
    // Cache the results
    wikiCache.set(cacheKey, allUrls);
    
    return allUrls;
  } catch (error) {
    console.error('Error in Wikimedia search:', error.message);
    return [];
  }
}

/**
 * Search for specific government domains in Wikimedia
 * @param {string[]} govDomains - Array of government domains to search for
 * @returns {Promise<string[]>} - Array of URLs
 */
async function searchGovSitemaps(govDomains = []) {
  try {
    if (!govDomains || govDomains.length === 0) {
      // Default government domains if none provided
      govDomains = [
        'gov', 'gov.uk', 'europa.eu', 'gc.ca', 'gov.au', 
        'government.se', 'bundesregierung.de', 'admin.ch'
      ];
    }
    
    const allUrls = [];
    
    // Search for each government domain
    for (const domain of govDomains) {
      const cacheKey = `${CACHE_KEY_PREFIX}gov_${domain}`;
      
      // Check cache first
      const cachedResults = wikiCache.get(cacheKey);
      if (cachedResults) {
        console.log(`Using cached government domain results for: ${domain}`);
        allUrls.push(...cachedResults);
        continue;
      }
      
      try {
        // Search Wikipedia for articles about this government domain
        const params = {
          action: 'query',
          list: 'search',
          srsearch: `${domain} site:${domain}`,
          format: 'json',
          srlimit: 50,
          origin: '*'
        };
        
        const response = await axios.get(WIKIMEDIA_APIS[0], { params });
        
        if (response.data && response.data.query && response.data.query.search) {
          const domainUrls = [];
          
          // Extract official websites from the search results
          for (const page of response.data.query.search) {
            const title = encodeURIComponent(page.title.replace(/ /g, '_'));
            const url = `https://${domain}`;
            
            if (!domainUrls.includes(url)) {
              domainUrls.push(url);
            }
          }
          
          // Cache the results for this domain
          wikiCache.set(cacheKey, domainUrls);
          
          // Add to overall results
          allUrls.push(...domainUrls);
        }
      } catch (error) {
        console.error(`Error searching for government domain ${domain}:`, error.message);
      }
    }
    
    return allUrls;
  } catch (error) {
    console.error('Error in government domain search:', error.message);
    return [];
  }
}

module.exports = {
  searchWikimedia,
  searchGovSitemaps
};
