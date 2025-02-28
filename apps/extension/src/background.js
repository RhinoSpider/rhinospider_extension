// Background script for RhinoSpider extension
import { rhinoSpiderIC } from './ic-agent';
import { ProxyClient } from './proxy-client.js';
import proxyClient from './proxy-client';

// Logger utility
const logger = {
    log: (msg, data) => {
        console.log(` [Background] ${msg}`, data || '');
    },
    error: (msg, error) => {
        console.error(` [Background] ${msg}`, error);
    }
};

// Scraping state
let isScrapingActive = false;
const SCRAPE_INTERVAL_MINUTES = 5; // How often to scrape
let scrapingInterval = null; // For setInterval fallback
let scrapeTimerId = null; // For fallback timer

// Topics and AI config storage
let topics = [];
let aiConfig = null;

// Authentication state
let isAuthenticated = false;

// Initialize extension state on startup
async function initializeExtension() {
    logger.log('Initializing extension');
    
    try {
        // Check if we're authenticated
        const cachedData = await chrome.storage.local.get(['principalId']);
        if (!cachedData.principalId) {
            logger.log('User is not authenticated, skipping initialization');
            return { success: false, error: 'Not authenticated' };
        }
        
        // Initialize topics and AI configuration first
        logger.log('Initializing topics and AI configuration');
        const topicsResult = await initializeTopicsAndConfig();
        
        if (!topicsResult.success) {
            logger.error('Failed to initialize topics and AI configuration');
            return topicsResult;
        }
        
        // Check if topics were loaded successfully
        if (topics.length === 0) {
            logger.error('No topics available after initialization');
            return { success: false, error: 'No topics available' };
        }
        
        logger.log(`Successfully loaded ${topics.length} topics`);
        
        // Check if scraping was previously active
        const scrapingState = await chrome.storage.local.get(['isScrapingActive']);
        if (scrapingState.isScrapingActive) {
            logger.log('Scraping was previously active, restarting');
            await startScraping();
        }
        
        // Set up alarm listener
        if (typeof chrome.alarms !== 'undefined') {
            try {
                chrome.alarms.onAlarm.addListener(async (alarm) => {
                    if (alarm.name === 'scrapeAlarm') {
                        logger.log('Scrape alarm triggered');
                        await performScrape();
                    }
                });
                logger.log('Alarm listener set up successfully');
            } catch (alarmError) {
                logger.error('Error setting up alarm listener:', alarmError);
                // We'll rely on the fallback timer mechanism
            }
        } else {
            logger.log('Alarms API not available, will use fallback timer');
        }
        
        logger.log('Extension initialization complete');
        return { success: true };
    } catch (error) {
        logger.error(`Error initializing extension: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Initialize topics and configuration
async function initializeTopicsAndConfig() {
    logger.log('Initializing topics and configuration');
    
    try {
        // Check if user is authenticated
        const authData = await chrome.storage.local.get(['principalId']);
        if (!authData.principalId) {
            logger.log('User not authenticated yet - waiting for login before fetching topics');
            return [];
        }
        
        // Check if we have cached topics
        const cachedData = await chrome.storage.local.get(['topics', 'lastTopicsUpdate']);
        const now = Date.now();
        
        // Use cached topics if they exist and are less than 1 hour old
        if (cachedData.topics && 
            cachedData.topics.length > 0 && 
            cachedData.lastTopicsUpdate && 
            (now - cachedData.lastTopicsUpdate < 60 * 60 * 1000)) {
            
            logger.log('Using cached topics:', cachedData.topics.length);
            topics = cachedData.topics;
            
            // Log the topics for debugging - now with FULL details
            topics.forEach((topic, index) => {
                logger.log(`Topic ${index + 1}:`, {
                    id: topic.id,
                    name: topic.name,
                    status: topic.status,
                    urlPatterns: topic.urlPatterns,
                    extractionRules: topic.extractionRules,
                    aiConfig: topic.aiConfig,
                    scrapingInterval: topic.scrapingInterval,
                    description: topic.description
                });
            });
            
            return topics;
        }
        
        // Otherwise, fetch topics from the server
        logger.log('Fetching topics from server');
        const fetchedTopics = await getTopics();
        
        if (fetchedTopics && fetchedTopics.length > 0) {
            logger.log('Successfully fetched topics:', fetchedTopics.length);
            topics = fetchedTopics;
            
            // Cache the topics
            await chrome.storage.local.set({ 
                topics: fetchedTopics,
                lastTopicsUpdate: now
            });
            
            // Log the topics for debugging - now with FULL details
            topics.forEach((topic, index) => {
                logger.log(`Topic ${index + 1}:`, {
                    id: topic.id,
                    name: topic.name,
                    status: topic.status,
                    urlPatterns: topic.urlPatterns,
                    extractionRules: topic.extractionRules,
                    aiConfig: topic.aiConfig,
                    scrapingInterval: topic.scrapingInterval,
                    description: topic.description
                });
            });
            
            return topics;
        } else {
            logger.error('No topics fetched from server');
            
            // If we have cached topics, use them as a fallback
            if (cachedData.topics && cachedData.topics.length > 0) {
                logger.log('Using cached topics as fallback:', cachedData.topics.length);
                topics = cachedData.topics;
                return topics;
            }
            
            // Otherwise, return empty array
            logger.log('No cached topics available, returning empty array');
            topics = [];
            return topics;
        }
    } catch (error) {
        logger.error('Error initializing topics:', error);
        
        // Try to use cached topics as fallback
        try {
            const cachedData = await chrome.storage.local.get(['topics']);
            if (cachedData.topics && cachedData.topics.length > 0) {
                logger.log('Using cached topics after error:', cachedData.topics.length);
                topics = cachedData.topics;
                return topics;
            }
        } catch (storageError) {
            logger.error('Error accessing storage:', storageError);
        }
        
        // If all else fails, return empty array
        logger.log('No topics available after error, returning empty array');
        topics = [];
        return topics;
    }
}

// Get topics from the server
async function getTopics() {
    logger.log('Getting topics from server');
    
    try {
        // Get the delegation chain and principal ID from storage
        const cachedData = await chrome.storage.local.get(['delegationChain', 'principalId']);
        
        if (!cachedData.principalId) {
            logger.log('No principal ID found in storage - user needs to authenticate first');
            return [];
        }
        
        logger.log('Using principal ID for topics request:', cachedData.principalId);
        
        // Ensure the principal ID is a string
        let principalIdValue;
        
        if (typeof cachedData.principalId === 'object') {
            if (cachedData.principalId.__principal__) {
                principalIdValue = cachedData.principalId.__principal__;
            } else {
                // Try to convert the object to a string in a safe way
                try {
                    principalIdValue = String(cachedData.principalId);
                } catch (e) {
                    principalIdValue = JSON.stringify(cachedData.principalId);
                }
            }
        } else {
            principalIdValue = String(cachedData.principalId);
        }
        
        logger.log('Using principal ID value for topics request:', principalIdValue);
        
        // Use the proxy client to get topics
        const proxyClientInstance = new ProxyClient();
        
        try {
            // Fetch topics from proxy
            logger.log('Fetching topics from proxy server...');
            const result = await proxyClientInstance.getTopics(principalIdValue);
            logger.log('Received topics response:', result);
            
            // Check if we got a valid response with topics
            if (result && result.ok && Array.isArray(result.ok)) {
                logger.log('Successfully fetched topics via proxy (result.ok):', result.ok.length);
                
                // Log each topic for debugging
                result.ok.forEach((topic, index) => {
                    logger.log(`Topic ${index + 1}:`, {
                        id: topic.id,
                        name: topic.name,
                        status: topic.status,
                        urlPatternsCount: topic.urlPatterns ? topic.urlPatterns.length : 0
                    });
                });
                
                return result.ok;
            } else if (result && Array.isArray(result)) {
                logger.log('Successfully fetched topics via proxy (array):', result.length);
                
                // Log each topic for debugging
                result.forEach((topic, index) => {
                    logger.log(`Topic ${index + 1}:`, {
                        id: topic.id,
                        name: topic.name,
                        status: topic.status,
                        urlPatternsCount: topic.urlPatterns ? topic.urlPatterns.length : 0
                    });
                });
                
                return result;
            } else {
                logger.error('Error fetching topics via proxy:', result);
                
                // Use cached topics if available
                if (cachedData.topics) {
                    logger.log('Using cached topics as fallback');
                    return cachedData.topics;
                } else {
                    logger.log('No cached topics available, skipping topic initialization');
                    return [];
                }
            }
        } catch (error) {
            logger.error('Error fetching topics:', error);
            
            // Use cached topics if available
            if (cachedData.topics) {
                logger.log('Using cached topics as fallback after error');
                return cachedData.topics;
            } else {
                logger.log('No cached topics available, skipping topic initialization');
                return [];
            }
        }
        
    } catch (error) {
        logger.error('Error in getTopics:', error);
        
        // Try to use cached topics as fallback
        try {
            const cachedData = await chrome.storage.local.get(['topics']);
            if (cachedData.topics) {
                logger.log('Using cached topics after error');
                return cachedData.topics;
            } else {
                logger.log('No cached topics available after error, skipping topic initialization');
                return [];
            }
        } catch (storageError) {
            logger.error('Error accessing storage:', storageError);
            return [];
        }
    }
}

// Handle dashboard tab management
async function openOrFocusDashboard() {
    try {
        logger.log('Opening or focusing dashboard');
        
        // Check if dashboard is already open
        const tabs = await chrome.tabs.query({
            url: chrome.runtime.getURL('pages/dashboard.html')
        });
        
        if (tabs.length > 0) {
            // Focus the first dashboard tab
            logger.log('Focusing existing dashboard tab');
            await chrome.tabs.update(tabs[0].id, { active: true });
            await chrome.windows.update(tabs[0].windowId, { focused: true });
        } else {
            // Open a new dashboard tab
            logger.log('Opening new dashboard tab');
            await chrome.tabs.create({
                url: chrome.runtime.getURL('pages/dashboard.html')
            });
        }
    } catch (error) {
        logger.error('Error opening dashboard:', error);
    }
}

// Generate a valid URL from a pattern
function generateUrlFromPattern(pattern) {
    logger.log('Generating URL from pattern:', pattern);
    
    // Replace wildcard with appropriate value
    let url = pattern;
    
    // Replace * with empty string for initial scraping
    url = url.replace(/\*/g, '');
    
    // Replace double slashes (except after protocol) with single slash
    url = url.replace(/(https?:\/\/)|(\/\/+)/g, function(match, protocol) {
        return protocol || '/';
    });
    
    // Ensure URL is properly formatted
    if (!url.startsWith('http')) {
        url = 'https://' + url;
    }
    
    logger.log('Generated URL:', url);
    return url;
}

// Select a topic and URL for scraping
function selectTopicAndUrl() {
    logger.log('Selecting topic and URL for scraping');
    
    // Filter active topics
    const activeTopics = topics.filter(topic => topic.status === 'active');
    logger.log('Active topics count:', activeTopics.length);
    
    if (activeTopics.length === 0) {
        logger.log('No active topics found');
        return null;
    }
    
    // Select a random topic
    const randomIndex = Math.floor(Math.random() * activeTopics.length);
    const selectedTopic = activeTopics[randomIndex];
    logger.log('Selected topic for scraping:', selectedTopic.name);
    
    // Check if topic has URL patterns
    if (!selectedTopic.urlPatterns || selectedTopic.urlPatterns.length === 0) {
        logger.log('Selected topic has no URL patterns');
        return null;
    }
    
    logger.log('Topic URL patterns:', selectedTopic.urlPatterns);
    
    // Select a random URL pattern
    const randomPatternIndex = Math.floor(Math.random() * selectedTopic.urlPatterns.length);
    const selectedPattern = selectedTopic.urlPatterns[randomPatternIndex];
    
    // Generate URL from pattern
    const url = generateUrlFromPattern(selectedPattern);
    
    return {
        topic: selectedTopic,
        url: url,
        pattern: selectedPattern
    };
}

// Perform a scrape operation
async function performScrape() {
    logger.log('Starting scrape operation');
    
    try {
        // Check if we're authenticated
        const cachedData = await chrome.storage.local.get(['principalId']);
        if (!cachedData.principalId) {
            logger.error('Cannot scrape: User is not authenticated');
            return { success: false, error: 'Not authenticated' };
        }
        
        // Initialize topics if needed
        if (topics.length === 0) {
            logger.log('No topics available, initializing before scrape');
            await initializeTopicsAndConfig();
        }
        
        // If still no topics, return error
        if (topics.length === 0) {
            logger.error('No topics available after initialization');
            return { success: false, error: 'No topics available' };
        }
        
        // Select a topic and URL
        const { topic, url, pattern } = await selectTopicAndUrl();
        
        if (!topic || !url) {
            logger.error('Failed to select topic or URL for scraping');
            return { success: false, error: 'No valid topic or URL' };
        }
        
        logger.log(`Selected topic: ${topic.name} (${topic.id})`);
        logger.log(`Selected URL: ${url}`);
        
        // Generate a valid URL from the pattern
        const validUrl = generateUrlFromPattern(url);
        logger.log(`Generated valid URL: ${validUrl}`);
        
        // Fetch content from the URL
        logger.log(`Fetching content from ${validUrl}`);
        
        let content = '';
        
        try {
            // Use the proxy server to fetch content instead of direct fetching
            // This avoids CORS issues by having the server make the request
            logger.log('Using proxy server to fetch content and avoid CORS issues');
            
            // Initialize proxy client
            const proxyClient = new ProxyClient();
            
            // Request content through the proxy using the fetchContent method
            const fetchResult = await proxyClient.fetchContent(validUrl, cachedData.principalId);
            
            if (fetchResult && fetchResult.ok && fetchResult.ok.content) {
                content = fetchResult.ok.content;
                logger.log(`Successfully fetched content via proxy (${content.length} bytes)`);
            } else if (fetchResult && fetchResult.content) {
                content = fetchResult.content;
                logger.log(`Successfully fetched content via proxy (${content.length} bytes)`);
            } else {
                logger.error('Failed to fetch content via proxy: No content in response');
                logger.log('Response:', fetchResult);
                throw new Error('No content in proxy response');
            }
        } catch (error) {
            logger.error(`Error fetching content via proxy: ${error.message}`);
            logger.log('Unable to fetch content, will submit empty content notification');
        }
        
        // Submit the scraped data
        if (content && content.length > 0) {
            logger.log(`Submitting scraped content (${content.length} bytes) for URL: ${validUrl}`);
            
            try {
                const result = await submitScrapedData(validUrl, content, topic.id, 'completed');
                logger.log('Successfully submitted scraped data:', result);
                return { success: true, result };
            } catch (submitError) {
                logger.error(`Error submitting scraped data: ${submitError.message}`);
                return { success: false, error: `Submission error: ${submitError.message}` };
            }
        } else {
            logger.log('No content fetched, submitting empty content notification');
            
            try {
                const result = await submitScrapedData(validUrl, '', topic.id, 'empty');
                logger.log('Successfully submitted empty content notification:', result);
                return { success: true, result, empty: true };
            } catch (emptySubmitError) {
                logger.error(`Error submitting empty content notification: ${emptySubmitError.message}`);
                return { success: false, error: `Empty submission error: ${emptySubmitError.message}` };
            }
        }
    } catch (error) {
        logger.error(`Error during scrape operation: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Submit scraped data to the proxy server
async function submitScrapedData(url, content, topicId, status = 'completed') {
    logger.log('Submitting scraped data for URL:', url);
    
    try {
        // Get principal ID from storage
        const { principalId } = await new Promise(resolve => {
            chrome.storage.local.get(['principalId'], result => resolve(result));
        });
        
        if (!principalId) {
            logger.error('No principal ID found, cannot submit scraped data');
            return { success: false, error: 'No principal ID found' };
        }
        
        logger.log('Submitting scraped data via proxy with principal ID:', principalId);
        
        // Convert principal ID to string if it's an object
        let principalIdValue;
        if (typeof principalId === 'object') {
            if (principalId.__principal__) {
                principalIdValue = principalId.__principal__;
            } else {
                try {
                    principalIdValue = JSON.stringify(principalId);
                } catch (e) {
                    principalIdValue = String(principalId);
                }
            }
        } else {
            principalIdValue = String(principalId);
        }
        
        logger.log('Using principal ID value for submission:', principalIdValue);
        logger.log('Submitting data with topic ID:', topicId);
        
        // Create scraped data object
        const scrapedData = {
            id: `scrape_${Date.now()}`,
            url: url,
            content: content || '',
            topic: topicId,
            timestamp: Date.now(),
            status: status,
            principalId: principalIdValue,
            source: 'extension',
            scraping_time: 500,
            client_id: null
        };
        
        logger.log('Created scraped data with URL:', url);
        
        // Initialize proxy client
        const proxyClient = new ProxyClient();
        
        // Submit the data
        try {
            const result = await proxyClient.submitScrapedData(scrapedData);
            logger.log('Submission result:', result);
            return { success: true, result };
        } catch (error) {
            logger.error('Error submitting scraped data:', error);
            return { success: false, error: error.message };
        }
    } catch (error) {
        logger.error('Error preparing scraped data for submission:', error);
        return { success: false, error: error.message };
    }
}

// Force a scrape operation for testing
async function forceScrape() {
    logger.log('Forcing a scrape operation for testing');
    
    // Make sure we're authenticated
    const cachedData = await chrome.storage.local.get(['principalId']);
    if (!cachedData.principalId) {
        logger.error('Cannot force scrape: User is not authenticated');
        return { success: false, error: 'Not authenticated' };
    }
    
    // Initialize topics if needed
    if (topics.length === 0) {
        logger.log('No topics available, initializing before force scrape');
        await initializeTopicsAndConfig();
    }
    
    // Log the current state
    logger.log('Before force scrape - Topics count:', topics.length);
    logger.log('Before force scrape - Is scraping active:', isScrapingActive);
    
    // Perform the scrape
    try {
        await performScrape();
        return { success: true };
    } catch (error) {
        logger.error('Error during forced scrape:', error);
        return { success: false, error: error.message };
    }
}

// Start the scraping process
async function startScraping() {
    logger.log('Starting scraping process');
    
    try {
        // Check if we're authenticated
        const cachedData = await chrome.storage.local.get(['principalId']);
        if (!cachedData.principalId) {
            logger.log('Cannot start scraping: User is not authenticated');
            return { success: false, error: 'Not authenticated' };
        }
        
        // Check if scraping is already active
        if (isScrapingActive) {
            logger.log('Scraping is already active, not starting again');
            return { success: true, message: 'Scraping already active' };
        }
        
        // Set scraping as active
        isScrapingActive = true;
        
        // Store scraping state
        chrome.storage.local.set({ isScrapingActive: true });
        
        // Update badge
        chrome.action.setBadgeText({ text: 'ON' });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
        
        // Perform initial scrape
        logger.log('Performing initial scrape');
        await performScrape();
        
        // Set up periodic scraping with alarms if available
        if (typeof chrome.alarms !== 'undefined') {
            try {
                // Clear any existing alarm
                await chrome.alarms.clear('scrapeAlarm');
                
                // Create a new alarm
                await chrome.alarms.create('scrapeAlarm', {
                    periodInMinutes: SCRAPE_INTERVAL_MINUTES
                });
                
                logger.log(`Scheduled periodic scraping every ${SCRAPE_INTERVAL_MINUTES} minutes`);
            } catch (alarmError) {
                logger.error('Error setting up alarms:', alarmError);
                // Set up fallback using setTimeout
                setupFallbackTimer();
            }
        } else {
            logger.log('Alarms API not available, using fallback timer');
            // Set up fallback using setTimeout
            setupFallbackTimer();
        }
        
        logger.log('Scraping process started successfully');
        return { success: true };
    } catch (error) {
        logger.error(`Error starting scraping: ${error.message}`);
        isScrapingActive = false;
        chrome.storage.local.set({ isScrapingActive: false });
        chrome.action.setBadgeText({ text: 'ERR' });
        chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
        return { success: false, error: error.message };
    }
}

// Set up a fallback timer for periodic scraping when alarms API is not available
function setupFallbackTimer() {
    // Clear any existing timer
    if (scrapeTimerId) {
        clearTimeout(scrapeTimerId);
    }
    
    // Convert minutes to milliseconds
    const intervalMs = SCRAPE_INTERVAL_MINUTES * 60 * 1000;
    
    // Set up a new timer
    scrapeTimerId = setTimeout(async () => {
        if (isScrapingActive) {
            logger.log('Executing scheduled scrape via fallback timer');
            await performScrape();
            // Set up the next timer
            setupFallbackTimer();
        }
    }, intervalMs);
    
    logger.log(`Scheduled fallback timer for scraping every ${SCRAPE_INTERVAL_MINUTES} minutes`);
}

// Stop the scraping process
async function stopScraping() {
    logger.log('Stopping scraping process');
    
    try {
        // Check if scraping is active
        if (!isScrapingActive) {
            logger.log('Scraping is not active, nothing to stop');
            return { success: true, message: 'Scraping not active' };
        }
        
        // Clear the alarm if it exists
        if (chrome.alarms) {
            await chrome.alarms.clear('scrapeAlarm');
            logger.log('Cleared scrape alarm');
        }
        
        // Set scraping as inactive
        isScrapingActive = false;
        
        // Update badge
        chrome.action.setBadgeText({ text: 'OFF' });
        chrome.action.setBadgeBackgroundColor({ color: '#9E9E9E' });
        
        // Save scraping state
        await chrome.storage.local.set({ isScrapingActive: false });
        
        logger.log('Scraping process stopped successfully');
        return { success: true, message: 'Scraping stopped' };
    } catch (error) {
        logger.error(`Error stopping scraping process: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Force refresh topics
async function forceRefreshTopics() {
    logger.log('Force refreshing topics');
    
    try {
        // Clear cached topics
        await chrome.storage.local.remove(['topics', 'lastTopicsUpdate']);
        logger.log('Cleared cached topics');
        
        // Reset topics array
        topics = [];
        
        // Fetch fresh topics
        const freshTopics = await getTopics();
        
        if (freshTopics && freshTopics.length > 0) {
            logger.log('Successfully fetched fresh topics:', freshTopics.length);
            
            // Update topics in memory
            topics = freshTopics;
            
            // Cache the new topics
            await chrome.storage.local.set({ 
                topics: freshTopics,
                lastTopicsUpdate: Date.now()
            });
            
            // Log the topics for debugging
            topics.forEach((topic, index) => {
                logger.log(`Topic ${index + 1}:`, {
                    id: topic.id,
                    name: topic.name,
                    status: topic.status,
                    urlPatternsCount: topic.urlPatterns ? topic.urlPatterns.length : 0
                });
            });
            
            return {
                success: true,
                topicsCount: freshTopics.length,
                topics: freshTopics
            };
        } else {
            logger.error('No topics fetched during force refresh');
            
            return {
                success: false,
                error: 'No topics returned from server',
                topicsCount: 0
            };
        }
    } catch (error) {
        logger.error('Error during force refresh topics:', error);
        
        return {
            success: false,
            error: error.message,
            topicsCount: 0
        };
    }
}

// Set up alarm listener if the API is available
if (chrome.alarms) {
    chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === 'scrapeAlarm') {
            logger.log('Scrape alarm triggered');
            if (isScrapingActive) {
                performScrape();
            }
        }
    });
}

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    logger.log('Received message:', message);
    
    switch (message.type) {
        case 'GET_STATUS':
            sendResponse({
                isAuthenticated,
                isScrapingActive,
                topicsCount: topics.length,
                lastScrapeTime: lastScrapeTime
            });
            break;
            
        case 'OPEN_DASHBOARD':
            openOrFocusDashboard();
            break;
            
        case 'GET_STATE':
            chrome.storage.local.get(['enabled'], (result) => {
                sendResponse({
                    enabled: result.enabled,
                    isScrapingActive: isScrapingActive
                });
            });
            return true;
            
        case 'SET_STATE':
            chrome.storage.local.set({
                enabled: message.enabled
            }, () => {
                // Start or stop scraping based on the active state
                if (message.enabled) {
                    startScraping();
                } else {
                    stopScraping();
                }
                
                sendResponse({ 
                    success: true,
                    isScrapingActive: isScrapingActive
                });
            });
            return true;
            
        case 'START_SCRAPING':
            logger.log('Received start scraping request');
            
            startScraping()
                .then(result => {
                    logger.log('Start scraping result:', result);
                    sendResponse(result);
                })
                .catch(error => {
                    logger.error('Error starting scraping:', error);
                    sendResponse({ success: false, error: error.message });
                });
            break;
            
        case 'STOP_SCRAPING':
            logger.log('Received stop scraping request');
            
            stopScraping()
                .then(result => {
                    logger.log('Stop scraping result:', result);
                    sendResponse(result);
                })
                .catch(error => {
                    logger.error('Error stopping scraping:', error);
                    sendResponse({ success: false, error: error.message });
                });
            break;
            
        case 'PERFORM_SCRAPE':
            performScrape();
            sendResponse({ success: true });
            return true;
            
        case 'LOGIN_COMPLETE':
            logger.log('Login complete, updating auth state');
            if (message.principalId) {
                let principalIdValue;
                
                if (typeof message.principalId === 'object') {
                    if (message.principalId.__principal__) {
                        principalIdValue = message.principalId.__principal__;
                    } else {
                        // Try to convert the object to a string in a safe way
                        try {
                            principalIdValue = String(message.principalId);
                        } catch (e) {
                            principalIdValue = JSON.stringify(message.principalId);
                        }
                    }
                } else {
                    principalIdValue = String(message.principalId);
                }
                
                logger.log('Storing principal ID:', principalIdValue);
                chrome.storage.local.set({ principalId: principalIdValue });
                isAuthenticated = true;
                
                // Initialize topics after login
                logger.log('Initializing topics after login');
                initializeTopicsAndConfig().then(() => {
                    // Start scraping if extension is enabled
                    chrome.storage.local.get(['enabled'], function(data) {
                        if (data.enabled !== false) {
                            logger.log('Extension is enabled, starting scraping');
                            startScraping();
                        } else {
                            logger.log('Extension is disabled, not starting scraping');
                        }
                    });
                });
            } else {
                logger.log('No principal ID provided in LOGIN_COMPLETE message');
            }
            sendResponse({ success: true });
            break;
            
        case 'UPDATE_TOPICS':
            // Update topics from message
            if (message.topics) {
                topics = message.topics;
                aiConfig = message.aiConfig;
                
                // Cache the topics
                chrome.storage.local.set({
                    topics: topics,
                    aiConfig: aiConfig,
                    topicsTimestamp: Date.now()
                });
                
                logger.log('Topics updated from message', topics.length);
                sendResponse({ success: true });
            }
            return true;
            
        case 'GET_TOPICS':
            // Return current topics
            sendResponse({
                topics: topics,
                aiConfig: aiConfig
            });
            return true;
            
        case 'FORCE_SCRAPE':
            logger.log('Received force scrape request');
            
            performScrape()
                .then(result => {
                    logger.log('Force scrape result:', result);
                    sendResponse(result || { success: true });
                })
                .catch(error => {
                    logger.error('Error in force scrape:', error);
                    sendResponse({ success: false, error: error.message });
                });
            
            return true; // Keep the message channel open for async response
            
        case 'FORCE_REFRESH_TOPICS':
            logger.log('Received force refresh topics request');
            
            forceRefreshTopics()
                .then(result => {
                    logger.log('Force refresh topics result:', result);
                    sendResponse(result);
                })
                .catch(error => {
                    logger.error('Error in force refresh topics:', error);
                    sendResponse({ 
                        success: false, 
                        error: error.message,
                        topicsCount: 0
                    });
                });
            
            return true; // Keep the message channel open for async response
            
        default:
            sendResponse({ error: 'Unknown message type' });
    }
    
    // Return true to indicate we'll respond asynchronously
    return true;
});

// Handle extension install/update
chrome.runtime.onInstalled.addListener((details) => {
    logger.log('Extension installed/updated:', details.reason);
    
    // Check if user is authenticated
    chrome.storage.local.get(['principalId', 'delegationChain', 'enabled'], (result) => {
        // Set authentication state
        isAuthenticated = !!result.principalId;
        
        // Initialize topics and config
        initializeTopicsAndConfig().then(() => {
            // Set initial state if not already set
            if (result.enabled === undefined) {
                chrome.storage.local.set({
                    enabled: true
                });
            }
            
            // Only start scraping if we have authentication and scraping is enabled
            if (result.principalId && result.enabled !== false) {
                logger.log('User is authenticated and scraping is enabled, starting scraping');
                startScraping();
            } else if (!result.principalId) {
                logger.log('User is not authenticated, waiting for login before scraping');
                // We'll start scraping when the LOGIN_COMPLETE message is received
            } else {
                logger.log('User is authenticated but scraping is disabled');
            }
        });
    });
});

// Get mock topics for testing
function getMockTopics() {
    logger.log('Creating mock topics for testing');
    return [
        {
            id: 'topic_mock_1',
            status: 'active',
            name: 'Mock Topic 1',
            description: 'This is a mock topic for testing',
            urlPatterns: ['https://example.com/*', 'https://test.com/*'],
            extractionRules: {
                fields: [
                    { name: 'Title', required: true, fieldType: 'text' },
                    { name: 'Content', required: true, fieldType: 'text' }
                ]
            }
        },
        {
            id: 'topic_mock_2',
            status: 'active',
            name: 'Mock Topic 2',
            description: 'This is another mock topic for testing',
            urlPatterns: ['https://example.org/*', 'https://test.org/*'],
            extractionRules: {
                fields: [
                    { name: 'Title', required: true, fieldType: 'text' },
                    { name: 'Content', required: true, fieldType: 'text' }
                ]
            }
        }
    ];
}

// Get mock topics for fallback
function getMockTopicsFallback() {
    return [
        {
            id: 'topic_45b4mrcnl',
            status: 'active',
            name: 'Product Hunt Launches',
            description: 'Scrape latest product launches from Product Hunt\'s homepage URL',
            urlPatterns: ['https://www.producthunt.com/*'],
            extractionRules: {
                fields: [
                    { name: 'Title', required: true, fieldType: 'text' },
                    { name: 'Description', required: true, fieldType: 'text' },
                    { name: 'Votes', required: true, fieldType: 'text' },
                    { name: 'Maker', required: true, fieldType: 'text' },
                    { name: 'LaunchDate', required: true, fieldType: 'text' }
                ],
                customPrompt: 'Extract information from the webpage about Product Hunt Launches'
            },
            aiConfig: {
                model: 'gpt-3.5-turbo',
                costLimits: {
                    maxConcurrent: 5,
                    maxDailyCost: 1,
                    maxMonthlyCost: 10
                }
            }
        },
        {
            id: 'topic_7i792lvvl',
            status: 'active',
            name: 'TechCrunch News',
            description: 'Scrape latest technology news articles from TechCrunch',
            urlPatterns: ['https://techcrunch.com/*/', 'https://techcrunch.com/20*/'],
            extractionRules: {
                fields: [
                    { name: 'Title', required: true, fieldType: 'text' },
                    { name: 'Author', required: true, fieldType: 'text' },
                    { name: 'Date', required: true, fieldType: 'text' },
                    { name: 'Content', required: true, fieldType: 'text' },
                    { name: 'Category', required: false, fieldType: 'text' }
                ],
                customPrompt: 'Extract information from the webpage about TechCrunch News'
            },
            aiConfig: {
                model: 'gpt-3.5-turbo',
                costLimits: {
                    maxConcurrent: 5,
                    maxDailyCost: 1,
                    maxMonthlyCost: 10
                }
            }
        }
    ];
}

// Get mock AI config for fallback
function getMockAIConfig() {
    return {
        maxContentLength: 10000,
        minContentLength: 500,
        maxRequestsPerMinute: 2,
        delayBetweenRequests: 5000,
        cleanupRules: {
            removeScripts: true,
            removeStyles: true,
            removeNavigation: true,
            removeFooters: true
        }
    };
}

// Add a simple debug log function
function debugLog(message, data) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        message,
        data
    };
    
    // Log to console
    console.log(`[DEBUG ${timestamp}]`, message, data);
    
    // Store in local storage for later inspection
    chrome.storage.local.get(['debugLogs'], (result) => {
        const logs = result.debugLogs || [];
        logs.push(logEntry);
        
        // Keep only the last 100 logs
        if (logs.length > 100) {
            logs.shift();
        }
        
        chrome.storage.local.set({ debugLogs: logs });
    });
}

// Expose debug functions to the global scope (service worker context)
// Note: Don't use window object in service workers
const rhinoSpiderDebug = {
    performScrape: async () => {
        logger.log('Manual scrape triggered from console');
        return await performScrape();
    },
    getTopics: async () => {
        logger.log('Manual get topics triggered from console');
        return await getTopics();
    },
    refreshTopics: async () => {
        logger.log('Manual refresh topics triggered from console');
        topics = [];
        return await initializeTopicsAndConfig();
    },
    logTopics: () => {
        logger.log('Current topics:', topics);
        return topics;
    },
    getLogs: () => {
        return new Promise((resolve) => {
            chrome.storage.local.get(['debugLogs'], (result) => {
                resolve(result.debugLogs || []);
            });
        });
    },
    clearLogs: () => {
        return new Promise((resolve) => {
            chrome.storage.local.remove(['debugLogs'], () => {
                resolve({ success: true, message: 'Debug logs cleared' });
            });
        });
    }
};

// Make debug functions available via chrome.runtime.getBackgroundPage()
self.rhinoSpiderDebug = rhinoSpiderDebug;

logger.log('Debug functions exposed to console as rhinoSpiderDebug');

// Call initialization on startup
initializeExtension();
