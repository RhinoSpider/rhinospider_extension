/**
 * Test script for DuckDuckGo search functionality
 * This script tests both the Instant Answer API and HTML scraping approaches
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Configure axios with longer timeout and keep-alive
const axiosInstance = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive'
  }
});

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

/**
 * Search DuckDuckGo using the Instant Answer API
 * This approach is simpler but returns fewer results
 * @param {Object} topic - Topic object with name and keywords
 * @returns {Array} - Array of extracted URLs
 */
const searchDuckDuckGoAPI = async (topic) => {
  try {
    // Generate query from topic name and keywords
    const query = generateSearchQuery(topic);
    console.log(`Searching DuckDuckGo API for: ${query}`);
    
    // Make request to DuckDuckGo API
    const response = await axiosInstance.get('https://api.duckduckgo.com/', {
      params: {
        q: query,
        format: 'json',
        no_html: 1,
        no_redirect: 1
      }
    });
    
    const data = response.data;
    const urls = [];
    
    // Extract URLs from related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      data.RelatedTopics.forEach(topic => {
        if (topic.FirstURL) {
          urls.push(topic.FirstURL);
        }
        
        // Some topics have nested topics
        if (topic.Topics && Array.isArray(topic.Topics)) {
          topic.Topics.forEach(subTopic => {
            if (subTopic.FirstURL) {
              urls.push(subTopic.FirstURL);
            }
          });
        }
      });
    }
    
    // Extract URL from main result if available
    if (data.AbstractURL) {
      urls.push(data.AbstractURL);
    }
    
    // Extract URLs from results
    if (data.Results && Array.isArray(data.Results)) {
      data.Results.forEach(result => {
        if (result.FirstURL) {
          urls.push(result.FirstURL);
        }
      });
    }
    
    console.log(`Found ${urls.length} URLs for topic "${topic.name}" from DuckDuckGo API`);
    return urls;
  } catch (error) {
    console.error('Error searching DuckDuckGo API:', error.message);
    return [];
  }
};

/**
 * Search DuckDuckGo by scraping HTML results
 * This approach returns more results but is more complex
 * @param {Object} topic - Topic object with name and keywords
 * @returns {Array} - Array of extracted URLs
 */
const searchDuckDuckGoHTML = async (topic) => {
  try {
    // Generate query from topic name and keywords
    const query = generateSearchQuery(topic);
    console.log(`Searching DuckDuckGo HTML for: ${query}`);
    
    // Make request to DuckDuckGo search page
    const response = await axiosInstance.get('https://duckduckgo.com/html/', {
      params: {
        q: query
      }
    });
    
    // Parse HTML response
    const $ = cheerio.load(response.data);
    const urls = [];
    
    // Extract URLs from search results
    $('.result__url').each((i, element) => {
      try {
        // Get the href attribute
        const href = $(element).attr('href');
        
        if (href) {
          // DuckDuckGo HTML results have URLs in the format /d.js?q=<encoded URL>
          if (href.startsWith('/d.js?q=')) {
            const encodedUrl = href.substring(8);
            const url = decodeURIComponent(encodedUrl);
            urls.push(url);
          } else {
            urls.push(href);
          }
        }
      } catch (error) {
        console.error('Error extracting URL:', error.message);
      }
    });
    
    // Also try to extract from result titles (which are often links)
    $('.result__a').each((i, element) => {
      try {
        const href = $(element).attr('href');
        
        if (href) {
          if (href.startsWith('/d.js?q=')) {
            const encodedUrl = href.substring(8);
            const url = decodeURIComponent(encodedUrl);
            if (!urls.includes(url)) {
              urls.push(url);
            }
          } else if (!urls.includes(href)) {
            urls.push(href);
          }
        }
      } catch (error) {
        console.error('Error extracting URL from title:', error.message);
      }
    });
    
    console.log(`Found ${urls.length} URLs for topic "${topic.name}" from DuckDuckGo HTML`);
    return urls;
  } catch (error) {
    console.error('Error searching DuckDuckGo HTML:', error.message);
    return [];
  }
};

/**
 * Run tests with sample topics
 */
const runTests = async () => {
  // Sample topics to test with
  const topics = [
    {
      id: 'bitcoin',
      name: 'Bitcoin',
      keywords: ['cryptocurrency', 'blockchain', 'digital currency']
    },
    {
      id: 'artificial-intelligence',
      name: 'Artificial Intelligence',
      keywords: ['machine learning', 'neural networks', 'AI']
    }
  ];
  
  console.log('=== TESTING DUCKDUCKGO SEARCH FUNCTIONALITY ===');
  
  for (const topic of topics) {
    console.log(`\n=== TESTING TOPIC: ${topic.name} ===`);
    
    // Test API approach
    console.log('\n--- TESTING API APPROACH ---');
    const apiUrls = await searchDuckDuckGoAPI(topic);
    console.log('API Results:');
    apiUrls.forEach((url, index) => {
      console.log(`${index + 1}. ${url}`);
    });
    
    // Test HTML scraping approach
    console.log('\n--- TESTING HTML SCRAPING APPROACH ---');
    const htmlUrls = await searchDuckDuckGoHTML(topic);
    console.log('HTML Scraping Results:');
    htmlUrls.forEach((url, index) => {
      console.log(`${index + 1}. ${url}`);
    });
    
    // Add a delay between topics
    if (topics.indexOf(topic) < topics.length - 1) {
      console.log('\nWaiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n=== TESTING COMPLETE ===');
};

// Run the tests
runTests().catch(error => {
  console.error('Test failed with error:', error);
});
