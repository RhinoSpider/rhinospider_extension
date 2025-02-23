import { Actor, HttpAgent } from '@dfinity/agent';
import { DelegationChain, DelegationIdentity } from '@dfinity/identity';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { idlFactory } from '../declarations/consumer/consumer.did.js';

// Environment variables
const IC_HOST = 'https://icp0.io';
const CONSUMER_CANISTER_ID = import.meta.env.VITE_CONSUMER_CANISTER_ID;

// Global state
let currentIdentity = null;
let consumerActor = null;

// Logger utility
const logger = {
    group: (name) => {
        console.group(`🔒 [IC Agent] ${name}`);
    },
    log: (msg, data) => {
        console.log(`🔒 [IC Agent] ${msg}`, data || '');
    },
    error: (msg, error) => {
        console.error(`❌ [IC Agent] ${msg}`, error);
        // Log error stack trace if available
        if (error?.stack) {
            console.error(`Stack trace:`, error.stack);
        }
    },
    warn: (msg, data) => {
        console.warn(`⚠️ [IC Agent] ${msg}`, data || '');
    },
    debug: (msg, data) => {
        console.debug(`🔍 [IC Agent] ${msg}`, data || '');
    },
    success: (msg, data) => {
        console.log(`✅ [IC Agent] ${msg}`, data || '');
    },
    groupEnd: () => console.groupEnd()
};

// Create identity for IC requests
async function createIdentity(delegationChain) {
    logger.group('Creating Identity');
    try {
        // Create base identity
        const secretKey = crypto.getRandomValues(new Uint8Array(32));
        const baseIdentity = Secp256k1KeyIdentity.fromSecretKey(secretKey);
        logger.log('Base identity created');
        
        // Process delegations
        const delegations = delegationChain.delegations.map(d => {
            // Ensure pubkey is Uint8Array
            const pubkey = d.delegation.pubkey instanceof Uint8Array 
                ? d.delegation.pubkey 
                : new Uint8Array(Object.values(d.delegation.pubkey));
            
            // Ensure signature is Uint8Array
            const signature = d.signature instanceof Uint8Array
                ? d.signature
                : new Uint8Array(Object.values(d.signature));
            
            // Convert expiration to BigInt
            let expiration;
            if (typeof d.delegation.expiration === 'string') {
                // Handle hex string (remove 0x if present)
                const hexString = d.delegation.expiration.replace('0x', '');
                expiration = BigInt('0x' + hexString);
            } else if (typeof d.delegation.expiration === 'number') {
                expiration = BigInt(d.delegation.expiration);
            } else if (typeof d.delegation.expiration === 'bigint') {
                expiration = d.delegation.expiration;
            } else {
                throw new Error(`Invalid expiration type: ${typeof d.delegation.expiration}`);
            }

            return {
                delegation: {
                    pubkey,
                    expiration,
                    targets: d.delegation.targets || []
                },
                signature
            };
        });

        // Create chain with root public key
        const publicKey = delegationChain.publicKey instanceof Uint8Array
            ? delegationChain.publicKey
            : new Uint8Array(Object.values(delegationChain.publicKey));
        
        logger.log('Creating delegation chain with:', {
            publicKey: Array.from(publicKey).map(b => b.toString(16).padStart(2, '0')).join(''),
            delegations: delegations.map(d => ({
                pubkey: Array.from(d.delegation.pubkey).map(b => b.toString(16).padStart(2, '0')).join(''),
                expiration: d.delegation.expiration.toString(16),
                signature: Array.from(d.signature).map(b => b.toString(16).padStart(2, '0')).join('')
            }))
        });
        
        const chain = DelegationChain.fromDelegations(publicKey, delegations);
        
        // Create identity
        const identity = new DelegationIdentity(baseIdentity, chain);
        logger.log('Identity created with principal:', identity.getPrincipal().toText());
        logger.groupEnd();
        return identity;
    } catch (error) {
        logger.error('Failed to create identity:', error);
        logger.groupEnd();
        throw error;
    }
}

