// Storage change listener for RhinoSpider extension
// This listens for changes to the extension's enabled state and updates the badge accordingly

// Get references to background script functions and variables
// These will be available since this script is imported into background.js
const backgroundLogger = globalThis.backgroundLogger || console;
const log = (msg) => backgroundLogger.log ? backgroundLogger.log(msg) : console.log(`[Storage Listener] ${msg}`);
const error = (msg, err) => backgroundLogger.error ? backgroundLogger.error(msg, err) : console.error(`[Storage Listener] ${msg}`, err);

// Listen for changes to storage
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        // Check if enabled state changed
        if (changes.enabled) {
            const newEnabledState = changes.enabled.newValue;
            log(`Extension enabled state changed to: ${newEnabledState}`);
            
            // Update badge to reflect current state
            chrome.action.setBadgeText({ text: newEnabledState ? 'ON' : 'OFF' });
            chrome.action.setBadgeBackgroundColor({ 
                color: newEnabledState ? '#4CAF50' : '#9E9E9E' 
            });
            
            // Start or stop scraping based on the new state
            // Use the background script's functions if available
            if (newEnabledState) {
                if (globalThis.isAuthenticatedState && globalThis.startScrapingFunc) {
                    log('Starting scraping due to enabled state change');
                    globalThis.startScrapingFunc();
                }
            } else {
                if (globalThis.stopScrapingFunc) {
                    log('Stopping scraping due to enabled state change');
                    globalThis.stopScrapingFunc();
                }
            }
        }
        
        // Check if scraping active state changed
        if (changes.isScrapingActive) {
            const newScrapingState = changes.isScrapingActive.newValue;
            log(`Scraping active state changed to: ${newScrapingState}`);
            
            // Start or stop scraping based on the new state
            if (newScrapingState) {
                if (globalThis.isAuthenticatedState && globalThis.startScrapingFunc) {
                    log('Starting scraping due to scraping state change');
                    globalThis.startScrapingFunc();
                }
            } else {
                if (globalThis.stopScrapingFunc) {
                    log('Stopping scraping due to scraping state change');
                    globalThis.stopScrapingFunc();
                }
            }
        }
    }
});

// Log that the storage listener has been initialized
log('Storage change listener initialized');
