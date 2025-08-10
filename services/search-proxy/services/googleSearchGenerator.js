/**
 * Google Custom Search API Generator
 * Fetches real URLs from Google Custom Search
 */

const axios = require('axios');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyA98pgJjPSUgYOzZ89vVzypT1GTpYB4RYs';
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID || ''; // You'll need to create a Custom Search Engine

// Topic to search query mapping
const TOPIC_QUERIES = {
  'ai_agents_1': ['artificial intelligence news', 'AI technology', 'machine learning', 'ChatGPT OpenAI'],
  'web3_security_1': ['blockchain security', 'cryptocurrency hack', 'DeFi exploit', 'Web3 vulnerabilities'],
  'depin_infra_1': ['DePIN infrastructure', 'decentralized physical infrastructure', 'IoT blockchain']
};

/**
 * Fetch URLs from Google Custom Search
 * @param {string} topicId - Topic ID
 * @param {number} limit - Max URLs to return
 * @returns {Promise<Array>} Array of URLs
 */
async function fetchGoogleSearchUrls(topicId, limit = 10) {
  if (!GOOGLE_CSE_ID) {
    console.log('[GoogleSearch] No Custom Search Engine ID configured');
    return [];
  }

  const queries = TOPIC_QUERIES[topicId] || TOPIC_QUERIES['web3_security_1'];
  const allUrls = [];
  
  console.log(`[GoogleSearch] Fetching URLs for topic ${topicId} with queries: ${queries.join(', ')}`);
  
  try {
    // Try each query until we have enough URLs
    for (const query of queries) {
      if (allUrls.length >= limit) break;
      
      const params = {
        key: GOOGLE_API_KEY,
        cx: GOOGLE_CSE_ID,
        q: query,
        num: Math.min(10, limit - allUrls.length)
      };
      
      console.log(`[GoogleSearch] Searching for: ${query}`);
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', { 
        params, 
        timeout: 5000 
      });
      
      if (response.data.items) {
        for (const item of response.data.items) {
          if (item.link && allUrls.length < limit) {
            allUrls.push({
              url: item.link,
              title: item.title || '',
              source: 'Google Search',
              snippet: item.snippet || ''
            });
          }
        }
        
        console.log(`[GoogleSearch] Got ${response.data.items.length} URLs for query: ${query}`);
      }
      
      // Rate limiting - wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
  } catch (error) {
    console.log(`[GoogleSearch] Failed to fetch: ${error.message}`);
    if (error.response?.status === 403) {
      console.log(`[GoogleSearch] API quota exceeded or invalid key`);
    }
  }
  
  console.log(`[GoogleSearch] Total URLs collected: ${allUrls.length}`);
  return allUrls;
}

/**
 * Generate URLs from Google Custom Search
 * @param {string} topic - Topic name
 * @param {Array} keywords - Keywords (ignored for Google Search)
 * @param {number} page - Page number (ignored for Google Search)
 * @param {string} userId - User ID
 * @param {string} topicId - Topic ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Search results
 */
async function googleSearchForUrls(topic, keywords = [], page = 0, userId = 'anonymous', topicId = '', options = {}) {
  console.log(`[GoogleSearch] Generating URLs for topic: ${topicId || topic}`);
  
  try {
    const urlObjects = await fetchGoogleSearchUrls(topicId, 10);
    
    // Convert to simple URL strings
    const urls = urlObjects.map(obj => obj.url);
    
    console.log(`[GoogleSearch] Returning ${urls.length} URLs for topic: ${topicId}`);
    
    return {
      urls: urls,
      source: 'google_search',
      quotaInfo: {
        userId: userId,
        quotaExceeded: false,
        dailyUrlsScraped: urls.length,
        dailyLimit: 1000,
        resetTime: Date.now() + 86400000
      }
    };
  } catch (error) {
    console.error(`[GoogleSearch] Error fetching URLs: ${error.message}`);
    
    // Return empty array if Google Search fails
    return {
      urls: [],
      source: 'google_search_error',
      error: error.message,
      quotaInfo: {
        userId: userId,
        quotaExceeded: false,
        dailyUrlsScraped: 0,
        dailyLimit: 1000,
        resetTime: Date.now() + 86400000
      }
    };
  }
}

module.exports = {
  googleSearchForUrls,
  fetchGoogleSearchUrls
};