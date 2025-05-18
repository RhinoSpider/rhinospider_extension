import { submitScrapedData } from './service-worker-adapter';
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
    }
});
