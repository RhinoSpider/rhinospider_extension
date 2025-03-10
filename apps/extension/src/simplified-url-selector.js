// Simplified URL selector that uses sample URLs from topics and DuckDuckGo search as fallback
// This replaces the complex URL generation logic

import { addCacheBusterToUrl } from './url-utils.js';
import { getUrlsForTopic } from './duckduckgo-search.js';

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
    
    // Get the current status of sample URL scraping (for logging only)
    const allSamplesDone = checkAllSampleUrlsScraped(topics);
    if (allSamplesDone) {
        logger.log('🔄 All sample URLs have been scraped, continuing with generated URLs');
    }
    
    // Filter active topics
    const activeTopics = topics.filter(topic => topic.status === 'active');
    logger.log(`Active topics count: ${activeTopics.length}`);
    
    if (activeTopics.length === 0) {
        logger.log('No active topics found');
        return { topic: null, url: null };
    }
    
    // Select a random topic from active topics
    const randomIndex = Math.floor(Math.random() * activeTopics.length);
    const selectedTopic = activeTopics[randomIndex];
    
    logger.log(`Selected topic: ${selectedTopic.name}`);
    
    // Initialize tracking for this topic if not exists
    if (!successfullyScrapedUrls[selectedTopic.id]) {
        successfullyScrapedUrls[selectedTopic.id] = [];
    }
    
    // Use sample URLs from the topic
    let url = null;
    
    // Check if all sample URLs have been scraped for all topics
    const allSamplesScraped = await chrome.storage.local.get(['allSampleUrlsScraped']);
    const isAllSamplesScraped = allSamplesScraped.allSampleUrlsScraped === true;
    
    // If all samples are scraped, go directly to generating new URLs
    if (isAllSamplesScraped) {
        logger.log('🔄 All sample URLs have been scraped, generating new URLs from DuckDuckGo');
        try {
            // Generate a batch of new URLs for this topic
            const generatedUrls = await getUrlsForTopic(selectedTopic);
            
            if (generatedUrls && generatedUrls.length > 0) {
                // Take a random URL from the generated URLs
                const randomUrlIndex = Math.floor(Math.random() * Math.min(generatedUrls.length, 5));
                url = generatedUrls[randomUrlIndex];
                logger.log(`🔍 Using generated URL: ${url}`);
            } else {
                logger.log('❌ No URLs could be generated for this topic, will try another topic next time');
                return { topic: null, url: null };
            }
        } catch (error) {
            logger.error('Error generating URLs:', error);
            return { topic: null, url: null };
        }
    }
    // Otherwise, try sample URLs first, then fall back to generated URLs
    else if (selectedTopic.sampleArticleUrls && selectedTopic.sampleArticleUrls.length > 0) {
        logger.log(`Topic has ${selectedTopic.sampleArticleUrls.length} sample URLs available`);
        
        // Filter out successfully scraped URLs using the same URL normalization
        const availableSampleUrls = selectedTopic.sampleArticleUrls.filter(sampleUrl => {
            // Apply the same URL normalization logic as in trackSuccessfulUrl
            let cleanUrl = sampleUrl;
            
            // Remove any URL parameters
            if (cleanUrl.includes('?')) {
                cleanUrl = cleanUrl.split('?')[0];
            }
            
            // Remove trailing slashes
            cleanUrl = cleanUrl.replace(/\/$/, '');
            
            // Case-insensitive comparison with tracked URLs
            return !successfullyScrapedUrls[selectedTopic.id].some(trackedUrl => 
                trackedUrl.toLowerCase() === cleanUrl.toLowerCase()
            );
        });
        
        const availabilitySymbol = availableSampleUrls.length > 0 ? '✅' : '❌';
        logger.log(`${availabilitySymbol} Available unused sample URLs: ${availableSampleUrls.length}`);
        
        if (availableSampleUrls.length > 0) {
            // Select a random URL from available ones
            const randomUrlIndex = Math.floor(Math.random() * availableSampleUrls.length);
            url = availableSampleUrls[randomUrlIndex];
            logger.log(`🔄 Using new sample URL: ${url}`);
        } else {
            // If all sample URLs for this topic have been scraped, generate new URLs
            logger.log('🔍 All sample URLs for this topic have been scraped, generating new URLs...');
            try {
                // Generate a batch of new URLs for this topic
                const generatedUrls = await getUrlsForTopic(selectedTopic);
                
                if (generatedUrls && generatedUrls.length > 0) {
                    // Always use newly generated URLs without filtering against scraped ones
                    // This ensures we always have fresh URLs to try
                    const randomUrlIndex = Math.floor(Math.random() * Math.min(generatedUrls.length, 5));
                    url = generatedUrls[randomUrlIndex];
                    logger.log(`🔍 Using generated URL: ${url}`);
                } else {
                    logger.log('❌ No URLs could be generated for this topic, will try another topic next time');
                    return { topic: null, url: null };
                }
            } catch (error) {
                logger.error('Error generating URLs:', error);
                return { topic: null, url: null };
            }
        }
    } else {
        // No sample URLs available, generate URLs directly
        logger.log('⚠️ No sample URLs available for topic, generating URLs directly');
        try {
            // Generate a batch of new URLs for this topic
            const generatedUrls = await getUrlsForTopic(selectedTopic);
            
            if (generatedUrls && generatedUrls.length > 0) {
                // Take a random URL from the first 5 generated URLs
                const randomUrlIndex = Math.floor(Math.random() * Math.min(generatedUrls.length, 5));
                url = generatedUrls[randomUrlIndex];
                logger.log(`🔍 Using generated URL: ${url}`);
            } else {
                logger.log('❌ No URLs could be generated for this topic, will try another topic next time');
                return { topic: null, url: null };
            }
        } catch (error) {
            logger.error('Error generating URLs:', error);
            return { topic: null, url: null };
        }
    }
    
    // If we have a valid URL, add a cache buster
    if (url) {
        // Add a cache buster to the URL to make it unique
        url = addCacheBusterToUrl(url);
        logger.log(`🎯 Selected: Topic "${selectedTopic.name}" | URL: ${url}`);
    } else {
        logger.log('❌ Failed to find a valid URL for topic:', selectedTopic.name);
        return { topic: selectedTopic, url: null };
    }
    
    return {
        topic: selectedTopic,
        url: url
    };
}

