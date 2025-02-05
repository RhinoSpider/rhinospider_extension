// Background script for the extension
import {
  initDB,
  canMakeRequest,
  updateBandwidthUsage,
  updateStats,
  getTodayStats
} from './services/api';
import { AuthClient, AdminClient, StorageClient } from '@rhinospider/web3-client';

// Initialize when installed
chrome.runtime.onInstalled.addListener(async () => {
  console.log('RhinoSpider extension installed');
  await initDB();
  await initAuth();
  
  // Initialize today's stats
  try {
    const date = new Date().toISOString().split('T')[0];
    await updateStats({
      date,
      requestCount: 0,
      bytesDownloaded: 0,
      bytesUploaded: 0,
      activeTime: 0
    });
  } catch (error) {
    console.error('Error initializing stats:', error);
  }
});

// Initialize auth client when extension loads
const initAuth = async () => {
  try {
    const authClient = AuthClient.getInstance();
    const state = await authClient.initialize();
    console.log('Auth initialized:', state);
  } catch (error) {
    console.error('Background - Auth initialization error:', error);
  }
};

// Queue for managing concurrent requests
let requestQueue = [];
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 5;

// Process queue
async function processQueue() {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS || requestQueue.length === 0) {
    return;
  }

  const task = requestQueue.shift();
  activeRequests++;

  try {
    if (await canMakeRequest()) {
      // Update task status to 'processing'
      await AdminClient.updateTaskStatus(task.id, 'processing');

      // Fetch and process the page
      const response = await fetch(task.url);
      const html = await response.text();
      const bytesDownloaded = new TextEncoder().encode(html).length;
      
      // Process the content based on task configuration
      const processedData = await processContent(html, task);
      
      // Store the processed data in the storage canister
      const contentId = await StorageClient.storeContent({
        url: task.url,
        data: processedData,
        taskId: task.id,
        timestamp: Date.now()
      });
      
      // Update task status to 'completed'
      await AdminClient.updateTaskStatus(task.id, 'completed');
      
      // Update bandwidth usage and stats
      await updateBandwidthUsage(bytesDownloaded, processedData.length);
      
      // Update active time
      const stats = await getTodayStats();
      await updateStats({
        ...stats,
        activeTime: stats.activeTime + 60, // Add 1 minute of active time
        lastScrapedUrl: task.url,
        lastScrapedTime: Date.now()
      });
    }
  } catch (error) {
    console.error('Error processing task:', error);
    // Update task status to 'failed'
    await AdminClient.updateTaskStatus(task.id, 'failed');
  } finally {
    activeRequests--;
    processQueue();
  }
}

// Process content based on task configuration
async function processContent(html, task) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Get task configuration
    const config = await AdminClient.getConfig();
    
    // Extract data based on task topic and configuration
    const data = {
      url: task.url,
      topic: task.topic,
      timestamp: Date.now(),
      content: {},
      metadata: {}
    };
    
    // Process based on topic
    switch (task.topic) {
      case 'product':
        data.content = extractProductData(doc);
        break;
      case 'article':
        data.content = extractArticleData(doc);
        break;
      default:
        data.content = extractGeneralData(doc);
    }
    
    return JSON.stringify(data);
  } catch (error) {
    console.error('Error processing content:', error);
    throw error;
  }
}

// Extract product data
function extractProductData(doc) {
  return {
    title: doc.querySelector('h1')?.textContent,
    price: doc.querySelector('[itemprop="price"]')?.content,
    description: doc.querySelector('[itemprop="description"]')?.content,
    // Add more product-specific selectors
  };
}

// Extract article data
function extractArticleData(doc) {
  return {
    title: doc.querySelector('h1')?.textContent,
    author: doc.querySelector('[rel="author"]')?.textContent,
    content: doc.querySelector('article')?.textContent,
    // Add more article-specific selectors
  };
}

// Extract general data
function extractGeneralData(doc) {
  return {
    title: doc.querySelector('title')?.textContent,
    description: doc.querySelector('meta[name="description"]')?.content,
    text: doc.body?.textContent,
  };
}

// Schedule scraping
async function scheduleScraping() {
  try {
    // Get tasks from admin canister
    const tasks = await AdminClient.getTasks(10); // Get up to 10 pending tasks
    
    // Filter out tasks that are already in the queue
    const queuedTaskIds = requestQueue.map(task => task.id);
    const newTasks = tasks.filter(task => !queuedTaskIds.includes(task.id));
    
    // Add new tasks to queue
    requestQueue.push(...newTasks);
    
    // Start processing
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
  } else if (request.type === 'GET_STATUS') {
    sendResponse({
      isRunning: !!scrapingInterval,
      activeRequests,
      queueLength: requestQueue.length
    });
  }
  return true; // Required for async response
});

// Keep track of the popup window
let popupWindow = null;

// Listen for when a tab is removed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (popupWindow && popupWindow.id === tabId) {
    popupWindow = null;
  }
});

// Listen for external messages (from Internet Identity)
chrome.runtime.onMessageExternal.addListener((message, sender) => {
  if (message.type === 'IDP_RESPONSE' && popupWindow) {
    // Close the IDP window after successful login
    chrome.tabs.remove(popupWindow.id);
    popupWindow = null;
  }
});
