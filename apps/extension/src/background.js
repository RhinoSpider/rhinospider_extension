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
    await authManager.initialize();
    console.log('Auth initialized');
    
    await updateTopics();
  } catch (error) {
    console.error('Failed to initialize:', error);
  }
}

// Fetch and cache scraping topics
async function updateTopics() {
  try {
    console.log('Updating topics...');
    const actor = await initAdminActor();
    console.log('Actor initialized');
    const result = await actor.getTopics();
    console.log('Got topics result:', result);
    if ('Ok' in result) {
      topics = result.Ok;
      console.log('Updated topics:', topics);
    }
  } catch (error) {
    console.error('Failed to fetch topics:', error);
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

// Initialize when the service worker starts
console.log('Service worker starting...');
initialize().catch(console.error);
