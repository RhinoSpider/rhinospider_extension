/**
 * NewsAPI URL Generator
 * Fetches real URLs from NewsAPI.org
 */

const axios = require('axios');

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_API_BASE = 'https://newsapi.org/v2';

// Topic to keyword mapping for NewsAPI
const TOPIC_KEYWORDS = {
  'ai_agents_1': ['artificial intelligence', 'AI', 'machine learning', 'GPT', 'OpenAI'],
  'web3_security_1': ['blockchain', 'cryptocurrency', 'DeFi', 'Web3', 'crypto security', 'hack'],
  'depin_infra_1': ['DePIN', 'decentralized infrastructure', 'IoT blockchain', 'edge computing']
};

/**
 * Fetch URLs from NewsAPI
 * @param {string} topicId - Topic ID
 * @param {number} limit - Max URLs to return
 * @returns {Promise<Array>} Array of URLs
 */
async function fetchNewsAPIUrls(topicId, limit = 10) {
  const keywords = TOPIC_KEYWORDS[topicId] || TOPIC_KEYWORDS['web3_security_1'];
  const allUrls = [];
  
  console.log(`[NewsAPI] Fetching URLs for topic ${topicId} with keywords: ${keywords.join(', ')}`);
  
  try {
    // Try each keyword until we have enough URLs
    for (const keyword of keywords) {
      if (allUrls.length >= limit) break;
      
      const params = {
        q: keyword,
        sortBy: 'publishedAt',
        language: 'en',
        pageSize: Math.min(10, limit - allUrls.length),
        apiKey: NEWS_API_KEY
      };
      
      console.log(`[NewsAPI] Searching for: ${keyword}`);
      const response = await axios.get(`${NEWS_API_BASE}/everything`, { params, timeout: 5000 });
      
      if (response.data.articles) {
        for (const article of response.data.articles) {
          if (article.url && allUrls.length < limit) {
            allUrls.push({
              url: article.url,
              title: article.title || '',
              source: article.source?.name || 'NewsAPI',
              publishedAt: article.publishedAt || new Date().toISOString()
            });
          }
        }
        
        console.log(`[NewsAPI] Got ${response.data.articles.length} URLs for keyword: ${keyword}`);
      }
      
      // Rate limiting - wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
  } catch (error) {
    console.log(`[NewsAPI] Failed to fetch: ${error.message}`);
    if (error.response?.status === 429) {
      console.log(`[NewsAPI] Rate limited - consider upgrading API plan`);
    }
  }
  
  console.log(`[NewsAPI] Total URLs collected: ${allUrls.length}`);
  return allUrls;
}

/**
 * Generate URLs from NewsAPI
 * @param {string} topic - Topic name
 * @param {Array} keywords - Keywords (ignored for NewsAPI)
 * @param {number} page - Page number (ignored for NewsAPI)
 * @param {string} userId - User ID
 * @param {string} topicId - Topic ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Search results
 */
async function newsApiSearchForUrls(topic, keywords = [], page = 0, userId = 'anonymous', topicId = '', options = {}) {
  console.log(`[NewsAPI] Generating URLs for topic: ${topicId || topic}`);
  
  try {
    const urlObjects = await fetchNewsAPIUrls(topicId, 10);
    
    // Convert to simple URL strings
    const urls = urlObjects.map(obj => obj.url);
    
    console.log(`[NewsAPI] Returning ${urls.length} URLs for topic: ${topicId}`);
    
    return {
      urls: urls,
      source: 'newsapi',
      quotaInfo: {
        userId: userId,
        quotaExceeded: false,
        dailyUrlsScraped: urls.length,
        dailyLimit: 1000,
        resetTime: Date.now() + 86400000
      }
    };
  } catch (error) {
    console.error(`[NewsAPI] Error fetching URLs: ${error.message}`);
    
    // Return empty array if NewsAPI fails
    return {
      urls: [],
      source: 'newsapi_error',
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
  newsApiSearchForUrls,
  fetchNewsAPIUrls
};