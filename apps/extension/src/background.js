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
    },
    warn: (msg, data) => {
        console.warn(` [Background] ${msg}`, data || '');
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
    try {
        logger.log('Initializing extension');
        
        // Get authentication state
        const { principalId, enabled } = await chrome.storage.local.get(['principalId', 'enabled']);
        
        // Set authentication state
        isAuthenticated = !!principalId;
        logger.log(`Authentication state: ${isAuthenticated ? 'Authenticated' : 'Not authenticated'}`);
        
        // Set up action listeners
        setupActionListeners();
        
        // Initialize topics and config only if authenticated
        if (isAuthenticated) {
            logger.log('User is authenticated, initializing topics and config');
            await initializeTopicsAndConfig();
            
            // Check if extension is enabled
            if (enabled !== false) {
                logger.log('Extension is enabled, checking topics before starting scraping');
                
                // Check if topics are loaded
                if (topics && topics.length > 0) {
                    logger.log('Topics are loaded, automatic scraping disabled');
                    // Removed automatic scraping on initialization
                } else {
                    logger.log('Topics are not loaded, waiting for topics before starting scraping');
                    // We'll start scraping when topics are loaded
                }
            } else {
                logger.log('Extension is disabled, not starting scraping');
            }
        } else {
            logger.log('User is not authenticated, waiting for login before initializing topics and scraping');
            // We'll initialize topics and start scraping when the LOGIN_COMPLETE message is received
        }
        
        return { success: true };
    } catch (error) {
        logger.error('Error initializing extension:', error);
        return { success: false, error: error.message };
    }
}

// Set up action listeners
function setupActionListeners() {
    // Set up browser action click listener
    if (chrome.action) {
        chrome.action.onClicked.addListener(handleBrowserActionClick);
    } else if (chrome.browserAction) {
        chrome.browserAction.onClicked.addListener(handleBrowserActionClick);
    }
    
    // DISABLED: We should not monitor user's browsing activity
    // This functionality has been disabled for privacy reasons
    // chrome.tabs.onUpdated.addListener(handleTabUpdated);
}

// Initialize basic functionality that doesn't depend on authentication
function initializeBasicFunctionality() {
    // Set up message listeners
    chrome.runtime.onMessage.addListener(handleMessages);
    
    // Set up alarm listener
    if (typeof chrome.alarms !== 'undefined') {
        chrome.alarms.onAlarm.addListener(handleAlarm);
    }
}

// Initialize scraping-related functionality
async function initializeScrapingFunctionality() {
    try {
        logger.log('Initializing scraping functionality');
        
        // Check authentication
        const { principalId, enabled } = await chrome.storage.local.get(['principalId', 'enabled']);
        if (!principalId) {
            logger.log('Cannot initialize scraping: User is not authenticated');
            return { success: false, error: 'Not authenticated' };
        }
        
        // Check if extension is enabled
        if (enabled === false) {
            logger.log('Extension is disabled, not initializing scraping');
            return { success: false, error: 'Extension disabled' };
        }
        
        // Check if topics are loaded
        if (!topics || topics.length === 0) {
            logger.log('No topics loaded, attempting to load topics');
            
            try {
                // Load topics
                await getTopics();
                
                // Check if topics were loaded successfully
                if (!topics || topics.length === 0) {
                    logger.log('Failed to load topics, cannot initialize scraping');
                    return { success: false, error: 'Failed to load topics' };
                }
            } catch (error) {
                logger.error('Error loading topics:', error);
                return { success: false, error: 'Error loading topics' };
            }
        }
        
        // Start scraping
        logger.log('Topics are loaded, starting scraping');
        const result = await startScraping();
        
        return result;
    } catch (error) {
        logger.error('Error initializing scraping functionality:', error);
        return { success: false, error: error.message };
    }
}

// Initialize topics and configuration
async function initializeTopicsAndConfig() {
    try {
        logger.log('Initializing topics and configuration');
        
        // Check authentication
        const { principalId } = await chrome.storage.local.get(['principalId']);
        if (!principalId) {
            logger.log('Cannot initialize topics: User is not authenticated');
            return { success: false, error: 'Not authenticated' };
        }
        
        // Load topics
        logger.log('Loading topics');
        await getTopics();
        
        // Check if topics were loaded successfully
        if (!topics || topics.length === 0) {
            logger.log('Failed to load topics during initialization');
            return { success: false, error: 'Failed to load topics' };
        }
        
        logger.log(`Successfully loaded ${topics.length} topics during initialization`);
        return { success: true, topicsCount: topics.length };
    } catch (error) {
        logger.error('Error initializing topics and configuration:', error);
        return { success: false, error: error.message };
    }
}

