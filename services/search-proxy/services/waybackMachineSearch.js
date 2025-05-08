/**
 * Wayback Machine CDX API Search Service
 * Discovers URLs by querying the Wayback Machine's CDX Server API
 * No API key required - this is a public API
 */

const axios = require('axios');
const NodeCache = require('node-cache');
const urlParser = require('url');

// Cache for Wayback Machine results (24 hour TTL)
const waybackCache = new NodeCache({ stdTTL: 86400, checkperiod: 600 });
const CACHE_KEY_PREFIX = 'wb_';

// Constants
const CDX_API_URL = 'https://web.archive.org/cdx/search/cdx';
const MAX_RESULTS_PER_QUERY = 100;

/**
 * Search Wayback Machine CDX API for URLs related to a topic
 * @param {string} topic - Topic name
 * @param {string[]} domains - Array of domains to search within
 * @param {number} page - Page number (0-based)
 * @returns {Promise<string[]>} - Array of URLs
 */
async function searchWaybackMachine(topic, domains = [], page = 0) {
  try {
    console.log(`Searching Wayback Machine for topic: ${topic} (page ${page})`);
    
    // Generate cache key
    const cacheKey = `${CACHE_KEY_PREFIX}${topic}_${domains.join('_')}_${page}`;
    
    // Check cache first
    const cachedResults = waybackCache.get(cacheKey);
    if (cachedResults) {
      console.log(`Using cached Wayback Machine results for: ${topic}`);
      return cachedResults;
    }
    
    // If no domains provided, we can't use the Wayback Machine effectively
    if (!domains || domains.length === 0) {
      console.log('No domains provided for Wayback Machine search');
      return [];
    }
    
    const allUrls = [];
    
    // Process each domain
    for (const domain of domains) {
      try {
        // Clean up the domain
        let cleanDomain = domain;
        if (cleanDomain.startsWith('http')) {
          // Extract just the hostname
          const parsed = urlParser.parse(cleanDomain);
          cleanDomain = parsed.hostname;
        }
        
        // Calculate offset based on page
        const offset = page * MAX_RESULTS_PER_QUERY;
        
        // Query parameters for the CDX API
        const params = {
          url: cleanDomain,
          matchType: 'domain',
          filter: 'statuscode:200',
          collapse: 'urlkey',
          output: 'json',
          limit: MAX_RESULTS_PER_QUERY,
          offset: offset
        };
        
        // Add the topic as a filter if provided
        if (topic) {
          // Convert spaces to underscores for URL-friendly format
          const formattedTopic = topic.replace(/\\s+/g, '_');
          params.filter += `,~url:.*${formattedTopic}.*`;
        }
        
        console.log(`Querying Wayback Machine CDX API for domain: ${cleanDomain}`);
        
        // Make the request to the CDX API
        const response = await axios.get(CDX_API_URL, { params });
        
        // Check if we got valid data
        if (!response.data || !Array.isArray(response.data) || response.data.length <= 1) {
          console.log(`No results from Wayback Machine for domain: ${cleanDomain}`);
          continue;
        }
        
        // The first row contains column headers
        const headers = response.data[0];
        const urlIndex = headers.indexOf('url');
        
        if (urlIndex === -1) {
          console.log('URL column not found in Wayback Machine response');
          continue;
        }
        
        // Extract URLs from the response (skip the header row)
        const urls = response.data.slice(1).map(row => row[urlIndex]);
        
        // Filter out duplicates and add to results
        urls.forEach(url => {
          if (!allUrls.includes(url)) {
            allUrls.push(url);
          }
        });
        
        console.log(`Found ${urls.length} URLs from Wayback Machine for domain: ${cleanDomain}`);
      } catch (error) {
        console.error(`Error searching Wayback Machine for domain ${domain}:`, error.message);
      }
    }
    
    // Cache the results
    waybackCache.set(cacheKey, allUrls);
    
    return allUrls;
  } catch (error) {
    console.error('Error in Wayback Machine search:', error.message);
    return [];
  }
}

module.exports = {
  searchWaybackMachine
};
