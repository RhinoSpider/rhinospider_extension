// Content script to handle page scraping and IC agent
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from './declarations/consumer/consumer.did.js';

// Constants from environment
const IC_HOST = import.meta.env.VITE_IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = import.meta.env.VITE_CONSUMER_CANISTER_ID;

// Initialize IC connection
let agent = null;
let actor = null;

// Logger utility
const logger = {
    log: (msg) => {
        console.log(`✅ [Content] ${msg}`);
    },
    error: (msg, error) => {
        console.error(`❌ [Content] ${msg}`, error);
    }
};

// Initialize IC connection with identity
async function initializeIC(identity) {
    try {
        logger.log('Initializing IC Connection');
        
        // Create agent
        agent = new HttpAgent({
            host: IC_HOST,
            identity
        });

        // Always fetch root key in extension context
        logger.log('Fetching root key');
        await agent.fetchRootKey();
        logger.log('Root key fetched successfully');

        // Create actor
        actor = Actor.createActor(idlFactory, {
            agent,
            canisterId: CONSUMER_CANISTER_ID
        });
        logger.log('Actor initialized successfully');

        return actor;
    } catch (error) {
        logger.error('Failed to initialize IC connection:', error);
        throw error;
    }
}

// Get current actor
function getCurrentActor() {
    if (!actor) {
        throw new Error('Actor not initialized');
    }
    return actor;
}

// Clear session
function clearSession() {
    agent = null;
    actor = null;
}

// Export functions to window
window.rhinoSpiderIC = {
    initializeIC,
    getCurrentActor,
    clearSession
};

// Content script to handle page scraping
console.log('RhinoSpider content script loaded');

let isActive = false;

// Initialize state
chrome.storage.local.get(['isActive'], (result) => {
    isActive = result.isActive;
});

// Listen for state changes
chrome.storage.onChanged.addListener((changes) => {
    if (changes.isActive) {
        isActive = changes.isActive.newValue;
    }
});

// Extract content based on topic rules
function extractContent(topic) {
    console.log('Extracting content with topic rules:', topic);
    const content = {
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
        content: '',
        metadata: {}
    };

    try {
        // Extract content using topic's extraction rules
        if (topic.extractionRules && topic.extractionRules.fields) {
            console.log('Found extraction rules with fields:', topic.extractionRules.fields);
            const extractedFields = {};
            
            for (const field of topic.extractionRules.fields) {
                try {
                    const selector = `.${field.name}, #${field.name}, [name="${field.name}"]`;
                    const elements = document.querySelectorAll(selector);
                    
                    if (elements.length > 0) {
                        let fieldValue = '';
                        
                        switch (field.fieldType.toLowerCase()) {
                            case 'text':
                                fieldValue = Array.from(elements)
                                    .map(el => el.textContent.trim())
                                    .filter(text => text.length > 0)
                                    .join(' ');
                                break;
                            
                            case 'html':
                                fieldValue = Array.from(elements)
                                    .map(el => el.innerHTML.trim())
                                    .filter(html => html.length > 0)
                                    .join(' ');
                                break;
                            
                            case 'attribute':
                                if (field.attributeName) {
                                    fieldValue = Array.from(elements)
                                        .map(el => el.getAttribute(field.attributeName))
                                        .filter(attr => attr && attr.length > 0)
                                        .join(' ');
                                }
                                break;
                        }
                        
                        if (fieldValue) {
                            extractedFields[field.name] = fieldValue;
                        }
                    }
                } catch (fieldError) {
                    console.error(`Error extracting field ${field.name}:`, fieldError);
                }
            }
            
            content.metadata = extractedFields;
        }
        
        // Get main content
        content.content = document.body.textContent;
        return content;
    } catch (error) {
        console.error('Error extracting content:', error);
        return content;
    }
}

// Listen for messages from dashboard
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    logger.log('Received message:', message.type);
    
    switch (message.type) {
        case 'INIT_IC_AGENT':
            try {
                await initializeIC(message.identity);
                sendResponse({ success: true });
            } catch (error) {
                logger.error('Failed to initialize IC agent:', error);
                sendResponse({ success: false, error: error.message });
            }
            break;
        case 'EXTRACT_CONTENT':
            if (!isActive) {
                sendResponse({ success: false, error: 'Extension is not active' });
                return;
            }
            
            const content = extractContent(message.topic);
            sendResponse({ success: true, content });
            break;
            
        case 'GET_PAGE_INFO':
            sendResponse({
                success: true,
                info: {
                    url: window.location.href,
                    title: document.title
                }
            });
            break;
    }
    
    return true; // Keep message channel open for async response
});

logger.log('Content script loaded');
