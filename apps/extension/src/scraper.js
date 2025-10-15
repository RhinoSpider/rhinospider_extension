import { submitScrapedData, awardPoints } from './service-worker-adapter';
// handles the actual scraping part
import * as urlSelector from './simplified-url-selector.js';
// AI processing
import { processWithAI, getAIConfig } from './ai-processor.js';

// simple logger
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

// main scraping function
async function performScrape(topics, submitScrapedData, getIPAddress, measureInternetSpeed, principalId) {
    if (!topics || topics.length === 0) {
        logger.log('No topics available for scraping');
        return;
    }

    try {
        // only use active topics
        const activeTopics = topics.filter(topic => topic.status === 'active');
        logger.log('Active topics count:', activeTopics.length);

        if (activeTopics.length === 0) {
            logger.log('No active topics found');
            return;
        }

        logger.log('Selecting topic and URL from sample URLs...');

        // pick random topic
        const randomIndex = Math.floor(Math.random() * activeTopics.length);
        const topic = activeTopics[randomIndex];
        logger.log(`Selected topic: ${topic.name}`);

        // get url from topic's samples
        const url = await urlSelector.selectUrlFromTopic(topic, logger);

        if (!url) {
            logger.log('No valid URL found for topic');
            return;
        }

        logger.log(`Selected: Topic "${topic.name}" | URL: ${url}`);

        // grab IP and speed info
        const [ipAddress, internetSpeed] = await Promise.all([
            getIPAddress(),
            measureInternetSpeed()
        ]);

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
            // fetch the page
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

            // update timing
            metrics.endTime = Date.now();
            metrics.duration = metrics.endTime - metrics.startTime;
            metrics.status = 'completed';
            metrics.contentLength = content.length;

            logger.log(`Scraped content length: ${content.length} characters`);

            // Check if AI processing is enabled
            const aiConfig = await getAIConfig();
            let dataToSubmit = {
                id: `${url.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
                url,
                topic: topic.id,
                source: 'extension',
                status: 'completed',
                principalId,
                scraping_time: metrics.duration
            };

            // Process with AI if enabled and API key is available
            if (aiConfig.enabled && aiConfig.apiKey) {
                logger.log('AI processing enabled, analyzing content...');
                const aiResult = await processWithAI(content, aiConfig.apiKey);

                if (aiResult.success) {
                    // Submit analyzed data (1-5KB) instead of raw content
                    dataToSubmit.content = JSON.stringify({
                        summary: aiResult.summary,
                        keywords: aiResult.keywords,
                        category: aiResult.category,
                        sentiment: aiResult.sentiment
                    });
                    dataToSubmit.aiProcessed = true;
                    dataToSubmit.originalSize = aiResult.originalSize;
                    dataToSubmit.analyzedSize = aiResult.analyzedSize;
                    dataToSubmit.compressionRatio = (aiResult.originalSize / aiResult.analyzedSize).toFixed(2) + 'x';

                    logger.log(`✅ AI processing successful! Compression: ${dataToSubmit.compressionRatio} (${aiResult.originalSize} → ${aiResult.analyzedSize} bytes)`);
                } else {
                    // AI failed, fall back to raw content
                    dataToSubmit.content = content;
                    dataToSubmit.aiProcessed = false;
                    dataToSubmit.aiError = aiResult.error;
                    logger.warn('AI processing failed, submitting raw content');
                }
            } else {
                // AI not enabled, submit raw content
                dataToSubmit.content = content || '<html><body><p>No content available</p></body></html>';
                dataToSubmit.aiProcessed = false;
                logger.log('AI processing disabled, submitting raw content');
            }

            // send it to the backend
            await submitScrapedData(dataToSubmit);

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