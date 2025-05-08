// Simplified URL selector that uses sample URLs from topics and search proxy service as fallback
// This replaces the complex URL generation logic

import { addCacheBusterToUrl } from './url-utils.js';
import searchProxyClient from './search-proxy-client.js';
const { getUrlForTopic, prefetchUrlsForAllTopics } = searchProxyClient;
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
    
    try {
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
        
        // Try to get a URL for the selected topic
        let url = null;
        logger.log('Attempting to get URL for topic: ' + selectedTopic.name);
        
        // Check if we have prefetched URLs for this topic
        if (prefetchedUrlsByTopic[selectedTopic.id] && prefetchedUrlsByTopic[selectedTopic.id].length > 0) {
            // Use a prefetched URL
            url = prefetchedUrlsByTopic[selectedTopic.id].shift(); // Remove and return the first URL
            logger.log(`Using prefetched URL for topic ${selectedTopic.name}:`, url);
        } else {
            // No prefetched URLs available, try to get a new one
            logger.log('No prefetched URLs available, fetching new URL from search proxy');
            
            // First check if we have any cached URLs in storage
            try {
                const cachedData = await chrome.storage.local.get(['cachedUrls', 'cachedUrlsTimestamp']);
                
                // Check if we have cached URLs for this topic that are less than 24 hours old
                if (cachedData.cachedUrls && 
                    cachedData.cachedUrls[selectedTopic.id] && 
                    cachedData.cachedUrls[selectedTopic.id].length > 0 &&
                    cachedData.cachedUrlsTimestamp && 
                    (Date.now() - cachedData.cachedUrlsTimestamp < 24 * 60 * 60 * 1000)) {
                    
                    // Use a cached URL
                    const cachedUrls = cachedData.cachedUrls[selectedTopic.id];
                    url = cachedUrls.shift(); // Remove and return the first URL
                    
                    // Update the cached URLs
                    cachedData.cachedUrls[selectedTopic.id] = cachedUrls;
                    await chrome.storage.local.set({ cachedUrls: cachedData.cachedUrls });
                    
                    logger.log(`Using cached URL for topic ${selectedTopic.name}:`, url);
                    return { topic: selectedTopic, url };
                }
            } catch (cacheError) {
                logger.error('Error retrieving cached URLs:', cacheError);
            }
            
            try {
                // Try the standard approach with searchProxyClient
                const isHealthy = await searchProxyClient.checkProxyHealth();
                logger.log(`Search proxy health check before URL fetch: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
                logger.log(`Calling getUrlForTopic for topic ${selectedTopic.id} (${selectedTopic.name})`);
                
                // Force reset=true to get fresh URLs
                url = await getUrlForTopic(selectedTopic);
                logger.log(`Result from getUrlForTopic:`, url);
            } catch (error) {
                // If the standard approach fails, try direct API call
                logger.error('Error using standard getUrlForTopic:', error);
                
                try {
                    // Fall back to direct API call
                    url = await directSearchProxyCall(selectedTopic);
                    logger.log(`Direct API call returned: ${url ? url : 'null'}`);
                } catch (directError) {
                    logger.error('Error with direct API call:', directError);
                }
            }
        }
        
        // Check if we got a URL from any approach
        if (!url) {
            logger.warn(`No URLs could be generated for topic ${selectedTopic.id}, trying fallback URLs`);
            
            // Use fallback URLs for this topic
            try {
                // Check if we have fallback URLs stored
                const fallbackData = await chrome.storage.local.get('fallbackUrls');
                
                if (fallbackData.fallbackUrls && fallbackData.fallbackUrls[selectedTopic.id] && 
                    fallbackData.fallbackUrls[selectedTopic.id].length > 0) {
                    
                    // Use a fallback URL
                    url = fallbackData.fallbackUrls[selectedTopic.id].shift();
                    
                    // Update the fallback URLs
                    await chrome.storage.local.set({ fallbackUrls: fallbackData.fallbackUrls });
                    
                    logger.log(`Using fallback URL for topic ${selectedTopic.name}:`, url);
                } else {
                    // No fallback URLs available, use a hardcoded fallback URL based on topic
                    const hardcodedFallbacks = {
                        'technology': ['https://techcrunch.com', 'https://wired.com', 'https://theverge.com'],
                        'health': ['https://webmd.com', 'https://health.com', 'https://mayoclinic.org'],
                        'science': ['https://scientificamerican.com', 'https://science.org', 'https://nature.com'],
                        'business': ['https://bloomberg.com', 'https://forbes.com', 'https://wsj.com'],
                        'entertainment': ['https://variety.com', 'https://hollywoodreporter.com', 'https://ew.com']
                    };
                    
                    // Try to match the topic name to a category
                    const topicName = selectedTopic.name.toLowerCase();
                    let category = Object.keys(hardcodedFallbacks).find(cat => topicName.includes(cat));
                    
                    // If no match, use technology as default
                    if (!category) category = 'technology';
                    
                    // Select a random fallback URL
                    const fallbackUrls = hardcodedFallbacks[category];
                    const randomIndex = Math.floor(Math.random() * fallbackUrls.length);
                    url = fallbackUrls[randomIndex];
                    
                    logger.log(`Using hardcoded fallback URL for topic ${selectedTopic.name}:`, url);
                }
            } catch (fallbackError) {
                logger.error('Error retrieving fallback URLs:', fallbackError);
                return { topic: null, url: null };
            }
        }
        
        // If we still don't have a URL after all fallback attempts, log an error and return null
        if (!url) {
            logger.error(`Failed to get URL for topic ${selectedTopic.name} after all fallback attempts`);
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
            logger.log(`Added cache buster to URL: ${urlWithCacheBuster}`);
            
            // Log selection (but not too frequently)
            const currentTime = Date.now();
            if (!selectTopicAndUrl.lastUrlSelectionLog || (currentTime - selectTopicAndUrl.lastUrlSelectionLog > 600000)) {
                logger.log(`Selected topic "${selectedTopic.name}" with URL`);
                selectTopicAndUrl.lastUrlSelectionLog = currentTime;
            }
            
            return { topic: selectedTopic, url: urlWithCacheBuster };
        } catch (error) {
            logger.error(`Invalid URL for topic ${selectedTopic.name}: ${url}`, error);
            return { topic: selectedTopic, url: null };
        }
    } catch (error) {
        // Handle any errors in the URL selection process
        logger.error('Error in selectTopicAndUrl:', error);
        return { topic: null, url: null };
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
async function initialize() {
    try {
        // Load from storage
        const data = await chrome.storage.local.get(['allSampleUrlsScraped', 'fallbackUrls']);
        if (data.allSampleUrlsScraped) {
            allSampleUrlsScraped = true;
            logger.log('All sample URLs have been scraped (loaded from storage)');
        }
        
        // Initialize fallback URLs if they don't exist
        if (!data.fallbackUrls) {
            // Create a set of fallback URLs for common topics
            const fallbackUrls = {
                // Technology-related topics
                'technology': ['https://techcrunch.com', 'https://wired.com', 'https://theverge.com', 'https://arstechnica.com', 'https://cnet.com'],
                'tech': ['https://techcrunch.com', 'https://wired.com', 'https://theverge.com', 'https://arstechnica.com', 'https://cnet.com'],
                'programming': ['https://github.blog', 'https://dev.to', 'https://stackoverflow.blog', 'https://css-tricks.com', 'https://smashingmagazine.com'],
                'ai': ['https://ai.googleblog.com', 'https://openai.com/blog', 'https://deepmind.com/blog', 'https://machinelearningmastery.com', 'https://distill.pub'],
                
                // Health-related topics
                'health': ['https://webmd.com', 'https://health.com', 'https://mayoclinic.org', 'https://medicalnewstoday.com', 'https://healthline.com'],
                'fitness': ['https://menshealth.com', 'https://womenshealthmag.com', 'https://shape.com', 'https://runnersworld.com', 'https://self.com'],
                'nutrition': ['https://eatright.org', 'https://nutritiondata.self.com', 'https://nutrition.gov', 'https://foodnetwork.com/healthy', 'https://eatingwell.com'],
                
                // Science-related topics
                'science': ['https://scientificamerican.com', 'https://science.org', 'https://nature.com', 'https://popsci.com', 'https://newscientist.com'],
                'space': ['https://space.com', 'https://nasa.gov', 'https://universetoday.com', 'https://skyandtelescope.org', 'https://astronomy.com'],
                'environment': ['https://nationalgeographic.com/environment', 'https://epa.gov', 'https://nature.org', 'https://earthday.org', 'https://sierraclub.org'],
                
                // Business-related topics
                'business': ['https://bloomberg.com', 'https://forbes.com', 'https://wsj.com', 'https://ft.com', 'https://hbr.org'],
                'finance': ['https://cnbc.com', 'https://marketwatch.com', 'https://investopedia.com', 'https://fool.com', 'https://morningstar.com'],
                'economy': ['https://economist.com', 'https://worldbank.org', 'https://imf.org', 'https://federalreserve.gov', 'https://bls.gov'],
                
                // Entertainment-related topics
                'entertainment': ['https://variety.com', 'https://hollywoodreporter.com', 'https://ew.com', 'https://deadline.com', 'https://rottentomatoes.com'],
                'movies': ['https://imdb.com', 'https://boxofficemojo.com', 'https://filmsite.org', 'https://rogerebert.com', 'https://metacritic.com/movies'],
                'music': ['https://billboard.com', 'https://pitchfork.com', 'https://rollingstone.com/music', 'https://npr.org/music', 'https://genius.com']
            };
            
            // Store the fallback URLs
            await chrome.storage.local.set({ fallbackUrls });
            logger.log('Initialized fallback URLs');
        }
    } catch (error) {
        logger.error('Error initializing simplified URL selector:', error);
    }
    
    await loadSuccessfullyScrapedUrls();
    
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
