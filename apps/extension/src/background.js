import {
  getTodayStats,
  updateStats,
  canMakeRequest,
  updateBandwidthUsage,
  initDB
} from './services/api';
import { AuthClient } from '@rhinospider/web3-client';

// Auth state management
let authState = {
  isAuthenticated: false,
  identity: null,
  isInitialized: false,
  error: null
};

// Initialize when installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  initializeAuth();
  initDB();
});

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  
  if (message.type === 'GET_AUTH_STATE') {
    sendResponse(authState);
    return true;
  }

  if (message.type === 'UPDATE_AUTH_STATE') {
    updateAuthState(message.state);
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'SCRAPE_CONTENT') {
    handleScrapeContent(message.data, sender.tab?.id)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
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
    throw error;
  }
}

// Initialize auth state
async function initializeAuth() {
  try {
    // Initialize auth state from storage
    const stored = await chrome.storage.local.get('authState');
    if (stored.authState) {
      authState = stored.authState;
    }
    authState.isInitialized = true;
    updateAuthState(authState);
  } catch (error) {
    console.error('Failed to initialize auth:', error);
    authState.error = error.message;
    updateAuthState(authState);
  }
}

// Update auth state
function updateAuthState(newState) {
  console.log('Updating auth state:', newState);
  authState = { ...authState, ...newState };
  chrome.storage.local.set({ authState });

  // Broadcast auth state change to all extension views
  chrome.runtime.sendMessage({ 
    type: 'AUTH_STATE_CHANGED', 
    state: authState 
  }).catch(error => {
    // Ignore errors about no receivers
    if (!error.message.includes('Could not establish connection')) {
      console.error('Error broadcasting auth state:', error);
    }
  });
}

// Initialize auth when service worker starts
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
