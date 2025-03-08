// Scraper patch module for RhinoSpider extension
// This module provides a simple patch for the background.js file to use our simplified scraping approach

import * as urlSelector from './simplified-url-selector.js';

// Logger utility
const logger = {
    log: (msg, data) => {
        console.log(`[ScraperPatch] ${msg}`, data || '');
    },
    error: (msg, error) => {
        console.error(`[ScraperPatch] ERROR: ${msg}`, error || '');
    },
    warn: (msg, data) => {
        console.warn(`[ScraperPatch] WARNING: ${msg}`, data || '');
    }
};

// Initialize the patch
async function initialize() {
    try {
        await urlSelector.initialize();
        logger.log('Scraper patch initialized');
        return true;
    } catch (error) {
        logger.error('Failed to initialize scraper patch', error);
        return false;
    }
}

// Select a topic and URL for scraping
async function selectTopicAndUrl(topics) {
    logger.log('Selecting topic and URL using simplified selector');
    
    try {
        const result = await urlSelector.selectTopicAndUrl(topics);
        return result;
    } catch (error) {
        logger.error('Error in selectTopicAndUrl', error);
        return { topic: null, url: null };
    }
}

// Track a scraped URL for a topic
async function trackScrapedUrl(topicId, url) {
    logger.log(`Tracking scraped URL for topic ${topicId}: ${url}`);
    
    try {
        // Store the URL in the simplified URL selector's tracking system
        await urlSelector.trackScrapedUrl(topicId, url);
        return true;
    } catch (error) {
        logger.error('Error tracking scraped URL', error);
        return false;
    }
}

// Test function to verify sample URL selection
async function testSampleUrlSelection(topics) {
    logger.log('TESTING: Sample URL selection');
    
    if (!topics || topics.length === 0) {
        logger.log('TESTING: No topics available for testing');
        return { success: false, message: 'No topics available' };
    }
    
    // Filter for active topics with sample URLs
    const testableTopics = topics.filter(topic => 
        topic.status === 'active' && 
        topic.sampleArticleUrls && 
        topic.sampleArticleUrls.length > 0
    );
    
    if (testableTopics.length === 0) {
        logger.log('TESTING: No active topics with sample URLs found');
        return { success: false, message: 'No topics with sample URLs' };
    }
    
    logger.log(`TESTING: Found ${testableTopics.length} topics with sample URLs`);
    
    // Test URL selection for each topic
    const results = [];
    for (const topic of testableTopics) {
        logger.log(`TESTING: Topic "${topic.name}" has ${topic.sampleArticleUrls.length} sample URLs`);
        
        // Try selecting a URL for this topic
        const result = await urlSelector.selectTopicAndUrl([topic]);
        
        if (result.url) {
            logger.log(`TESTING: Successfully selected URL for topic "${topic.name}": ${result.url}`);
            results.push({
                topicId: topic.id,
                topicName: topic.name,
                selectedUrl: result.url,
                success: true
            });
        } else {
            logger.log(`TESTING: Failed to select URL for topic "${topic.name}"`);
            results.push({
                topicId: topic.id,
                topicName: topic.name,
                success: false
            });
        }
    }
    
    const successCount = results.filter(r => r.success).length;
    logger.log(`TESTING: Successfully selected URLs for ${successCount}/${testableTopics.length} topics`);
    
    return {
        success: successCount > 0,
        message: `Tested ${testableTopics.length} topics, ${successCount} successful`,
        results: results
    };
}

// Export the patch functions
export {
    initialize,
    selectTopicAndUrl,
    trackScrapedUrl,
    testSampleUrlSelection
};