// Create agent for IC requests
async function createAgent(identity) {
    logger.group('Creating Agent');
    try {
        logger.debug('Initializing HttpAgent', { host: IC_HOST });
        const agent = new HttpAgent({
            identity,
            host: IC_HOST
        });

        // Fetch root key in development
        if (process.env.NODE_ENV !== 'production') {
            logger.debug('Development environment detected, fetching root key');
            await agent.fetchRootKey();
            logger.success('Root key fetched successfully');
        }

        logger.success('Agent created successfully');
        logger.groupEnd();
        return agent;
    } catch (error) {
        logger.error('Failed to create agent:', error);
        logger.groupEnd();
        throw error;
    }
}

// Initialize actor with agent
async function initializeActor(identity) {
    logger.group('Initializing Actor');
    try {
        logger.debug('Creating agent for actor initialization');
        const agent = await createAgent(identity);

        logger.debug('Creating actor with IDL', { 
            canisterId: CONSUMER_CANISTER_ID 
        });
        
        consumerActor = Actor.createActor(idlFactory, {
            agent,
            canisterId: CONSUMER_CANISTER_ID
        });

        // Verify actor creation
        if (!consumerActor) {
            throw new Error('Actor creation failed - actor is null');
        }

        logger.success('Actor initialized successfully');
        logger.groupEnd();
        return consumerActor;
    } catch (error) {
        logger.error('Failed to initialize actor:', error);
        logger.groupEnd();
        throw error;
    }
}

// Initialize IC agent
async function initializeIC(delegationChain) {
    logger.group('Initializing IC Connection');
    try {
        if (!delegationChain) {
            logger.error('No delegation chain provided');
            throw new Error('Delegation chain is required for IC initialization');
        }

        logger.debug('Creating identity with delegation chain');
        currentIdentity = await createIdentity(delegationChain);
        
        logger.debug('Initializing actor with identity');
        const actor = await initializeActor(currentIdentity);
        
        logger.success('IC Connection initialized successfully', {
            principal: currentIdentity.getPrincipal().toText()
        });
        logger.groupEnd();
        return actor;
    } catch (error) {
        logger.error('Failed to initialize IC connection:', error);
        logger.groupEnd();
        throw error;
    }
}

// Get current actor
function getCurrentActor() {
    if (!consumerActor) {
        logger.warn('No active actor found - IC may not be initialized');
        return null;
    }
    logger.debug('Returning current actor');
    return consumerActor;
}

// Clear session
function clearSession() {
    logger.group('Clearing Session');
    try {
        currentIdentity = null;
        consumerActor = null;
        logger.success('Session cleared successfully');
    } catch (error) {
        logger.error('Error clearing session:', error);
        throw error;
    } finally {
        logger.groupEnd();
    }
}

// Initialize namespace for content script access
window.rhinoSpiderIC = {
    initializeIC,
    getCurrentActor,
    clearSession
};

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('IC Agent: Received message:', message);
    
    if (message.type === 'PING') {
        sendResponse({ success: true });
        return;
    }

    if (message.type === 'INIT_IC_AGENT') {
        initializeIC(message.delegationChain)
            .then(sendResponse)
            .catch(error => sendResponse({ success: false, error: error.toString() }));
        return true; // Will respond asynchronously
    }

    if (message.type === 'GET_TOPICS') {
        const actor = getCurrentActor();
        if (!actor) {
            sendResponse({ success: false, error: 'No active actor' });
            return;
        }
        
        actor.getTopics()
            .then(topics => sendResponse({ success: true, topics }))
            .catch(error => sendResponse({ success: false, error: error.toString() }));
        return true; // Will respond asynchronously
    }

    if (message.type === 'CLEAR_SESSION') {
        sendResponse(clearSession());
    }
});

console.log('IC agent script loaded');
