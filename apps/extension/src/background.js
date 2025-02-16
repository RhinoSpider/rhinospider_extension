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
    const actor = await initConsumerActor();
    const result = await actor.submitScrapedData({
      url,
      html,
      topic_id: topic.id,
      timestamp: Date.now()
    });
    console.log('Content processed:', result);
    return result;
  } catch (error) {
    console.error('Failed to process content:', error);
    throw error;
  }
}

// Get topics from consumer canister
async function getTopics() {
  try {
    const actor = await initConsumerActor();
    const result = await actor.getTopics();
    return result;
  } catch (error) {
    console.error('Failed to get topics:', error);
    throw error;
  }
}

// Get AI config from consumer canister
async function getAIConfig() {
  try {
    const actor = await initConsumerActor();
    const result = await actor.getAIConfig();
    return result;
  } catch (error) {
    console.error('Failed to get AI config:', error);
    throw error;
  }
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  
  if (message.type === 'GET_SCRAPING_CONFIG') {
    // Return default config for now
    sendResponse({
      success: true,
      data: {
        enabled: true,
        maxRequestsPerDay: 1000,
        maxBandwidthPerDay: 100 * 1024 * 1024, // 100MB
        urls: ['*://*.example.com/*']
      }
    });
    return true;
  }

  if (message.type === 'UPDATE_SCRAPING_CONFIG') {
    // Update config
    sendResponse({
      success: true,
      data: message.data
    });
    return true;
  }
  
  if (message.type === 'login') {
    authManager.login(message.windowFeatures)
      .then(result => {
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        console.error('Login failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.type === 'logout') {
    authManager.logout()
      .then(() => {
        consumerActor = null;
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('Logout failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.type === 'AUTH_STATE_CHANGED') {
    handleAuthStateChange(message.data).catch(error => {
      console.error('Failed to handle auth state change:', error);
    });
  }
  
  if (message.type === 'getAuthState') {
    initializeAuth()
      .then(state => {
        sendResponse({ success: true, data: state });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  if (message.type === 'GET_AUTH_STATE') {
    authManager.getAuthState().then(sendResponse);
    return true;
  }
  
  if (message.type === 'GET_TOPICS') {
    getTopics()
      .then(topics => {
        sendResponse({ success: true, data: topics });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.type === 'GET_AI_CONFIG') {
    getAIConfig()
      .then(config => {
        sendResponse({ success: true, data: config });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  if (message.type === 'SCRAPE_PAGE') {
    const { url, html, topic } = message;
    console.log('Processing page:', { url, topic: topic.name });
    processContent(url, html, topic)
      .then(result => {
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  return false;
});

// Handle auth state changes
async function handleAuthStateChange(authState) {
  if (!authState.isAuthenticated) {
    consumerActor = null;
  }
}

// Initialize on extension load
initializeAuth().catch(console.error);

// Initialize on install/update
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated');
  initializeAuth().catch(console.error);
});
