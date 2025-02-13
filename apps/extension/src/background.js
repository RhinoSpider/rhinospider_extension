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
  // Base points configuration
  const POINTS_PER_REQUEST = 10;
  const POINTS_PER_MB = 1;
  const STREAK_MULTIPLIER = 0.1;
  const QUALITY_MULTIPLIER = 0.2;
  const PEAK_HOURS_BONUS = 0.2;
  const RESOURCE_BONUS = 0.05;

  // Calculate base points
  const requestPoints = stats.requestCount * POINTS_PER_REQUEST;
  const bandwidthPoints = Math.floor((stats.bytesDownloaded + stats.bytesUploaded) / (1024 * 1024)) * POINTS_PER_MB;

  // Calculate quality multiplier (based on successful vs failed requests)
  const successRate = stats.successCount / (stats.successCount + stats.failureCount || 1);
  const qualityBonus = Math.floor((requestPoints + bandwidthPoints) * (successRate * QUALITY_MULTIPLIER));

  // Calculate streak bonus
  const streakBonus = Math.floor((requestPoints + bandwidthPoints) * (streak * STREAK_MULTIPLIER));

  // Check if current hour is peak (9 AM - 5 PM local time)
  const currentHour = new Date().getHours();
  const isPeakHour = currentHour >= 9 && currentHour <= 17;
  const peakBonus = isPeakHour ? Math.floor((requestPoints + bandwidthPoints) * PEAK_HOURS_BONUS) : 0;

  // Resource optimization bonus (if processing multiple topics)
  const resourceBonus = stats.topicsProcessed > 1 
    ? Math.floor((requestPoints + bandwidthPoints) * (RESOURCE_BONUS * Math.min(stats.topicsProcessed, 5))) 
    : 0;

  // Calculate total points
  const total = requestPoints + bandwidthPoints + streakBonus + qualityBonus + peakBonus + resourceBonus;

  // Cap at 1000 points per day
  const cappedTotal = Math.min(total, 1000);

  return {
    total: cappedTotal,
    breakdown: {
      requests: requestPoints,
      bandwidth: bandwidthPoints,
      streak: streakBonus,
      quality: qualityBonus,
      peak: peakBonus,
      resource: resourceBonus
    },
    multipliers: {
      streak: streak * STREAK_MULTIPLIER,
      quality: successRate * QUALITY_MULTIPLIER,
      peak: isPeakHour ? PEAK_HOURS_BONUS : 0,
      resource: stats.topicsProcessed > 1 ? RESOURCE_BONUS * Math.min(stats.topicsProcessed, 5) : 0
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

// Check if a topic should be scraped based on its schedule
function shouldScrapeTopic(topic) {
  const now = Date.now();
  const currentHour = new Date().getUTCHours();

  // Check if within active hours
  if (currentHour < topic.activeHours.start || currentHour > topic.activeHours.end) {
    return false;
  }

  // Check if enough time has passed since last scrape
  const timeSinceLastScrape = now - topic.lastScraped;
  if (timeSinceLastScrape < topic.scrapingInterval * 1000) {
    return false;
  }

  return true;
}

// Update last scraped time for a topic
async function updateLastScraped(topic) {
  try {
    const response = await fetch(`${apiConfig.adminUrl}/topics/${topic.id}/lastScraped`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timestamp: Date.now()
      })
    });
    
    if (!response.ok) {
      console.error('Failed to update last scraped time:', await response.text());
    }
  } catch (error) {
    console.error('Error updating last scraped time:', error);
  }
}

// Get active topics that need scraping
async function getActiveTopics() {
  try {
    const response = await fetch(`${apiConfig.adminUrl}/topics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch topics');
    }

    const topics = await response.json();
    return topics.filter(topic => 
      topic.status === 'active' && shouldScrapeTopic(topic)
    );
  } catch (error) {
    console.error('Error fetching topics:', error);
    return [];
  }
}

// Main scraping loop
async function scrapeLoop() {
  const topics = await getActiveTopics();
  
  for (const topic of topics) {
    try {
      // Start scraping
      const result = await scrapeContent(topic);
      
      if (result.success) {
        // Update last scraped time
        await updateLastScraped(topic);
        
        // Update analytics
        await updateAnalytics({
          topicId: topic.id,
          success: true,
          bytesProcessed: result.bytesProcessed,
          processingTime: result.processingTime
        });
      } else {
        // Handle failure
        console.error('Scraping failed for topic:', topic.id, result.error);
        
        // Update analytics with failure
        await updateAnalytics({
          topicId: topic.id,
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error processing topic:', topic.id, error);
    }
  }
}

// Start scraping loop with interval
setInterval(scrapeLoop, 60000); // Check every minute
scrapeLoop(); // Initial run

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