// Initialize the module
async function initialize() {
    await loadSuccessfullyScrapedUrls();
    allSampleUrlsScraped = false;
    logger.log('URL selector initialized');
    return true;
}

// Track a successfully scraped URL for a topic
async function trackSuccessfulUrl(topicId, url) {
    if (!topicId) {
        logger.error('Invalid topicId provided to trackSuccessfulUrl');
        return false;
    }
    
    if (!url) {
        logger.error('Invalid URL provided to trackSuccessfulUrl');
        return false;
    }
    
    // More robust URL normalization - handles various URL formats
    let cleanUrl = url;
    
    // Remove cache buster parameter if present
    if (cleanUrl.includes('?_cb=')) {
        cleanUrl = cleanUrl.split('?_cb=')[0];
    }
    // Remove any URL parameters (everything after ?)
    else if (cleanUrl.includes('?')) {
        cleanUrl = cleanUrl.split('?')[0];
    }
    
    // Remove trailing slashes for consistency
    cleanUrl = cleanUrl.replace(/\/$/, '');
    
    logger.log(`Checking URL for tracking: ${cleanUrl}`);
    
    // Initialize tracking for this topic if not exists
    if (!successfullyScrapedUrls[topicId]) {
        successfullyScrapedUrls[topicId] = [];
        logger.log(`Initialized tracking for new topic ${topicId}`);
    }
    
    // First, determine if this is a sample URL that should be tracked
    try {
        const result = await chrome.storage.local.get(['topics']);
        if (result.topics && result.topics.length > 0) {
            // Find the current topic
            const currentTopic = result.topics.find(topic => topic.id === topicId);
            
            if (currentTopic && currentTopic.sampleArticleUrls && currentTopic.sampleArticleUrls.length > 0) {
                // Check if the URL is one of the sample URLs
                const isSampleUrl = currentTopic.sampleArticleUrls.some(sampleUrl => {
                    // Normalize the sample URL the same way
                    let normalizedSampleUrl = sampleUrl;
                    if (normalizedSampleUrl.includes('?')) {
                        normalizedSampleUrl = normalizedSampleUrl.split('?')[0];
                    }
                    normalizedSampleUrl = normalizedSampleUrl.replace(/\/$/, '');
                    
                    // Case-insensitive comparison
                    return normalizedSampleUrl.toLowerCase() === cleanUrl.toLowerCase();
                });
                
                // Only track if it's a sample URL
                if (isSampleUrl) {
                    logger.log(`💾 URL identified as a sample URL, will be tracked: ${cleanUrl}`);
                    
                    // Check if URL is already tracked (case-insensitive comparison)
                    const isAlreadyTracked = successfullyScrapedUrls[topicId].some(trackedUrl => {
                        return trackedUrl.toLowerCase() === cleanUrl.toLowerCase();
                    });
                    
                    // Only add the URL if it's not already in the list
                    if (!isAlreadyTracked) {
                        // Add the URL to the tracked list
                        successfullyScrapedUrls[topicId].push(cleanUrl);
                        
                        // Save updated URL history immediately
                        await saveSuccessfullyScrapedUrls();
                        logger.log(`✅ Sample URL tracked successfully for topic ${topicId}`);
                        
                        // Log the current count of tracked URLs for this topic
                        logger.log(`📊 Topic ${topicId} now has ${successfullyScrapedUrls[topicId].length} tracked sample URLs`);
                        
                        // After adding a new URL, check if all sample URLs have been scraped
                        const wasAllScraped = allSampleUrlsScraped;
                        allSampleUrlsScraped = checkAllSampleUrlsScraped(result.topics);
                        
                        // Use different symbols based on the change in status
                        let flagSymbol = allSampleUrlsScraped ? '🏁' : '⏳';
                        if (!wasAllScraped && allSampleUrlsScraped) {
                            flagSymbol = '🎉';
                            logger.log('🎉 MILESTONE: All sample URLs are now scraped!');
                        }
                        
                        logger.log(`${flagSymbol} Updated allSampleUrlsScraped flag: ${allSampleUrlsScraped}`);
                    } else {
                        logger.log(`⏭️ Sample URL already tracked for topic ${topicId}: ${cleanUrl}`);
                    }
                } else {
                    logger.log(`🔎 URL is not a sample URL, skipping tracking: ${cleanUrl}`);
                }
            } else {
                logger.log(`ℹ️ Topic ${topicId} has no sample URLs, skipping tracking`);
            }
        } else {
            logger.warn('No topics found when checking sample URLs');
        }
    } catch (err) {
        logger.error('Error determining if URL should be tracked:', err);
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
                logger.log('🎉 MILESTONE: All sample URLs are now scraped! Continuing with generated URLs');
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
    areAllSampleUrlsScraped
};
