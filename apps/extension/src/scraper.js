import { submitScrapedData, awardPoints } from './service-worker-adapter';
// Scraper module for RhinoSpider extension
// This module handles the actual scraping functionality

import * as urlSelector from './url-selector.js';

// Logger utility
const logger = {
    log: (msg, data) => {
        console.log(` [Scraper] ${msg}`, data || '');
    },
    error: (msg, error) => {
        console.error(` [Scraper] ERROR: ${msg}`, error || '');
    },
    warn: (msg, data) => {
        console.warn(` [Scraper] WARNING: ${msg}`, data || '');
    }
};

// Perform a scrape operation using sample URLs from topics
async function performScrape(topics, submitScrapedData, getIPAddress, measureInternetSpeed, principalId) {
    if (!topics || topics.length === 0) {
        logger.log('No topics available for scraping');
        return;
    }

    try {
        // Filter active topics
        const activeTopics = topics.filter(topic => topic.status === 'active');
        logger.log('Active topics count:', activeTopics.length);
        
        if (activeTopics.length === 0) {
            logger.log('No active topics found');
            return;
        }
        
        logger.log('Selecting topic and URL from sample URLs...');
        
        // Select a random topic from active topics
        const randomIndex = Math.floor(Math.random() * activeTopics.length);
        const topic = activeTopics[randomIndex];
        logger.log(`Selected topic: ${topic.name}`);
        
        // Get a URL from the topic's sample URLs
        const url = await urlSelector.selectUrlFromTopic(topic, logger);
        
        if (!url) {
            logger.log('No valid URL found for topic');
            return;
        }
        
        logger.log(`Selected: Topic "${topic.name}" | URL: ${url}`);
        
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
            await submitScrapedData({
                id: `${url.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
                url,
                topic: topic.id,
                content: content || '<html><body><p>No content available</p></body></html>',
                source: 'extension',
                status: 'completed',
                principalId,
                scraping_time: metrics.duration
            });

            // Award points for successful scrape
            await awardPoints(principalId, metrics.contentLength);
            
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
                await submitScrapedData({
                    id: `${url.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
                    url,
                    topic: topic.id,
                    content: content || '<html><body><p>No content available</p></body></html>',
                    source: 'extension',
                    status: 'failed',
                    principalId,
                    scraping_time: metrics.duration,
                    error: metrics.error
                });
            } else {
                logger.error(`Error scraping URL: ${url}`, error);
                
                // Update metrics
                metrics.endTime = Date.now();
                metrics.duration = metrics.endTime - metrics.startTime;
                metrics.status = 'failed';
                metrics.error = error.message;
                
                // Submit the failed scrape
                await submitScrapedData({
                    id: `${url.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
                    url,
                    topic: topic.id,
                    content: content || '<html><body><p>No content available</p></body></html>',
                    source: 'extension',
                    status: 'failed',
                    principalId,
                    scraping_time: metrics.duration,
                    error: metrics.error
                });
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
}

// Export the module functions
export {
    initialize,
    performScrape
};