import { Actor, HttpAgent, AnonymousIdentity } from '@dfinity/agent';
import { DelegationChain, DelegationIdentity } from '@dfinity/identity';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { Principal } from '@dfinity/principal';
import { toHex } from './utils/hex';
import { parsePublicKeyDer, parseSignatureDer } from './utils/der';
import { createBackgroundIdentity } from './auth.js';

// Environment variables
const CONSUMER_CANISTER_ID = import.meta.env.VITE_CONSUMER_CANISTER_ID;
const IC_HOST = import.meta.env.VITE_IC_HOST;
const SCRAPER_URL = import.meta.env.VITE_SCRAPER_URL;

let consumerActor = null;
let isEnabled = false;
let scrapeQueue = [];
let scrapedCount = 0;
let lastScrapedTime = Date.now();
let currentSpeed = 0;

// Helper to serialize BigInts for logging
const serializeForLogging = (obj) => {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString(16); // Convert BigInt to hex string
    }
    // For Uint8Arrays, just show length
    if (value instanceof Uint8Array) {
      return `Uint8Array(${value.length})`;
    }
    // For large objects like signatures, just show type
    if (key === 'signature') {
      return '[Signature]';
    }
    return value;
  }, 2); // Pretty print with 2 space indent
};

// Helper function to serialize BigInts and ensure proper CBOR encoding
function serializeBigInt(obj) {
  if (typeof obj === 'bigint') {
    return Number(obj); // Convert BigInt to Number for CBOR compatibility
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  if (obj !== null && typeof obj === 'object') {
    if (obj instanceof Uint8Array) {
      return Array.from(obj); // Convert Uint8Array to regular array
    }
    const result = {};
    for (const key in obj) {
      result[key] = serializeBigInt(obj[key]);
    }
    return result;
  }
  return obj;
}

// Create delegation chain from stored data
function createDelegationChain(storedChain) {
  try {
    console.log('Creating delegation chain from:', JSON.stringify(storedChain, (key, value) => {
      if (value instanceof Uint8Array) {
        return Array.from(value);
      }
      if (typeof value === 'bigint') {
        return value.toString(16);
      }
      return value;
    }, 2));
    
    // Validate stored chain structure
    if (!storedChain || !Array.isArray(storedChain.delegations) || !Array.isArray(storedChain.publicKey)) {
      throw new Error('Invalid stored chain structure');
    }

    // Convert stored arrays to proper types
    const delegations = storedChain.delegations
      .filter(d => d && d.delegation && d.delegation.pubkey && d.signature)
      .map(d => ({
        delegation: {
          pubkey: new Uint8Array(d.delegation.pubkey),
          expiration: BigInt('0x' + d.delegation.expiration),
          targets: Array.isArray(d.delegation.targets) 
            ? d.delegation.targets
                .map(t => {
                  try {
                    return Principal.fromText(t);
                  } catch (error) {
                    console.error('Failed to convert target to Principal:', t, error);
                    return null;
                  }
                })
                .filter(Boolean)
            : []
        },
        signature: new Uint8Array(d.signature)
      }));

    // Ensure we have valid delegations
    if (!delegations.length) {
      throw new Error('No valid delegations found in stored chain');
    }

    const publicKey = new Uint8Array(storedChain.publicKey);
    
    // Create delegation chain using DelegationChain.fromDelegations
    console.log('Creating chain with public key:', Array.from(publicKey));
    const chain = DelegationChain.fromDelegations(publicKey, delegations);
    console.log('Created delegation chain successfully');
    
    // Log chain details for debugging - only log what we know exists
    console.log('Chain details:', {
      publicKey: Array.from(publicKey),
      delegationCount: delegations.length,
      delegations: delegations.map(d => ({
        expiration: d.delegation.expiration.toString(16),
        targetCount: d.delegation.targets.length
      }))
    });

    return chain;
  } catch (error) {
    console.error('Failed to create delegation chain:', error);
    throw error;
  }
}

// Create identity for IC requests
function createIdentity(delegationChain) {
  try {
    // Create base key identity with signing capability
    const secretKey = crypto.getRandomValues(new Uint8Array(32));
    const baseIdentity = Secp256k1KeyIdentity.fromSecretKey(secretKey);
    
    // Create delegation identity
    return new DelegationIdentity(baseIdentity, delegationChain);
  } catch (error) {
    console.error('Failed to create identity:', error);
    throw error;
  }
}

async function getStoredDelegationChain() {
  const result = await chrome.storage.local.get('delegationChain');
  if (!result.delegationChain) return null;
  
  try {
    return JSON.parse(result.delegationChain);
  } catch (error) {
    console.error('Failed to parse delegation chain:', error);
    return null;
  }
}

const initializeActor = async () => {
  const storedChain = await getStoredDelegationChain();
  const identity = createBackgroundIdentity(storedChain);
  
  // If using anonymous identity, we're not authenticated
  if (identity instanceof AnonymousIdentity) {
    console.log('No stored delegation chain, using anonymous identity');
    return null;
  }
  
  const agent = new HttpAgent({ 
    identity,
    host: IC_HOST,
    fetch: (...args) => {
      const [resource, init = {}] = args;
      init.headers = {
        ...init.headers,
        'Accept': 'application/cbor',
        'Content-Type': 'application/cbor'
      };
      return fetch(resource, init);
    }
  });
  
  // Import the proper actor creator
  const { createActor } = await import('../declarations/consumer/index.js');
  
  // Create actor with our configured agent
  consumerActor = await createActor(CONSUMER_CANISTER_ID, {
    agent,
    actorOptions: {
      blsVerify: false
    }
  });

  console.log('Consumer actor initialized');
  return consumerActor;
};

// Initialize the scraping system
async function initializeScrapingSystem() {
  try {
    console.log('Initializing scraping system...');
    console.log('Fetching topics...');
    
    // Ensure we have a valid consumer actor
    if (!consumerActor) {
      await initializeActor();
      if (!consumerActor) {
        throw new Error('Failed to initialize consumer actor');
      }
    }

    // Get topics with proper request transformation
    const result = await consumerActor.getTopics();
    if ('err' in result) {
      throw new Error('Failed to get topics: ' + JSON.stringify(result.err));
    }
    
    const topics = result.ok;
    console.log('Got topics:', serializeForLogging(topics));

    // Check if extension is enabled
    const extensionState = await chrome.storage.local.get(['extensionEnabled']);
    if (extensionState.extensionEnabled !== false) {
      console.log('Starting scraping...');
      startScraping(topics);
    } else {
      console.log('Extension is disabled, not starting scraping');
    }
  } catch (error) {
    console.error('Failed to initialize scraping system:', error);
    // Store error state
    await chrome.storage.local.set({
      scrapingError: error.message
    });
    throw error;
  }
}

// Process scraped content
async function processScrapedContent(tab, topic, html) {
  try {
    console.log('Processing content for topic:', serializeForLogging(topic));
    
    // Create parser for HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Process content according to extraction rules
    const processedData = {
      url: tab.url,
      topic: topic.id,
      title: '',
      text: '',
      timestamp: Date.now(),
      data: {},
      metadata: {
        source: 'extension',
        scrapeTime: Date.now(),
        userAgent: navigator.userAgent
      }
    };

    // Apply extraction rules
    if (topic.extractionRules) {
      for (const rule of topic.extractionRules) {
        try {
          if (!rule.selector) continue;

          const elements = doc.querySelectorAll(rule.selector);
          
          if (rule.type === 'array') {
            // Extract array of items
            processedData.data[rule.field] = Array.from(elements).map(el => {
              return rule.attribute ? 
                el.getAttribute(rule.attribute) : 
                el.textContent.trim();
            }).filter(Boolean);
          } 
          else if (rule.type === 'object') {
            // Extract object with key-value pairs
            processedData.data[rule.field] = {};
            elements.forEach(el => {
              const key = rule.keyAttribute ? 
                el.getAttribute(rule.keyAttribute) : 
                el.tagName;
              const value = rule.valueSelector ? 
                el.querySelector(rule.valueSelector)?.textContent.trim() : 
                el.textContent.trim();
              if (key && value) {
                processedData.data[rule.field][key] = value;
              }
            });
          }
          else {
            // Extract single value
            const element = elements[0];
            if (element) {
              const value = rule.attribute ? 
                element.getAttribute(rule.attribute) : 
                element.textContent.trim();
              
              if (rule.field === 'title') {
                processedData.title = value;
              } else if (rule.field === 'text') {
                processedData.text = value;
              } else {
                processedData.data[rule.field] = value;
              }
            }
          }
        } catch (ruleError) {
          console.error('Error applying extraction rule:', ruleError);
          processedData.metadata.errors = processedData.metadata.errors || [];
          processedData.metadata.errors.push({
            rule: rule.field,
            error: ruleError.message
          });
        }
      }
    }

    // Add page metadata
    const metaTags = doc.querySelectorAll('meta');
    const pageMetadata = {};
    metaTags.forEach(meta => {
      const name = meta.getAttribute('name') || meta.getAttribute('property');
      const content = meta.getAttribute('content');
      if (name && content) {
        pageMetadata[name] = content;
      }
    });
    processedData.metadata.page = pageMetadata;

    // Submit directly to consumer canister
    await submitScrapedContent(processedData);

    console.log('Content processed and submitted successfully');
  } catch (error) {
    console.error('Error processing content:', error);
    throw error;
  }
}

// Submit scraped content to consumer canister
async function submitScrapedContent(content) {
  try {
    if (!consumerActor) {
      throw new Error('Consumer actor not initialized');
    }
    
    console.log('Submitting scraped content:', serializeForLogging(content));
    
    // Format content according to consumer.did ScrapedData type
    const formattedContent = {
      id: content.id || crypto.randomUUID(),
      url: content.url,
      topicId: content.topic,
      status: 'pending',
      timestamp: Number(Date.now()),
      retries: 0,
      content: {
        raw: content.text || '',
        extracted: Object.entries(content.data || {})
      },
      error: content.error ? [content.error] : [] // opt text in Candid
    };
    
    // Submit to consumer canister
    const result = await consumerActor.submitScrapedData(formattedContent);
    console.log('Content submission result:', serializeForLogging(result));
    
    // Update metrics
    const metrics = await chrome.storage.local.get(['metrics']) || { metrics: {} };
    metrics.totalSubmissions = (metrics.totalSubmissions || 0) + 1;
    metrics.lastSubmission = Date.now();
    await chrome.storage.local.set({ metrics });
    
    return result;
  } catch (error) {
    console.error('Failed to submit scraped content:', error);
    throw error;
  }
}

// Start scraping process
function startScraping(topics) {
  const activeTopics = topics.filter(t => t.active);
  console.log('Starting scraping for topics:', serializeForLogging(activeTopics));
  
  activeTopics.forEach(topic => {
    console.log('Processing topic:', topic.name);
    topic.urlPatterns.forEach(pattern => {
      console.log('Processing pattern:', pattern);
      // Convert wildcard pattern to regex
      const regexPattern = new RegExp(
        pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&') // escape special chars
              .replace(/\*/g, '.*') // convert * to .*
      );
      
      // Queue initial URLs based on pattern
      if (pattern.includes('*')) {
        // For wildcard patterns, we'll rely on tab updates to match URLs
        console.log('Wildcard pattern registered:', pattern);
      } else {
        // For exact URLs, queue them immediately
        queueScrape(pattern, topic);
      }
    });
  });
  
  // Set up tab update listener to catch matching URLs
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      activeTopics.forEach(topic => {
        topic.urlPatterns.forEach(pattern => {
          const regexPattern = new RegExp(
            pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                  .replace(/\*/g, '.*')
          );
          if (regexPattern.test(tab.url)) {
            queueScrape(tab.url, topic);
          }
        });
      });
    }
  });
}

