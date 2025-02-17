import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory as consumerIdlFactory } from './declarations/consumer/consumer.did.js';
import { BackgroundAuthManager } from './auth';

const CONSUMER_CANISTER_ID = Principal.fromText(import.meta.env.VITE_CONSUMER_CANISTER_ID);
let consumerActor = null;
const authManager = BackgroundAuthManager.getInstance();

const initializeAuth = async () => {
  console.log('Initializing auth...');
  try {
    await authManager.initialize();
    const isAuthenticated = await authManager.isAuthenticated();
    console.log('Auth initialized, isAuthenticated:', isAuthenticated);

    return {
      isAuthenticated,
      principal: isAuthenticated ? (await authManager.getIdentity()).getPrincipal().toText() : null
    };
  } catch (error) {
    console.error('Failed to initialize auth:', error);
    throw error;
  }
};

async function initConsumerActor() {
  try {
    const agent = authManager.getAgent();
    if (!agent) {
      throw new Error('No agent available. Please login first.');
    }

    if (!consumerActor || consumerActor._agent !== agent) {
      consumerActor = Actor.createActor(consumerIdlFactory, {
        agent,
        canisterId: CONSUMER_CANISTER_ID
      });
    }

    return consumerActor;
  } catch (error) {
    console.error('Failed to initialize consumer actor:', error);
    consumerActor = null;
    throw error;
  }
}

// Process scraped content through consumer canister
async function processContent(url, html, topic) {
  try {
    console.log('Processing content:', { url, topicId: topic.id });
    const actor = await initConsumerActor();
    console.log('Consumer actor initialized');

    const result = await actor.submitScrapedData({
      url,
      html,
      topic_id: topic.id,
      timestamp: Date.now()
    });
    console.log('Content submitted to canister:', result);
    return result;
  } catch (error) {
    console.error('Failed to process content:', error);
    throw error;
  }
}

// Get topics from consumer canister
async function getTopics() {
  try {
    console.log('Fetching topics from canister');
    const actor = await initConsumerActor();
    const result = await actor.getTopics();
    console.log('Received topics:', result);
    return result;
  } catch (error) {
    console.error('Failed to get topics:', error);
    throw error;
  }
}

// Get AI config from consumer canister
async function getAIConfig() {
  try {
    console.log('Fetching AI config from canister');
    const actor = await initConsumerActor();
    const result = await actor.getAIConfig();
    console.log('Received AI config:', result);
    return result;
  } catch (error) {
    console.error('Failed to get AI config:', error);
    throw error;
  }
}

// Cache for topics and AI config
let topicsCache = [];
let aiConfigCache = null;
let lastTopicsUpdate = 0;
const TOPICS_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Update topics cache
async function updateTopicsCache() {
  try {
    console.log('Updating topics cache');
    const topics = await getTopics();
    if ('ok' in topics) {
      topicsCache = topics.ok;
      lastTopicsUpdate = Date.now();
      console.log('Topics cache updated:', topicsCache);
    } else {
      console.error('Failed to update topics:', topics.err);
    }
  } catch (error) {
    console.error('Error updating topics cache:', error);
  }
}

// Update AI config cache
async function updateAIConfigCache() {
  try {
    console.log('Updating AI config cache');
    const config = await getAIConfig();
    if ('ok' in config) {
      aiConfigCache = config.ok;
      console.log('AI config cache updated:', aiConfigCache);
    } else {
      console.error('Failed to update AI config:', config.err);
    }
  } catch (error) {
    console.error('Error updating AI config cache:', error);
  }
}

// Check if URL matches any topic
function findMatchingTopic(url) {
  console.log('Finding matching topic for URL:', url);
  if (!topicsCache || topicsCache.length === 0) {
    console.warn('No topics in cache');
    return null;
  }

  for (const topic of topicsCache) {
    if (topic.urlPatterns.some(pattern => {
      try {
        const regex = new RegExp(pattern);
        return regex.test(url);
      } catch (error) {
        console.error(`Invalid regex pattern in topic ${topic.id}:`, pattern);
        return false;
      }
    })) {
      console.log('Found matching topic:', topic);
      return topic;
    }
  }
  console.log('No matching topic found');
  return null;
}

