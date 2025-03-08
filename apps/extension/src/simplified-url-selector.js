// Simplified URL selector that only uses sample URLs from topics
// This replaces the complex URL generation logic

import { addCacheBusterToUrl } from './url-utils.js';

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

// Track last scraped URLs to avoid repetition
let lastScrapedUrls = {};

// Load last scraped URLs from storage
async function loadLastScrapedUrls() {
    try {
        const result = await chrome.storage.local.get(['lastScrapedUrls']);
        if (result.lastScrapedUrls) {
            lastScrapedUrls = result.lastScrapedUrls;
            logger.log(`Loaded ${Object.keys(lastScrapedUrls).length} topic URL histories`);
        }
    } catch (error) {
        logger.error('Error loading last scraped URLs:', error);
    }
}

// Save last scraped URLs to storage
async function saveLastScrapedUrls() {
    try {
        await chrome.storage.local.set({ lastScrapedUrls });
        logger.log('Saved last scraped URLs to storage');
    } catch (error) {
        logger.error('Error saving last scraped URLs:', error);
    }
}

// Function to select a topic and URL for scraping
async function selectTopicAndUrl(topics) {
    logger.log('Selecting topic and URL for scraping');
    
    if (!topics || topics.length === 0) {
        logger.log('No topics available');
        return { topic: null, url: null };
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
    if (!lastScrapedUrls[selectedTopic.id]) {
        lastScrapedUrls[selectedTopic.id] = [];
    }
    
    // Use sample URLs from the topic
    let url = null;
    
    // Try using a sample URL from the topic if available
    if (selectedTopic.sampleArticleUrls && selectedTopic.sampleArticleUrls.length > 0) {
        logger.log(`Topic has ${selectedTopic.sampleArticleUrls.length} sample URLs available`);
        
        // Log all available sample URLs for debugging
        selectedTopic.sampleArticleUrls.forEach((sampleUrl, index) => {
            logger.log(`Sample URL ${index + 1}: ${sampleUrl}`);
        });
        
        // Log recently scraped URLs for this topic
        if (lastScrapedUrls[selectedTopic.id] && lastScrapedUrls[selectedTopic.id].length > 0) {
            logger.log(`Recently scraped URLs for this topic: ${lastScrapedUrls[selectedTopic.id].length}`);
            lastScrapedUrls[selectedTopic.id].forEach((scrapedUrl, index) => {
                logger.log(`Recently scraped ${index + 1}: ${scrapedUrl}`);
            });
        }
        
        // Filter out recently scraped URLs
        const availableSampleUrls = selectedTopic.sampleArticleUrls.filter(sampleUrl => {
            return !lastScrapedUrls[selectedTopic.id].includes(sampleUrl);
        });
        
        logger.log(`Available unused sample URLs: ${availableSampleUrls.length}`);
        
        if (availableSampleUrls.length > 0) {
            const randomUrlIndex = Math.floor(Math.random() * availableSampleUrls.length);
            url = availableSampleUrls[randomUrlIndex];
            logger.log(`Using new sample URL: ${url}`);
        } else if (selectedTopic.sampleArticleUrls.length > 0) {
            // If all sample URLs have been used recently, just pick one randomly
            const randomUrlIndex = Math.floor(Math.random() * selectedTopic.sampleArticleUrls.length);
            url = selectedTopic.sampleArticleUrls[randomUrlIndex];
            logger.log(`All sample URLs were recently used, reusing: ${url}`);
        }
    } else {
        logger.log('No sample URLs available for topic');
        return { topic: selectedTopic, url: null };
    }
    
    // If we have a valid URL, add it to the recently scraped list and add a cache buster
    if (url) {
        // Add the selected URL to the recently scraped list
        lastScrapedUrls[selectedTopic.id].unshift(url);
        if (lastScrapedUrls[selectedTopic.id].length > 5) {
            lastScrapedUrls[selectedTopic.id] = lastScrapedUrls[selectedTopic.id].slice(0, 5);
        }
        
        // Save updated URL history
        saveLastScrapedUrls();
        
        // Add a cache buster to the URL to make it unique
        url = addCacheBusterToUrl(url);
        
        logger.log(`Selected: Topic "${selectedTopic.name}" | URL: ${url}`);
    } else {
        logger.log('Failed to find a valid URL for topic:', selectedTopic.name);
        return { topic: selectedTopic, url: null };
    }
    
    return {
        topic: selectedTopic,
        url: url
    };
}

// Initialize the module
async function initialize() {
    await loadLastScrapedUrls();
    logger.log('URL selector initialized');
    return true;
}

// Track a scraped URL for a topic
async function trackScrapedUrl(topicId, url) {
    logger.log(`Tracking scraped URL for topic ${topicId}: ${url}`);
    
    // Initialize tracking for this topic if not exists
    if (!lastScrapedUrls[topicId]) {
        lastScrapedUrls[topicId] = [];
    }
    
    // Add the URL to the recently scraped list
    lastScrapedUrls[topicId].unshift(url);
    if (lastScrapedUrls[topicId].length > 5) {
        lastScrapedUrls[topicId] = lastScrapedUrls[topicId].slice(0, 5);
    }
    
    // Save updated URL history
    await saveLastScrapedUrls();
    
    logger.log(`URL tracked successfully for topic ${topicId}`);
    return true;
}

// Export the module functions
export {
    initialize,
    selectTopicAndUrl,
    loadLastScrapedUrls,
    saveLastScrapedUrls,
    trackScrapedUrl
};
