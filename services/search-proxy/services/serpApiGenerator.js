/**
 * SerpAPI URL Generator
 * Fetches real URLs from SerpAPI (Google Search results)
 */

const axios = require('axios');

const SERP_API_KEY = process.env.SERP_API_KEY || '16f9cb080944d47eacc58e3a8496139dfe3e2a1c0c3e75da315415db28e72a28';
const SERP_API_BASE = 'https://serpapi.com/search';

// Topic to search query mapping for SerpAPI
const TOPIC_QUERIES = {
  'ai_agents_1': ['AI agents development', 'artificial intelligence tools', 'machine learning agents', 'AI automation'],
  'web3_security_1': ['blockchain security vulnerabilities', 'cryptocurrency hacks', 'DeFi exploits 2024', 'Web3 security news'],
  'depin_infra_1': ['DePIN decentralized infrastructure', 'IoT blockchain networks', 'decentralized physical infrastructure']
};

/**
 * Fetch URLs from SerpAPI
 * @param {string} topicId - Topic ID
 * @param {number} limit - Max URLs to return
 * @returns {Promise<Array>} Array of URLs
 */
async function fetchSerpApiUrls(topicId, limit = 10) {
  const queries = TOPIC_QUERIES[topicId] || TOPIC_QUERIES['web3_security_1'];
  const allUrls = [];
  
  console.log(`[SerpAPI] Fetching URLs for topic ${topicId} with queries: ${queries.join(', ')}`);
  
  try {
    // Try each query until we have enough URLs
    for (const query of queries) {
      if (allUrls.length >= limit) break;
      
      const params = {
        api_key: SERP_API_KEY,
        engine: 'google',
        q: query,
        num: Math.min(10, limit - allUrls.length),
        tbm: 'nws', // News search for more recent content
      };
      
      console.log(`[SerpAPI] Searching for: ${query}`);
      const response = await axios.get(SERP_API_BASE, { 
        params, 
        timeout: 10000 
      });
      
      if (response.data.news_results) {
        for (const result of response.data.news_results) {
          if (result.link && allUrls.length < limit) {
            allUrls.push({
              url: result.link,
              title: result.title || '',
              source: result.source || 'SerpAPI',
              snippet: result.snippet || '',
              date: result.date || new Date().toISOString()
            });
          }
        }
        
        console.log(`[SerpAPI] Got ${response.data.news_results?.length || 0} URLs from news search for: ${query}`);
      }
      
      // If no news results, try regular organic results
      if (response.data.organic_results && allUrls.length < limit) {
        for (const result of response.data.organic_results.slice(0, limit - allUrls.length)) {
          if (result.link && allUrls.length < limit) {
            allUrls.push({
              url: result.link,
              title: result.title || '',
              source: 'Google Search',
              snippet: result.snippet || ''
            });
          }
        }
        
        console.log(`[SerpAPI] Got ${response.data.organic_results?.length || 0} URLs from organic search for: ${query}`);
      }
      
      // Rate limiting - wait 200ms between requests (SerpAPI allows 100 req/month free)
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
  } catch (error) {
    console.log(`[SerpAPI] Failed to fetch: ${error.message}`);
    if (error.response?.status === 429) {
      console.log(`[SerpAPI] Rate limited - consider upgrading API plan`);
    } else if (error.response?.status === 403) {
      console.log(`[SerpAPI] API key invalid or quota exceeded`);
    }
  }
  
  console.log(`[SerpAPI] Total URLs collected: ${allUrls.length}`);
  return allUrls;
}

/**
 * Generate URLs from SerpAPI
 * @param {string} topic - Topic name
 * @param {Array} keywords - Keywords (ignored for SerpAPI)
 * @param {number} page - Page number (ignored for SerpAPI)
 * @param {string} userId - User ID
 * @param {string} topicId - Topic ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Search results
 */
async function serpApiSearchForUrls(topic, keywords = [], page = 0, userId = 'anonymous', topicId = '', options = {}) {
  console.log(`[SerpAPI] Generating URLs for topic: ${topicId || topic}`);
  
  try {
    const urlObjects = await fetchSerpApiUrls(topicId, 10);
    
    // Convert to simple URL strings
    const urls = urlObjects.map(obj => obj.url);
    
    console.log(`[SerpAPI] Returning ${urls.length} URLs for topic: ${topicId}`);
    
    return {
      urls: urls,
      source: 'serpapi',
      quotaInfo: {
        userId: userId,
        quotaExceeded: false,
        dailyUrlsScraped: urls.length,
        dailyLimit: 100, // SerpAPI free tier limit
        resetTime: Date.now() + 86400000
      }
    };
  } catch (error) {
    console.error(`[SerpAPI] Error fetching URLs: ${error.message}`);
    
    // Return empty array if SerpAPI fails
    return {
      urls: [],
      source: 'serpapi_error',
      error: error.message,
      quotaInfo: {
        userId: userId,
        quotaExceeded: false,
        dailyUrlsScraped: 0,
        dailyLimit: 100,
        resetTime: Date.now() + 86400000
      }
    };
  }
}

module.exports = {
  serpApiSearchForUrls,
  fetchSerpApiUrls
};