// Direct test of fetchPageContent function
// Run this in the Chrome DevTools console of the extension's background page

console.log('=== DIRECT FETCH TEST ===');

// Test fetchPageContent directly
if (typeof fetchPageContent === 'function') {
    console.log('fetchPageContent found, testing...');
    
    fetchPageContent('https://example.com').then(result => {
        console.log('Result:', result);
        console.log('Content length:', result.content ? result.content.length : 0);
        console.log('Status:', result.status);
        console.log('Error:', result.error);
        console.log('Source:', result.source);
    }).catch(error => {
        console.error('Error:', error);
    });
} else {
    console.error('fetchPageContent not found!');
}

// Also test if chrome.tabs.create works
console.log('Testing chrome.tabs.create...');
chrome.tabs.create({
    url: 'https://test.com',
    active: false,
    pinned: true
}, (tab) => {
    if (chrome.runtime.lastError) {
        console.error('Tab creation error:', chrome.runtime.lastError);
    } else {
        console.log('Tab created successfully, ID:', tab.id);
        setTimeout(() => {
            chrome.tabs.remove(tab.id);
            console.log('Tab closed');
        }, 2000);
    }
});