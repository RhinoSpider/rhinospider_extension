// Logger utility
const logger = {
    log: (msg) => console.log(`[Background] ${msg}`),
    error: (msg, error) => console.error(`[Background] ${msg}`, error),
    debug: (msg, data) => console.debug(`[Background] ${msg}`, data || '')
};

// Handle extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
    logger.log(`Extension installed/updated: ${details.reason}`);
});

// Import authentication functions
import { login, logout, getPrincipal, isAuthenticated } from './src/auth.js';

// Import scraping functions
import { submitScrapedData } from './service-worker-adapter';
import { performScrape } from './src/scraper.js';

// Function to get the current principal ID
const getPrincipalId = async () => {
    const principal = await getPrincipal();
    return principal.toText();
};

// Example of how scraping might be triggered (replace with actual trigger)
// This is a simplified example. In a real extension, this might be triggered by a timer,
// a user action, or a message from another part of the extension.
const triggerScrape = async () => {
    const currentPrincipalId = await getPrincipalId();
    if (currentPrincipalId) {
        // Assuming topics, getIPAddress, and measureInternetSpeed are available or can be imported
        // For demonstration, using dummy values or placeholders
        const dummyTopics = [{ id: "topic1", name: "Example Topic", status: "active" }];
        const dummyGetIPAddress = async () => ({ ip: "192.168.1.1" });
        const dummyMeasureInternetSpeed = async () => ({ score: 100 });

        logger.log("Triggering scrape with principal:", currentPrincipalId);
        await performScrape(dummyTopics, submitScrapedData, dummyGetIPAddress, dummyMeasureInternetSpeed, currentPrincipalId);
    } else {
        logger.warn("No principal ID available for scraping.");
    }
};

// Call triggerScrape when appropriate, e.g., on extension startup or periodically
// triggerScrape(); // Uncomment and adjust as needed for your scraping logic

// Handle messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    logger.log('Received message:', message.type);

    if (message.type === 'OPEN_DASHBOARD') {
        chrome.tabs.query({ url: chrome.runtime.getURL('pages/dashboard.html') }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.update(tabs[0].id, { active: true });
                logger.log('Focusing existing dashboard tab');
            } else {
                chrome.tabs.create({ url: chrome.runtime.getURL('pages/dashboard.html') });
                logger.log('Opening new dashboard tab');
            }
        });
        return true;
    } else if (message.type === 'LOGIN') {
        login().then(principal => {
            sendResponse({ success: true, principal: principal.toText() });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true; // Indicate that sendResponse will be called asynchronously
    } else if (message.type === 'LOGOUT') {
        logout().then(() => {
            sendResponse({ success: true });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true; // Indicate that sendResponse will be called asynchronously
    } else if (message.type === 'GET_PRINCIPAL') {
        getPrincipal().then(principal => {
            sendResponse({ principal: principal.toText() });
        });
        return true; // Indicate that sendResponse will be called asynchronously
    } else if (message.type === 'IS_AUTHENTICATED') {
        isAuthenticated().then(authenticated => {
            sendResponse({ authenticated });
        });
        return true; // Indicate that sendResponse will be called asynchronously
    }
});

