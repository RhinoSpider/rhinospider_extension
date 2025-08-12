// Test script to verify tab creation works
// Run this in Chrome DevTools console of the extension's background page

console.log('Testing tab creation...');

chrome.tabs.create({
    url: 'https://example.com',
    active: false,
    pinned: true
}, (tab) => {
    if (chrome.runtime.lastError) {
        console.error('Tab creation failed:', chrome.runtime.lastError);
    } else {
        console.log('Tab created successfully:', tab);
        // Close it after 3 seconds
        setTimeout(() => {
            chrome.tabs.remove(tab.id, () => {
                console.log('Test tab closed');
            });
        }, 3000);
    }
});