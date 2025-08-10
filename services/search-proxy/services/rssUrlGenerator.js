/**
 * RSS Feed URL Generator
 * Fetches real URLs from RSS feeds - NO API KEY NEEDED!
 */

const Parser = require('rss-parser');
const parser = new Parser({
  timeout: 5000,
  headers: {
    'User-Agent': 'RhinoSpider/1.0'
  }
});

// RSS feeds for different topics
const RSS_FEEDS = {
  'ai_agents_1': [
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    'https://venturebeat.com/ai/feed/',
    'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
    'https://www.wired.com/feed/category/artificial-intelligence/latest/rss',
    'https://www.artificialintelligence-news.com/feed/'
  ],
  'web3_security_1': [
    'https://cointelegraph.com/rss',
    'https://www.theblock.co/rss.xml',
    'https://decrypt.co/feed',
    'https://cryptoslate.com/feed/',
    'https://rekt.news/feed.xml',
    'https://blog.chainalysis.com/reports/feed/'
  ],
  'depin_infra_1': [
    'https://messari.io/rss',
    'https://www.coindesk.com/arc/outboundfeeds/rss/',
    'https://cryptobriefing.com/feed/',
    'https://bitcoinmagazine.com/feed',
    'https://news.bitcoin.com/feed/'
  ]
};

/**
 * Fetch URLs from RSS feeds
 * @param {string} topicId - Topic ID
 * @param {number} limit - Max URLs to return
 * @returns {Promise<Array>} Array of URLs
 */
async function fetchRSSUrls(topicId, limit = 10) {
  const feeds = RSS_FEEDS[topicId] || RSS_FEEDS['web3_security_1'];
  const allUrls = [];
  
  console.log(`[RSS] Fetching URLs for topic ${topicId} from ${feeds.length} feeds`);
  
  // Try to fetch from each feed
  for (const feedUrl of feeds) {
    if (allUrls.length >= limit) break;
    
    try {
      console.log(`[RSS] Trying feed: ${feedUrl}`);
      const feed = await parser.parseURL(feedUrl);
      
      // Extract URLs from feed items
      const items = feed.items.slice(0, Math.min(5, limit - allUrls.length));
      for (const item of items) {
        if (item.link) {
          allUrls.push({
            url: item.link,
            title: item.title || '',
            source: new URL(feedUrl).hostname,
            publishedAt: item.pubDate || new Date().toISOString()
          });
        }
      }
      
      console.log(`[RSS] Got ${items.length} URLs from ${feedUrl}`);
    } catch (error) {
      console.log(`[RSS] Failed to fetch ${feedUrl}: ${error.message}`);
      // Continue with next feed
    }
  }
  
  console.log(`[RSS] Total URLs collected: ${allUrls.length}`);
  return allUrls;
}

/**
 * Generate URLs from RSS feeds
 * @param {string} topic - Topic name
 * @param {Array} keywords - Keywords (ignored for RSS)
 * @param {number} page - Page number (ignored for RSS)
 * @param {string} userId - User ID
 * @param {string} topicId - Topic ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Search results
 */
async function rssSearchForUrls(topic, keywords = [], page = 0, userId = 'anonymous', topicId = '', options = {}) {
  console.log(`[RSS] Generating URLs for topic: ${topicId || topic}`);
  
  try {
    const urlObjects = await fetchRSSUrls(topicId, 10);
    
    // Convert to simple URL strings
    const urls = urlObjects.map(obj => obj.url);
    
    console.log(`[RSS] Returning ${urls.length} URLs for topic: ${topicId}`);
    
    return {
      urls: urls,
      source: 'rss_feeds',
      quotaInfo: {
        userId: userId,
        quotaExceeded: false,
        dailyUrlsScraped: urls.length,
        dailyLimit: 1000,
        resetTime: Date.now() + 86400000
      }
    };
  } catch (error) {
    console.error(`[RSS] Error fetching URLs: ${error.message}`);
    
    // Fallback to basic URLs if RSS fails
    const fallbackUrls = [
      'https://cointelegraph.com',
      'https://decrypt.co',
      'https://theblock.co',
      'https://techcrunch.com',
      'https://venturebeat.com'
    ].map(url => `${url}?t=${Date.now()}`);
    
    return {
      urls: fallbackUrls,
      source: 'rss_fallback',
      quotaInfo: {
        userId: userId,
        quotaExceeded: false,
        dailyUrlsScraped: fallbackUrls.length,
        dailyLimit: 1000,
        resetTime: Date.now() + 86400000
      }
    };
  }
}

module.exports = {
  rssSearchForUrls,
  fetchRSSUrls
};