// Get topics from the API
async function getTopics() {
    try {
        logger.log('Getting topics from API');
        
        // Check authentication
        const { principalId } = await chrome.storage.local.get(['principalId']);
        if (!principalId) {
            logger.log('Cannot get topics: User is not authenticated');
            return [];
        }
        
        // Get API URL from storage
        const { apiUrl } = await chrome.storage.local.get(['apiUrl']);
        
        // If API URL is set, use it to fetch topics
        if (apiUrl) {
            // Construct topics URL
            const topicsUrl = `${apiUrl}/topics`;
            logger.log(`Fetching topics from ${topicsUrl}`);
            
            // Fetch topics from API
            const response = await fetch(topicsUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${principalId}`,
                    'Content-Type': 'application/json'
                }
            });
            
            // Check response
            if (!response.ok) {
                throw new Error(`Failed to fetch topics: ${response.status} ${response.statusText}`);
            }
            
            // Parse response
            const data = await response.json();
            
            // Check if topics array exists
            if (!data || !Array.isArray(data.topics)) {
                logger.log('No topics found in API response');
                topics = [];
                return [];
            }
            
            // Store topics in memory and storage
            topics = data.topics;
            await chrome.storage.local.set({ topics: data.topics });
            
            logger.log(`Successfully loaded ${topics.length} topics`);
            return topics;
        } 
        // If API URL is not set, try using the proxy client
        else {
            logger.log('API URL not set, trying to fetch topics via proxy client');
            
            try {
                // Use the proxy client to fetch topics
                const topicsResult = await proxyClient.getTopics(principalId);
                
                // Check if we got a valid result
                if (topicsResult && Array.isArray(topicsResult)) {
                    // Store topics in memory and storage
                    topics = topicsResult;
                    await chrome.storage.local.set({ topics: topicsResult });
                    
                    logger.log(`Successfully loaded ${topics.length} topics via proxy client`);
                    return topics;
                } else if (topicsResult && topicsResult.ok && Array.isArray(topicsResult.ok)) {
                    // Handle result.ok format
                    topics = topicsResult.ok;
                    await chrome.storage.local.set({ topics: topicsResult.ok });
                    
                    logger.log(`Successfully loaded ${topics.length} topics via proxy client (ok format)`);
                    return topics;
                } else {
                    logger.log('No valid topics found in proxy client response');
                    return [];
                }
            } catch (proxyError) {
                logger.error('Error getting topics via proxy client:', proxyError);
                return [];
            }
        }
    } catch (error) {
        logger.error('Error getting topics:', error);
        return [];
    }
}

// Open or focus dashboard
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
    try {
        if (!topics || topics.length === 0) {
            logger.log('Cannot perform scrape: No topics loaded');
            return;
        }
        
        logger.log('Performing scrape operation');
        
        // We're not going to scan tabs anymore
        // Instead, we'll just log that scraping is ready
        logger.log('Scraping system initialized and ready for test URLs');
        
    } catch (error) {
        logger.error('Error during scrape operation:', error);
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
                    principalIdValue = String(principalId);
                } catch (e) {
                    principalIdValue = JSON.stringify(principalId);
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
    try {
        logger.log('Starting scraping process');
        
        // Check authentication
        const { principalId, enabled } = await chrome.storage.local.get(['principalId', 'enabled']);
        if (!principalId) {
            logger.log('Cannot start scraping: User is not authenticated');
            return { success: false, error: 'Not authenticated' };
        }
        
        // Check if extension is enabled
        if (enabled === false) {
            logger.log('Cannot start scraping: Extension is disabled');
            return { success: false, error: 'Extension disabled' };
        }
        
        // Check if topics are loaded
        if (!topics || topics.length === 0) {
            logger.log('Cannot start scraping: No topics loaded');
            return { success: false, error: 'No topics loaded' };
        }
        
        // Set scraping state to active
        isScrapingActive = true;
        
        // Create alarm for periodic scraping
        if (chrome.alarms) {
            // Clear any existing alarms
            await chrome.alarms.clear('scrapeAlarm');
            
            // Create new alarm
            await chrome.alarms.create('scrapeAlarm', {
                periodInMinutes: 5 // Scrape every 5 minutes
            });
            
            logger.log('Scrape alarm created, will scrape every 5 minutes');
        } else {
            logger.warn('Alarms API not available, periodic scraping disabled');
        }
        
        // Perform initial scrape
        await performScrape();
        
        logger.log('Scraping started successfully');
        return { success: true };
    } catch (error) {
        logger.error('Error starting scraping:', error);
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

// Handle alarm events
async function handleAlarm(alarm) {
    if (alarm.name === 'scrapeAlarm') {
        // Check authentication before scraping
        const { principalId } = await chrome.storage.local.get(['principalId']);
        if (!principalId) {
            logger.log('Scrape alarm triggered but user is not authenticated, skipping');
            return;
        }
        
        logger.log('Scrape alarm triggered');
        await performScrape();
    }
}

// Handle browser action click
function handleBrowserActionClick() {
    logger.log('Browser action clicked');
    openOrFocusDashboard();
}

// Handle tab updates
function handleTabUpdated(tabId, changeInfo, tab) {
    // DISABLED: We should not monitor user's browsing activity
    // This functionality has been disabled for privacy reasons
    // We will not process URL changes from user's browsing activity
}

// Handle extension installation or update
function handleInstalled(details) {
    logger.log(`Extension installed/updated: ${details.reason}`);
    initializeOnInstall(details);
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
            logger.log('Received START_SCRAPING message');
            
            // Check if user is authenticated
            chrome.storage.local.get(['principalId']).then(result => {
                const principalId = result.principalId;
                
                if (!principalId) {
                    logger.log('Cannot start scraping: User is not authenticated');
                    sendResponse({ success: false, error: 'User is not authenticated' });
                    return;
                }
                
                // Check if topics are loaded, if not, load them
                if (!topics || topics.length === 0) {
                    logger.log('Topics not loaded, loading them before starting scraping');
                    
                    // Load topics
                    getTopics().then(loadedTopics => {
                        if (loadedTopics && loadedTopics.length > 0) {
                            logger.log(`Topics loaded successfully (${loadedTopics.length} topics), starting scraping`);
                            
                            // Start scraping
                            startScraping().then(() => {
                                logger.log('Scraping started successfully');
                                sendResponse({ success: true });
                            }).catch(error => {
                                logger.error('Error starting scraping:', error);
                                sendResponse({ success: false, error: error.message });
                            });
                        } else {
                            logger.log('Failed to load topics, cannot start scraping');
                            sendResponse({ success: false, error: 'Failed to load topics' });
                        }
                    }).catch(error => {
                        logger.error('Error loading topics:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                } else {
                    logger.log(`Topics already loaded (${topics.length} topics), starting scraping`);
                    
                    // Start scraping
                    startScraping().then(() => {
                        logger.log('Scraping started successfully');
                        sendResponse({ success: true });
                    }).catch(error => {
                        logger.error('Error starting scraping:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                }
            }).catch(error => {
                logger.error('Error checking authentication:', error);
                sendResponse({ success: false, error: error.message });
            });
            
            return true; // Keep the message channel open for async response
            
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
            logger.log('Received LOGIN_COMPLETE message');
            
            if (message.principalId) {
                logger.log(`User authenticated with principalId: ${message.principalId}`);
                
                // Set authentication state
                isAuthenticated = true;
                
                // Get extension enabled state
                chrome.storage.local.get(['enabled']).then(result => {
                    // Check if extension is enabled
                    if (result.enabled !== false) {
                        logger.log('Extension is enabled, loading topics');
                        
                        // Load topics
                        getTopics().then(loadedTopics => {
                            // Check if topics were loaded successfully
                            if (loadedTopics && loadedTopics.length > 0) {
                                logger.log(`Topics loaded successfully (${loadedTopics.length} topics)`);
                                logger.log('Automatic scraping on login has been disabled');
                            } else {
                                logger.log('Failed to load topics, cannot start scraping');
                            }
                        }).catch(error => {
                            logger.error('Error loading topics after login:', error);
                        });
                    } else {
                        logger.log('Extension is disabled, not starting scraping');
                    }
                }).catch(error => {
                    logger.error('Error getting extension state:', error);
                });
            } else {
                logger.warn('LOGIN_COMPLETE message received but no principalId provided');
            }
            
            // Send response back to dashboard
            sendResponse({ success: true });
            return true; // Keep the message channel open for async response
            
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
            
        case 'TEST_SCRAPE_URL':
            logger.log('Received test scrape URL request for:', message.url);
            
            // Check if user is authenticated
            chrome.storage.local.get(['principalId']).then(result => {
                const principalId = result.principalId;
                
                if (!principalId) {
                    logger.log('Cannot test scrape: User is not authenticated');
                    sendResponse({ success: false, error: 'User is not authenticated' });
                    return;
                }
                
                // Check if topics are loaded
                if (!topics || topics.length === 0) {
                    logger.log('Topics not loaded, loading them before test scrape');
                    
                    // Load topics
                    getTopics().then(loadedTopics => {
                        if (loadedTopics && loadedTopics.length > 0) {
                            logger.log(`Topics loaded successfully (${loadedTopics.length} topics), performing test scrape`);
                            
                            // Perform test scrape with the specified URL
                            testScrapeUrl(message.url).then(result => {
                                logger.log('Test scrape completed:', result);
                                sendResponse({ success: true, data: result });
                            }).catch(error => {
                                logger.error('Error during test scrape:', error);
                                sendResponse({ success: false, error: error.message });
                            });
                        } else {
                            logger.log('Failed to load topics, cannot perform test scrape');
                            sendResponse({ success: false, error: 'Failed to load topics' });
                        }
                    }).catch(error => {
                        logger.error('Error loading topics:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                } else {
                    logger.log(`Topics already loaded (${topics.length} topics), performing test scrape`);
                    
                    // Perform test scrape with the specified URL
                    testScrapeUrl(message.url).then(result => {
                        logger.log('Test scrape completed:', result);
                        sendResponse({ success: true, data: result });
                    }).catch(error => {
                        logger.error('Error during test scrape:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                }
            }).catch(error => {
                logger.error('Error checking authentication:', error);
                sendResponse({ success: false, error: error.message });
            });
            
            return true; // Keep the message channel open for async response
            
        default:
            sendResponse({ error: 'Unknown message type' });
    }
    
    // Return true to indicate we'll respond asynchronously
    return true;
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
            urlPatterns: ['https://test.org/*'],
            extractionRules: {
                fields: [
                    { name: 'Title', required: true, fieldType: 'text' },
                    { name: 'Description', required: true, fieldType: 'text' },
                    { name: 'Author', required: false, fieldType: 'text' }
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
    getTopics: async () => {
        const loadedTopics = await getTopics();
        logger.log('Topics loaded via debug function:', loadedTopics);
        return loadedTopics;
    },
    startScraping: async () => {
        const result = await startScraping();
        logger.log('Scraping started via debug function:', result);
        return result;
    },
    stopScraping: async () => {
        const result = await stopScraping();
        logger.log('Scraping stopped via debug function:', result);
        return result;
    },
    forceRefreshTopics: async () => {
        const result = await forceRefreshTopics();
        logger.log('Force refresh topics executed via debug function:', result);
        return result;
    },
    testScrapeUrl: async (url) => {
        if (!url) {
            logger.error('URL is required for test scraping');
            return { success: false, error: 'URL is required' };
        }
        
        const result = await testScrapeUrl(url);
        logger.log('Test scrape executed via debug function:', result);
        return result;
    },
    getExtractedData: async () => {
        const result = await chrome.storage.local.get(['extractedData']);
        const extractedData = result.extractedData || [];
        logger.log(`Retrieved ${extractedData.length} extracted data items`);
        return extractedData;
    },
    clearExtractedData: async () => {
        await chrome.storage.local.set({ extractedData: [] });
        logger.log('Cleared all extracted data');
        return { success: true };
    }
};

// Expose debug functions to the console
globalThis.rhinoSpiderDebug = rhinoSpiderDebug;

logger.log('Debug functions exposed to console as rhinoSpiderDebug');

// Set up event listeners
if (chrome.alarms) {
    chrome.alarms.onAlarm.addListener(handleAlarm);
}

if (chrome.action) {
    chrome.action.onClicked.addListener(handleBrowserActionClick);
} else if (chrome.browserAction) {
    chrome.browserAction.onClicked.addListener(handleBrowserActionClick);
}

// DISABLED: We should not monitor user's browsing activity
// chrome.tabs.onUpdated.addListener(handleTabUpdated);
chrome.runtime.onInstalled.addListener(handleInstalled);

// Handle extension install/update
async function initializeOnInstall(details) {
    logger.log('Extension installed/updated:', details.reason);
    
    // Check if user is authenticated
    const result = await chrome.storage.local.get(['principalId', 'delegationChain', 'enabled', 'topics']);
    
    // Set authentication state
    isAuthenticated = !!result.principalId;
    
    // Initialize topics and config
    try {
        await initializeExtension();
        
        // Set initial state if not already set
        if (result.enabled === undefined) {
            await chrome.storage.local.set({
                enabled: true
            });
        }
        
        // Check if we have topics loaded
        const hasTopics = result.topics && Array.isArray(result.topics) && result.topics.length > 0;
        
        // Only start scraping if we have authentication, topics are loaded, and scraping is enabled
        if (result.principalId && result.enabled !== false && hasTopics) {
            logger.log('User is authenticated, topics are loaded, and scraping is enabled - automatic scraping disabled');
            // Removed automatic scraping on install
        } else if (!result.principalId) {
            logger.log('User is not authenticated, waiting for login before scraping');
            // We'll start scraping when the LOGIN_COMPLETE message is received
        } else if (!hasTopics) {
            logger.log('User is authenticated but topics are not loaded, waiting for topics before scraping');
            // We'll start scraping when topics are loaded
        } else {
            logger.log('User is authenticated but scraping is disabled');
        }
    } catch (error) {
        logger.error('Error initializing extension during install/update:', error);
    }
}

// Initialize the extension on startup
// Removed duplicate listener since we already added it above
initializeExtension();

// Process URL change for scraping - only used for testing with specific URLs
async function processUrlChange(url, tabId = null) {
    try {
        if (!url) {
            logger.log('No URL provided to process');
            return;
        }
        
        logger.log(`Processing URL: ${url}`);
        
        // Find matching topics for this URL
        const matchingTopics = findMatchingTopicsForUrl(url);
        
        if (!matchingTopics || matchingTopics.length === 0) {
            logger.log('No matching topics found for URL:', url);
            return;
        }
        
        logger.log(`Found ${matchingTopics.length} matching topics for URL:`, url);
        
        // For simplicity, just use the first matching topic
        const topic = matchingTopics[0];
        logger.log('Using topic for scraping:', topic.name);
        
        // For testing purposes only - fetch content directly
        // This is only used when explicitly called with a test URL
        if (!tabId) {
            const content = await fetchPageContent(url);
            if (content) {
                logger.log(`Fetched content directly (${content.length} bytes)`);
                await submitScrapedData(url, content, topic.id);
            } else {
                logger.log('Failed to fetch content directly');
            }
            return;
        }
        
        // This part is only reached if a tabId is provided (which we're not doing in our implementation)
        // It's kept for compatibility but won't be used
        try {
            // Request the content script to get the page content
            const response = await chrome.tabs.sendMessage(tabId, { 
                action: 'getPageContent' 
            });
            
            if (response && response.content) {
                logger.log(`Received page content (${response.content.length} bytes)`);
                
                // Submit the data
                await submitScrapedData(url, response.content, topic.id);
            } else {
                logger.log('No content received from tab');
            }
        } catch (error) {
            logger.log('Error getting page content, tab may not have content script:', error.message);
            // This is expected for tabs without our content script, so we don't need to log as error
        }
    } catch (error) {
        logger.error('Error processing URL change:', error);
    }
}

// Find topics that match a given URL
function findMatchingTopicsForUrl(url) {
    if (!topics || topics.length === 0) {
        logger.log('No topics available to match URL');
        return [];
    }
    
    logger.log(`Finding matching topics for URL: ${url}`);
    
    // Convert URL to lowercase for case-insensitive matching
    const lowerUrl = url.toLowerCase();
    
    // Find topics with matching URL patterns
    const matchingTopics = topics.filter(topic => {
        // Skip inactive topics
        if (topic.status !== 'active') {
            return false;
        }
        
        // Check if any URL pattern matches
        if (!topic.urlPatterns || topic.urlPatterns.length === 0) {
            return false;
        }
        
        return topic.urlPatterns.some(pattern => {
            // Convert glob pattern to regex
            const regexPattern = pattern
                .replace(/\./g, '\\.')
                .replace(/\*/g, '.*');
            
            const regex = new RegExp(`^${regexPattern}$`, 'i');
            return regex.test(lowerUrl);
        });
    });
    
    logger.log(`Found ${matchingTopics.length} matching topics for URL: ${url}`);
    return matchingTopics;
}

// Test scraping with a specific URL
async function testScrapeUrl(url) {
    try {
        logger.log(`Testing scrape for URL: ${url}`);
        
        // Find matching topics for this URL
        const matchingTopics = findMatchingTopicsForUrl(url);
        
        if (!matchingTopics || matchingTopics.length === 0) {
            logger.log('No matching topics found for URL:', url);
            return { 
                success: false, 
                error: 'No matching topics found for this URL',
                url: url
            };
        }
        
        logger.log(`Found ${matchingTopics.length} matching topics for URL:`, url);
        
        // For simplicity, just use the first matching topic
        const topic = matchingTopics[0];
        logger.log('Using topic for scraping:', topic.name);
        
        // Get the page content
        const pageContent = await fetchPageContent(url);
        
        if (!pageContent) {
            return { 
                success: false, 
                error: 'Failed to fetch page content',
                url: url
            };
        }
        
        // Process the content based on the topic's extraction rules
        const extractedData = {
            url: url,
            topicId: topic.id,
            topicName: topic.name,
            timestamp: new Date().toISOString(),
            fields: {}
        };
        
        // For now, just extract basic info without AI processing
        // In a real implementation, this would use AI to extract data based on extraction rules
        if (topic.extractionRules && topic.extractionRules.fields) {
            for (const field of topic.extractionRules.fields) {
                // Simple extraction based on field name (just for testing)
                if (field.name === 'Title') {
                    const titleMatch = pageContent.match(/<title>(.*?)<\/title>/i);
                    extractedData.fields.Title = titleMatch ? titleMatch[1] : 'Unknown Title';
                } else if (field.name === 'Content' || field.name === 'Description') {
                    const metaDesc = pageContent.match(/<meta name="description" content="(.*?)"/i);
                    extractedData.fields[field.name] = metaDesc ? metaDesc[1] : 'No description found';
                } else if (field.name === 'Author') {
                    const authorMatch = pageContent.match(/author">(.*?)</i);
                    extractedData.fields.Author = authorMatch ? authorMatch[1] : 'Unknown Author';
                } else {
                    extractedData.fields[field.name] = `Placeholder for ${field.name}`;
                }
            }
        }
        
        // Save the extracted data
        await saveExtractedData(extractedData);
        
        return {
            success: true,
            url: url,
            topicName: topic.name,
            extractedData: extractedData
        };
    } catch (error) {
        logger.error('Error in test scrape:', error);
        return { 
            success: false, 
            error: error.message,
            url: url
        };
    }
}

// Fetch page content for testing
async function fetchPageContent(url) {
    try {
        logger.log(`Fetching content for URL: ${url}`);
        
        // Use fetch API to get the page content
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
        }
        
        const content = await response.text();
        logger.log(`Successfully fetched content (${content.length} bytes)`);
        
        return content;
    } catch (error) {
        logger.error('Error fetching page content:', error);
        return null;
    }
}

// Save extracted data
async function saveExtractedData(data) {
    try {
        logger.log('Saving extracted data');
        
        // Get existing data from storage
        const result = await chrome.storage.local.get(['extractedData']);
        const extractedData = result.extractedData || [];
        
        // Add new data
        extractedData.push(data);
        
        // Save back to storage
        await chrome.storage.local.set({ extractedData });
        
        logger.log(`Saved extracted data, total items: ${extractedData.length}`);
        return true;
    } catch (error) {
        logger.error('Error saving extracted data:', error);
        return false;
    }
}
