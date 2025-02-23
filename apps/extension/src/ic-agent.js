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
        logger.debug('Received delegation chain:', {
            isDefined: !!delegationChain,
            hasPublicKey: delegationChain?.publicKey ? 'yes' : 'no',
            hasDelegations: delegationChain?.delegations ? 'yes' : 'no',
            delegationsLength: delegationChain?.delegations?.length
        });

        if (!delegationChain?.delegations) {
            throw new Error('Invalid delegation chain');
        }

        // Create base identity with signing capability
        const secretKey = crypto.getRandomValues(new Uint8Array(32));
        const baseIdentity = Secp256k1KeyIdentity.fromSecretKey(secretKey);
        logger.success('Base identity created');
        
        // Log first delegation for debugging
        if (delegationChain.delegations[0]) {
            logger.debug('Processing delegation:', {
                pubkeyLength: delegationChain.delegations[0].delegation?.pubkey?.length,
                expiration: delegationChain.delegations[0].delegation?.expiration?.toString(16),
                signatureLength: delegationChain.delegations[0].signature?.length,
                pubkeyType: typeof delegationChain.delegations[0].delegation?.pubkey,
                signatureType: typeof delegationChain.delegations[0].signature
            });
        }

        // Convert binary data to Uint8Arrays
        const publicKey = new Uint8Array(delegationChain.publicKey);
        
        const delegations = delegationChain.delegations.map(d => {
            // Ensure pubkey and signature are Uint8Arrays
            const pubkey = d.delegation.pubkey instanceof Uint8Array ? 
                d.delegation.pubkey : 
                new Uint8Array(d.delegation.pubkey);
                
            const signature = d.signature instanceof Uint8Array ?
                d.signature :
                new Uint8Array(d.signature);

            // Convert expiration to BigInt
            const expiration = typeof d.delegation.expiration === 'string' ?
                BigInt('0x' + d.delegation.expiration) :
                d.delegation.expiration;

            return {
                delegation: {
                    pubkey,
                    expiration,
                    targets: d.delegation.targets || []
                },
                signature
            };
        });

        // Create DelegationChain
        logger.debug('Creating DelegationChain:', {
            publicKeyLength: publicKey.length,
            delegationsCount: delegations.length,
            firstDelegation: delegations[0] ? {
                pubkeyLength: delegations[0].delegation.pubkey.length,
                signatureLength: delegations[0].signature.length,
                expiration: delegations[0].delegation.expiration.toString(16)
            } : null
        });
        
        const chain = DelegationChain.fromDelegations(publicKey, delegations);
        
        logger.debug('DelegationChain created:', {
            chainValid: !!chain,
            delegationCount: chain?.delegations?.length,
            publicKeyLength: chain?.publicKey?.length
        });

        // Create delegation identity
        const identity = new DelegationIdentity(baseIdentity, chain);
        logger.success('Identity created successfully');
        
        logger.groupEnd();
        return identity;
    } catch (error) {
        logger.error('Failed to create identity:', error);
        logger.error('Error stack:', error.stack);
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
            host: IC_HOST,
            fetch: async (resource, init) => {
                const headers = new Headers(init.headers);
                headers.set('Content-Type', 'application/cbor');
                return fetch(resource, {
                    ...init,
                    headers
                });
            }
        });

        // Always fetch root key for mainnet
        logger.debug('Fetching root key');
        await agent.fetchRootKey().catch(error => {
            logger.warn('Failed to fetch root key, using fallback', error);
        });
        logger.success('Agent initialized');

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

// Initialize IC connection with delegation chain
export async function initializeIC(delegationChain) {
    logger.group('Initializing IC Connection');
    try {
        logger.debug('Creating identity with delegation chain', {
            isDefined: !!delegationChain,
            type: typeof delegationChain
        });
        
        // Create identity
        const identity = await createIdentity(delegationChain);
        
        // Create agent
        await createAgent(identity);
        
        // Create actor
        await initializeActor(identity);
        
        logger.success('IC connection initialized successfully');
        logger.groupEnd();
        
        // Return the identity for consumer service
        return identity;
    } catch (error) {
        logger.error('Failed to initialize IC connection:', error);
        logger.error('Error stack:', error.stack);
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
const rhinoSpiderIC = {
    initializeIC,
    getCurrentActor,
    clearSession
};

// Export for module usage
export { rhinoSpiderIC };

// Make available on window for content script access
window.rhinoSpiderIC = rhinoSpiderIC;

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
