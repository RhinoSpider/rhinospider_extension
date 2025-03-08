// Simplified scraper module for RhinoSpider extension
// This module handles the scraping functionality using sample URLs from topics

import * as urlSelector from './simplified-url-selector.js';

// Logger utility
const logger = {
    log: (msg, data) => {
        console.log(`[SimplifiedScraper] ${msg}`, data || '');
    },
    error: (msg, error) => {
        console.error(`[SimplifiedScraper] ERROR: ${msg}`, error || '');
    },
    warn: (msg, data) => {
        console.warn(`[SimplifiedScraper] WARNING: ${msg}`, data || '');
    }
};

// Perform a scrape operation
async function performScrape(topics, submitScrapedData, getIPAddress, measureInternetSpeed) {
    try {
        logger.log('Starting scrape operation');
        
        if (!topics || topics.length === 0) {
            logger.log('No topics available for scraping');
            return false;
        }
        
        // Select a topic and URL for scraping
        const { topic, url } = await urlSelector.selectTopicAndUrl(topics);
        
        if (!topic || !url) {
            logger.log('No valid topic or URL selected for scraping');
            return false;
        }
        
        logger.log(`Selected topic: ${topic.name}`);
        logger.log(`Selected URL: ${url}`);
        
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
    await urlSelector.initialize();
    logger.log('Simplified scraper initialized');
    return true;
}

// Export the module functions
export {
    initialize,
    performScrape
};
