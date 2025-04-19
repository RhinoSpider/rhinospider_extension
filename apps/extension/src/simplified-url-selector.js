// Simplified URL selector that uses sample URLs from topics and search proxy service as fallback
// This replaces the complex URL generation logic

import { addCacheBusterToUrl } from './url-utils.js';
import { getUrlForTopic, prefetchUrlsForAllTopics } from './search-proxy-client.js';
import { directSearchProxyCall } from './service-worker-adapter.js';

// Cache for prefetched URLs
let prefetchedUrlsByTopic = {};

// Logger utility
const logger = {  
    log: (msg, data) => {
        console.log(`[URLSelector] ${msg}`, data || '');
    },
    error: (msg, error) => {
        console.error(`[URLSelector] ERROR: ${msg}`, error || '');
    },
    warn: (msg, data) => {
        console.warn(`[URLSelector] WARNING: ${msg}`, data || '');
    }
};

// Structure to track successfully scraped URLs
let successfullyScrapedUrls = {};

// Flag to track if all sample URLs have been scraped
let allSampleUrlsScraped = false;

/**
 * Reset the module state
 * This is used for testing to ensure we're starting with a clean slate
 */
async function resetState() {
    logger.log('Resetting URL selector state');
    
    // Reset in-memory state
    successfullyScrapedUrls = {};
    prefetchedUrlsByTopic = {};
    allSampleUrlsScraped = false;
    
    // Reset storage state
    await chrome.storage.local.set({
        successfullyScrapedUrls: {},
        prefetchedUrls: {},
        allSampleUrlsScraped: false
    });
    
    logger.log('URL selector state reset complete');
    return { success: true };
}

// Load successfully scraped URLs from storage
async function loadSuccessfullyScrapedUrls() {
    try {
        const result = await chrome.storage.local.get(['successfullyScrapedUrls']);
        if (result.successfullyScrapedUrls) {
            successfullyScrapedUrls = result.successfullyScrapedUrls;
            logger.log(`Loaded ${Object.keys(successfullyScrapedUrls).length} successfully scraped topic URLs`);
        }
    } catch (error) {
        logger.error('Error loading successfully scraped URLs:', error);
    }
}

// Save successfully scraped URLs to storage
async function saveSuccessfullyScrapedUrls() {
    try {
        await chrome.storage.local.set({ successfullyScrapedUrls });
        logger.log('Saved successfully scraped URLs to storage');
    } catch (error) {
        logger.error('Error saving successfully scraped URLs:', error);
    }
}

// Track a URL as successfully scraped
async function trackScrapedUrl(topicId, url) {
    if (!topicId || !url) {
        logger.error('Invalid topic ID or URL for tracking');
        return false;
    }
    
    try {
        // Get existing successfully scraped URLs
        const result = await chrome.storage.local.get(['successfullyScrapedUrls']);
        const storedSuccessfullyScrapedUrls = result.successfullyScrapedUrls || {};
        
        // Initialize topic entry if it doesn't exist
        if (!storedSuccessfullyScrapedUrls[topicId]) {
            storedSuccessfullyScrapedUrls[topicId] = [];
        }
        
        // Check if URL is already tracked
        if (storedSuccessfullyScrapedUrls[topicId].includes(url)) {
            // Don't log this to reduce noise
            return true;
        }
        
        // Add URL to list
        storedSuccessfullyScrapedUrls[topicId].push(url);
        
        // Limit the array size to prevent excessive storage
        if (storedSuccessfullyScrapedUrls[topicId].length > 100) {
            // Keep only the most recent 100 URLs
            storedSuccessfullyScrapedUrls[topicId] = storedSuccessfullyScrapedUrls[topicId].slice(-100);
        }
        
        // Save updated list
        await chrome.storage.local.set({ successfullyScrapedUrls: storedSuccessfullyScrapedUrls });
        
        // Log only once per session when we reach certain milestones
        if (storedSuccessfullyScrapedUrls[topicId].length % 10 === 0) {
            logger.log(`Tracked ${storedSuccessfullyScrapedUrls[topicId].length} URLs for topic ${topicId}`);
        }
        
        return true;
    } catch (error) {
        logger.error('Error tracking URL as scraped:', error);
        return false;
    }
}

