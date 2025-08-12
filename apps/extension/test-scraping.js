// Test script to verify scraping works
// Run this in Chrome DevTools console of the extension's background page

console.log('=== TESTING SCRAPING ===');

// First check if we're authenticated
chrome.storage.local.get(['principalId', 'enabled', 'topics'], async (result) => {
    console.log('Current state:', {
        authenticated: !!result.principalId,
        enabled: result.enabled,
        topicsCount: result.topics?.length || 0
    });
    
    if (!result.principalId) {
        console.error('❌ Not authenticated! Please login first');
        return;
    }
    
    // Try to start scraping using the exposed debug function
    if (typeof rhinoSpiderDebug?.startScraping === 'function') {
        console.log('✅ rhinoSpiderDebug.startScraping exists, calling it...');
        try {
            const result = await rhinoSpiderDebug.startScraping();
            console.log('Start scraping result:', result);
        } catch (error) {
            console.error('Error starting scraping:', error);
        }
    } else {
        console.error('❌ rhinoSpiderDebug.startScraping not found');
    }
    
    // Try direct tab creation test
    console.log('Testing direct tab creation...');
    try {
        const tab = await chrome.tabs.create({
            url: 'https://example.com',
            active: false,
            pinned: true
        });
        console.log('✅ Tab created successfully! ID:', tab.id);
        
        // Wait 2 seconds then close it
        setTimeout(() => {
            chrome.tabs.remove(tab.id, () => {
                console.log('Test tab closed');
            });
        }, 2000);
    } catch (error) {
        console.error('❌ Tab creation failed:', error);
    }
    
    // Check if fetchPageContent exists
    if (typeof fetchPageContent === 'function') {
        console.log('✅ fetchPageContent exists, testing it...');
        try {
            const result = await fetchPageContent('https://example.com');
            console.log('fetchPageContent result:', {
                hasContent: !!result.content,
                contentLength: result.content?.length || 0,
                status: result.status,
                error: result.error
            });
        } catch (error) {
            console.error('Error in fetchPageContent:', error);
        }
    } else {
        console.error('❌ fetchPageContent not found');
    }
});

console.log('=== END TEST ===');