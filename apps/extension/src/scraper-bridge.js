// Scraper bridge module for RhinoSpider extension
// This module provides a bridge between the background.js file and our simplified scraper module

import * as simplifiedScraper from './simplified-scraper-module.js';

// Logger utility
const logger = {
    log: (msg, data) => {
        console.log(`[ScraperBridge] ${msg}`, data || '');
    },
    error: (msg, error) => {
        console.error(`[ScraperBridge] ERROR: ${msg}`, error || '');
    },
    warn: (msg, data) => {
        console.warn(`[ScraperBridge] WARNING: ${msg}`, data || '');
    }
};

// Initialize the bridge
async function initialize() {
    try {
        await simplifiedScraper.initialize();
        logger.log('Scraper bridge initialized');
        return true;
    } catch (error) {
        logger.error('Failed to initialize scraper bridge', error);
        return false;
    }
}

// Perform a scrape operation using the simplified scraper
async function performScrape(topics, submitScrapedData, getIPAddress, measureInternetSpeed) {
    logger.log('Delegating scrape operation to simplified scraper');
    
    try {
        const result = await simplifiedScraper.performScrape(
            topics,
            submitScrapedData,
            getIPAddress,
            measureInternetSpeed
        );
        
        return result;
    } catch (error) {
        logger.error('Error in bridge performScrape', error);
        return false;
    }
}

// Export the bridge functions
export {
    initialize,
    performScrape
};
