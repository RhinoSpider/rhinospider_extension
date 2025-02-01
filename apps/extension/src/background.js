// Background script for the extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('RhinoSpider extension installed');
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'AUTH_STATUS') {
    // Handle authentication status updates
    console.log('Auth status:', request.data);
  }
});
