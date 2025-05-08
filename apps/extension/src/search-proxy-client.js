/**
 * RhinoSpider Search Proxy Client - Redesigned
 * 
 * A completely redesigned search proxy client that addresses the following issues:
 * 1. Rate limiting problems (429 errors)
 * 2. Poor URL quality and relevance
 * 3. Unreliable fallback mechanisms
 * 4. Excessive API calls causing performance issues
 */

import { addCacheBusterToUrl } from './url-utils.js';
import { config } from './config.js';
import { validateAndFormatUrl } from './proxy-client.js';

// Logger utility for service worker environment
const logger = {  
    log: (msg, data) => {
        if (typeof console !== 'undefined') {
            console.log(`[SearchProxyClient] ${msg}`, data || '');
        }
    },
    error: (msg, error) => {
        if (typeof console !== 'undefined') {
            console.error(`[SearchProxyClient] ERROR: ${msg}`, error || '');
        }
    },
    warn: (msg, data) => {
        if (typeof console !== 'undefined') {
            console.warn(`[SearchProxyClient] WARNING: ${msg}`, data || '');
        }
    }
};

// Configuration
const PROXY_SERVICE_URL = 'https://search-proxy.rhinospider.com/api/search';
const HEALTH_CHECK_URL = 'https://search-proxy.rhinospider.com/api/health';

// Log the URLs for debugging
if (typeof console !== 'undefined') {
    console.log(`[SearchProxyClient] Using search proxy at ${PROXY_SERVICE_URL}`);
    console.log(`[SearchProxyClient] Using health check at ${HEALTH_CHECK_URL}`);
}

// Constants
const FETCH_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 3;
const BATCH_SIZE = 50; // Increased batch size to get more URLs at once
const URL_CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_BACKOFF_MS = 30 * 60 * 1000; // 30 minutes backoff when rate limited
const MIN_URLS_PER_TOPIC = 10; // Minimum number of URLs to keep per topic

// Storage keys
const STORAGE_KEYS = {
    URL_CACHE: 'url_cache',
    LAST_FETCH_TIME: 'last_fetch_time',
    RATE_LIMITED: 'rate_limited',
    RATE_LIMITED_TIMESTAMP: 'rate_limited_timestamp',
    RATE_LIMIT_COUNT: 'rate_limit_count',
    RATE_LIMIT_BACKOFF_MS: 'rate_limit_backoff_ms',
    EXTENSION_ID: 'extension_id'
};

// Rate limiting configuration
const INITIAL_BACKOFF_MS = 5000; // 5 seconds
const MAX_BACKOFF_MS = 3600000; // 1 hour

/**
 * Check if we're currently rate limited
 * @returns {Promise<boolean>} - Whether we're rate limited
 */
async function isRateLimited() {
    return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.RATE_LIMITED, STORAGE_KEYS.RATE_LIMITED_TIMESTAMP, STORAGE_KEYS.RATE_LIMIT_BACKOFF_MS], (result) => {
            const isLimited = result[STORAGE_KEYS.RATE_LIMITED];
            const timestamp = result[STORAGE_KEYS.RATE_LIMITED_TIMESTAMP];
            const backoffMs = result[STORAGE_KEYS.RATE_LIMIT_BACKOFF_MS] || RATE_LIMIT_BACKOFF_MS;
            
            if (isLimited && timestamp) {
                const expiryTime = timestamp + backoffMs;
                if (Date.now() < expiryTime) {
                    const minutesLeft = Math.round((expiryTime - Date.now()) / 60000);
                    logger.warn(`Rate limited for ${minutesLeft} more minutes (until ${new Date(expiryTime).toLocaleString()})`);
                    resolve(true);
                    return;
                }
            }
            resolve(false);
        });
    });
}

/**
 * Set rate limit with progressive backoff
 * @returns {Promise<void>}
 */
