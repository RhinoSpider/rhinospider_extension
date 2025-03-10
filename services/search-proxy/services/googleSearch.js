const axios = require('axios');
const cheerio = require('cheerio');
const querystring = require('querystring');

// List of user agents to rotate
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36'
];

// Get a random user agent
function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Delay function to avoid rate limiting
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Search Google for a topic and extract URLs
 * @param {string} topic - Topic name
 * @param {string[]} keywords - Additional keywords
 * @param {number} page - Page number (0-based)
 * @returns {Promise<string[]>} - Array of URLs
 */
async function searchGoogle(topic, keywords = [], page = 0) {
  try {
    // Generate search query
    let query = topic;
    if (keywords && keywords.length > 0) {
      query += ' ' + keywords.join(' ');
    }
    
    // Calculate start parameter (10 results per page)
    const start = page * 10;
    
    // Construct search URL
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&start=${start}`;
    
    console.log(`Searching Google for: ${query} (page ${page})`);
    
    // Make request with a random user agent and proper headers
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.google.com/',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      responseEncoding: 'latin1', // Important for proper character encoding
      timeout: 15000,
      maxRedirects: 5
    });
    
    // Parse HTML
    const $ = cheerio.load(response.data);
    
    // Extract URLs from search results using the correct selectors from Stack Overflow
    const urls = [];
    
    // Use the '.egMi0' selector as suggested in the Stack Overflow post
    $('.egMi0').each((i, element) => {
      const href = $(element).find('a').attr('href');
      
      // Skip if no href
      if (!href) return;
      
      let url = href;
      
      // Handle Google redirects that start with /url?q=
      if (href.startsWith('/url?q=')) {
        // Extract actual URL
        url = href.substring(7); // Remove /url?q=
        
        // Remove Google tracking parameters
        const endIndex = url.indexOf('&');
        if (endIndex !== -1) {
          url = url.substring(0, endIndex);
        }
        
        // Decode URL
        url = decodeURIComponent(url);
      }
      
      // Skip Google-specific URLs and other search engines/social media
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
        if (!urls.includes(url)) {
          urls.push(url);
        }
      }
    });
    
    // Fallback: If the egMi0 selector didn't work, try other common Google result selectors
    if (urls.length === 0) {
      console.log(`No URLs found with egMi0 selector for topic ${topic}, trying alternative selectors`);
      
      // Try different Google result selectors
      const selectors = [
        '.g .yuRUbf a', // Common selector for Google results
        '.tF2Cxc .yuRUbf a', // Another common pattern
        '.g .rc .r a', // Older Google format
        '.srg .g .rc .r a', // Another older format
        'a.l', // Simple links
        '.rc .yuRUbf a', // Another variation
        '.g a[href^="http"]', // Any link in a result that starts with http
        '.g a[href^="/url?q="]' // Any Google redirect link
      ];
      
      // Try each selector
      for (const selector of selectors) {
        $(selector).each((i, element) => {
          const href = $(element).attr('href');
          if (!href) return;
          
          let url = href;
          
          // Handle Google redirects
          if (href.startsWith('/url?q=')) {
            url = href.substring(7); // Remove /url?q=
            const endIndex = url.indexOf('&');
            if (endIndex !== -1) {
              url = url.substring(0, endIndex);
            }
            url = decodeURIComponent(url);
          }
          
          // Skip unwanted domains
          if (
            url && 
            url.startsWith('http') && 
            !url.includes('google.com') && 
            !url.includes('youtube.com') && 
            !urls.includes(url)
          ) {
            urls.push(url);
          }
        });
        
        // If we found URLs with this selector, no need to try others
        if (urls.length > 0) {
          console.log(`Found ${urls.length} URLs using selector: ${selector}`);
          break;
        }
      }
      
      console.log(`After alternative extraction, found ${urls.length} URLs for topic ${topic}`);
    }
    
    // Generate additional URL variations to ensure we get enough
    const baseUrls = [...urls];
    
    // For each base URL, try adding common paths
    baseUrls.forEach(baseUrl => {
      try {
        const url = new URL(baseUrl);
        
        // Skip URLs that already have a path
        if (url.pathname !== '/' && url.pathname !== '') {
          return;
        }
        
        // Add common paths
        const commonPaths = ['/blog', '/articles', '/news', '/resources', '/learn'];
        
        commonPaths.forEach(path => {
          const newUrl = `${url.origin}${path}`;
          if (!urls.includes(newUrl)) {
            urls.push(newUrl);
          }
        });
      } catch (error) {
        // Skip invalid URLs
      }
    });
    
    console.log(`Found ${urls.length} URLs for topic: ${topic} (page ${page})`);
    
    return urls;
  } catch (error) {
    console.error(`Error searching Google for topic ${topic}:`, error.message);
    return [];
  }
}

/**
 * Create variations of a search query to get more diverse results
 * @param {string} topic - Base topic
 * @returns {string[]} - Array of query variations
 */
function createQueryVariations(topic) {
  return [
    topic,
    `${topic} guide`,
    `${topic} tutorial`,
    `${topic} examples`,
    `${topic} best practices`,
    `${topic} how to`,
    `learn ${topic}`,
    `${topic} for beginners`,
    `${topic} advanced`,
    `${topic} tips`
  ];
}

module.exports = {
  searchGoogle,
  createQueryVariations
};
