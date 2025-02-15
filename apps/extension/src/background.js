import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from './declarations/admin/admin.did.js';
import { AuthManager } from './auth';

let topics = [];
let adminActor = null;
const authManager = new AuthManager();

// Initialize admin canister connection
async function initAdminActor() {
  if (!adminActor) {
    try {
      const host = 'https://icp0.io';
      const canisterId = Principal.fromText('s6r66-wyaaa-aaaaj-az4sq-cai');
      
      console.log('Initializing admin actor with:', { host, canisterId: canisterId.toText() });
      
      // Get identity from auth manager
      const identity = authManager.getIdentity();
      const agent = new HttpAgent({ host, identity });
      
      adminActor = Actor.createActor(idlFactory, {
        agent,
        canisterId
      });
      
      console.log('Admin actor initialized');
    } catch (error) {
      console.error('Failed to initialize admin actor:', error);
      throw error;
    }
  }
  return adminActor;
}

// Initialize auth and fetch topics
async function initialize() {
  try {
    console.log('Initializing auth...');
    const authState = await authManager.initialize();
    console.log('Auth initialized:', authState);
    
    if (authState.isAuthenticated) {
      await updateTopics();
    } else {
      console.log('Not authenticated, skipping topic update');
    }
  } catch (error) {
    console.error('Failed to initialize:', error);
  }
}

// Fetch and cache scraping topics
async function updateTopics() {
  try {
    const actor = await initAdminActor();
    const result = await actor.getTopics();
    console.log('Got topics result:', result);
    
    // Handle the Result variant
    if ('Ok' in result) {
      topics = result.Ok;
      console.log('Topics updated:', topics);
    } else if ('Err' in result) {
      console.error('Error getting topics:', result.Err);
      topics = [];
    }
  } catch (error) {
    console.error('Failed to update topics:', error);
    topics = [];
  }
}

// Check if a URL matches any topic patterns
function findMatchingTopic(url) {
  for (const topic of topics) {
    if (!topic.active) continue;
    
    for (const pattern of topic.urlPatterns) {
      try {
        const regex = new RegExp(pattern);
        if (regex.test(url)) {
          return topic;
        }
      } catch (error) {
        console.error(`Invalid pattern ${pattern}:`, error);
      }
    }
  }
  return null;
}

// Process scraped content
async function processContent(url, html, topic) {
  try {
    const actor = await initAdminActor();
    
    // First store the HTML
    const storeResult = await actor.storeHTML({
      url,
      html,
      topicId: topic.id,
      timestamp: BigInt(Date.now())
    });

    if ('Err' in storeResult) {
      throw new Error(storeResult.Err);
    }

    // Then process with AI
    const processResult = await actor.processWithAI({
      url,
      topicId: topic.id,
      htmlId: storeResult.Ok.id
    });

    if ('Ok' in processResult) {
      // Notify content script of success
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'SCRAPING_COMPLETE',
            data: processResult.Ok
          });
        }
      });
    }
  } catch (error) {
    console.error('Failed to process content:', error);
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  
  if (message.type === 'GET_AUTH_STATE') {
    authManager.getAuthState().then(sendResponse);
    return true;
  }
  
  if (message.type === 'CHECK_URL') {
    const topic = findMatchingTopic(message.url);
    if (topic) {
      console.log('Found matching topic:', topic);
      sendResponse({ match: true, topic });
    } else {
      console.log('No matching topic found');
      sendResponse({ match: false });
    }
    return true;
  }
  
  if (message.type === 'SCRAPE_PAGE') {
    const { url, html, topic } = message;
    console.log('Processing page:', { url, topic: topic.name });
    processContent(url, html, topic);
    return true;
  }
});

// Initialize on install/update
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated');
  initialize();
});

// Re-initialize when extension loads
initialize();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'UPDATE_AUTH_STATE') {
    console.log('Received auth state update:', request.state);
    if (request.state.isAuthenticated) {
      updateTopics();
    } else {
      topics = [];
    }
    sendResponse({ success: true });
    return true;
  }
  
  if (request.type === 'login') {
    authManager.login()
      .then(() => {
        sendResponse({ success: true });
        // After successful login, update topics
        updateTopics();
      })
      .catch(error => {
        console.error('Login failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Will respond asynchronously
  }
  
  if (request.type === 'logout') {
    authManager.logout()
      .then(() => {
        sendResponse({ success: true });
        // Clear topics on logout
        topics = [];
      })
      .catch(error => {
        console.error('Logout failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Will respond asynchronously
  }
});
