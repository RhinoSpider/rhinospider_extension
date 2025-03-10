const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

// Google search URL
const GOOGLE_SEARCH_URL = 'https://www.google.com/search';

// Create an axios instance with longer timeout and keep-alive
const axiosInstance = axios.create({
  timeout: 30000,
  httpsAgent: new https.Agent({ keepAlive: true }),
  maxRedirects: 5
});

/**
 * Generate a search query based on topic name and keywords
 * @param {Object} topic - Topic object with name and keywords
 * @returns {String} - Formatted search query
 */
const generateSearchQuery = (topic) => {
  let query = topic.name;
  
  if (topic.keywords && topic.keywords.length > 0) {
    const keywordsString = topic.keywords.join(' ');
    query += ` ${keywordsString}`;
  }
  
  return query;
};

/**
 * Generate a Google search URL with query and page number
 * @param {String} query - Search query
 * @param {Number} page - Page number (0-based)
 * @returns {String} - Google search URL
 */
const generateSearchUrl = (query, page = 0) => {
  const start = page * 10; // Google uses 10 results per page
  return `${GOOGLE_SEARCH_URL}?q=${encodeURIComponent(query)}&start=${start}`;
};

/**
 * Extract URLs from Google search results HTML
 * @param {String} html - HTML content from Google search page
 * @returns {Array} - Array of extracted URLs
 */
const extractSearchResultUrls = (html) => {
  const urls = [];
  const $ = cheerio.load(html);
  
  // Log a sample of the HTML for debugging
  console.log('HTML sample (first 200 chars):', html.substring(0, 200));
  
  // Extract URLs from search results
  $('a').each((i, element) => {
    const href = $(element).attr('href');
    
    // Filter Google search result URLs
    if (href && href.startsWith('/url?q=')) {
      // Extract actual URL from Google's redirect URL
      let url = href.substring(7); // Remove '/url?q='
      const endIndex = url.indexOf('&');
      
      if (endIndex !== -1) {
        url = url.substring(0, endIndex);
      }
      
      // Decode URL
      url = decodeURIComponent(url);
      
      // Filter out Google's own domains and duplicates
      if (!url.includes('google.com') && !urls.includes(url)) {
        urls.push(url);
      }
    }
  });
  
  // Try alternative extraction method if no URLs found
  if (urls.length === 0) {
    console.log('No URLs found with primary method, trying alternative extraction...');
    
    // Look for div elements with class 'g' (Google search result container)
    $('.g').each((i, element) => {
      // Find the first a tag with href attribute
      const link = $(element).find('a[href]').first();
      const href = link.attr('href');
      
      if (href && !href.startsWith('/') && !href.includes('google.com') && !urls.includes(href)) {
        urls.push(href);
      }
    });
  }
  
  return urls;
};

/**
 * Perform Google search for a topic and extract URLs
 * @param {Object} topic - Topic object with name and keywords
 * @param {Object} session - Session object to store URLs
 * @returns {Array} - Array of extracted URLs
 */
const searchGoogle = async (topic, session = { urls: [] }) => {
  console.log(`Starting search for topic: ${topic.name}`);
  
  // Track if we're being blocked by Google
  let isBlocked = false;
  try {
    const query = generateSearchQuery(topic);
    const maxPages = 10; // Fetch up to 10 pages (approximately 100 results)
    const allUrls = [];
    
    // Fetch multiple pages of search results
    for (let page = 0; page < maxPages; page++) {
      const searchUrl = generateSearchUrl(query, page);
      
      console.log(`Fetching search results for "${query}" - Page ${page + 1}`);
      
      // Use axios to fetch the page with a realistic user agent
      const response = await axiosInstance.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.google.com/',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'document',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'same-origin',
          'sec-fetch-user': '?1',
          'upgrade-insecure-requests': '1'
        },
        timeout: 15000 // 15 second timeout
      });
      
      if (response.status !== 200) {
        console.error(`Failed to fetch page ${page + 1}: HTTP ${response.status}`);
        isBlocked = true;
        break;
      }
      
      // Check if we're being blocked (look for CAPTCHA or JavaScript challenge)
      if (response.data.includes('Our systems have detected unusual traffic') ||
          response.data.includes('Please click here if you are not redirected') ||
          response.data.includes('noscript')) {
        console.log('Google is blocking our requests with a CAPTCHA or JavaScript challenge');
        isBlocked = true;
      }
      
      // Extract URLs from the HTML
      const urls = extractSearchResultUrls(response.data);
      console.log(`Found ${urls.length} URLs on page ${page + 1}`);
      
      // Add URLs to the result array
      allUrls.push(...urls);
      
      // If we didn't find any URLs, stop fetching more pages
      if (urls.length === 0) {
        break;
      }
      
      // Add a delay between requests to avoid being blocked
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    }
    
    // Update session with found URLs
    session.urls = allUrls;
    session.currentIndex = 0;
    
    console.log(`Total URLs found for topic "${topic.name}": ${allUrls.length}`);
    
    // Log if we're being blocked and didn't find any URLs
    if (isBlocked && allUrls.length === 0) {
      console.log(`Google is blocking our requests for topic "${topic.name}". Consider implementing a more sophisticated approach.`);
    }
    
    return allUrls;
  } catch (error) {
    console.error('Error during Google search:', error.message);
    
    // Return empty array in case of error
    return [];
  }
};

