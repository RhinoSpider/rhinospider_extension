const { searchGoogle } = require('./googleSearch');
const { searchDuckDuckGo } = require('./duckduckgoSearch');

/**
 * Search for URLs based on a topic
 * First tries DuckDuckGo, then falls back to Google if needed
 * @param {string} topic - Topic name
 * @param {string[]} keywords - Additional keywords
 * @param {number} page - Page number (0-based)
 * @returns {Promise<string[]>} - Array of URLs
 */
async function searchForUrls(topic, keywords = [], page = 0) {
  try {
    console.log(`Searching for URLs for topic: ${topic} (page ${page})`);
    
    // First try DuckDuckGo
    const duckDuckGoUrls = await searchDuckDuckGo(topic, keywords, page);
    
    // If we got results from DuckDuckGo, return them
    if (duckDuckGoUrls && duckDuckGoUrls.length > 0) {
      console.log(`Using ${duckDuckGoUrls.length} URLs from DuckDuckGo for topic: ${topic}`);
      return duckDuckGoUrls;
    }
    
    // If no results from DuckDuckGo, try Google
    console.log(`No results from DuckDuckGo for topic: ${topic}, trying Google`);
    const googleUrls = await searchGoogle(topic, keywords, page);
    
    if (googleUrls && googleUrls.length > 0) {
      console.log(`Using ${googleUrls.length} URLs from Google for topic: ${topic}`);
      return googleUrls;
    }
    
    // If still no results, return empty array
    console.log(`No URLs found for topic: ${topic} from any search engine`);
    return [];
  } catch (error) {
    console.error(`Error in searchForUrls for topic ${topic}:`, error.message);
    return [];
  }
}

module.exports = {
  searchForUrls
};
