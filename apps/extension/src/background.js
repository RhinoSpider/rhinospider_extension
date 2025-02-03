// Background script for the extension
import {
  initDB,
  getScrapingConfig,
  canMakeRequest,
  updateBandwidthUsage,
  updateStats
} from './services/api';

// Initialize when installed
chrome.runtime.onInstalled.addListener(async () => {
  console.log('RhinoSpider extension installed');
  await initDB();
});

// Queue for managing concurrent requests
let requestQueue = [];
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 5;

// Process queue
async function processQueue() {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS || requestQueue.length === 0) {
    return;
  }

  const request = requestQueue.shift();
  activeRequests++;

  try {
    if (await canMakeRequest()) {
      const response = await fetch(request.url);
      const data = await response.text();
      const bytesDownloaded = new TextEncoder().encode(data).length;
      
      await updateBandwidthUsage(bytesDownloaded);
      await updateStats({
        lastScrapedUrl: request.url,
        lastScrapedTime: Date.now()
      });
    }
  } catch (error) {
    console.error('Error processing request:', error);
  } finally {
    activeRequests--;
    processQueue();
  }
}

// Schedule scraping
async function scheduleScraping() {
  try {
    const config = await getScrapingConfig();
    if (!config || !config.urls || config.urls.length === 0) {
      console.log('No URLs configured for scraping');
      return;
    }

    for (const url of config.urls) {
      requestQueue.push({ url });
    }

    processQueue();
  } catch (error) {
    console.error('Error scheduling scraping:', error);
  }
}

// Start scraping scheduler
let scrapingInterval;

function startScrapingScheduler() {
  if (!scrapingInterval) {
    scrapingInterval = setInterval(scheduleScraping, 60000); // Run every minute
    scheduleScraping(); // Run immediately
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'START_SCRAPING') {
    startScrapingScheduler();
    sendResponse({ success: true });
  } else if (request.type === 'STOP_SCRAPING') {
    if (scrapingInterval) {
      clearInterval(scrapingInterval);
      scrapingInterval = null;
    }
    sendResponse({ success: true });
  }
  return true; // Required for async sendResponse
});
