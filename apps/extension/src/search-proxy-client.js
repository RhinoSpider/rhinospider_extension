// Search Proxy Client for RhinoSpider extension
// Communicates with the search proxy service to get URLs for topics
// Now with enhanced fallback strategies for URL retrieval

import { addCacheBusterToUrl } from './url-utils.js';
import { validateAndFormatUrl } from './proxy-client.js';
import * as EnhancedUrlFetcher from './enhanced-url-fetcher.js';

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
// Connect directly to the search proxy service over HTTPS (no port specification needed)
// Based on the proxy architecture, the search proxy is at search-proxy.rhinospider.com on port 3002
const PROXY_SERVICE_URL = 'https://search-proxy.rhinospider.com/api/search'; // Production
const HEALTH_CHECK_URL = 'https://search-proxy.rhinospider.com/api/health';

// Log the configuration on startup
console.log(`[SearchProxyClient] Initialized with URL: ${PROXY_SERVICE_URL}`);
console.log(`[SearchProxyClient] Health check URL: ${HEALTH_CHECK_URL}`);

// No fallback data - we only want to use real data from the search proxy

// Function to check health of the search proxy service
async function checkProxyHealth() {
    console.log(`[SearchProxyClient] Checking health of search proxy service at ${HEALTH_CHECK_URL}`);
    try {
        // Log the health check URL
        logger.log(`Checking search proxy health at ${HEALTH_CHECK_URL}`);
        
        // Create an abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        // Make a request to the health check endpoint with proper headers
        const healthResponse = await fetch(HEALTH_CHECK_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'chrome-extension://rhinospider',
                'X-Requested-With': 'XMLHttpRequest'
            },
            signal: controller.signal
        });
        
        // Clear the timeout
        clearTimeout(timeoutId);
        
        // Log the response status and headers
        logger.log(`Health check response status: ${healthResponse.status}`);
        
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            logger.log('Health check response:', healthData);
            return healthData.status === 'ok';
        } else {
            logger.error(`Health check failed with status: ${healthResponse.status}`);
            return false;
        }
    } catch (error) {
        logger.error(`Error checking health: ${error.message}`);
        return false;
    }
}

// Get API password from storage or environment variable
async function getApiPassword() {
    try {
        // Try to get the API password from storage first
        const result = await chrome.storage.local.get(['apiPassword']);
        if (result.apiPassword) {
            logger.log('Using API password from storage');
            return result.apiPassword;
        }
        
        // Fallback to environment variable
        const envPassword = import.meta.env.VITE_API_PASSWORD || 'ffGpA2saNS47qr';
        logger.log('Using API password from environment variable');
        
        // Store the password for future use
        await chrome.storage.local.set({ apiPassword: envPassword });
        
        return envPassword;
    } catch (error) {
        logger.error('Error getting API password:', error);
        return import.meta.env.VITE_API_PASSWORD || 'ffGpA2saNS47qr';
    }
}

// Retry configuration
const MAX_RETRIES = 3; // Increased to 3 for better resilience
const FETCH_TIMEOUT_MS = 15000; // 15 seconds timeout
const INITIAL_RETRY_DELAY_MS = 2000; // 2 seconds
const MAX_RETRY_DELAY_MS = 30000; // 30 seconds max delay

// Rate limiting configuration
let lastRateLimitTime = 0;
let rateLimitBackoffMs = 5000; // Start with 5 seconds backoff

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
 * Fetch with timeout and retry logic
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<Response>} - Promise resolving to fetch response
 */
