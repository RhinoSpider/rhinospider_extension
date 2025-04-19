const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');
const { setTimeout } = require('timers/promises');

// Cache for search results (1 hour TTL)
const resultCache = new NodeCache({ stdTTL: 3600, checkperiod: 300 });

// Track usage to implement rate limiting and rotation
const engineUsage = {
  duckduckgo: { lastUsed: 0, count: 0, errors: 0, backoffUntil: 0 },
  bing: { lastUsed: 0, count: 0, errors: 0, backoffUntil: 0 },
  brave: { lastUsed: 0, count: 0, errors: 0, backoffUntil: 0 },
  yandex: { lastUsed: 0, count: 0, errors: 0, backoffUntil: 0 }
};

// List of search engines to rotate
const searchEngines = [
  {
    name: 'duckduckgo',
    searchUrl: 'https://html.duckduckgo.com/html/?q=',
    resultSelector: '.result .links_main a',
    extractUrl: ($, el) => {
      const href = $(el).attr('href');
      if (!href) return null;
      
      // DuckDuckGo HTML search uses redirects
      if (href.includes('/d.js?')) {
        const urlParam = new URLSearchParams(href.split('?')[1]).get('uddg');
        if (urlParam) {
          return decodeURIComponent(urlParam);
        }
      }
      return href;
    },
    paginationParam: (page) => `&s=${page * 30}`
  },
  {
    name: 'bing',
    searchUrl: 'https://www.bing.com/search?q=',
    resultSelector: '.b_algo h2 a',
    extractUrl: ($, el) => $(el).attr('href'),
    paginationParam: (page) => `&first=${page * 10 + 1}`
  },
  {
    name: 'brave',
    searchUrl: 'https://search.brave.com/search?q=',
    resultSelector: '.snippet a.h',
    extractUrl: ($, el) => $(el).attr('href'),
    paginationParam: (page) => `&offset=${page * 10}`
  },
  {
    name: 'yandex',
    searchUrl: 'https://yandex.com/search/?text=',
    resultSelector: '.serp-item a.link',
    extractUrl: ($, el) => $(el).attr('href'),
    paginationParam: (page) => `&p=${page}`
  }
];

/**
 * Get a random user agent
 * @returns {string} - Random user agent
 */
function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  ];
  
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * Select the best engine to use based on usage history
 * @returns {Object} - Selected search engine
 */
function selectEngine() {
  const now = Date.now();
  
  // Filter out engines with too many errors or in backoff
  const availableEngines = searchEngines.filter(engine => {
    const usage = engineUsage[engine.name];
    return usage.errors < 5 && now > usage.backoffUntil;
  });
  
  if (availableEngines.length === 0) {
    // Reset errors if all engines have errors
    searchEngines.forEach(engine => {
      engineUsage[engine.name].errors = 0;
      engineUsage[engine.name].backoffUntil = 0;
    });
    
    // Sort by last used (oldest first)
    return searchEngines.sort((a, b) => {
      return engineUsage[a.name].lastUsed - engineUsage[b.name].lastUsed;
    })[0];
  }
  
  // Sort by last used (oldest first)
  return availableEngines.sort((a, b) => {
    return engineUsage[a.name].lastUsed - engineUsage[b.name].lastUsed;
  })[0];
}

/**
 * Search using a specific engine
 * @param {Object} engine - Search engine configuration
 * @param {string} query - Search query
 * @param {number} page - Page number
 * @returns {Promise<string[]>} - Array of URLs
 */
async function searchWithEngine(engine, query, page = 0) {
  try {
    // Track usage
    engineUsage[engine.name].lastUsed = Date.now();
    engineUsage[engine.name].count++;
    
    // Construct search URL
    const searchUrl = `${engine.searchUrl}${encodeURIComponent(query)}${engine.paginationParam(page)}`;
    
    console.log(`Searching ${engine.name} for: ${query} (page ${page})`);
    
    // Make the request
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      responseEncoding: 'utf-8',
      timeout: 10000,
      maxRedirects: 5
    });
    
    // Parse HTML
    const $ = cheerio.load(response.data);
    
    // Extract URLs from search results
    const urls = [];
    const seenUrls = new Set();
    
    $(engine.resultSelector).each((i, element) => {
      const url = engine.extractUrl($, element);
      
      // Skip if no URL
      if (!url) return;
      
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
        !url.includes('linkedin.com') &&
        !url.includes('duckduckgo.com') &&
        !url.includes('brave.com') &&
        !url.includes('yandex.com')
      ) {
        // Add URL if not already in the list
        if (!seenUrls.has(url)) {
          urls.push(url);
          seenUrls.add(url);
        }
      }
    });
    
    console.log(`Found ${urls.length} URLs from ${engine.name} for query: ${query}`);
    
    // Reset error count on success
    engineUsage[engine.name].errors = 0;
    
    return urls;
  } catch (error) {
    console.error(`Error with ${engine.name}:`, error.message);
    
    // Increment error count
    engineUsage[engine.name].errors++;
    
    // Implement exponential backoff
    const backoffMinutes = Math.min(Math.pow(2, engineUsage[engine.name].errors), 60);
    const backoffMs = backoffMinutes * 60 * 1000;
    engineUsage[engine.name].backoffUntil = Date.now() + backoffMs;
    
    console.log(`${engine.name} in backoff for ${backoffMinutes} minutes`);
    
    return [];
  }
}

/**
 * Search for URLs using search engine rotation
 * @param {string} topic - Topic name
 * @param {string[]} keywords - Additional keywords
 * @param {number} page - Page number (0-based)
 * @returns {Promise<string[]>} - Array of URLs
 */
async function searchWithRotation(topic, keywords = [], page = 0) {
  try {
    // Generate search query
    let query = topic;
    if (keywords && keywords.length > 0) {
      query += ' ' + keywords.join(' ');
    }
    
    // Generate cache key
    const cacheKey = `rotation_${query}_${page}`;
    
    // Check cache first
    const cachedUrls = resultCache.get(cacheKey);
    if (cachedUrls) {
      console.log(`Using ${cachedUrls.length} cached URLs from rotation for query: ${query}`);
      return cachedUrls;
    }
    
    // Select engine
    const engine = selectEngine();
    console.log(`Using search engine: ${engine.name}`);
    
    // Search with selected engine
    const urls = await searchWithEngine(engine, query, page);
    
    // If we got results, cache them
    if (urls.length > 0) {
      resultCache.set(cacheKey, urls);
    } else {
      // If no results, try another engine after a short delay
      await setTimeout(1000);
      
      // Exclude the engine we just tried
      const nextEngine = searchEngines.find(e => e.name !== engine.name && engineUsage[e.name].errors < 5);
      
      if (nextEngine) {
        console.log(`No results from ${engine.name}, trying ${nextEngine.name}`);
        const nextUrls = await searchWithEngine(nextEngine, query, page);
        
        if (nextUrls.length > 0) {
          resultCache.set(cacheKey, nextUrls);
          return nextUrls;
        }
      }
    }
    
    return urls;
  } catch (error) {
    console.error(`Error in searchWithRotation for topic ${topic}:`, error.message);
    return [];
  }
}

module.exports = {
  searchWithRotation
};