// Check if all sample URLs across all topics have been scraped
function checkAllSampleUrlsScraped(topics) {
    if (!topics || topics.length === 0) {
        logger.warn('No topics provided to checkAllSampleUrlsScraped');
        return false;
    }
    
    // Only check active topics
    const activeTopics = topics.filter(topic => topic.status === 'active');
    
    if (activeTopics.length === 0) {
        logger.warn('No active topics found in checkAllSampleUrlsScraped');
        return false;
    }
    
    let totalSampleUrls = 0;
    let totalScrapedUrls = 0;
    let topicsWithUrls = 0;
    
    // Log header for URL status
    logger.log('📋 ===== SAMPLE URL SCRAPING STATUS ===== 📋');
    
    // For each topic, check if all sample URLs have been scraped
    for (const topic of activeTopics) {
        // Log the topic's sample URLs for debugging
        logger.log(`Topic ${topic.name} (${topic.id}) sample URLs:`, 
            topic.sampleArticleUrls ? JSON.stringify(topic.sampleArticleUrls) : 'undefined');
        
        // Skip topics without sample URLs
        if (!topic.sampleArticleUrls || topic.sampleArticleUrls.length === 0) {
            logger.log(`⚠️ Topic ${topic.name} (${topic.id}) has no sample URLs`);
            continue;
        }
        
        topicsWithUrls++;
        
        // Initialize tracking for this topic if not exists
        if (!successfullyScrapedUrls[topic.id]) {
            successfullyScrapedUrls[topic.id] = [];
            logger.log(`🆕 Initializing tracking for topic ${topic.name} (${topic.id})`);
        }
        
        // Count total sample URLs for this topic
        const topicSampleUrlCount = topic.sampleArticleUrls.length;
        totalSampleUrls += topicSampleUrlCount;
        
        // Log each URL's status for this topic
        logger.log(`🔖 TOPIC: ${topic.name} (${topic.id})`);
        
        // Count scraped URLs for this topic
        let topicScrapedCount = 0;
        
        topic.sampleArticleUrls.forEach((url, index) => {
            // Apply the same URL normalization logic as in trackSuccessfulUrl
            let cleanUrl = url;
            
            // Remove any URL parameters
            if (cleanUrl.includes('?')) {
                cleanUrl = cleanUrl.split('?')[0];
            }
            
            // Remove trailing slashes
            cleanUrl = cleanUrl.replace(/\/$/, '');
            
            // Case-insensitive comparison with tracked URLs
            const isScraped = successfullyScrapedUrls[topic.id].some(trackedUrl => 
                trackedUrl.toLowerCase() === cleanUrl.toLowerCase()
            );
            const statusSymbol = isScraped ? '✅' : '⏳';
            
            logger.log(`  ${statusSymbol} URL ${index + 1}: ${cleanUrl}`);
            
            // Count this URL
            if (isScraped) {
                topicScrapedCount++;
                totalScrapedUrls++;
            }
        });
        
        // Log detailed information for debugging with visual indicators
        const progressSymbol = topicScrapedCount === topicSampleUrlCount ? '✅' : '⏳';
        logger.log(`${progressSymbol} Topic ${topic.name}: ${topicScrapedCount}/${topicSampleUrlCount} URLs scraped`);
        
        // Check if all sample URLs for this topic have been scraped
        if (topicScrapedCount < topicSampleUrlCount) {
            const unscrapedUrls = topic.sampleArticleUrls.filter(url => {
                // Apply the same URL normalization logic as in trackSuccessfulUrl
                let cleanUrl = url;
                
                // Remove any URL parameters
                if (cleanUrl.includes('?')) {
                    cleanUrl = cleanUrl.split('?')[0];
                }
                
                // Remove trailing slashes
                cleanUrl = cleanUrl.replace(/\/$/, '');
                
                // Case-insensitive comparison with tracked URLs
                return !successfullyScrapedUrls[topic.id].some(trackedUrl => 
                    trackedUrl.toLowerCase() === cleanUrl.toLowerCase()
                );
            });
            
            logger.log(`🔍 Topic ${topic.name} has ${unscrapedUrls.length} unscraped URLs remaining:`);
            unscrapedUrls.forEach((url, index) => {
                const cleanUrl = url.split('?_cb=')[0];
                logger.log(`  🔸 Unscraped URL ${index + 1}: ${cleanUrl}`);
            });
        }
    }
    
    // Additional safety check - if no topics have URLs, we can't determine completion
    if (topicsWithUrls === 0) {
        logger.warn('⚠️ No active topics with sample URLs found, cannot determine scraping completion');
        return false;
    }
    
    // Log overall progress with visual indicators
    const completionPercentage = totalSampleUrls > 0 ? Math.round((totalScrapedUrls/totalSampleUrls)*100) : 0;
    const overallProgressSymbol = totalScrapedUrls >= totalSampleUrls ? '🎉' : '📊';
    
    logger.log(`${overallProgressSymbol} OVERALL PROGRESS: ${totalScrapedUrls}/${totalSampleUrls} sample URLs scraped (${completionPercentage}%)`);
    logger.log(`📊 Topics with URLs: ${topicsWithUrls}, Total URLs: ${totalSampleUrls}, Scraped: ${totalScrapedUrls}`);
    logger.log('📋 ===== END STATUS ===== 📋');
    
    // If all sample URLs across all topics have been scraped
    if (totalSampleUrls > 0 && totalScrapedUrls >= totalSampleUrls) {
        logger.log('🏆 ALL SAMPLE URLS HAVE BEEN SUCCESSFULLY SCRAPED 🏆');
        return true;
    }
    
    return false;
}