async function setRateLimit() {
    try {
        // Get current rate limit data
        const rateLimitData = await new Promise((resolve) => {
            chrome.storage.local.get([
                STORAGE_KEYS.RATE_LIMITED,
                STORAGE_KEYS.RATE_LIMITED_TIMESTAMP,
                STORAGE_KEYS.RATE_LIMIT_COUNT
            ], (result) => {
                resolve(result);
            });
        });
        
        // Calculate progressive backoff based on how many times we've been rate limited
        const currentCount = rateLimitData[STORAGE_KEYS.RATE_LIMIT_COUNT] || 0;
        const newCount = currentCount + 1;
        
        // Exponential backoff: 30min, 1hr, 2hr, 4hr max
        const backoffMultiplier = Math.min(Math.pow(2, newCount - 1), 8);
        const backoffTime = RATE_LIMIT_BACKOFF_MS * backoffMultiplier;
        
        logger.warn(`Rate limit hit ${newCount} times, setting backoff for ${backoffTime/60000} minutes`);
        
        await new Promise((resolve) => {
            chrome.storage.local.set({
                [STORAGE_KEYS.RATE_LIMITED]: true,
                [STORAGE_KEYS.RATE_LIMITED_TIMESTAMP]: Date.now(),
                [STORAGE_KEYS.RATE_LIMIT_COUNT]: newCount,
                [STORAGE_KEYS.RATE_LIMIT_BACKOFF_MS]: backoffTime
            }, () => {
                resolve();
            });
        });
        
        logger.warn(`Rate limit flag set with ${backoffTime/60000} minute backoff`);
    } catch (error) {
        logger.error('Error setting rate limit flag:', error);
    }
}

/**
 * Reset rate limit backoff
 * @returns {Promise<void>}
 */
async function resetRateLimit() {
    return new Promise((resolve) => {
        chrome.storage.local.set({
            [STORAGE_KEYS.RATE_LIMITED]: false,
            [STORAGE_KEYS.RATE_LIMITED_TIMESTAMP]: null,
            [STORAGE_KEYS.RATE_LIMIT_COUNT]: 0,
            [STORAGE_KEYS.RATE_LIMIT_BACKOFF_MS]: null
        }, () => {
            logger.log('Reset rate limit backoff');
            resolve();
        });
    });
}

/**
 * Function to check health of the search proxy service
 * @returns {Promise<boolean>} - Whether the service is healthy
 */