// Process a tab for scraping
async function processTab(tab) {
  try {
    if (!tab.url || tab.url.startsWith('chrome://')) return;

    const matchingTopic = findMatchingTopic(tab.url);
    if (!matchingTopic) return;

    console.log('Found matching topic for tab:', tab.url, matchingTopic);

    // Inject content script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    // Send topic to content script
    await chrome.tabs.sendMessage(tab.id, {
      type: 'START_SCRAPING',
      topic: matchingTopic
    });
  } catch (error) {
    console.error('Error processing tab:', error);
  }
}

// Scrape a single URL
async function scrapeUrl(url, topic) {
  try {
    console.log('Scraping URL:', url, 'for topic:', topic.name);
    
    // Create a temporary tab to load the URL
    const tab = await chrome.tabs.create({ 
      url, 
      active: false, // Keep tab in background
      pinned: false  // Don't pin the tab
    });

    // Wait for page to load
    await new Promise(resolve => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      });
    });

    // Inject and execute content script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    // Get page content
    const [{ result: content }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const html = document.documentElement.outerHTML;
        return {
          url: window.location.href,
          html,
          timestamp: Date.now()
        };
      }
    });

    // Process content
    await processContent(content.url, content.html, topic);

    // Close the temporary tab
    await chrome.tabs.remove(tab.id);

    console.log('Successfully scraped:', url);
    return true;
  } catch (error) {
    console.error('Error scraping URL:', url, error);
    return false;
  }
}

// Check if a topic should be scraped based on its schedule
function shouldScrapeTopic(topic) {
  const now = new Date();
  const hour = now.getUTCHours();
  
  // Check active hours
  if (hour < topic.activeHours.start || hour >= topic.activeHours.end) {
    return false;
  }

  // Check last scraped time
  const lastScraped = topic.lastScraped ? new Date(Number(topic.lastScraped)) : new Date(0);
  const timeSinceLastScrape = now.getTime() - lastScraped.getTime();
  const intervalMs = topic.scrapingInterval * 1000; // Convert to milliseconds
  
  return timeSinceLastScrape >= intervalMs;
}

// Process URLs for a topic
async function processTopicUrls(topic) {
  if (!shouldScrapeTopic(topic)) {
    console.log('Skipping topic, not scheduled:', topic.name);
    return;
  }

  console.log('Processing URLs for topic:', topic.name);
  
  for (const pattern of topic.urlPatterns) {
    try {
      // If pattern is a direct URL, scrape it
      if (pattern.startsWith('http')) {
        await scrapeUrl(pattern, topic);
        continue;
      }

      // If pattern is a regex/glob, expand it to get actual URLs
      // This would typically involve some site-specific logic
      // For example, for a blog you might need to fetch the sitemap
      // or for a news site you might need to fetch the RSS feed
      console.log('Pattern requires URL expansion:', pattern);
      // TODO: Implement URL expansion based on pattern type
    } catch (error) {
      console.error('Error processing pattern:', pattern, error);
    }
  }
}

// Main background scraping loop
async function runBackgroundScraping() {
  try {
    const authState = await authManager.getAuthState();
    if (!authState.isAuthenticated) {
      console.log('Not authenticated, skipping scraping cycle');
      return;
    }

    // Update topics if needed
    if (Date.now() - lastTopicsUpdate > TOPICS_UPDATE_INTERVAL) {
      await updateTopicsCache();
    }

    // Process each topic
    for (const topic of topicsCache) {
      if (topic.status === 'active') {
        await processTopicUrls(topic);
      }
    }
  } catch (error) {
    console.error('Error in background scraping:', error);
  } finally {
    // Schedule next run
    setTimeout(runBackgroundScraping, 60000); // Run every minute
  }
}