// Function to select a topic and URL for scraping
async function selectTopicAndUrl(topics) {
    logger.log('Selecting topic and URL for scraping');
    
    if (!topics || topics.length === 0) {
        logger.log('No topics available');
        return { topic: null, url: null };
    }
    
    // Check if all sample URLs have been scraped - only do this check once per session
    // to avoid excessive logging
    if (!allSampleUrlsScraped && checkAllSampleUrlsScraped(topics)) {
        // Set the flag to true to indicate all sample URLs have been scraped
        allSampleUrlsScraped = true;
        logger.log('All sample URLs have been scraped, switching to search proxy service');
        // Store this information in storage to avoid rechecking
        try {
            await chrome.storage.local.set({ allSampleUrlsScraped: true });
        } catch (error) {
            logger.error('Error storing allSampleUrlsScraped flag:', error);
        }
    }
    
    // Filter active topics
    const activeTopics = topics.filter(topic => topic.status === 'active');
    logger.log(`Active topics count: ${activeTopics.length}`);
    
    if (activeTopics.length === 0) {
        logger.log('No active topics found');
        return { topic: null, url: null };
    }
    
    // Prefetch URLs for all topics if we haven't already
    if (Object.keys(prefetchedUrlsByTopic).length === 0) {
        logger.log('No prefetched URLs available, prefetching for all topics');
        await prefetchUrlsForTopics(activeTopics);
    }
    
    // Get all topics that have prefetched URLs available
    const topicsWithUrls = activeTopics.filter(topic => 
        prefetchedUrlsByTopic[topic.id] && 
        prefetchedUrlsByTopic[topic.id].length > 0
    );
    
    // Select a topic - prioritize topics with available prefetched URLs
    let selectedTopic;
    
    if (topicsWithUrls.length > 0) {
        // Select a random topic from those with available URLs
        const randomIndex = Math.floor(Math.random() * topicsWithUrls.length);
        selectedTopic = topicsWithUrls[randomIndex];
        logger.log(`Selected topic with available URLs: ${selectedTopic.name}`);
    } else {
        // Fall back to selecting a random topic if none have prefetched URLs
        const randomIndex = Math.floor(Math.random() * activeTopics.length);
        selectedTopic = activeTopics[randomIndex];
        logger.log(`Selected random topic (no prefetched URLs available): ${selectedTopic.name}`);
    }
    
    logger.log(`Processing topic: ${selectedTopic.name}`);
    
    // Initialize tracking for this topic if not exists
    if (!successfullyScrapedUrls[selectedTopic.id]) {
        successfullyScrapedUrls[selectedTopic.id] = [];
    }
    
    // Always use the search proxy service for URLs
    let url = null;
    logger.log('Bypassing sampleArticleUrls: always using search proxy URLs.');
    
    try {
        // First try the standard approach
        try {
            const isHealthy = await import('./search-proxy-client.js').then(module => module.checkProxyHealth());
            logger.log(`[URLSelector] Search proxy health check before URL fetch: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
            logger.log(`[URLSelector] Calling getUrlForTopic for topic ${selectedTopic.id} (${selectedTopic.name})`);
            url = await getUrlForTopic(selectedTopic);
            logger.log(`[URLSelector] Result from getUrlForTopic:`, url);
        } catch (importError) {
            // If the standard approach fails, try direct API call
            logger.error('Error using standard getUrlForTopic:', importError);
            console.error('[URL Selector] Error using standard getUrlForTopic, trying direct API call');
            
            // Fall back to direct API call
            url = await directSearchProxyCall(selectedTopic);
            logger.log(`[URLSelector] Direct API call returned: ${url ? url : 'null'}`);
        }
        
        // Check if we got a URL from either approach
        if (!url) {
            logger.warn(`No URLs could be generated for topic ${selectedTopic.id}`);
            return { topic: null, url: null };
        }
    } catch (error) {
        // Handle any errors in the URL fetching process
        logger.error('Error getting URL from search proxy service:', error);
        console.error('[URL Selector] Error getting URL:', error);
        return { topic: null, url: null };
    }
    
    // If we have a valid URL, add a cache buster
    try {
        // Extract the URL string if we have a URL object
        let urlString = url;
        if (typeof url === 'object' && url.url) {
            urlString = url.url;
        }
        
        // Validate the URL
        new URL(urlString);
        
        // Add cache buster
        const urlWithCacheBuster = addCacheBusterToUrl(urlString);
        logger.log(`[URLSelector] Added cache buster to URL: ${urlWithCacheBuster}`);
        console.log(`[URL Selector] URL with cache buster: ${urlWithCacheBuster}`);
        
        // Log selection (but not too frequently)
        const currentTime = Date.now();
        if (!selectTopicAndUrl.lastUrlSelectionLog || (currentTime - selectTopicAndUrl.lastUrlSelectionLog > 600000)) {
            logger.log(`Selected topic "${selectedTopic.name}" with URL`);
            selectTopicAndUrl.lastUrlSelectionLog = currentTime;
        }
        
        return { topic: selectedTopic, url: urlWithCacheBuster };
    } catch (error) {
        logger.error(`Invalid URL for topic ${selectedTopic.name}: ${url}`, error);
        console.error(`[URL Selector] Invalid URL for topic ${selectedTopic.name}: ${url}`, error);
        return { topic: selectedTopic, url: null };
    }
}

// Function to prefetch URLs for topics
async function prefetchUrlsForTopics(topics) {
    try {
        // Check if we already have prefetched URLs in storage
        const result = await new Promise(resolve => {
            chrome.storage.local.get(['prefetchedUrls'], resolve);
        });
        
        const storedPrefetchedUrls = result.prefetchedUrls || {};
        
        // Check if we have enough URLs for each topic
        const topicsNeedingUrls = topics.filter(topic => {
            return !storedPrefetchedUrls[topic.id] || storedPrefetchedUrls[topic.id].length < 5;
        });
        
        if (topicsNeedingUrls.length === 0) {
            logger.log('All topics have sufficient prefetched URLs in storage');
            prefetchedUrlsByTopic = storedPrefetchedUrls;
            return storedPrefetchedUrls;
        }
        
        logger.log(`Prefetching URLs for ${topicsNeedingUrls.length} topics that need more URLs`);
        
        // Prefetch URLs for topics that need more
        const newUrlsByTopic = await prefetchUrlsForAllTopics(topicsNeedingUrls);
        
        // Merge with existing URLs
        prefetchedUrlsByTopic = { ...storedPrefetchedUrls };
        
        for (const topicId in newUrlsByTopic) {
            if (newUrlsByTopic.hasOwnProperty(topicId)) {
                if (!prefetchedUrlsByTopic[topicId]) {
                    prefetchedUrlsByTopic[topicId] = [];
                }
                prefetchedUrlsByTopic[topicId] = [
                    ...prefetchedUrlsByTopic[topicId],
                    ...newUrlsByTopic[topicId]
                ];
            }
        }
        
        // Store the updated prefetched URLs
        await new Promise(resolve => {
            chrome.storage.local.set({ prefetchedUrls: prefetchedUrlsByTopic }, resolve);
        });
        
        const totalPrefetchedUrls = Object.values(prefetchedUrlsByTopic)
            .reduce((total, urls) => total + urls.length, 0);
        
        logger.log(`✅ Successfully prefetched ${totalPrefetchedUrls} URLs for ${Object.keys(prefetchedUrlsByTopic).length} topics`);
        return prefetchedUrlsByTopic;
    } catch (error) {
        logger.error('Error prefetching URLs for topics', error);
        return {};
    }
}

// Initialize the module
async function initialize() {
    await loadSuccessfullyScrapedUrls();
    
    // Load the allSampleUrlsScraped flag from storage
    try {
        const result = await chrome.storage.local.get(['allSampleUrlsScraped']);
        allSampleUrlsScraped = result.allSampleUrlsScraped || false;
        logger.log(`Loaded allSampleUrlsScraped flag from storage: ${allSampleUrlsScraped}`);
    } catch (error) {
        allSampleUrlsScraped = false;
        logger.error('Error loading allSampleUrlsScraped flag from storage:', error);
    }
    
    logger.log('URL selector initialized');
    
    // Set up message listener for reset requests
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'RESET_URL_SELECTOR') {
            resetState().then(result => sendResponse(result));
            return true; // Will respond asynchronously
        }
    });
    
    // Try to prefetch URLs for topics if they're available
    try {
        // Get topics and prefetched URLs from storage
        const result = await chrome.storage.local.get(['topics', 'prefetchedUrls']);
        const prefetchedUrls = result.prefetchedUrls || {};
        
        if (result.topics && Array.isArray(result.topics) && result.topics.length > 0) {
            // Check if we need to prefetch URLs
            const needPrefetch = result.topics.some(topic => {
                return !prefetchedUrls[topic.id] || prefetchedUrls[topic.id].length < 5;
            });
            
            if (needPrefetch) {
                logger.log(`Found ${result.topics.length} topics in storage, some need URL prefetching`);
                // Prefetch URLs for topics that need more in the background
                prefetchUrlsForTopics(result.topics).catch(error => {
                    logger.error('Error prefetching URLs during initialization:', error);
                });
            } else {
                logger.log('All topics have sufficient prefetched URLs, skipping prefetch');
                // Load the prefetched URLs into memory
                prefetchedUrlsByTopic = prefetchedUrls;
            }
        } else {
            logger.log('No topics found in storage, skipping URL prefetch');
        }
    } catch (error) {
        logger.error('Error checking for topics during initialization:', error);
    }
    
    return true;
}

// Track a successfully scraped URL for a topic
async function trackSuccessfulUrl(topicId, url) {
    if (!topicId || !url) {
        logger.error('Invalid topicId or URL provided to trackSuccessfulUrl');
        return false;
    }
    
    // More robust URL normalization - handles various URL formats
    let cleanUrl = url;
    
    // Remove any URL parameters (everything after ?)
    if (cleanUrl.includes('?')) {
        cleanUrl = cleanUrl.split('?')[0];
    }
    
    // Remove trailing slashes for consistency
    cleanUrl = cleanUrl.replace(/\/$/, '');
    
    // Initialize tracking for this topic if not exists
    if (!successfullyScrapedUrls[topicId]) {
        successfullyScrapedUrls[topicId] = [];
    }
    
    // Check if URL is already tracked (case-insensitive comparison)
    const isAlreadyTracked = successfullyScrapedUrls[topicId].some(trackedUrl => {
        return trackedUrl.toLowerCase() === cleanUrl.toLowerCase();
    });
    
    // Only add the URL if it's not already in the list
    if (!isAlreadyTracked) {
        // Add the URL to the tracked list
        successfullyScrapedUrls[topicId].push(cleanUrl);
        
        // Limit the array size to prevent excessive storage
        if (successfullyScrapedUrls[topicId].length > 100) {
            // Keep only the most recent 100 URLs
            successfullyScrapedUrls[topicId] = successfullyScrapedUrls[topicId].slice(-100);
        }
        
        // Save updated URL history immediately
        await saveSuccessfullyScrapedUrls();
        
        // Only log when reaching certain milestones to reduce noise
        if (successfullyScrapedUrls[topicId].length % 10 === 0) {
            logger.log(`Topic ${topicId} now has ${successfullyScrapedUrls[topicId].length} tracked URLs`);
        }
        
        // After adding a new URL, check if all sample URLs have been scraped
        // We need to get the topics to check this
        try {
            const result = await chrome.storage.local.get(['topics', 'allSampleUrlsScraped']);
            
            // If we already know all URLs are scraped, don't check again
            if (result.allSampleUrlsScraped) {
                allSampleUrlsScraped = true;
                return true;
            }
            
            if (result.topics && result.topics.length > 0) {
                // Update the allSampleUrlsScraped flag
                const wasAllScraped = allSampleUrlsScraped;
                allSampleUrlsScraped = checkAllSampleUrlsScraped(result.topics);
                
                // Only log if the status changed
                if (!wasAllScraped && allSampleUrlsScraped) {
                    logger.log('All sample URLs are now scraped, switching to search proxy service');
                    
                    // Store this information in storage to avoid rechecking
                    await chrome.storage.local.set({ allSampleUrlsScraped: true });
                }
            }
        } catch (err) {
            logger.error('Error checking all sample URLs scraped after tracking:', err);
        }
    }
    
    return true;
}

// Check if all sample URLs have been scraped
async function areAllSampleUrlsScraped() {
    logger.log('Checking if all sample URLs have been scraped...');
    
    // Get the latest topics to ensure we have the most up-to-date information
    try {
        const result = await chrome.storage.local.get(['topics']);
        if (result.topics && result.topics.length > 0) {
            // Recheck and update the flag
            const previousState = allSampleUrlsScraped;
            allSampleUrlsScraped = checkAllSampleUrlsScraped(result.topics);
            
            // Log with appropriate symbol based on status change
            let statusSymbol = allSampleUrlsScraped ? '✅' : '⏳';
            if (!previousState && allSampleUrlsScraped) {
                statusSymbol = '🎉';
                logger.log('🎉 MILESTONE: All sample URLs are now scraped!');
            }
            
            logger.log(`${statusSymbol} Rechecked allSampleUrlsScraped flag: ${allSampleUrlsScraped}`);
            
            // If we're returning true, do one final check of our tracking data
            if (allSampleUrlsScraped) {
                logger.log('🔍 Performing final verification of tracked URLs:');
                
                // Count total tracked URLs across all topics
                let totalTrackedUrls = 0;
                for (const topicId in successfullyScrapedUrls) {
                    if (successfullyScrapedUrls.hasOwnProperty(topicId)) {
                        totalTrackedUrls += successfullyScrapedUrls[topicId].length;
                        logger.log(`  📊 Topic ${topicId}: ${successfullyScrapedUrls[topicId].length} tracked URLs`);
                    }
                }
                
                logger.log(`  📈 Total tracked URLs across all topics: ${totalTrackedUrls}`);
            }
        } else {
            logger.warn('No topics found when checking all sample URLs scraped');
            return false;
        }
    } catch (err) {
        logger.error('Error checking all sample URLs scraped:', err);
        return false;
    }
    
    return allSampleUrlsScraped;
}

// Export the module functions
export {
    initialize,
    selectTopicAndUrl,
    loadSuccessfullyScrapedUrls,
    saveSuccessfullyScrapedUrls,
    trackSuccessfulUrl,
    checkAllSampleUrlsScraped,
    areAllSampleUrlsScraped,
    prefetchUrlsForTopics
};