// Queue a URL for scraping
async function queueScrape(url, topic) {
  console.log('Starting scrape for:', url);
  
  try {
    // Scrape HTML using user's bandwidth
    console.log('Fetching HTML from:', url);
    const response = await fetch(url);
    const html = await response.text();
    
    // Send raw HTML to DO for processing
    console.log('Sending to DO for processing');
    const doResponse = await fetch(SCRAPER_URL + '/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        topic: topic.id,
        html,
        extractionRules: topic.extractionRules
      })
    });

    if (!doResponse.ok) {
      throw new Error(`DO processing failed: ${doResponse.statusText}`);
    }

    console.log('DO successfully processed HTML');

    // Update metrics
    scrapedCount++;
    const now = Date.now();
    const timeDiff = now - lastScrapedTime;
    currentSpeed = (timeDiff > 0) ? (timeDiff / 1000) : 0;
    lastScrapedTime = now;
    
    // Send speed update to UI
    chrome.runtime.sendMessage({
      type: 'SPEED_UPDATE',
      speed: currentSpeed,
      totalScraped: scrapedCount
    }).catch(() => {}); // Ignore if popup is closed
    
    console.log('Updated metrics:', {
      speed: currentSpeed.toFixed(2),
      totalScraped: scrapedCount
    });

  } catch (error) {
    console.error('Error in scraping process:', error);
    throw error;
  }
}

