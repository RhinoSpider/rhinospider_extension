// Background script for the extension
import {
  initDB,
  getConfig,
  canMakeRequest,
  updateBandwidthUsage,
  storeScrapedData
} from './services/scraping';

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
  if (requestQueue.length === 0 || activeRequests >= MAX_CONCURRENT_REQUESTS) {
    return;
  }

  if (!await canMakeRequest()) {
    console.log('Rate limit reached, waiting...');
    setTimeout(processQueue, 60000); // Wait 1 minute
    return;
  }

  const request = requestQueue.shift();
  activeRequests++;

  try {
    const response = await fetch(request.url);
    const data = await response.text();
    const size = new Blob([data]).size;

    await updateBandwidthUsage(size);
    await storeScrapedData({
      url: request.url,
      data: data,
      size: size,
      timestamp: new Date().toISOString()
    });

    console.log(`Processed ${request.url}`);
  } catch (error) {
    console.error(`Error processing ${request.url}:`, error);
  } finally {
    activeRequests--;
    processQueue();
  }
}

// Schedule scraping
async function scheduleScraping() {
  const config = await getConfig();
  if (!config.enabled) {
    console.log('Scraping is disabled');
    return;
  }

  // Add URLs to queue based on configuration
  const urls = [
    'https://example.com/page1',
    'https://example.com/page2'
  ];

  requestQueue.push(...urls.map(url => ({ url })));
  processQueue();
}

// Start scraping scheduler
let scrapingInterval;

function startScrapingScheduler() {
  if (scrapingInterval) {
    return;
  }
  scheduleScraping();
  scrapingInterval = setInterval(scheduleScraping, 15 * 60 * 1000); // Every 15 minutes
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
  return true;
});

// Start on extension load
startScrapingScheduler();
