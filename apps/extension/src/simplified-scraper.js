// Simplified scraper module for RhinoSpider extension
// This module handles the scraping functionality using sample URLs from topics

// Import URL utilities
import { addCacheBusterToUrl } from './url-utils.js';

// Logger utility
const logger = {
    log: (msg, data) => {
        console.log(`[Scraper] ${msg}`, data || '');
    },
    error: (msg, error) => {
        console.error(`[Scraper] ERROR: ${msg}`, error || '');
    },
    warn: (msg, data) => {
        console.warn(`[Scraper] WARNING: ${msg}`, data || '');
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
        }
    } catch (error) {
        logger.error('Error loading last scraped URLs:', error);
    }
}

// Save last scraped URLs to storage
async function saveLastScrapedUrls() {
    try {
        await chrome.storage.local.set({ lastScrapedUrls });
    } catch (error) {
        logger.error('Error saving last scraped URLs:', error);
    }
}

// Select a topic and URL for scraping
async function selectTopicAndUrl(topics) {
    logger.log('Selecting topic and URL from sample URLs...');
    
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
    const topic = activeTopics[randomIndex];
    logger.log(`Selected topic: ${topic.name}`);
    
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
        return { topic, url: null };
    }
    
    if (!url) {
        logger.log('No valid URL found for topic');
        return { topic, url: null };
    }
    
    // Add a cache buster to make the URL unique
    url = addCacheBusterToUrl(url, Date.now());
    
    // Update the recently scraped URLs list
    lastScrapedUrls[topic.id].unshift(url);
    if (lastScrapedUrls[topic.id].length > 5) {
        lastScrapedUrls[topic.id] = lastScrapedUrls[topic.id].slice(0, 5);
    }
    
    // Save updated URL history
    await saveLastScrapedUrls();
    
    logger.log(`Selected: Topic "${topic.name}" | URL: ${url}`);
    return { topic, url };
}

// Perform a scrape operation
async function performScrape(topics, submitScrapedData, getIPAddress, measureInternetSpeed) {
    if (!topics || topics.length === 0) {
        logger.log('No topics available for scraping');
        return false;
    }
    
    try {
        // Select a topic and URL for scraping
        const { topic, url } = await selectTopicAndUrl(topics);
        
        if (!topic || !url) {
            logger.log('No valid topic or URL selected for scraping');
            return false;
        }
        
        // Get IP and internet speed before scraping
        const [ipAddress, internetSpeed] = await Promise.all([
            getIPAddress(),
            measureInternetSpeed()
        ]);
        
        // Prepare metrics
        const metrics = {
            ipAddress,
            internetSpeed,
            startTime: Date.now(),
            endTime: null,
            duration: null,
            status: 'started'
        };
        
        logger.log(`Scraping with IP: ${ipAddress} | Speed: ${internetSpeed.score}`);
        
        try {
            // Fetch content
            logger.log(`Fetching content from URL: ${url}`);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const content = await response.text();
            
            // Update metrics
            metrics.endTime = Date.now();
            metrics.duration = metrics.endTime - metrics.startTime;
            metrics.status = 'completed';
            metrics.contentLength = content.length;
            
            logger.log(`Scraped content length: ${content.length} characters`);
            
            // Submit the scraped data
            await submitScrapedData(url, content, topic.id, 'completed', null, metrics);
            
            logger.log('Scraping completed successfully');
            return true;
        } catch (error) {
            // Handle CORS errors
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                logger.error(`CORS issue with URL: ${url}`, error);
                
                // Update metrics
                metrics.endTime = Date.now();
                metrics.duration = metrics.endTime - metrics.startTime;
                metrics.status = 'failed';
                metrics.error = 'CORS error';
                
                // Submit the failed scrape
                await submitScrapedData(url, null, topic.id, 'failed', null, metrics);
            } else {
                logger.error(`Error scraping URL: ${url}`, error);
                
                // Update metrics
                metrics.endTime = Date.now();
                metrics.duration = metrics.endTime - metrics.startTime;
                metrics.status = 'failed';
                metrics.error = error.message;
                
                // Submit the failed scrape
                await submitScrapedData(url, null, topic.id, 'failed', null, metrics);
            }
            
            return false;
        }
    } catch (error) {
        logger.error('Error in performScrape:', error);
        return false;
    }
}

// Initialize the module
async function initialize() {
    await loadLastScrapedUrls();
}

// Export the module functions
export {
    initialize,
    performScrape,
    selectTopicAndUrl
};