async function checkProxyHealth() {
    try {
        logger.log('Checking search proxy health...');
        
        // Add a cache buster to avoid caching
        const url = addCacheBusterToUrl(HEALTH_CHECK_URL);
        
        // Fetch with a timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            logger.error(`Health check failed with status: ${response.status}`);
            return false;
        }
        
        const data = await response.json();
        const isHealthy = data && data.status === 'ok';
        
        logger.log(`Search proxy health check result: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
        return isHealthy;
    } catch (error) {
        logger.error(`Health check error: ${error.message}`);
        return false;
    }
}

/**
 * Get or generate a unique extension ID
 * @returns {Promise<string>} - Extension ID
 */
async function getExtensionId() {
    return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.EXTENSION_ID], (result) => {
            if (result[STORAGE_KEYS.EXTENSION_ID]) {
                resolve(result[STORAGE_KEYS.EXTENSION_ID]);
            } else {
                // Generate a random ID
                const id = 'ext_' + Math.random().toString(36).substring(2, 15);
                chrome.storage.local.set({ [STORAGE_KEYS.EXTENSION_ID]: id }, () => {
                    resolve(id);
                });
            }
        });
    });
}

/**
 * Fetch with timeout and retry logic
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<Response>} - Promise resolving to fetch response
 */
async function fetchWithRetry(url, options, timeout = FETCH_TIMEOUT_MS, maxRetries = MAX_RETRIES) {
    let retries = 0;
    
    while (retries <= maxRetries) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // If we get a 429 (rate limit), handle it
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                const retryMs = retryAfter ? parseInt(retryAfter) * 1000 : INITIAL_BACKOFF_MS;
                
                logger.warn(`Rate limited by server. Retry after: ${retryMs}ms`);
                await setRateLimit();
                
                // If we've reached max retries, throw an error
                if (retries >= maxRetries) {
                    throw new Error(`Rate limited after ${retries} retries`);
                }
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, retryMs));
                retries++;
                continue;
            }
            
            // For other non-200 responses, retry with exponential backoff
            if (!response.ok) {
                // If we've reached max retries, return the error response
                if (retries >= maxRetries) {
                    return response;
                }
                
                const backoffMs = Math.min(1000 * Math.pow(2, retries), 10000);
                logger.warn(`Request failed with status ${response.status}. Retrying in ${backoffMs}ms...`);
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, backoffMs));
                retries++;
                continue;
            }
            
            // If we get here, the request was successful
            return response;
        } catch (error) {
            // If we've reached max retries, throw the error
            if (retries >= maxRetries) {
                throw error;
            }
            
            // For timeout or network errors, retry with exponential backoff
            const backoffMs = Math.min(1000 * Math.pow(2, retries), 10000);
            logger.warn(`Request failed: ${error.message}. Retrying in ${backoffMs}ms...`);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            retries++;
        }
    }
    
    // This should not be reached, but just in case
    throw new Error(`Failed after ${maxRetries} retries`);
}

/**
 * Get URLs for multiple topics with smart batching and quota management
 * @param {Array} topics - Array of topics to get URLs for
 * @param {Number} batchSize - Number of URLs to get per topic
 * @returns {Promise<Object>} - Promise resolving to an object with topic IDs as keys and arrays of URLs as values
 */
async function getUrlsForTopics(topics, batchSize = 15) {
    try {
        // Check if we have enough cached URLs before making a request
        const cachedData = await chrome.storage.local.get(['cachedUrls', 'cachedUrlsTimestamp', 'cachedUrlCounts']);
        const cachedUrls = cachedData.cachedUrls || {};
        const cachedTimestamp = cachedData.cachedUrlsTimestamp || 0;
        const cachedCounts = cachedData.cachedUrlCounts || {};
        
        // If we have a recent cache (less than 6 hours old) with enough URLs, use it
        const cacheAge = Date.now() - cachedTimestamp;
        const cacheValid = cacheAge < 6 * 60 * 60 * 1000; // 6 hours
        
        // Check if we have enough URLs for each topic (at least 5)
        const needsRefresh = topics.some(topic => {
            const topicUrls = cachedUrls[topic.id] || [];
            return topicUrls.length < 5;
        });
        
        if (cacheValid && !needsRefresh) {
            logger.log('Using cached URLs, cache age: ' + Math.round(cacheAge / (60 * 1000)) + ' minutes');
            return cachedUrls;
        }
        
        // Check if we're rate limited
        const rateLimited = await isRateLimited();
        if (rateLimited) {
            logger.warn('Rate limited, using cached URLs only');
            return cachedUrls;
        }
        
        // Check if the search proxy is healthy
        const isHealthy = await checkProxyHealth();
        if (!isHealthy) {
            logger.warn('Search proxy is not healthy, using cached URLs only');
            return cachedUrls;
        }
        
        // Get extension ID
        const extensionId = await getExtensionId();
        
        // Prepare the request
        const url = addCacheBusterToUrl(PROXY_SERVICE_URL + '/urls');
        
        // Only request URLs for topics that need them
        const topicsNeedingUrls = topics.filter(topic => {
            const topicUrls = cachedUrls[topic.id] || [];
            return topicUrls.length < 10; // Request more if we have less than 10
        });
        
        // If all topics have enough URLs, just return the cache
        if (topicsNeedingUrls.length === 0) {
            logger.log('All topics have sufficient URLs in cache');
            return cachedUrls;
        }
        
        // Format the topics for the request
        const topicsForRequest = topicsNeedingUrls.map(topic => ({
            id: topic.id,
            name: topic.name,
            keywords: topic.keywords || []
        }));
        
        // Prepare the request body - request more URLs at once to reduce API calls
        const requestBody = {
            extensionId,
            topics: topicsForRequest,
            batchSize, // Use larger batch size to get more URLs at once
            reset: false
        };
        
        // Make the request
        logger.log(`Sending request to ${url} with body:`, JSON.stringify(requestBody, null, 2));
        const response = await fetchWithRetry(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        logger.log(`Response status: ${response.status} ${response.statusText}`);
        
        // Log response headers for debugging
        const headers = {};
        response.headers.forEach((value, name) => {
            headers[name] = value;
        });
        logger.log('Response headers:', headers);
        
        // If the request failed, handle the error
        if (!response.ok) {
            if (response.status === 429) {
                logger.warn('Rate limited by server, setting backoff');
                await setRateLimit();
                
                // When rate limited, use cached URLs if available
                logger.log('Rate limited, using cached URLs');
                return cachedUrls;
            }
            
            logger.error(`Error fetching URLs: ${response.status} ${response.statusText}`);
            
            // When any error occurs, use cached URLs if available
            logger.log('Search proxy error, using cached URLs');
            return cachedUrls;
        }
        
        // Parse the response
        const data = await response.json();
        
        // If we got a successful response, reset the rate limit
        await resetRateLimit();
        
        // Log the full response for debugging
        logger.log('Full response from search proxy:', JSON.stringify(data, null, 2));
        
        // Process the URLs
        if (!data || !data.urls || Object.keys(data.urls).length === 0) {
            logger.error('Invalid or empty response from search proxy');
            
            // When we get an empty response, use cached URLs if available
            logger.log('Empty search proxy response, using cached URLs');
            return cachedUrls;
        }
        
        // Cache the URLs for future use with a smarter caching strategy
        try {
            // Get existing cached URLs
            const existingCache = await chrome.storage.local.get(['cachedUrls', 'cachedUrlsTimestamp']);
            const existingUrls = existingCache.cachedUrls || {};
            
            // Merge new URLs with existing ones, preserving URLs we already have
            const mergedUrls = { ...existingUrls };
            
            // Add new URLs to the cache, but don't replace existing ones
            for (const topicId in data.urls) {
                if (!mergedUrls[topicId]) {
                    mergedUrls[topicId] = [];
                }
                
                // Add new URLs that aren't already in the cache
                const newUrls = data.urls[topicId];
                const existingUrlStrings = mergedUrls[topicId].map(u => typeof u === 'string' ? u : u.url);
                
                for (const newUrl of newUrls) {
                    const urlString = typeof newUrl === 'string' ? newUrl : newUrl.url;
                    if (!existingUrlStrings.includes(urlString)) {
                        mergedUrls[topicId].push(newUrl);
                    }
                }
            }
            
            // Store the merged URLs back to cache
            await chrome.storage.local.set({
                cachedUrls: mergedUrls,
                cachedUrlsTimestamp: Date.now(),
                // Track how many URLs we have per topic
                cachedUrlCounts: Object.fromEntries(Object.entries(mergedUrls).map(([id, urls]) => [id, urls.length]))
            });
            
            logger.log('URLs cached successfully with smart merging');
            logger.log('Cache now contains URLs for ' + Object.keys(mergedUrls).length + ' topics');
            for (const topicId in mergedUrls) {
                logger.log(`Topic ${topicId}: ${mergedUrls[topicId].length} URLs in cache`);
            }
        } catch (cacheError) {
            logger.error('Error caching URLs:', cacheError);
        }
        
        // Log the response for debugging
        if (typeof console !== 'undefined') {
            console.log(`[SearchProxyClient] Received ${Object.keys(data.urls).length} topics with URLs`);
            for (const topicId in data.urls) {
                console.log(`[SearchProxyClient] Topic ${topicId}: ${data.urls[topicId].length} URLs`);
                
                // Log the actual URLs for debugging
                if (data.urls[topicId].length > 0) {
                    console.log(`[SearchProxyClient] Sample URLs for topic ${topicId}:`);
                    data.urls[topicId].slice(0, 3).forEach((url, index) => {
                        console.log(`  ${index + 1}. ${typeof url === 'string' ? url : JSON.stringify(url)}`);
                    });
                } else {
                    console.log(`[SearchProxyClient] No URLs found for topic ${topicId}`);
                }
            }
        }
        
        // Return the URLs
        return data.urls;
    } catch (error) {
        logger.error(`Error in getUrlsForTopics: ${error.message}`);
        return {};
    }
}

/**
 * Reset the URL pool for this extension instance
 * @returns {Promise<Boolean>} - Promise resolving to success status
 */
async function resetUrlPool() {
    try {
        // Check if we're rate limited
        const rateLimited = await isRateLimited();
        if (rateLimited) {
            logger.warn('Rate limited, cannot reset URL pool');
            return false;
        }
        
        // Get extension ID
        const extensionId = await getExtensionId();
        
        // Prepare the request
        const url = addCacheBusterToUrl(PROXY_SERVICE_URL + '/reset');
        
        // Make the request
        const response = await fetchWithRetry(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ extensionId })
        });
        
        // If the request failed, handle the error
        if (!response.ok) {
            if (response.status === 429) {
                logger.warn('Rate limited by server, setting backoff');
                await setRateLimit();
                return false;
            }
            
            logger.error(`Error resetting URL pool: ${response.status} ${response.statusText}`);
            return false;
        }
        
        // Parse the response
        const data = await response.json();
        
        // If we got a successful response, reset the rate limit
        await resetRateLimit();
        
        return data && data.success === true;
    } catch (error) {
        logger.error(`Error in resetUrlPool: ${error.message}`);
        return false;
    }
}

/**
 * Get a single URL for a topic
 * @param {Object} topic - Topic object
 * @returns {Promise<Object|null>} - Promise resolving to URL object or null
 */
async function getUrlForTopic(topic) {
    try {
        // Check if we're rate limited
        const rateLimited = await isRateLimited();
        if (rateLimited) {
            logger.warn(`Rate limited, cannot get URL for topic: ${topic.name}`);
            return null;
        }
        
        logger.log(`Attempting to get URL for topic: ${topic.name} (${topic.id})`);
        
        // Try to get URLs with reset=true to force fresh URLs
        const urlsByTopic = await getUrlsForTopics([topic], 1, true);
        
        // Log the result for debugging
        logger.log(`URL fetch result for topic ${topic.id}:`, urlsByTopic);
        
        // Check if we got any URLs
        if (!urlsByTopic || !urlsByTopic[topic.id] || urlsByTopic[topic.id].length === 0) {
            logger.warn(`No URLs found for topic: ${topic.name}`);
            
            // Fallback: Try to get URLs from a predefined list for this topic
            const fallbackUrls = getFallbackUrlsForTopic(topic);
            if (fallbackUrls && fallbackUrls.length > 0) {
                logger.log(`Using fallback URL for topic: ${topic.name}`);
                return fallbackUrls[0];
            }
            
            return null;
        }
        
        // Return the first URL
        logger.log(`Found URL for topic ${topic.name}:`, urlsByTopic[topic.id][0]);
        return urlsByTopic[topic.id][0];
    } catch (error) {
        logger.error(`Error in getUrlForTopic: ${error.message}`);
        return null;
    }
}

/**
 * Get fallback URLs for a topic when the search proxy fails
 * @param {Object} topic - Topic object
 * @returns {Array} - Array of fallback URLs
 */
function getFallbackUrlsForTopic(topic) {
    // Predefined fallback URLs for common topics
    const fallbackUrlMap = {
        // TechCrunch News Articles
        'topic_swsi3j4lj': [
            { url: 'https://techcrunch.com/2023/04/20/ai-weekly-microsoft-build/' },
            { url: 'https://techcrunch.com/category/artificial-intelligence/' },
            { url: 'https://techcrunch.com/startups/' }
        ],
        // E-commerce Product Monitor
        'topic_t7wkl7zyb': [
            { url: 'https://www.amazon.com/dp/B08N5KWB9H' },
            { url: 'https://www.bestbuy.com/site/macbook-air-13-3-laptop-apple-m1-chip-8gb-memory-256gb-ssd-space-gray/5721600.p' },
            { url: 'https://www.walmart.com/ip/PlayStation-5-Console-Marvel-s-Spider-Man-2-Bundle/1796366300' }
        ]
    };
    
    // Return fallback URLs for this topic if available
    return fallbackUrlMap[topic.id] || [];
}

/**
 * Prefetch URLs for all active topics at once
 * @param {Array} topics - Array of topic objects
 * @param {Number} urlsPerTopic - Number of URLs to fetch per topic (default: 15)
 * @returns {Promise<Object>} - Promise resolving to object with topic IDs as keys and arrays of URLs as values
 */
async function prefetchUrlsForAllTopics(topics, urlsPerTopic = 15) {
    try {
        // Check if we're rate limited
        const rateLimited = await isRateLimited();
        if (rateLimited) {
            logger.warn('Rate limited, cannot prefetch URLs');
            return {};
        }
        
        // Get URLs for all topics
        const urlsByTopic = await getUrlsForTopics(topics, urlsPerTopic);
        
        // Return the URLs
        return urlsByTopic || {};
    } catch (error) {
        logger.error(`Error in prefetchUrlsForAllTopics: ${error.message}`);
        return {};
    }
}

// Export the functions
const searchProxyClient = {
    getUrlsForTopics,
    getUrlForTopic,
    resetUrlPool,
    prefetchUrlsForAllTopics,
    checkProxyHealth
};

export default searchProxyClient;
