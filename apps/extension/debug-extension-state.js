// Debug script to check extension state
// Run this in the Chrome DevTools console of the extension's background page

console.log('=== EXTENSION STATE DEBUG ===');

// Check storage state
chrome.storage.local.get([
    'enabled',
    'isScrapingActive', 
    'principalId',
    'topics',
    'lastScrapeTime',
    'prefetchedUrls',
    'remainingUrls',
    'scrapingEnabled',
    'scrapingConsent'
], (result) => {
    console.log('Storage state:', result);
    
    if (!result.principalId) {
        console.warn('⚠️ No principalId - user not authenticated');
    }
    
    if (!result.enabled) {
        console.warn('⚠️ Extension is disabled');
    }
    
    if (!result.isScrapingActive) {
        console.warn('⚠️ Scraping is not active');
    }
    
    if (!result.topics || result.topics.length === 0) {
        console.warn('⚠️ No topics loaded');
    }
    
    if (result.lastScrapeTime) {
        const timeSinceLastScrape = Date.now() - result.lastScrapeTime;
        console.log(`Last scrape: ${Math.round(timeSinceLastScrape / 1000)} seconds ago`);
    }
});

// Check if scraping functions exist
console.log('startScraping exists:', typeof rhinoSpiderDebug?.startScraping === 'function');
console.log('performScrape exists:', typeof performScrape === 'function');
console.log('fetchPageContent exists:', typeof fetchPageContent === 'function');

// Check alarms
chrome.alarms.getAll((alarms) => {
    console.log('Active alarms:', alarms);
});

// Test tab creation permission
chrome.tabs.create({
    url: 'https://example.com',
    active: false,
    pinned: true
}, (tab) => {
    if (chrome.runtime.lastError) {
        console.error('❌ Tab creation failed:', chrome.runtime.lastError);
    } else {
        console.log('✅ Tab creation works! Tab ID:', tab.id);
        // Close the test tab
        setTimeout(() => {
            chrome.tabs.remove(tab.id);
            console.log('Test tab closed');
        }, 2000);
    }
});

console.log('=== END DEBUG ===');