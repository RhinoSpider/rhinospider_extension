import {
  getTodayStats,
  updateStats,
  canMakeRequest,
  updateBandwidthUsage,
  initDB
} from './services/api';
import { AuthClient } from '@rhinospider/web3-client';

// Initialize when installed
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed');
  await initDB();
  await initializeAuth();
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SCRAPE_CONTENT') {
    handleScrapeContent(request.data, sender.tab?.id);
    // Return true to indicate we'll send response asynchronously
    return true;
  }
});

// Handle scraping content
async function handleScrapeContent(data, tabId) {
  try {
    console.log('Processing content:', data);
    // Process content here
    
    // Send success response back to content script
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        type: 'SCRAPE_COMPLETE',
        success: true
      });
    }
  } catch (error) {
    console.error('Error processing content:', error);
    // Send error response back to content script
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        type: 'SCRAPE_COMPLETE',
        success: false,
        error: error.message
      });
    }
  }
}

// Auth state management
let authState = {
  isAuthenticated: false,
  identity: null
};

// Initialize auth state
async function initializeAuth() {
  try {
    const authClient = AuthClient.getInstance();
    const newState = await authClient.initialize();
    updateAuthState(newState);
  } catch (error) {
    console.error('Failed to initialize auth:', error);
  }
}

// Update auth state
function updateAuthState(newState) {
  authState = newState;
  chrome.storage.local.set({ authState });
}

// Initialize auth when extension loads
initializeAuth();

// Export functions for popup
export async function getAuthState() {
  return authState;
}

export async function login() {
  try {
    const authClient = AuthClient.getInstance();
    const newState = await authClient.login();
    updateAuthState(newState);
    return newState;
  } catch (error) {
    console.error('Failed to login:', error);
    throw error;
  }
}

export async function logout() {
  try {
    const authClient = AuthClient.getInstance();
    const newState = await authClient.logout();
    updateAuthState(newState);
    return newState;
  } catch (error) {
    console.error('Failed to logout:', error);
    throw error;
  }
}

// API functions
export {
  getTodayStats,
  updateStats,
  canMakeRequest,
  updateBandwidthUsage,
  initDB
};
