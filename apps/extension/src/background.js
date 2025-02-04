// Background script for the extension
import {
  initDB,
  getScrapingConfig,
  canMakeRequest,
  updateBandwidthUsage,
  updateStats,
  updateScrapingConfig,
  getTodayStats
} from './services/api';
import { AuthClient } from '@rhinospider/web3-client';

// Initialize when installed
chrome.runtime.onInstalled.addListener(async () => {
  console.log('RhinoSpider extension installed');
  await initDB();
  await initAuth();
  
  // Initialize default stats and config
  try {
    const config = await getScrapingConfig();
    if (!config) {
      const defaultConfig = {
        id: 'current',
        enabled: false,
        maxRequestsPerDay: 1000,
        maxBandwidthPerDay: 100 * 1024 * 1024, // 100MB
        urls: []
      };
      await updateScrapingConfig(defaultConfig);
    }
    
    // Initialize today's stats if not present
    const date = new Date().toISOString().split('T')[0];
    await updateStats({
      date,
      requestCount: 0,
      bytesDownloaded: 0,
      bytesUploaded: 0,
      activeTime: 0
    });
  } catch (error) {
    console.error('Error initializing stats and config:', error);
  }
});

// Initialize auth client when extension loads
const initAuth = async () => {
  try {
    const authClient = AuthClient.getInstance();
    const state = await authClient.initialize();
    console.log('Background - Auth initialized:', state);
    
    // Store auth state
    if (state.isAuthenticated) {
      chrome.storage.local.set({ authState: state }, () => {
        console.log('Background - Auth state saved');
      });
    }
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

  const request = requestQueue.shift();
  activeRequests++;

  try {
    if (await canMakeRequest()) {
      const response = await fetch(request.url);
      const data = await response.text();
      const bytesDownloaded = new TextEncoder().encode(data).length;
      
      // Generate mock upload data
      const bytesUploaded = Math.floor(Math.random() * 1024); // Random upload between 0-1KB
      
      await updateBandwidthUsage(bytesDownloaded, bytesUploaded);
      
      // Update active time
      const stats = await getTodayStats();
      await updateStats({
        ...stats,
        activeTime: stats.activeTime + 60, // Add 1 minute of active time
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
  } else if (request.type === 'AUTH_STATE_CHANGED') {
    chrome.storage.local.set({ authState: request.state }, () => {
      console.log('Background - Auth state updated:', request.state);
      sendResponse({ success: true });
    });
    return true; // Keep the message channel open for async response
  } else if (request.type === 'GET_AUTH_STATE') {
    chrome.storage.local.get(['authState'], (result) => {
      sendResponse(result.authState || { isAuthenticated: false });
    });
    return true; // Required for async response
  } else if (request.type === 'SET_AUTH_STATE') {
    chrome.storage.local.set({ authState: request.state }, () => {
      sendResponse({ success: true });
    });
    return true; // Required for async response
  } else if (request.type === 'OPEN_II') {
    // Open II in a new tab
    chrome.tabs.create({
      url: 'https://identity.ic0.app',
      active: true
    });
    sendResponse({ success: true });
  } else if (request.type === 'II_LOGIN') {
    // Handle II login
    chrome.identity.launchWebAuthFlow({
      url: 'https://identity.ic0.app/#authorize',
      interactive: true
    }, (responseUrl) => {
      if (responseUrl) {
        // Handle successful login
        console.log('II login successful:', responseUrl);
      } else {
        console.error('II login failed');
      }
    });
  }
  return true; // Required for async sendResponse
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