// Check if user is authenticated
async function checkAuthentication() {
  try {
    console.log('Checking auth state:', await chrome.storage.local.get(['identityInfo']));
    
    // Get stored identity info
    const result = await chrome.storage.local.get(['identityInfo']);
    if (!result.identityInfo?.delegationChain) {
      console.log('No auth state found');
      return null;
    }

    // Get raw delegation chain
    const rawDelegationChain = result.identityInfo.delegationChain;
    console.log('Raw delegation chain:', rawDelegationChain);

    // Create delegation chain from stored data
    const delegationChain = createDelegationChain(rawDelegationChain);
    console.log('Created delegation chain:', delegationChain);

    return {
      delegationChain
    };
  } catch (error) {
    console.error('Error checking authentication:', error);
    throw error;
  }
}

// Initialize extension state
async function initializeExtension() {
  try {
    console.log('Background: Starting background script...');
    console.log('Background: Checking existing auth...');
    
    const isAuthenticated = await checkAuthentication();
    console.log('Background: Authentication status:', isAuthenticated);
    
    if (!isAuthenticated) {
      console.log('Background: Not authenticated, waiting for login...');
      return;
    }
    
    const result = await chrome.storage.local.get(['extensionEnabled']);
    const isEnabled = result.extensionEnabled !== false; // Default to true if not set
    
    if (isEnabled) {
      console.log('Extension is enabled, initializing actor...');
      const actor = await initializeActor();
      if (actor) {
        console.log('Actor initialized, starting scraping system...');
        await initializeScrapingSystem();
      }
    } else {
      console.log('Extension is disabled, skipping initialization');
    }
  } catch (error) {
    console.error('Failed to initialize extension:', error);
  }
}

// Handle extension installation/update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details.reason);
  await initializeExtension();
});

// Handle extension startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('Extension starting up');
  await initializeExtension();
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('Background: Received message:', message);
  
  if (message.type === 'LOGIN_COMPLETE') {
    console.log('Background: Login complete, initializing actor...');
    await initializeExtension();
  }
  
  // Always return true to indicate we'll send a response asynchronously
  return true;
});

// Initialize on script load
initializeExtension();

// Update topics periodically
setInterval(() => {
  if (isEnabled && consumerActor) {
    console.log('Periodic update: fetching new topics...');
    initializeScrapingSystem();
  }
}, 5 * 60 * 1000); // Every 5 minutes

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background: Received message:', message);
  if (message.type === 'LOGIN_COMPLETE') {
    console.log('Background: Login complete, initializing actor...');
    initializeActor();
  } else if (message.type === 'LOGOUT') {
    console.log('Background: Logout received, clearing actor...');
    consumerActor = null;
  }
});
