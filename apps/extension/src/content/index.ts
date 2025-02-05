import type { ScrapingTopic } from '../../admin/src/types';

let currentTopic: ScrapingTopic | null = null;

// Check if current URL matches any topic
async function checkUrl() {
  const response = await chrome.runtime.sendMessage({
    type: 'CHECK_URL',
    url: window.location.href
  });
  
  currentTopic = response.topic;
  if (currentTopic) {
    startScraping();
  }
}

// Wait for dynamic content to load
function waitForContent(): Promise<void> {
  return new Promise((resolve) => {
    // Wait for main content to be available
    const checkContent = () => {
      // Add your content checks here based on topic
      const mainContent = document.querySelector('main, article, #content');
      if (mainContent) {
        resolve();
      } else {
        setTimeout(checkContent, 100);
      }
    };
    checkContent();
  });
}

// Start scraping process
async function startScraping() {
  if (!currentTopic) return;

  try {
    // Wait for content to be ready
    await waitForContent();

    // Get the HTML content
    const html = document.documentElement.outerHTML;

    // Send to background script for processing
    await chrome.runtime.sendMessage({
      type: 'PROCESS_CONTENT',
      url: window.location.href,
      html,
      topic: currentTopic
    });

    // Show success notification
    showNotification('success', 'Content processed successfully');
  } catch (error) {
    console.error('Scraping failed:', error);
    showNotification('error', 'Failed to process content');
  }
}

// Show notification to user
function showNotification(type: 'success' | 'error', message: string) {
  const notification = document.createElement('div');
  notification.className = `rhinospider-notification ${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    background: ${type === 'success' ? '#4CAF50' : '#f44336'};
    color: white;
    font-family: system-ui;
    font-size: 14px;
    z-index: 999999;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    transition: opacity 0.3s;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SCRAPING_COMPLETE') {
    showNotification('success', 'Data extracted and stored successfully');
  }
});

// Start checking URL when page loads
checkUrl();