// Initialize background scraping
async function initBackgroundScraping() {
  // Only proceed if authenticated
  const authState = await authManager.getAuthState();
  if (!authState.isAuthenticated) {
    console.log('Not authenticated, waiting for login...');
    return;
  }

  try {
    // Update caches
    await Promise.all([
      updateTopicsCache(),
      updateAIConfigCache()
    ]);

    // Start background scraping
    runBackgroundScraping();
  } catch (error) {
    console.error('Error initializing background scraping:', error);
  }
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  
  switch (message.type) {
    case 'GET_SCRAPING_CONFIG':
      authManager.isAuthenticated().then(isAuthenticated => {
        if (!isAuthenticated) {
          sendResponse({
            success: false,
            error: 'Not authenticated'
          });
          return;
        }
        sendResponse({
          success: true,
          data: {
            enabled: true,
            maxRequestsPerDay: 1000,
            topics: topicsCache,
            aiConfig: aiConfigCache
          }
        });
      }).catch(error => {
        console.error('Failed to check auth state:', error);
        sendResponse({
          success: false,
          error: 'Failed to check authentication'
        });
      });
      return true;

    case 'CHECK_URL':
      authManager.isAuthenticated().then(isAuthenticated => {
        if (!isAuthenticated) {
          sendResponse({
            success: false,
            error: 'Not authenticated'
          });
          return;
        }
        const matchingTopic = findMatchingTopic(message.url);
        sendResponse({ success: true, topic: matchingTopic });
      }).catch(error => {
        console.error('Failed to check auth state:', error);
        sendResponse({
          success: false,
          error: 'Failed to check authentication'
        });
      });
      return true;

    case 'PROCESS_CONTENT':
      authManager.isAuthenticated().then(async isAuthenticated => {
        if (!isAuthenticated) {
          if (sender.tab) {
            chrome.tabs.sendMessage(sender.tab.id, {
              type: 'SCRAPING_COMPLETE',
              success: false,
              error: 'Not authenticated'
            });
          }
          return;
        }

        try {
          const result = await processContent(message.content.url, message.content.content, message.topic);
          console.log('Content processed:', result);
          if (sender.tab) {
            chrome.tabs.sendMessage(sender.tab.id, {
              type: 'SCRAPING_COMPLETE',
              success: true
            });
          }
        } catch (error) {
          console.error('Failed to process content:', error);
          if (sender.tab) {
            chrome.tabs.sendMessage(sender.tab.id, {
              type: 'SCRAPING_COMPLETE',
              success: false,
              error: error.message
            });
          }
        }
      }).catch(error => {
        console.error('Failed to check auth state:', error);
        if (sender.tab) {
          chrome.tabs.sendMessage(sender.tab.id, {
            type: 'SCRAPING_COMPLETE',
            success: false,
            error: 'Failed to check authentication'
          });
        }
      });
      return true;

    case 'login':
      authManager.login(message.windowFeatures)
        .then(async result => {
          // Start background scraping after successful login
          await initBackgroundScraping();
          sendResponse({ success: true, data: result });
        })
        .catch(error => {
          console.error('Login failed:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'logout':
      authManager.logout()
        .then(() => {
          consumerActor = null;
          topicsCache = [];
          aiConfigCache = null;
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('Logout failed:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'AUTH_STATE_CHANGED':
      handleAuthStateChange(message.data)
        .then(async () => {
          if (message.data.isAuthenticated) {
            await initBackgroundScraping();
          } else {
            consumerActor = null;
            topicsCache = [];
            aiConfigCache = null;
          }
        })
        .catch(error => {
          console.error('Failed to handle auth state change:', error);
        });
      break;

    case 'getAuthState':
      initializeAuth()
        .then(state => {
          sendResponse({ success: true, data: state });
        })
        .catch(error => {
          console.error('Failed to get auth state:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'GET_AUTH_STATE':
      authManager.getAuthState().then(sendResponse);
      return true;

    case 'GET_TOPICS':
      getTopics()
        .then(topics => {
          sendResponse({ success: true, data: topics });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'GET_AI_CONFIG':
      getAIConfig()
        .then(config => {
          sendResponse({ success: true, data: config });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'SCRAPE_PAGE':
      processContent(message.url, message.html, message.topic)
        .then(result => {
          sendResponse({ success: true, data: result });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
  }
});

// Handle auth state changes
async function handleAuthStateChange(authState) {
  if (!authState.isAuthenticated) {
    consumerActor = null;
    topicsCache = [];
    aiConfigCache = null;
  }
}

// Initialize on extension load
Promise.all([
  initializeAuth()
]).catch(console.error);

// Initialize on install/update
chrome.runtime.onInstalled.addListener(() => {
  initializeAuth().catch(console.error);
});