/**
 * Get the next batch of URLs from a session
 * @param {Object} session - Session object with URLs and current index
 * @param {Number} batchSize - Number of URLs to return in this batch
 * @returns {Array} - Array of URLs for this batch
 */
const getNextBatch = async (session, batchSize) => {
  const { urls, currentIndex } = session;
  
  // Calculate end index for this batch
  const endIndex = Math.min(currentIndex + batchSize, urls.length);
  
  // Get URLs for this batch
  const batch = urls.slice(currentIndex, endIndex);
  
  // Update session's current index
  session.currentIndex = endIndex;
  
  return batch;
};

/**
 * Try to fetch search results using a proxy service if direct Google search fails
 * @param {Object} topic - Topic object with name and keywords
 * @param {Object} session - Session object to store URLs
 * @returns {Array} - Array of extracted URLs
 */
const tryProxySearch = async (topic, session = { urls: [] }) => {
  try {
    console.log(`Attempting proxy search for topic: ${topic.name}`);
    
    // Use a different search engine or approach that's less likely to be blocked
    // For this implementation, we'll use a different user agent and request pattern
    
    const query = generateSearchQuery(topic);
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`;
    
    const response = await axiosInstance.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      },
      // Use a different approach to avoid fingerprinting
      decompress: true,
      timeout: 20000
    });
    
    if (response.status !== 200) {
      console.log(`Proxy search failed with status: ${response.status}`);
      return [];
    }
    
    // Extract URLs using a more robust approach
    const $ = cheerio.load(response.data);
    const urls = [];
    
    // Try multiple selector patterns to find URLs
    $('a[href]').each((i, element) => {
      const href = $(element).attr('href');
      
      // Process URLs from search results
      if (href && href.startsWith('http') && !href.includes('google.com')) {
        // Clean the URL
        let url = href;
        
        // Remove tracking parameters if present
        if (url.includes('?')) {
          url = url.split('?')[0];
        }
        
        // Add to results if unique
        if (!urls.includes(url)) {
          urls.push(url);
        }
      }
    });
    
    console.log(`Proxy search found ${urls.length} URLs for topic "${topic.name}"`);    
    return urls;
  } catch (error) {
    console.error('Error during proxy search:', error.message);
    return [];
  }
};

const searchGoogleForMultipleTopics = async (topics, session = { urls: [] }) => {
  console.log(`Processing ${topics.length} topics for search`);
  try {
    const allUrls = [];
    
    // Randomize the order of topics
    const shuffledTopics = [...topics].sort(() => Math.random() - 0.5);
    
    // Limit the number of topics to process (to avoid excessive searching)
    const topicsToProcess = shuffledTopics.slice(0, Math.min(5, shuffledTopics.length));
    
    console.log(`Processing ${topicsToProcess.length} topics for search`);
    
    // Process each topic
    for (const topic of topicsToProcess) {
      console.log(`Searching for topic: ${topic.name}`);
      
      // Get URLs for this topic
      let urls = await searchGoogle(topic);
      
      // If no URLs found, try proxy search as fallback
      if (urls.length === 0) {
        console.log(`No URLs found with primary method for "${topic.name}", trying proxy search...`);
        urls = await tryProxySearch(topic);
      }
      
      // Add URLs to the result array
      allUrls.push(...urls);
      
      // If we have enough URLs, stop processing more topics
      if (allUrls.length >= 500) {
        console.log(`Reached target of 500+ URLs (${allUrls.length}), stopping search`);
        break;
      }
      
      // Add a delay between topics
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    }
    
    // Randomize the order of URLs
    const shuffledUrls = [...allUrls].sort(() => Math.random() - 0.5);
    
    // Update session with found URLs
    session.urls = shuffledUrls;
    session.currentIndex = 0;
    
    console.log(`Total URLs found for ${topicsToProcess.length} topics: ${shuffledUrls.length}`);
    
    return shuffledUrls;
  } catch (error) {
    console.error('Error during multi-topic Google search:', error.message);
    
    // Return empty array in case of error
    return [];
  }
};

module.exports = {
  searchGoogle,
  searchGoogleForMultipleTopics,
  getNextBatch,
  tryProxySearch,
  generateSearchQuery,
  generateSearchUrl,
  extractSearchResultUrls
};
