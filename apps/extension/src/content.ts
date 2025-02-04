// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_II_STATUS') {
    // Check if we're on the II page and if it's loaded
    if (document.readyState === 'complete') {
      // Send back the current page status
      sendResponse({ status: 'ready' });
    }
  }
});

// Watch for changes in the page that indicate successful login
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    // Look for successful login indicators
    if (mutation.type === 'childList' && document.querySelector('.success-message')) {
      // Notify the extension that login was successful
      chrome.runtime.sendMessage({ type: 'II_LOGIN_SUCCESS' });
    }
  }
});

// Start observing the document body for changes
observer.observe(document.body, {
  childList: true,
  subtree: true
});
