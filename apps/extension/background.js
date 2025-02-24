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

// Inject content script into a tab
async function injectContentScript(tabId) {
    try {
        // Check if content script is already injected
        try {
            await chrome.tabs.sendMessage(tabId, { type: 'PING' });
            return true;
        } catch (error) {
            // Content script not found, inject it
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['src/content-script/ic-agent.js']
            });
            return true;
        }
    } catch (error) {
        logger.error('Failed to inject content script:', error);
        return false;
    }
}

// Handle messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    logger.log('Received message:', message.type);

    if (message.type === 'INJECT_CONTENT_SCRIPT') {
        const { tabId } = message;
        injectContentScript(tabId)
            .then(result => sendResponse({ success: result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (message.type === 'OPEN_DASHBOARD') {
        chrome.tabs.query({ url: chrome.runtime.getURL('pages/dashboard.html') }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.update(tabs[0].id, { active: true });
            } else {
                chrome.tabs.create({ url: 'pages/dashboard.html' });
            }
        });
        return true;
    }

    if (message.type === 'II_AUTH_ERROR') {
        logger.error('Authentication error:', message.error);
        return true;
    }
});
