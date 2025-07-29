
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

// Handle messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    logger.log('Received message:', message.type);

    if (message.type === 'OPEN_DASHBOARD') {
        chrome.tabs.query({ url: chrome.runtime.getURL('pages/dashboard.html') }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.update(tabs[0].id, { active: true });
                logger.log('Focusing existing dashboard tab');
            } else {
                chrome.tabs.create({ url: 'pages/dashboard.html' });
                logger.log('Opening new dashboard tab');
            }
        });
        return true;
    } else if (message.type === 'OPEN_REFERRAL_PAGE') {
        chrome.tabs.query({ url: chrome.runtime.getURL('pages/referral.html') }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.update(tabs[0].id, { active: true });
                logger.log('Focusing existing referral tab');
            } else {
                chrome.tabs.create({ url: chrome.runtime.getURL('pages/referral.html') });
                logger.log('Opening new referral tab');
            }
        });
        return true;
    }
});

chrome.commands.onCommand.addListener((command) => {
    if (command === "open-referral-page") {
        chrome.tabs.create({ url: chrome.runtime.getURL('pages/referral.html') });
    }
});

// Placeholder for getting principalId - replace with actual authentication logic
// This should ideally come from an authenticated session or identity provider
const getPrincipalId = async () => {
    // For now, returning a hardcoded principal for testing purposes.
    // In a real scenario, this would involve fetching the authenticated user's principal.
    return "2vxsx-fae"; // Example principal ID
};

// Import performScrape from scraper.js
import { submitScrapedData } from './service-worker-adapter';
import { performScrape } from './src/scraper.js';

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
