// Background script for RhinoSpider extension

// Logger utility
const logger = {
    log: (msg, data) => {
        console.log(` [Background] ${msg}`, data || '');
    },
    error: (msg, error) => {
        console.error(` [Background] ${msg}`, error);
    }
};

// Handle dashboard tab management
async function openOrFocusDashboard() {
    try {
        logger.log('Opening or focusing dashboard');
        
        // Check if dashboard is already open
        const dashboardUrl = chrome.runtime.getURL('pages/dashboard.html');
        const tabs = await chrome.tabs.query({ url: dashboardUrl });
        
        if (tabs.length > 0) {
            // Focus the first dashboard tab
            logger.log('Dashboard already open, focusing tab');
            await chrome.tabs.update(tabs[0].id, { active: true });
            await chrome.windows.update(tabs[0].windowId, { focused: true });
            return;
        }
        
        // Open new dashboard tab
        logger.log('Opening new dashboard tab');
        await chrome.tabs.create({ url: dashboardUrl });
    } catch (error) {
        logger.error('Failed to open/focus dashboard:', error);
    }
}

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    logger.log('Received message:', message.type);
    
    switch (message.type) {
        case 'OPEN_DASHBOARD':
            openOrFocusDashboard();
            break;
            
        case 'GET_STATE':
            chrome.storage.local.get(['isActive', 'delegationChain'], (result) => {
                sendResponse({
                    isActive: result.isActive,
                    isLoggedIn: !!result.delegationChain
                });
            });
            return true; // Keep channel open for async response
            
        case 'UPDATE_STATE':
            chrome.storage.local.set({
                isActive: message.isActive
            });
            break;
    }
});

// Initialize on install/update
chrome.runtime.onInstalled.addListener(async (details) => {
    logger.log('Extension installed/updated:', details.reason);
    await chrome.storage.local.remove('delegationChain');
});
