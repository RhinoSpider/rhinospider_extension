// Search Proxy Client for RhinoSpider extension
// Communicates with the search proxy service to get URLs for topics

import { addCacheBusterToUrl } from './url-utils.js';

// Logger utility
const logger = {  
    log: (msg, data) => {
        console.log(`[SearchProxyClient] ${msg}`, data || '');
    },
    error: (msg, error) => {
        console.error(`[SearchProxyClient] ERROR: ${msg}`, error || '');
    },
    warn: (msg, data) => {
        console.warn(`[SearchProxyClient] WARNING: ${msg}`, data || '');
    }
};

// Configuration
// const PROXY_SERVICE_URL = 'http://localhost:3002/api/search'; // Local development
// Get URL from environment variable or use default
const PROXY_SERVICE_URL = (import.meta.env.VITE_SEARCH_PROXY_URL || 'https://search-proxy.rhinospider.com') + '/api/search'; // Production

// Get API password from environment variable
const API_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'ffGpA2saNS47qr';

// Get or generate a unique extension ID
async function getExtensionId() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['extensionId'], (result) => {
            if (result.extensionId) {
                resolve(result.extensionId);
            } else {
                // Generate a new ID if not exists
                const newId = 'ext_' + Math.random().toString(36).substring(2, 15) + 
                              Math.random().toString(36).substring(2, 15);
                
                chrome.storage.local.set({ extensionId: newId }, () => {
                    resolve(newId);
                });
            }
        });
    });
}

/**
 * Get URLs for topics from the search proxy service
 * @param {Array} topics - Array of topic objects
 * @param {Number} batchSize - Number of URLs to fetch per topic (default: 15)
 * @param {Boolean} reset - Whether to reset the URL pool (default: false)
 * @returns {Promise<Array>} - Promise resolving to array of URLs with topic info
 */
async function getUrlsForTopics(topics, batchSize = 15, reset = false) {
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
        logger.error('Invalid topics provided');
        return [];
    }
    
    try {
        logger.log(`Fetching URLs for ${topics.length} topics (batchSize: ${batchSize}, reset: ${reset})`);
        
        // Get extension ID
        const extensionId = await getExtensionId();
        
        // Prepare request data
        const requestData = {
            extensionId,
            topics: topics.map(topic => ({
                id: topic.id,
                name: topic.name,
                keywords: topic.keywords || []
            })),
            batchSize,
            reset,
            query: topics.map(topic => topic.name).join(' OR ') // Add a search query based on topic names
        };
        
        // Make request to the search proxy service
        const response = await fetch(`${PROXY_SERVICE_URL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_PASSWORD}`
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`Search proxy service returned status ${response.status}`);
        }
        
        const data = await response.json();
        
        // The search proxy returns results directly, not in a urls property
        if (!Array.isArray(data)) {
            logger.warn('Search proxy service returned invalid data');
            return [];
        }
        
        logger.log(`Received ${data.length} URLs from search proxy service`);
        
        // Transform the search results to match expected format and add cache busters
        const urlsWithCacheBusters = data.map(result => ({
            url: addCacheBusterToUrl(result.url),
            title: result.title,
            snippet: result.snippet,
            topicId: topics[0]?.id, // Assign to first topic
            topicName: topics[0]?.name
        }));
        
        return urlsWithCacheBusters;
    } catch (error) {
        logger.error('Failed to fetch URLs from search proxy service:', error);
        return [];
    }
}

/**
 * Reset the URL pool for this extension instance
 * @returns {Promise<Boolean>} - Promise resolving to success status
 */
async function resetUrlPool() {
    try {
        // Get extension ID
        const extensionId = await getExtensionId();
        
        // Make request to search endpoint with reset flag
        const response = await fetch(`${PROXY_SERVICE_URL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_PASSWORD}`
            },
            body: JSON.stringify({
                extensionId,
                reset: true,
                query: 'reset',
                limit: 1
            })
        });
        
        if (!response.ok) {
            throw new Error(`Search proxy service returned status ${response.status}`);
        }
        
        const data = await response.json();
        logger.log('URL pool reset successfully');
        
        return true;
    } catch (error) {
        logger.error('Failed to reset URL pool:', error);
        return false;
    }
}

/**
 * Get a single URL for a topic
 * @param {Object} topic - Topic object
 * @returns {Promise<String|null>} - Promise resolving to URL or null
 */
async function getUrlForTopic(topic) {
    if (!topic) {
        logger.error('Invalid topic provided');
        return null;
    }
    
    try {
        // Get URLs for this topic - increased batch size to 15 to take advantage of improved search proxy service
        const urlsWithInfo = await getUrlsForTopics([topic], 15);
        
        if (urlsWithInfo.length === 0) {
            logger.warn(`No URLs found for topic "${topic.name}"`);
            return null;
        }
        
        // Return the first URL
        return urlsWithInfo[0].url;
    } catch (error) {
        logger.error(`Failed to get URL for topic "${topic.name}":`, error);
        return null;
    }
}

/**
 * Prefetch URLs for all active topics at once
 * This is more efficient than fetching URLs for one topic at a time
 * @param {Array} topics - Array of topic objects
 * @param {Number} urlsPerTopic - Number of URLs to fetch per topic (default: 15)
 * @returns {Promise<Object>} - Promise resolving to object with topic IDs as keys and arrays of URLs as values
 */
async function prefetchUrlsForAllTopics(topics, urlsPerTopic = 15) {
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
        logger.error('Invalid topics provided to prefetchUrlsForAllTopics');
        return {};
    }
    
    // Filter active topics
    const activeTopics = topics.filter(topic => topic.status === 'active');
    logger.log(`Prefetching URLs for ${activeTopics.length} active topics (${urlsPerTopic} per topic)`);
    
    if (activeTopics.length === 0) {
        logger.log('No active topics to prefetch URLs for');
        return {};
    }
    
    try {
        // Get URLs for all topics at once
        const urlsWithInfo = await getUrlsForTopics(activeTopics, urlsPerTopic);
        
        if (urlsWithInfo.length === 0) {
            logger.warn('No URLs found for any topics');
            return {};
        }
        
        // Organize URLs by topic ID
        const urlsByTopic = {};
        
        // Initialize urlsByTopic with empty arrays for all active topics
        activeTopics.forEach(topic => {
            urlsByTopic[topic.id] = [];
        });
        
        // Add URLs to their respective topics
        urlsWithInfo.forEach(urlInfo => {
            const topicId = urlInfo.topicId || activeTopics[0]?.id;
            if (topicId && urlsByTopic[topicId]) {
                urlsByTopic[topicId].push(urlInfo.url);
            }
        });
        
        // Log the number of URLs fetched for each topic
        Object.keys(urlsByTopic).forEach(topicId => {
            const topic = activeTopics.find(t => t.id === topicId);
            const topicName = topic ? topic.name : 'Unknown';
            logger.log(`Prefetched ${urlsByTopic[topicId].length} URLs for topic: ${topicName}`);
        });
        
        return urlsByTopic;
    } catch (error) {
        logger.error('Failed to prefetch URLs for topics:', error);
        return {};
    }
}

// Export the module functions
export {
    getUrlsForTopics,
    getUrlForTopic,
    resetUrlPool,
    prefetchUrlsForAllTopics
};