async function fetchWithRetry(url, options, timeout = FETCH_TIMEOUT_MS, maxRetries = MAX_RETRIES) {
    let retryCount = 0;
    let lastError = null;
    let lastResponse = null;
    
    while (retryCount < maxRetries) {
        try {
            logger.log(`Fetch attempt ${retryCount + 1}/${maxRetries} to ${url}`);
            
            // Create an AbortController for this fetch request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                logger.warn(`Request timeout after ${timeout}ms, aborting fetch`);
                controller.abort();
            }, timeout);
            
            // Add cache buster to URL to avoid caching issues
            const urlWithCacheBuster = url.includes('?') 
                ? `${url}&_cb=${Date.now()}` 
                : `${url}?_cb=${Date.now()}`;
            
            // Ensure headers include proper content type and origin
            const enhancedOptions = {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'chrome-extension://rhinospider',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...(options.headers || {})
                }
            };
            
            const response = await fetch(urlWithCacheBuster, enhancedOptions);
            lastResponse = response;
            
            // Clear the timeout since the request completed
            clearTimeout(timeoutId);
            
            // Log response details for debugging
            logger.log(`Response status: ${response.status}`);
            logger.log(`Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
            
            // Check for non-JSON responses (HTML, text, etc.)
            const contentType = response.headers.get('content-type') || '';
            
            // Always return the response, even if it's not OK
            // This allows the caller to handle different response types
            return response;
        } catch (error) {
            logger.error(`Request failed (attempt ${retryCount + 1}/${maxRetries}):`); 
            logger.error(`- Error type: ${error.name}`);
            logger.error(`- Error message: ${error.message}`);
            
            // Check if it's a timeout or network error
            if (error.name === 'AbortError') {
                logger.error('Request was aborted due to timeout');
            } else if (error.message.includes('network')) {
                logger.error('Network error occurred');
            }
            
            // Exponential backoff for retries
            const delay = Math.min(INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount), MAX_RETRY_DELAY_MS);
            logger.warn(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retryCount++;
            lastError = error;
        }
    }
    
    // If we've exhausted all retries but have a response, return it anyway
    // This allows the caller to handle even error responses
    if (lastResponse) {
        logger.warn('Returning last response despite errors');
        return lastResponse;
    }
    
    // If we've exhausted all retries, throw the last error
    logger.error(`Failed to fetch after ${maxRetries} attempts`);
    
    // Try to check health again to see if the service is still up
    try {
        const isStillHealthy = await checkProxyHealth();
        logger.log(`Final health check after failures: ${isStillHealthy ? 'Healthy' : 'Unhealthy'}`);
    } catch (healthError) {
        logger.error(`Final health check failed: ${healthError.message}`);
    }
    
    throw lastError || new Error('Failed to fetch');
}

/**
 * Get fallback URLs from storage when rate limited
 * @param {Array} topics - Array of topic objects
 * @returns {Promise<Object>} - Promise resolving to object with topic IDs as keys and arrays of URLs as values
 */
async function getFallbackUrlsFromStorage(topics) {
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
        return {};
    }
    
    logger.log('Checking storage for cached URLs due to rate limiting');
    
    try {
        // Get both prefetched and remaining URLs
        const result = await chrome.storage.local.get(['prefetchedUrls', 'remainingUrls']);
        const prefetchedUrls = result.prefetchedUrls || {};
        const remainingUrls = result.remainingUrls || {};
        
        const fallbackUrls = {};
        let foundUrls = false;
        
        // Check each topic for cached URLs
        for (const topic of topics) {
            const topicId = topic.id;
            
            // First check remaining URLs
            if (remainingUrls[topicId] && remainingUrls[topicId].length > 0) {
                fallbackUrls[topicId] = remainingUrls[topicId];
                foundUrls = true;
                logger.log(`Found ${remainingUrls[topicId].length} cached remaining URLs for topic ${topic.name}`);
                continue;
            }
            
            // Then check prefetched URLs
            if (prefetchedUrls[topicId] && prefetchedUrls[topicId].length > 0) {
                fallbackUrls[topicId] = prefetchedUrls[topicId];
                foundUrls = true;
                logger.log(`Found ${prefetchedUrls[topicId].length} cached prefetched URLs for topic ${topic.name}`);
                continue;
            }
            
            // If we have sample URLs in the topic, use those
            if (topic.sampleArticleUrls && Array.isArray(topic.sampleArticleUrls) && topic.sampleArticleUrls.length > 0) {
                fallbackUrls[topicId] = topic.sampleArticleUrls.map(url => ({
                    url: validateAndFormatUrl(url),
                    source: 'sample',
                    topicId: topic.id,
                    topicName: topic.name
                }));
                foundUrls = true;
                logger.log(`Using ${topic.sampleArticleUrls.length} sample URLs for topic ${topic.name}`);
            }
        }
        
        if (foundUrls) {
            logger.log(`Found cached URLs for ${Object.keys(fallbackUrls).length} topics`);
            return fallbackUrls;
        }
        
        logger.warn('No cached URLs found for any topics');
        return {};
    } catch (error) {
        logger.error('Error getting fallback URLs from storage:', error);
        return {};
    }
}

/**
 * Get URLs for multiple topics
 * @param {Array} topics - Array of topic objects
 * @param {Number} batchSize - Number of URLs to fetch per topic (default: 5)
 * @param {Boolean} reset - Whether to reset the URL pool (default: false)
 * @returns {Promise<Object>} - Promise resolving to object with topic IDs as keys and arrays of URLs as values
 */
async function getUrlsForTopics(topics, batchSize = 5, reset = false) {
    // Track consecutive empty responses using a module-level variable
    // Use globalThis instead of window to make it work in background scripts
    if (typeof globalThis.rhinoSpiderConsecutiveEmptyResponses === 'undefined') {
        globalThis.rhinoSpiderConsecutiveEmptyResponses = 0;
    }
    
    // If we've previously failed to get URLs, force reset to true
    if (globalThis.rhinoSpiderConsecutiveEmptyResponses > 2) {
        logger.log('Forcing reset=true after multiple empty responses');
        reset = true;
        globalThis.rhinoSpiderConsecutiveEmptyResponses = 0;
    }
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
        logger.warn('No topics provided to getUrlsForTopics');
        return {};
    }

    logger.log(`Fetching URLs for ${topics.length} topics (batchSize: ${batchSize}, reset: ${reset})`);
    
    // ENHANCED: First try to get URLs from our enhanced fetcher
    try {
        logger.log('Attempting to get URLs using enhanced fetcher strategies');
        const enhancedUrls = await EnhancedUrlFetcher.getUrlsForTopics(topics, batchSize);
        
        // Check if we got any URLs from the enhanced fetcher
        let hasUrls = false;
        for (const topicId in enhancedUrls) {
            if (enhancedUrls[topicId] && enhancedUrls[topicId].length > 0) {
                hasUrls = true;
                break;
            }
        }
        
        if (hasUrls) {
            logger.log('Successfully retrieved URLs using enhanced fetcher strategies');
            globalThis.rhinoSpiderConsecutiveEmptyResponses = 0;
            return enhancedUrls;
        } else {
            logger.log('Enhanced fetcher did not find any URLs, falling back to search proxy');
        }
    } catch (error) {
        logger.error('Error using enhanced URL fetcher:', error);
        // Continue with regular search proxy approach
    }

    // Check if we're currently rate limited
    try {
        const rateLimitInfo = (await chrome.storage.local.get(['rateLimitInfo'])).rateLimitInfo;
        
        if (rateLimitInfo && Date.now() < rateLimitInfo.nextAttempt) {
            const waitTimeRemaining = Math.ceil((rateLimitInfo.nextAttempt - Date.now()) / 1000);
            logger.warn(`Still in rate limit backoff period. ${waitTimeRemaining} seconds remaining before next attempt`);
            
            // If we're rate limited, try to use cached URLs
            return await getFallbackUrlsFromStorage(topics);
        } else if (rateLimitInfo) {
            // Clear the rate limit info since we're past the backoff period
            logger.log('Rate limit backoff period has passed, proceeding with request');
            await chrome.storage.local.remove(['rateLimitInfo']);
        }
    } catch (error) {
        logger.error('Error checking rate limit status:', error);
    }
    
    // First check if the search proxy service is healthy
    let isHealthy = false;
    try {
        isHealthy = await checkProxyHealth();
        console.log(`[SearchProxyClient] Health check result: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    } catch (error) {
        console.error(`[SearchProxyClient] Error checking search proxy health: ${error.message}`);
        logger.error('Error checking search proxy health:', error.message);
    }

    if (!isHealthy) {
        console.warn(`[SearchProxyClient] Search proxy service is not healthy. Will try anyway but expect potential issues.`);
        logger.warn('Search proxy service is not healthy. Will try anyway but expect potential issues.');
    } else {
        console.log(`[SearchProxyClient] Search proxy service is healthy, proceeding with URL fetch`);
    }

    // Get the extension ID for tracking
    const extensionId = await getExtensionId();

    // Create the payload
    const payload = {
        extensionId,
        topics: topics.map(topic => ({
            id: topic.id,
            name: topic.name,
            urlPatterns: topic.urlPatterns || [],
            domains: topic.domains || [],
            keywords: topic.keywords || []
        })),
        batchSize,
        reset,
        // Add a query parameter to help with search relevance
        query: topics.map(t => t.name).join(' OR ')
    };
    
    // Log the full payload for debugging
    logger.log(`Sending payload to search proxy:`, JSON.stringify(payload, null, 2));

    try {
        // Log the search proxy URL with more visibility
        console.log(`[SearchProxyClient] Connecting to search proxy at ${PROXY_SERVICE_URL}`);
        logger.log(`Connecting to search proxy at ${PROXY_SERVICE_URL}`);
        
        // Add a cache buster to the URL to avoid caching
        const urlWithCacheBuster = addCacheBusterToUrl(PROXY_SERVICE_URL);
        console.log(`[SearchProxyClient] URL with cache buster: ${urlWithCacheBuster}`);
        
        // Make the request
        console.log(`[SearchProxyClient] DEBUG: Fetching URLs from search proxy service with payload:`, JSON.stringify(payload, null, 2));
        logger.log(`Fetching URLs from search proxy service`);
        
        // Log topic IDs we're fetching for
        const topicIds = topics.map(topic => topic.id);
        console.log(`[SearchProxyClient] DEBUG: Fetching URLs for topic IDs:`, topicIds);
        
        // Get API password
        const apiPassword = await getApiPassword();
        logger.log(`Using API password: ${apiPassword.substring(0, 3)}...${apiPassword.substring(apiPassword.length - 3)}`);
        
        // Use fetchWithRetry to handle timeouts and retries
        const response = await fetchWithRetry(
            PROXY_SERVICE_URL,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiPassword}`,
                    'Origin': 'chrome-extension://rhinospider',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(payload)
            },
            FETCH_TIMEOUT_MS,
            MAX_RETRIES
        );
        
        // Log response details
        logger.log(`Response status: ${response.status} ${response.statusText}`);
        logger.log(`Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
        
        // Check if the response is OK
        if (!response.ok) {
            logger.error(`Search proxy service returned error: ${response.status} ${response.statusText}`);
            
            // Special handling for rate limiting (429)
            if (response.status === 429) {
                // Update rate limit tracking
                lastRateLimitTime = Date.now();
                
                // Exponential backoff for rate limits
                rateLimitBackoffMs = Math.min(rateLimitBackoffMs * 2, 120000); // Max 2 minutes
                
                // Try to get the retry-after header
                const retryAfter = response.headers.get('retry-after');
                let waitTime = rateLimitBackoffMs;
                
                if (retryAfter) {
                    // If retry-after is provided, use that value (in seconds)
                    waitTime = parseInt(retryAfter, 10) * 1000;
                    logger.log(`Rate limited. Server requested retry after ${waitTime/1000} seconds`);
                } else {
                    logger.log(`Rate limited. Using exponential backoff: ${waitTime/1000} seconds`);
                }
                
                // Store the rate limit info for future requests
                await chrome.storage.local.set({
                    rateLimitInfo: {
                        timestamp: Date.now(),
                        backoffMs: waitTime,
                        nextAttempt: Date.now() + waitTime
                    }
                });
                
                // Check if we have cached URLs we can use
                return await getFallbackUrlsFromStorage(topics);
            }
            
            globalThis.rhinoSpiderConsecutiveEmptyResponses++;
            return {};
        }
        
        // Parse the response
        const data = await response.json();
        
        // Log the full response data for debugging
        logger.log(`Response data:`, JSON.stringify(data, null, 2));
        
        // Check if the response contains URLs
        if (!data.urls || Object.keys(data.urls).length === 0) {
            logger.warn('Search proxy service returned no URLs');
            globalThis.rhinoSpiderConsecutiveEmptyResponses++;
            
            // Try to use cached URLs
            return await getFallbackUrlsFromStorage(topics);
        }
        
        // Reset rate limit backoff since we got a successful response
        rateLimitBackoffMs = 5000;
        
        // Log URL counts for each topic
        logger.log(`Response contains URLs for ${Object.keys(data.urls).length} topics`);
        Object.keys(data.urls).forEach(topicId => {
            logger.log(`Topic ${topicId} has ${data.urls[topicId].length} URLs`);
            if (data.urls[topicId].length > 0) {
                logger.log(`First URL for topic ${topicId}: ${data.urls[topicId][0].url}`);
            }
        });
        
        // Process the URLs to ensure they have the correct format
        const processedUrls = {};
        
        for (const topicId in data.urls) {
            if (data.urls.hasOwnProperty(topicId)) {
                // Get the URLs for this topic
                const urls = data.urls[topicId];
                
                if (!urls || urls.length === 0) {
                    // No URLs for this topic from the search proxy
                    logger.warn(`No URLs returned for topic ${topicId}, will try to use sample URLs`);
                    
                    // Find the topic object to get sample URLs
                    const topic = topics.find(t => t.id === topicId);
                    
                    if (topic && topic.sampleArticleUrls && Array.isArray(topic.sampleArticleUrls) && topic.sampleArticleUrls.length > 0) {
                        // Use sample URLs as fallback
                        logger.log(`Using ${topic.sampleArticleUrls.length} sample URLs for topic ${topicId}`);
                        
                        // Create URL objects from sample URLs
                        const sampleUrls = topic.sampleArticleUrls.map(url => ({
                            url: url,
                            source: 'sample',
                            topicId: topicId,
                            topicName: topic.name || 'Unknown'
                        }));
                        
                        // Use these sample URLs instead
                        processedUrls[topicId] = sampleUrls;
                    }
                    
                    // Continue to next topic
                    continue;
                }
                
                // Process each URL to ensure it has the correct format and is defined
                const validUrls = [];
                
                for (let i = 0; i < urls.length; i++) {
                    const urlInfo = urls[i];
                    
                    // Skip undefined or null URL objects
                    if (!urlInfo || typeof urlInfo !== 'object') {
                        logger.warn(`Skipping undefined URL object at index ${i} for topic ${topicId}`);
                        continue;
                    }
                    
                    // Skip URLs without a url property
                    if (!urlInfo.url) {
                        logger.warn(`Skipping URL object without url property at index ${i} for topic ${topicId}`);
                        continue;
                    }
                    
                    try {
                        // Check if the URL is a string or an object
                        let urlToValidate = urlInfo.url;
                        
                        // Log the URL type for debugging
                        logger.log(`URL type for topic ${topicId}: ${typeof urlToValidate}`);
                        
                        // Handle case where URL might be an object with a url property
                        if (typeof urlToValidate === 'object' && urlToValidate !== null && urlToValidate.url) {
                            logger.log(`URL is an object with url property: ${urlToValidate.url}`);
                            urlToValidate = urlToValidate.url;
                        }
                        
                        // Validate and format all URLs consistently
                        const validatedUrl = validateAndFormatUrl(urlToValidate);
                        
                        // Only add if we got a valid URL back
                        if (validatedUrl) {
                            validUrls.push({
                                ...urlInfo,
                                url: validatedUrl
                            });
                        } else {
                            logger.warn(`URL validation failed for ${urlToValidate}`);
                        }
                    } catch (error) {
                        logger.warn(`Error validating URL ${JSON.stringify(urlInfo.url)} for topic ${topicId}:`, error);
                    }
                }
                
                // If we have valid URLs, add them to the processed URLs
                if (validUrls.length > 0) {
                    processedUrls[topicId] = validUrls;
                }
            }
        }

        const topicsWithUrls = Object.keys(processedUrls).length;
        logger.log(`Received URLs for ${topicsWithUrls} topics`);
        
        // Update the consecutive empty responses counter
        if (topicsWithUrls === 0) {
            globalThis.rhinoSpiderConsecutiveEmptyResponses++;
            logger.log(`Increased consecutive empty responses counter to ${globalThis.rhinoSpiderConsecutiveEmptyResponses}`);
        } else {
            // Reset the counter if we got URLs
            globalThis.rhinoSpiderConsecutiveEmptyResponses = 0;
        }
        
        return processedUrls;
    } catch (error) {
        logger.error(`Error fetching URLs from search proxy: ${error.message}`);
        
        // Check if it's a timeout or server error
        if (error.name === 'AbortError' || 
            error.message.includes('timeout') || 
            error.message.includes('aborted') || 
            error.message.includes('502') || 
            error.message.includes('504')) {
            
            logger.error('Search proxy server timeout or error detected:');
            logger.error(`- Error type: ${error.name}`);
            logger.error(`- Error message: ${error.message}`);
            logger.error(`- Error code: ${error.code || 'N/A'}`);
        }
        
        // Create a fallback response using sample URLs from topics
        logger.log('Attempting to use sample URLs as fallback after error');
        const fallbackUrls = {};
        
        for (const topic of topics) {
            if (topic.sampleArticleUrls && Array.isArray(topic.sampleArticleUrls) && topic.sampleArticleUrls.length > 0) {
                logger.log(`Using ${topic.sampleArticleUrls.length} sample URLs for topic ${topic.name} (${topic.id})`);
                
                fallbackUrls[topic.id] = topic.sampleArticleUrls.map(url => ({
                    url: validateAndFormatUrl(url),
                    source: 'sample',
                    topicId: topic.id,
                    topicName: topic.name
                })).filter(item => item.url); // Filter out any URLs that failed validation
            }
        }
        
        if (Object.keys(fallbackUrls).length > 0) {
            logger.log(`Created fallback response with sample URLs for ${Object.keys(fallbackUrls).length} topics`);
            return fallbackUrls;
        }
        
        logger.error(`- Stack trace: ${error.stack || 'Not available'}`);
        
        // Try to check the health of the search proxy
        try {
            const isHealthy = await checkProxyHealth();
            logger.log(`Search proxy health check result: ${isHealthy ? 'Healthy' : 'Unhealthy'}`);
            
            if (isHealthy) {
                logger.warn('Search proxy health endpoint is responding but search API is timing out');
                logger.warn('This suggests the search operation itself is taking too long');
            }
        } catch (healthError) {
            logger.error(`Health check also failed: ${healthError.message}`);
        }
        
        // No fallback - return empty results
        logger.warn('No fallback handling - returning empty results as requested');
        return {};
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
        // Get API password
        const apiPassword = await getApiPassword();
        logger.log(`Using API password: ${apiPassword.substring(0, 3)}...${apiPassword.substring(apiPassword.length - 3)}`);
        
        const response = await fetchWithRetry(PROXY_SERVICE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiPassword}`,
                'Origin': 'chrome-extension://rhinospider',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                extensionId,
                reset: true,
                query: 'reset',
                limit: 1
            })
        });
        
        // Log response details
        logger.log(`Response status: ${response.status} ${response.statusText}`);
        logger.log(`Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
        
        // Check if the response is OK
        if (!response.ok) {
            logger.error(`Search proxy service returned error: ${response.status} ${response.statusText}`);
            return false;
        }
        
        const data = await response.json();
        
        // Log the full response data for debugging
        logger.log(`Response data:`, JSON.stringify(data, null, 2));
        
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
 * @returns {Promise<Object|null>} - Promise resolving to URL object or null
 */
async function getUrlForTopic(topic) {
    if (!topic) {
        logger.error('Invalid topic provided');
        return null;
    }
    
    logger.log(`Getting URL for topic: ${topic.name} (ID: ${topic.id})`);
    
    // ENHANCED: First try to get a URL from our enhanced fetcher
    try {
        logger.log('Attempting to get URL using enhanced fetcher strategies');
        const enhancedUrls = await EnhancedUrlFetcher.getUrlsForTopic(topic, 1);
        
        if (enhancedUrls && enhancedUrls.length > 0) {
            logger.log(`Successfully retrieved URL using enhanced fetcher: ${enhancedUrls[0].url}`);
            return enhancedUrls[0];
        } else {
            logger.log('Enhanced fetcher did not find any URLs, falling back to search proxy');
        }
    } catch (error) {
        logger.error('Error using enhanced URL fetcher:', error);
        // Continue with regular search proxy approach
    }

    // Check if we're currently rate limited
    try {
        const rateLimitInfo = (await chrome.storage.local.get(['rateLimitInfo'])).rateLimitInfo;
        
        if (rateLimitInfo && Date.now() < rateLimitInfo.nextAttempt) {
            const waitTimeRemaining = Math.ceil((rateLimitInfo.nextAttempt - Date.now()) / 1000);
            logger.warn(`Still in rate limit backoff period. ${waitTimeRemaining} seconds remaining before next attempt`);
            
            // If we're rate limited, try to use a cached URL
            return await getFallbackUrlFromStorage(topic);
        }
    } catch (error) {
        logger.error('Error checking rate limit status:', error);
    }
    
    try {
        // First check if we have any prefetched URLs for this topic in storage
        logger.log(`Checking storage for prefetched URLs for topic ${topic.id} (${topic.name})`);
        const result = await new Promise(resolve => {
            chrome.storage.local.get(['prefetchedUrls', 'remainingUrls'], resolve);
        });
        
        const prefetchedUrls = result.prefetchedUrls || {};
        const remainingUrls = result.remainingUrls || {};
        
        // Log what we found in storage
        logger.log(`Storage check results for topic ${topic.id}:`);
        logger.log(`- Prefetched URLs: ${prefetchedUrls[topic.id] ? prefetchedUrls[topic.id].length : 0}`);
        logger.log(`- Remaining URLs: ${remainingUrls[topic.id] ? remainingUrls[topic.id].length : 0}`);
        
        // If we have prefetched URLs for this topic, use one of them
        if (prefetchedUrls[topic.id] && prefetchedUrls[topic.id].length > 0) {
            // Get a URL from the prefetched URLs
            const url = prefetchedUrls[topic.id].shift();
            
            // Update the prefetched URLs in storage
            await new Promise(resolve => {
                chrome.storage.local.set({ prefetchedUrls }, resolve);
            });
            
            // Only log every 5th URL to reduce noise
            if ((prefetchedUrls[topic.id]?.length % 5) === 0) {
                logger.log(`Using prefetched URL for topic ${topic.id}. ${prefetchedUrls[topic.id]?.length || 0} URLs remaining`);
            }
            
            return url;
        }
        
        // Check if we have remaining URLs from previous fetches
        if (remainingUrls[topic.id] && remainingUrls[topic.id].length > 0) {
            // Get a URL from the remaining URLs
            const url = remainingUrls[topic.id].shift();
            
            // Update the remaining URLs in storage
            await new Promise(resolve => {
                chrome.storage.local.set({ remainingUrls }, resolve);
            });
            
            logger.log(`Using remaining URL for topic ${topic.id}. ${remainingUrls[topic.id].length} URLs remaining`);
            return url;
        }
        
        // If no prefetched or remaining URLs, get new ones from the search proxy service
        logger.log(`No cached URLs found for topic ${topic.id}, fetching from search proxy...`);
        // Get URLs for this topic - increased batch size to 20 to take advantage of improved search proxy service
        const urlsMap = await getUrlsForTopics([topic], 20);
        
        // Log the result of the fetch
        if (urlsMap && urlsMap[topic.id]) {
            logger.log(`Search proxy returned ${urlsMap[topic.id].length} URLs for topic ${topic.id}`);
            if (urlsMap[topic.id].length > 0) {
                logger.log(`First URL: ${urlsMap[topic.id][0].url}`);
            }
        } else {
            logger.log(`Search proxy returned no URLs for topic ${topic.id}`);
        }
        
        // Check if we have URLs for this topic
        if (!urlsMap || !urlsMap[topic.id] || urlsMap[topic.id].length === 0) {
            logger.warn(`No URLs found for topic "${topic.name}"`);
            return null;
        }
        
        // Store the remaining URLs for future use
        if (urlsMap[topic.id].length > 1) {
            // Get the current remaining URLs from storage
            const storageResult = await new Promise(resolve => {
                chrome.storage.local.get(['remainingUrls'], resolve);
            });
            
            const storedRemainingUrls = storageResult.remainingUrls || {};
            
            // Initialize the array for this topic if it doesn't exist
            if (!storedRemainingUrls[topic.id]) {
                storedRemainingUrls[topic.id] = [];
            }
            
            // Add the new URLs to the remaining URLs
            storedRemainingUrls[topic.id] = [
                ...storedRemainingUrls[topic.id],
                ...urlsMap[topic.id].slice(1)
            ];
            
            // Update the remaining URLs in storage
            await new Promise(resolve => {
                chrome.storage.local.set({ remainingUrls: storedRemainingUrls }, resolve);
            });
            
            logger.log(`Stored ${urlsMap[topic.id].length - 1} remaining URLs for topic ${topic.id}`);
        }
        
        // Return the first URL
        const url = urlsMap[topic.id][0];
        return url;
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
        logger.warn('No topics provided to prefetchUrlsForAllTopics');
        return {};
    }
    
    // Filter to only active topics
    const activeTopics = topics.filter(topic => topic.status === 'active');
    
    if (activeTopics.length === 0) {
        logger.warn('No active topics found');
        return {};
    }
    
    logger.log(`Prefetching URLs for ${activeTopics.length} active topics`);
    
    try {
        // Check if we have any sample URLs in the topics that we can use as fallback
        let hasSampleUrls = false;
        let sampleUrlCount = 0;
        activeTopics.forEach(topic => {
            if (topic.sampleArticleUrls && Array.isArray(topic.sampleArticleUrls) && topic.sampleArticleUrls.length > 0) {
                hasSampleUrls = true;
                sampleUrlCount += topic.sampleArticleUrls.length;
                logger.log(`Topic ${topic.name} (${topic.id}) has ${topic.sampleArticleUrls.length} sample URLs: ${JSON.stringify(topic.sampleArticleUrls)}`);
            } else {
                logger.log(`Topic ${topic.name} (${topic.id}) has no sample URLs`);
            }
        });
        
        if (hasSampleUrls) {
            logger.log(`Sample URLs available in topics (${sampleUrlCount} total), will use as fallback if search proxy fails`);
        } else {
            logger.warn('No sample URLs available in any topics, search proxy must succeed');
        }
        
        // First try getting URLs without reset
        let allUrls = await getUrlsForTopics(activeTopics, urlsPerTopic, false);
        
        // If no URLs returned, try again with reset=true
        if (Object.keys(allUrls).length === 0) {
            logger.log('No URLs returned on first attempt, trying again with reset=true');
            allUrls = await getUrlsForTopics(activeTopics, urlsPerTopic, true);
        }
        
        if (Object.keys(allUrls).length === 0) {
            logger.warn('No URLs returned from search proxy, checking for sample URLs in topics');
            
            // If no URLs returned but we have sample URLs, use them
            if (hasSampleUrls) {
                const sampleUrls = {};
                
                // Always process all active topics to ensure we have URLs for each
                activeTopics.forEach(topic => {
                    // Check if we already have URLs for this topic
                    if (!allUrls[topic.id] || allUrls[topic.id].length === 0) {
                        // Only add sample URLs for topics that don't have URLs yet
                        if (topic.sampleArticleUrls && Array.isArray(topic.sampleArticleUrls) && topic.sampleArticleUrls.length > 0) {
                            logger.log(`Adding sample URLs for topic ${topic.id} (${topic.name})`);
                            
                            sampleUrls[topic.id] = topic.sampleArticleUrls.map(url => ({
                                url: validateAndFormatUrl(url),
                                source: 'sample',
                                topicId: topic.id,
                                topicName: topic.name
                            }));
                        }
                    } else {
                        // Keep the URLs we already have
                        sampleUrls[topic.id] = allUrls[topic.id];
                    }
                });
                
                if (Object.keys(sampleUrls).length > 0) {
                    logger.log(`Using URLs for ${Object.keys(sampleUrls).length} topics (mix of search proxy and sample URLs)`);
                    
                    // Store all URLs
                    for (const topicId in sampleUrls) {
                        if (sampleUrls.hasOwnProperty(topicId)) {
                            const urls = sampleUrls[topicId];
                            
                            if (!urls || urls.length === 0) {
                                logger.warn(`No URLs available for topic ${topicId}, even after fallback`);
                                continue;
                            }
                            
                            // Store the URLs for this topic
                            await new Promise(resolve => {
                                chrome.storage.local.get(['prefetchedUrls'], result => {
                                    const prefetchedUrls = result.prefetchedUrls || {};
                                    prefetchedUrls[topicId] = urls;
                                    
                                    chrome.storage.local.set({ prefetchedUrls }, () => {
                                        logger.log(`Stored ${urls.length} URLs for topic ${topicId}`);
                                        resolve();
                                    });
                                });
                            });
                        }
                    }
                    
                    // Store the last prefetch time
                    await new Promise(resolve => {
                        chrome.storage.local.set({ lastPrefetchTime: Date.now() }, resolve);
                    });
                    
                    return sampleUrls;
                }
            }
        }
        
        // Store the URLs in local storage for each topic
        for (const topicId in allUrls) {
            if (allUrls.hasOwnProperty(topicId)) {
                const urls = allUrls[topicId];
                
                if (urls && urls.length > 0) {
                    // Store the URLs for this topic
                    await new Promise(resolve => {
                        chrome.storage.local.get(['prefetchedUrls'], result => {
                            const prefetchedUrls = result.prefetchedUrls || {};
                            prefetchedUrls[topicId] = urls;
                            
                            chrome.storage.local.set({ prefetchedUrls }, () => {
                                logger.log(`Stored ${urls.length} URLs for topic ${topicId}`);
                                resolve();
                            });
                        });
                    });
                }
            }
        }
        
        // Store the last prefetch time
        await new Promise(resolve => {
            chrome.storage.local.set({ lastPrefetchTime: Date.now() }, resolve);
        });
        
        logger.log(`Successfully prefetched URLs for ${Object.keys(allUrls).length} topics`);
        return allUrls;
    } catch (error) {
        logger.error('Error prefetching URLs for topics:', error);
        
        // Try to use sample URLs as fallback
        const sampleUrls = {};
        
        activeTopics.forEach(topic => {
            if (topic.sampleArticleUrls && Array.isArray(topic.sampleArticleUrls) && topic.sampleArticleUrls.length > 0) {
                sampleUrls[topic.id] = topic.sampleArticleUrls.map(url => ({
                    url: validateAndFormatUrl(url),
                    source: 'sample',
                    topicId: topic.id,
                    topicName: topic.name
                }));
            }
        });
        
        if (Object.keys(sampleUrls).length > 0) {
            logger.log(`Using sample URLs for ${Object.keys(sampleUrls).length} topics as fallback after error`);
            
            // Store the sample URLs
            for (const topicId in sampleUrls) {
                if (sampleUrls.hasOwnProperty(topicId)) {
                    const urls = sampleUrls[topicId];
                    
                    // Store the URLs for this topic
                    await new Promise(resolve => {
                        chrome.storage.local.get(['prefetchedUrls'], result => {
                            const prefetchedUrls = result.prefetchedUrls || {};
                            prefetchedUrls[topicId] = urls;
                            
                            chrome.storage.local.set({ prefetchedUrls }, () => {
                                logger.log(`Stored ${urls.length} sample URLs for topic ${topicId}`);
                                resolve();
                            });
                        });
                    });
                }
            }
            
            // Store the last prefetch time
            await new Promise(resolve => {
                chrome.storage.local.set({ lastPrefetchTime: Date.now() }, resolve);
            });
            
            return sampleUrls;
        }
        
        return {};
    }
}

// Export the functions we need
export {
    getUrlsForTopics,
    getUrlForTopic,
    resetUrlPool,
    prefetchUrlsForAllTopics,
    checkProxyHealth
};
