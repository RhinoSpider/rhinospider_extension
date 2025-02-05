import { Actor } from '@dfinity/agent';
import { idlFactory } from '../../../../src/declarations/admin/admin.did.js';
import type { ScrapingTopic } from '../../admin/src/types';

let topics: ScrapingTopic[] = [];
let adminActor: any = null;

// Initialize admin canister connection
async function initAdminActor() {
  if (!adminActor) {
    const host = process.env.NODE_ENV === 'production' 
      ? 'https://ic0.app'
      : 'http://localhost:4943';
      
    const agent = new HttpAgent({
      host,
      verifyQuerySignatures: false
    });

    if (process.env.NODE_ENV !== 'production') {
      await agent.fetchRootKey();
    }

    adminActor = Actor.createActor(idlFactory, {
      agent,
      canisterId: process.env.ADMIN_CANISTER_ID!
    });
  }
  return adminActor;
}

// Fetch and cache scraping topics
async function updateTopics() {
  try {
    const actor = await initAdminActor();
    const result = await actor.getTopics();
    if ('Ok' in result) {
      topics = result.Ok;
    }
  } catch (error) {
    console.error('Failed to fetch topics:', error);
  }
}

// Check if a URL matches any topic patterns
function findMatchingTopic(url: string): ScrapingTopic | null {
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
async function processContent(url: string, html: string, topic: ScrapingTopic) {
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
  if (message.type === 'CHECK_URL') {
    const topic = findMatchingTopic(message.url);
    sendResponse({ topic });
  } else if (message.type === 'PROCESS_CONTENT') {
    processContent(message.url, message.html, message.topic);
    sendResponse({ success: true });
  }
  return true;
});

// Update topics periodically
setInterval(updateTopics, 5 * 60 * 1000); // Every 5 minutes

// Initial topics fetch
updateTopics();
