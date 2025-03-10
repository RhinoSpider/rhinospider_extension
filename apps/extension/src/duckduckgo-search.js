/**
 * DuckDuckGo search functionality for RhinoSpider extension
 * This module provides URL generation from DuckDuckGo search results
 */

import { addCacheBusterToUrl } from './url-utils.js';

// Logger utility
const logger = {  
    log: (msg, data) => {
        console.log(`[DuckDuckGoSearch] ${msg}`, data || '');
    },
    error: (msg, error) => {
        console.error(`[DuckDuckGoSearch] ERROR: ${msg}`, error || '');
    },
    warn: (msg, data) => {
        console.warn(`[DuckDuckGoSearch] WARNING: ${msg}`, data || '');
    }
};

/**
 * Generate a search query from a topic
 * @param {Object} topic - Topic object with name and keywords
 * @returns {String} - Formatted search query
 */
const generateSearchQuery = (topic) => {
  let query = topic.name;
  
  // Add keywords if available
  if (topic.keywords && topic.keywords.length > 0) {
    // Take up to 3 keywords to avoid overly specific queries
    const keywordsToUse = topic.keywords.slice(0, 3);
    query += ` ${keywordsToUse.join(' ')}`;
  }
  
  return query;
};

// List of domain-specific URL patterns for common topics
const topicDomainPatterns = {
  // Finance/Cryptocurrency
  'bitcoin': [
    'https://www.coindesk.com/price/bitcoin/',
    'https://bitcoin.org/en/',
    'https://www.investopedia.com/terms/b/bitcoin.asp',
    'https://www.blockchain.com/explorer',
    'https://cointelegraph.com/tags/bitcoin'
  ],
  'cryptocurrency': [
    'https://www.coinmarketcap.com/',
    'https://www.binance.com/en/markets',
    'https://decrypt.co/',
    'https://www.coindesk.com/',
    'https://www.investopedia.com/terms/c/cryptocurrency.asp'
  ],
  'finance': [
    'https://www.bloomberg.com/',
    'https://www.cnbc.com/',
    'https://www.ft.com/',
    'https://www.wsj.com/',
    'https://www.investopedia.com/'
  ],
  
  // Technology
  'artificial intelligence': [
    'https://www.deeplearning.ai/',
    'https://openai.com/research/',
    'https://ai.google/',
    'https://www.technologyreview.com/topic/artificial-intelligence/',
    'https://www.ibm.com/watson/'
  ],
  'technology': [
    'https://techcrunch.com/',
    'https://www.theverge.com/',
    'https://www.wired.com/',
    'https://www.cnet.com/',
    'https://www.technologyreview.com/'
  ],
  
  // Default patterns for any topic
  'default': [
    'https://en.wikipedia.org/wiki/[TOPIC]',
    'https://www.reddit.com/search/?q=[TOPIC]',
    'https://medium.com/search?q=[TOPIC]',
    'https://www.quora.com/search?q=[TOPIC]',
    'https://www.youtube.com/results?search_query=[TOPIC]'
  ]
};

/**
 * Generate URLs based on topic name and keywords
 * This is a fallback method that doesn't require external API calls
 * @param {Object} topic - Topic object with name and keywords
 * @returns {Array} - Array of generated URLs
 */
const generateUrlsFromPatterns = (topic) => {
  const urls = [];
  const topicKey = topic.name.toLowerCase();
  const query = generateSearchQuery(topic);
  const encodedTopic = encodeURIComponent(topic.name);
  const encodedQuery = encodeURIComponent(query);
  
  // Check if we have specific patterns for this topic
  let patterns = [];
  
  // Look for exact match
  if (topicDomainPatterns[topicKey]) {
    patterns = patterns.concat(topicDomainPatterns[topicKey]);
  }
  
  // Look for partial matches
  Object.keys(topicDomainPatterns).forEach(key => {
    if (key !== 'default' && topicKey.includes(key)) {
      patterns = patterns.concat(topicDomainPatterns[key]);
    }
  });
  
  // Add default patterns
  patterns = patterns.concat(topicDomainPatterns['default']);
  
  // Process patterns and replace placeholders
  patterns.forEach(pattern => {
    let url = pattern;
    url = url.replace(/\[TOPIC\]/g, encodedTopic);
    url = url.replace(/\[QUERY\]/g, encodedQuery);
    
    // Add some randomization to URLs to avoid duplicates
    if (url.includes('?')) {
      url += `&t=${Date.now()}`;
    } else if (!url.endsWith('/')) {
      url += `?t=${Date.now()}`;
    } else {
      url += `?t=${Date.now()}`;
    }
    
    urls.push(url);
  });
  
  // Add some well-known sites with the topic as search term
  const wellKnownSites = [
    `https://www.nytimes.com/search?query=${encodedQuery}`,
    `https://www.theguardian.com/search?q=${encodedQuery}`,
    `https://scholar.google.com/scholar?q=${encodedQuery}`,
    `https://www.sciencedirect.com/search?qs=${encodedQuery}`,
    `https://www.forbes.com/search/?q=${encodedQuery}`
  ];
  
  urls.push(...wellKnownSites);
  
  // Shuffle the URLs to randomize the order
  return urls.sort(() => Math.random() - 0.5);
};

/**
 * Get URLs for a topic using pattern-based generation
 * @param {Object} topic - Topic object with name and keywords
 * @returns {Promise<Array>} - Promise resolving to array of URLs
 */
const getUrlsForTopic = async (topic) => {
  if (!topic || !topic.name) {
    logger.error('Invalid topic provided');
    return [];
  }
  
  try {
    logger.log(`Generating URLs for topic: ${topic.name}`);
    const urls = generateUrlsFromPatterns(topic);
    logger.log(`Generated ${urls.length} URLs for topic "${topic.name}"`);
    
    // Add cache busters to URLs
    const urlsWithCacheBusters = urls.map(url => addCacheBusterToUrl(url));
    
    return urlsWithCacheBusters;
  } catch (error) {
    logger.error(`Failed to generate URLs for topic "${topic.name}":`, error);
    return [];
  }
};

// Export the module functions
export {
  getUrlsForTopic
};
