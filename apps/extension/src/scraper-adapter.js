// Scraper adapter module for RhinoSpider extension
// This module provides a bridge between the old scraping code and the new simplified scraper

import * as simplifiedScraper from './simplified-scraper.js';

// Logger utility
const logger = {
    log: (msg, data) => {
        console.log(`[ScraperAdapter] ${msg}`, data || '');
    },
    error: (msg, error) => {
        console.error(`[ScraperAdapter] ERROR: ${msg}`, error || '');
    },
    warn: (msg, data) => {
        console.warn(`[ScraperAdapter] WARNING: ${msg}`, data || '');
    }
};

// Initialize the adapter
async function initialize() {
    try {
        await simplifiedScraper.initialize();
        logger.log('Scraper adapter initialized');
        return true;
    } catch (error) {
        logger.error('Failed to initialize scraper adapter', error);
        return false;
    }
}

// Perform a scrape operation using the simplified scraper
async function performScrape(topics, submitScrapedData, getIPAddress, measureInternetSpeed) {
    logger.log('Performing scrape using simplified scraper');
    
    try {
        const result = await simplifiedScraper.performScrape(
            topics,
            submitScrapedData,
            getIPAddress,
            measureInternetSpeed
        );
        
        return result;
    } catch (error) {
        logger.error('Error in adapter performScrape', error);
        return false;
    }
}

// Export the adapter functions
export {
    initialize,
    performScrape
};
