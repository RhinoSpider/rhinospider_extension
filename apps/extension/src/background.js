import {
  getTodayStats,
  updateStats,
  canMakeRequest,
  updateBandwidthUsage,
  initDB
} from './services/api';
import { AuthClient } from '@rhinospider/web3-client';
import { apiConfig } from './utils/apiConfig';
import { StorageManager } from './utils/storage';

// Initialize storage
const storage = new StorageManager();

// Cache for scraping topics
let topics = [];

// Auth state management
let authState = {
  isAuthenticated: false,
  identity: null,
  isInitialized: false,
  error: null
};

// Initialize when installed
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed');
  try {
    await storage.init();
    console.log('Storage initialized');
    await initializeAuth();
    await updateTopics();
  } catch (error) {
    console.error('Failed to initialize:', error);
  }
});

// Initialize auth state
async function initializeAuth() {
  try {
    // Initialize auth state from storage
    const stored = await chrome.storage.local.get('authState');
    if (stored.authState) {
      authState = stored.authState;
    }
    authState.isInitialized = true;
    await updateAuthState(authState);
  } catch (error) {
    console.error('Failed to initialize auth:', error);
    authState.error = error.message;
    await updateAuthState(authState);
  }
}

// Update auth state
async function updateAuthState(newState) {
  console.log('Updating auth state:', newState);
  authState = { ...authState, ...newState };
  await chrome.storage.local.set({ authState });

  // Broadcast auth state change to all extension views
  try {
    await chrome.runtime.sendMessage({ 
      type: 'AUTH_STATE_CHANGED', 
      state: authState 
    });
  } catch (error) {
    // Ignore errors about no receivers
    if (!error.message.includes('Could not establish connection')) {
      console.error('Error broadcasting auth state:', error);
    }
  }
}

// Update topics from admin portal
async function updateTopics() {
  try {
    // Initialize API config first
    await apiConfig.init();
    
    // Use the admin canister URL
    const response = await fetch(`${apiConfig.adminUrl}/topics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch topics: ${response.statusText}`);
    }
    
    topics = await response.json();
    console.log('Updated topics:', topics);
  } catch (error) {
    console.error('Error updating topics:', error);
    // Set empty topics array on error to avoid undefined
    topics = [];
  }
}

// Process scraped content
async function processContent(content, topic) {
  try {
    console.log('Processing content:', { url: content.url, topic: topic.name });
    
    // Calculate bandwidth usage
    const contentSize = new Blob([JSON.stringify(content)]).size;
    const today = new Date().toISOString().split('T')[0];
    
    // Update bandwidth stats
    await storage.updateBandwidthUsage(today, contentSize, 0);
    
    // Store scraped data locally
    await storage.addScrapedData({
      url: content.url,
      topic: topic.name,
      content: content.content.substring(0, 1000), // Store preview only
      metadata: content.metadata,
      timestamp: content.timestamp
    });

    // Initialize API config
    await apiConfig.init();

    // Send to admin canister
    const response = await fetch(`${apiConfig.adminUrl}/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content,
        topic: topic.name
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send content: ${response.statusText}`);
    }

    console.log('Content processed and sent successfully');
    
    // Calculate and update points
    const stats = await storage.getStats(today);
    const streak = await storage.getPointsStreak();
    const points = calculatePoints(stats, streak);
    
    await storage.updateDailyPoints({
      date: today,
      total: points.total,
      breakdown: points.breakdown
    });

    // Update streak if we have activity today
    if (stats.requestCount > 0) {
      await storage.updateStreak(streak + 1);
    }

  } catch (error) {
    console.error('Error processing content:', error);
    throw error;
  }
}

function calculatePoints(stats, streak) {
  const POINTS_PER_REQUEST = 10;
  const POINTS_PER_MB = 1;
  const STREAK_MULTIPLIER = 0.1;

  const requestPoints = stats.requestCount * POINTS_PER_REQUEST;
  const bandwidthPoints = Math.floor((stats.bytesDownloaded + stats.bytesUploaded) / (1024 * 1024)) * POINTS_PER_MB;
  const streakBonus = Math.floor((requestPoints + bandwidthPoints) * (streak * STREAK_MULTIPLIER));

  return {
    total: requestPoints + bandwidthPoints + streakBonus,
    breakdown: {
      requests: requestPoints,
      bandwidth: bandwidthPoints,
      streak: streakBonus
    }
  };
}

// Check if URL matches any topic patterns
function findMatchingTopic(url) {
  for (const topic of topics) {
    if (!topic.active) continue;
    
    for (const pattern of topic.urlPatterns) {
      try {
        const regex = new RegExp(pattern);
        if (regex.test(url)) {
          console.log('Found matching topic for URL:', url, topic);
          return topic;
        }
      } catch (error) {
        console.error(`Invalid pattern ${pattern}:`, error);
      }
    }
  }
  return null;
}

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  
  switch (message.type) {
    case 'CHECK_URL':
      const topic = findMatchingTopic(message.url);
      sendResponse({ topic });
      break;
      
    case 'PROCESS_CONTENT':
      processContent(message.content, message.topic)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ error: error.message }));
      return true; // Keep channel open for async response
      
    case 'GET_AUTH_STATE':
      sendResponse({ state: authState });
      break;
  }
  
  return true; // Keep the message channel open for async response
});

// Update topics periodically
setInterval(updateTopics, 5 * 60 * 1000); // Every 5 minutes

// Initialize auth when service worker starts
initializeAuth();

// Auth functions
export async function getAuthState() {
  return authState;
}

export async function login() {
  try {
    const authClient = AuthClient.getInstance();
    const newState = await authClient.login();
    await updateAuthState(newState);
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
    await updateAuthState(newState);
    return newState;
  } catch (error) {
    console.error('Failed to logout:', error);
    throw error;
  }
}

// Export functions for popup
export {
  getTodayStats,
  updateStats,
  canMakeRequest,
  updateBandwidthUsage
};
