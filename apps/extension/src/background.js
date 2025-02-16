import { Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from './declarations/admin/admin.did.js';
import { BackgroundAuthManager } from './auth';
import { Ed25519KeyIdentity } from '@dfinity/identity';

const ADMIN_CANISTER_ID = Principal.fromText('s6r66-wyaaa-aaaaj-az4sq-cai');
let topics = [];
let adminActor = null;
const authManager = new BackgroundAuthManager();

// Initialize auth on extension load
const initializeAuth = async () => {
  console.log('Initializing auth...');
  try {
    const state = await authManager.initialize();
    console.log('Auth initialized:', state);
    
    if (state.isAuthenticated) {
      console.log('Auth state is authenticated, updating topics...');
      await updateTopics();
    } else {
      console.log('Not authenticated, skipping topic update');
    }
    return state;
  } catch (error) {
    console.error('Failed to initialize auth:', error);
    throw error;
  }
};

// Initialize admin actor
async function initAdminActor() {
  console.log('Initializing admin actor with canisterId:', ADMIN_CANISTER_ID.toText());
  try {
    const agent = await authManager.getAgent();
    console.log('Got authenticated agent');
    
    adminActor = Actor.createActor(idlFactory, {
      agent,
      canisterId: ADMIN_CANISTER_ID
    });
    
    console.log('Admin actor created successfully');
    return adminActor;
  } catch (error) {
    console.error('Failed to initialize admin actor:', error);
    adminActor = null;
    throw error;
  }
}

// Fetch and cache scraping topics
async function updateTopics() {
  console.log('Updating topics...');
  try {
    const actor = await initAdminActor();
    if (!actor) {
      throw new Error('Failed to get admin actor');
    }
    
    console.log('Fetching topics from canister...');
    const result = await actor.get_topics();
    
    if ('Ok' in result) {
      topics = result.Ok;
      console.log('Topics updated:', topics);
    } else {
      console.error('Failed to get topics:', result.Err);
      topics = [];
    }
    return topics;
  } catch (error) {
    console.error('Failed to update topics:', error);
    topics = [];
    throw error;
  }
}

// Process scraped content
async function processContent(url, html, topic) {
  try {
    const actor = await initAdminActor();
    
    const result = await actor.process_content({
      url,
      html,
      topic_id: topic.id
    });
    
    console.log('Content processed:', result);
    return result;
  } catch (error) {
    console.error('Failed to process content:', error);
    throw error;
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

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  
  if (message.type === 'login') {
    // Handle login
    authManager.login(message.windowFeatures)
      .then(result => {
        if (result.isAuthenticated) {
          updateTopics()
            .catch(error => console.error('Failed to update topics:', error));
        }
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        console.error('Login failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }

  if (message.type === 'logout') {
    // Handle logout
    authManager.logout()
      .then(() => {
        adminActor = null;
        topics = [];
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('Logout failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }

  if (message.type === 'AUTH_STATE_CHANGED') {
    console.log('Auth state changed:', message.data);
    
    if (message.data.isAuthenticated) {
      // Initialize auth and update topics
      initializeAuth()
        .then(() => {
          console.log('Auth initialized after state change');
          return updateTopics();
        })
        .then(() => {
          console.log('Topics updated after auth state change');
          // Close any open II tabs
          chrome.tabs.query({ url: 'https://identity.ic0.app/*' }, (tabs) => {
            tabs.forEach(tab => chrome.tabs.remove(tab.id));
          });
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('Failed to handle auth state change:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    } else {
      console.log('Auth state changed to not authenticated');
      adminActor = null;
      topics = [];
      sendResponse({ success: true });
    }
    return true;
  }
  
  if (message.type === 'getAuthState') {
    authManager.initialize()
      .then((state) => {
        sendResponse({ success: true, data: state });
      })
      .catch((error) => {
        console.error('Failed to get auth state:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
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
  
  if (message.type === 'UPDATE_AUTH_STATE') {
    console.log('Received auth state update:', message.state);
    if (message.state.isAuthenticated) {
      updateTopics();
    } else {
      topics = [];
    }
    sendResponse({ success: true });
    return true;
  }
  
  // Return false to indicate no async response
  return false;
});

// Initialize on install/update
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated');
  initializeAuth().catch(console.error);
});
