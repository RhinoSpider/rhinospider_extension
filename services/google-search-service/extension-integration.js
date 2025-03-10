// Google Search Service Integration for RhinoSpider Extension
// Add these functions to your background.js file

// Service URL
const GOOGLE_SEARCH_SERVICE_URL = 'http://143.244.133.154/api/search';

// Store the session token
let googleSearchSessionToken = null;

/**
 * Fetch Google search results from the service
 * @param {Array} topics - Array of topic objects with name and keywords
 * @returns {Array} - Array of URLs from search results
 */
async function fetchGoogleSearchResults(topics) {
  try {
    // If a single topic was passed, convert it to an array
    const topicsArray = Array.isArray(topics) ? topics : [topics];
    
    logger.log(`Fetching Google search results for ${topicsArray.length} topics`);
    
    const response = await fetch(GOOGLE_SEARCH_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topics: topicsArray.map(topic => ({
          name: topic.name,
          keywords: topic.keywords || []
        })),
        extensionId: chrome.runtime.id,
        sessionToken: googleSearchSessionToken
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Store session token for future requests
    googleSearchSessionToken = data.sessionToken;
    await chrome.storage.local.set({ googleSearchSessionToken: data.sessionToken });
    
    // Store URLs in local storage for each topic
    for (const topic of topicsArray) {
      await saveGoogleUrls(topic.id, data.urls);
    }
    
    logger.log(`Received ${data.urls.length} URLs from search service`);
    logger.log(`Total URLs available: ${data.totalFound}`);
    
    return data.urls;
  } catch (error) {
    logger.error('Error fetching Google search results:', error);
    return [];
  }
}

/**
 * Get the next batch of URLs from the service
 * @param {Object} topic - Topic object
 * @returns {Array} - Array of URLs
 */
async function getNextGoogleUrls(topic) {
  // Try to get the session token from storage if not in memory
  if (!googleSearchSessionToken) {
    try {
      const result = await chrome.storage.local.get('googleSearchSessionToken');
      googleSearchSessionToken = result.googleSearchSessionToken;
    } catch (error) {
      logger.error('Error retrieving session token:', error);
    }
  }
  
  if (!googleSearchSessionToken) {
    // If no session token, start a new search
    return fetchGoogleSearchResults(topic);
  }
  
  try {
    logger.log(`Getting next batch of URLs for topic: ${topic.name}`);
    
    const response = await fetch(`${GOOGLE_SEARCH_SERVICE_URL}/${googleSearchSessionToken}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        // Session expired, start a new search
        googleSearchSessionToken = null;
        await chrome.storage.local.remove('googleSearchSessionToken');
        return fetchGoogleSearchResults(topic);
      }
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Store URLs in local storage
    await saveGoogleUrls(topic.id, data.urls);
    
    logger.log(`Received ${data.urls.length} more URLs from search service`);
    
    return data.urls;
  } catch (error) {
    logger.error('Error getting next batch of Google URLs:', error);
    return [];
  }
}

/**
 * Save Google search URLs to storage
 * @param {String} topicId - Topic ID
 * @param {Array} urls - Array of URLs to save
 */
async function saveGoogleUrls(topicId, urls) {
  if (!urls || urls.length === 0) {
    logger.warn(`No URLs to save for topic ${topicId}`);
    return;
  }
  
  try {
    // Get existing URLs for this topic
    const key = `google_urls_${topicId}`;
    const result = await chrome.storage.local.get(key);
    
    // Combine existing and new URLs, removing duplicates
    const existingUrls = result[key] || [];
    const combinedUrls = [...new Set([...existingUrls, ...urls])];
    
    // Save combined URLs
    await chrome.storage.local.set({ [key]: combinedUrls });
    
    logger.log(`Saved ${urls.length} Google URLs for topic ${topicId}`);
    logger.log(`Total Google URLs for topic ${topicId}: ${combinedUrls.length}`);
  } catch (error) {
    logger.error(`Error saving Google URLs for topic ${topicId}:`, error);
  }
}

/**
 * Get the next Google URL for a topic
 * @param {Object} topic - Topic object
 * @returns {String|null} - Next URL or null if none available
 */
async function getNextGoogleUrl(topic) {
  try {
    // Get URLs for this topic
    const key = `google_urls_${topic.id}`;
    const result = await chrome.storage.local.get([key, `${key}_index`]);
    
    const urls = result[key] || [];
    let currentIndex = result[`${key}_index`] || 0;
    
    // If we've used all URLs, try to get more
    if (currentIndex >= urls.length) {
      // Try to get more URLs from the service
      const newUrls = await getNextGoogleUrls(topic);
      
      if (newUrls.length === 0) {
        logger.warn(`No more Google URLs available for topic ${topic.name}`);
        return null;
      }
      
      // Reset index to start using the new URLs
      currentIndex = 0;
    }
    
    // Get the next URL
    const nextUrl = urls[currentIndex];
    
    // Update the index
    await chrome.storage.local.set({ [`${key}_index`]: currentIndex + 1 });
    
    return nextUrl;
  } catch (error) {
    logger.error(`Error getting next Google URL for topic ${topic.id}:`, error);
    return null;
  }
}

/**
 * Get the count of available Google URLs for a topic
 * @param {String} topicId - Topic ID
 * @returns {Number} - Number of available URLs
 */
async function getGoogleUrlCount(topicId) {
  try {
    const key = `google_urls_${topicId}`;
    const result = await chrome.storage.local.get(key);
    return (result[key] || []).length;
  } catch (error) {
    logger.error(`Error getting Google URL count for topic ${topicId}:`, error);
    return 0;
  }
}
