// URL selector module for RhinoSpider extension
// This module handles selecting topics and URLs for scraping

// Track last scraped URLs to avoid repetition
let lastScrapedUrls = {};

// Load last scraped URLs from storage
async function loadLastScrapedUrls() {
    try {
        const result = await chrome.storage.local.get(['lastScrapedUrls']);
        if (result.lastScrapedUrls) {
            lastScrapedUrls = result.lastScrapedUrls;
        }
    } catch (error) {
        console.error('Error loading last scraped URLs:', error);
    }
}

// Save last scraped URLs to storage
async function saveLastScrapedUrls() {
    try {
        await chrome.storage.local.set({ lastScrapedUrls });
    } catch (error) {
        console.error('Error saving last scraped URLs:', error);
    }
}

// Select a URL from sample URLs in a topic
async function selectUrlFromTopic(topic, logger) {
    // Initialize tracking for this topic if not exists
    if (!lastScrapedUrls[topic.id]) {
        lastScrapedUrls[topic.id] = [];
    }
    
    // Use sample URLs from the topic
    let url = null;
    
    // Try using a sample URL from the topic if available
    if (topic.sampleArticleUrls && topic.sampleArticleUrls.length > 0) {
        logger.log(`Topic has ${topic.sampleArticleUrls.length} sample URLs available`);
        
        // Filter out recently scraped URLs
        const availableSampleUrls = topic.sampleArticleUrls.filter(sampleUrl => {
            return !lastScrapedUrls[topic.id].includes(sampleUrl);
        });
        
        if (availableSampleUrls.length > 0) {
            const randomUrlIndex = Math.floor(Math.random() * availableSampleUrls.length);
            url = availableSampleUrls[randomUrlIndex];
            logger.log(`Using sample URL: ${url}`);
        } else if (topic.sampleArticleUrls.length > 0) {
            // If all sample URLs have been used recently, just pick one randomly
            const randomUrlIndex = Math.floor(Math.random() * topic.sampleArticleUrls.length);
            url = topic.sampleArticleUrls[randomUrlIndex];
            logger.log(`All sample URLs were recently used, reusing: ${url}`);
        }
    } else {
        logger.log('No sample URLs available for topic');
        return null;
    }
    
    if (!url) {
        logger.log('No valid URL found for topic');
        return null;
    }
    
    // Update the recently scraped URLs list
    lastScrapedUrls[topic.id].unshift(url);
    if (lastScrapedUrls[topic.id].length > 5) {
        lastScrapedUrls[topic.id] = lastScrapedUrls[topic.id].slice(0, 5);
    }
    
    // Save updated URL history
    await saveLastScrapedUrls();
    
    return url;
}

// Initialize the module
async function initialize() {
    await loadLastScrapedUrls();
}

// Export the module functions
export {
    initialize,
    selectUrlFromTopic,
    loadLastScrapedUrls,
    saveLastScrapedUrls
};
