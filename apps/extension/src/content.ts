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

import { ScrapingTopic } from '../../admin/src/types';

// Helper to clean HTML string
function cleanHTML(html: string): string {
  return html
    .replace(/\\s+/g, ' ')
    .replace(/<!--.*?-->/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .trim();
}

// Extract only relevant HTML based on topic rules
function extractRelevantHTML(topic: ScrapingTopic): string {
  const relevantElements = new Set<Element>();
  
  // For each extraction field in the topic
  topic.extractionRules.forEach(rule => {
    // Common selectors for different fields
    const selectors = {
      title: ['h1', '[class*="title"]', '[id*="title"]', '[class*="product-name"]'],
      price: ['[class*="price"]', '[id*="price"]', '.amount', '[itemprop="price"]'],
      description: ['[class*="description"]', '[id*="description"]', '[class*="product-info"]'],
      features: ['[class*="features"]', '[class*="specs"]', 'ul.product-features'],
      images: ['[class*="gallery"]', '[class*="product-image"]', '[itemprop="image"]']
    };

    // Get relevant selectors based on field name
    const fieldSelectors = selectors[rule.name.toLowerCase() as keyof typeof selectors] || [];
    
    // Try each selector
    fieldSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        relevantElements.add(element);
        // Also include parent for context
        if (element.parentElement) {
          relevantElements.add(element.parentElement);
        }
      });
    });
  });

  // Create a temporary container
  const container = document.createElement('div');
  
  // Clone and append relevant elements
  relevantElements.forEach(element => {
    container.appendChild(element.cloneNode(true));
  });

  // Clean and return the HTML
  return cleanHTML(container.innerHTML);
}

// Listen for scraping requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCRAPE_PAGE') {
    const { topic } = message;
    const relevantHTML = extractRelevantHTML(topic);
    
    // Send back only the relevant HTML
    sendResponse({ 
      html: relevantHTML,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
  }
  
  if (message.type === 'CHECK_II_STATUS') {
    if (document.readyState === 'complete') {
      sendResponse({ status: 'ready' });
    }
  }
});

// Watch for changes in the page that indicate successful login
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && document.querySelector('.success-message')) {
      chrome.runtime.sendMessage({ type: 'II_LOGIN_SUCCESS' });
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
