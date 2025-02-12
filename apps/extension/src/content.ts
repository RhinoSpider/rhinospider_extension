import { ScrapingTopic } from '../../admin/src/types';
import { apiConfig } from './utils/apiConfig';

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
      author: ['[class*="author"]', '[rel="author"]', '[itemprop="author"]'],
      date: ['[class*="date"]', '[class*="time"]', '[itemprop="datePublished"]'],
      content: ['article', '.post-content', '.article-content', '.entry-content']
    };

    // Get relevant selectors for this field
    const fieldSelectors = selectors[rule.fieldType as keyof typeof selectors] || [];
    
    // Find elements matching selectors
    fieldSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        relevantElements.add(el);
      });
    });
  });

  // Convert elements to array and get their HTML
  const html = Array.from(relevantElements)
    .map(el => el.outerHTML)
    .join('\n');

  return cleanHTML(html);
}

// Send data to DO scraper service
async function sendToScraper(url: string, html: string, topic: ScrapingTopic) {
  try {
    const scraperUrl = await apiConfig.getScraperUrl();
    const response = await fetch(`${scraperUrl}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        html,
        extractionRules: topic.extractionRules
      })
    });

    if (!response.ok) {
      throw new Error(`Scraper service error: ${response.statusText}`);
    }

    const result = await response.json();
    return { success: true, jobId: result.jobId };
  } catch (error) {
    console.error('Error sending to scraper:', error);
    return { success: false, error: error.message };
  }
}

// Listen for scraping requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCRAPE_PAGE') {
    const { topic } = message;
    
    // Get relevant HTML
    const html = extractRelevantHTML(topic);
    
    // Send to scraper service
    sendToScraper(window.location.href, html, topic)
      .then(result => {
        if (result.success) {
          // Notify extension popup of success
          chrome.runtime.sendMessage({ 
            type: 'SCRAPE_SUCCESS',
            jobId: result.jobId
          });
        } else {
          // Notify extension popup of failure
          chrome.runtime.sendMessage({ 
            type: 'SCRAPE_ERROR',
            error: result.error
          });
        }
      });

    // Indicate we'll respond asynchronously
    return true;
  }
});

// Listen for II login status
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_II_STATUS') {
    if (document.readyState === 'complete') {
      sendResponse({ status: 'ready' });
    }
  }
});

// Watch for II login success
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
