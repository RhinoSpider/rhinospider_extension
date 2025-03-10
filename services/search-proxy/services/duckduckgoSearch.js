const axios = require('axios');
const cheerio = require('cheerio');

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
 * Search DuckDuckGo for a topic and extract URLs
 * @param {string} topic - Topic name
 * @param {string[]} keywords - Additional keywords
 * @param {number} page - Page number (0-based)
 * @returns {Promise<string[]>} - Array of URLs
 */
async function searchDuckDuckGo(topic, keywords = [], page = 0) {
  try {
    // Generate search query
    let query = topic;
    if (keywords && keywords.length > 0) {
      query += ' ' + keywords.join(' ');
    }
    
    // Determine how many pages to fetch based on the requested page
    // For page 0, fetch 3 pages; for page 1, fetch pages 3-5, etc.
    const startPageOffset = page * 3;
    const pagesToFetch = 3; // Fetch 3 pages at a time
    
    // Array to hold all URLs
    const allUrls = [];
    
    // Fetch multiple pages in parallel
    const fetchPromises = [];
    
    for (let i = 0; i < pagesToFetch; i++) {
      const currentPage = startPageOffset + i;
      const start = currentPage * 30; // DuckDuckGo uses 's' parameter for pagination, 30 results per page
      
      // Construct search URL - DuckDuckGo HTML search
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&s=${start}`;
      
      console.log(`Searching DuckDuckGo for: ${query} (page ${currentPage})`);
      
      // Create a fetch promise for this page
      const fetchPromise = axios.get(searchUrl, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        responseEncoding: 'utf-8',
        timeout: 15000,
        maxRedirects: 5
      }).then(response => {
        // Parse HTML
        const $ = cheerio.load(response.data);
        
        // Extract URLs from search results
        const pageUrls = [];
        
        // DuckDuckGo HTML results are in .result elements with links
        $('.result .links_main a').each((i, element) => {
          const href = $(element).attr('href');
          
          // Skip if no href
          if (!href) return;
          
          // DuckDuckGo HTML search uses redirects
          // Extract the actual URL from the redirect URL
          let url = href;
          
          if (url.includes('/d.js?')) {
            const urlParam = new URLSearchParams(url.split('?')[1]).get('uddg');
            if (urlParam) {
              url = decodeURIComponent(urlParam);
            }
          }
          
          // Skip unwanted domains
          if (
            url && 
            url.startsWith('http') && 
            !url.includes('duckduckgo.com') && 
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
            if (!pageUrls.includes(url)) {
              pageUrls.push(url);
            }
          }
        });
        
        console.log(`Found ${pageUrls.length} URLs from DuckDuckGo for topic: ${topic} (page ${currentPage})`);
        return pageUrls;
      }).catch(error => {
        console.error(`Error fetching page ${currentPage} for topic ${topic}:`, error.message);
        return []; // Return empty array on error
      });
      
      fetchPromises.push(fetchPromise);
    }
    
    // Wait for all pages to be fetched
    const results = await Promise.all(fetchPromises);
    
    // Combine all URLs, ensuring uniqueness
    const urlSet = new Set();
    results.forEach(pageUrls => {
      pageUrls.forEach(url => urlSet.add(url));
    });
    
    const urls = Array.from(urlSet);
    console.log(`Total unique URLs found from DuckDuckGo for topic: ${topic} (batch ${page}): ${urls.length}`);
    
    return urls;
  } catch (error) {
    console.error(`Error searching DuckDuckGo for topic ${topic}:`, error.message);
    return [];
  }
}

module.exports = {
  searchDuckDuckGo
};
