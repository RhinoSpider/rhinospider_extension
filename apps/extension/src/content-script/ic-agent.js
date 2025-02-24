// IC Agent Content Script
const logger = {
    log: (msg) => console.log(`[IC Agent] ${msg}`),
    error: (msg, error) => console.error(`[IC Agent] ${msg}`, error),
    debug: (msg, data) => console.debug(`[IC Agent] ${msg}`, data || '')
};

import { Actor, HttpAgent } from '@dfinity/agent';
import { DelegationIdentity, DelegationChain } from '@dfinity/identity';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { idlFactory } from '../declarations/consumer/consumer.did.js';

// Constants
const IC_HOST = 'https://icp0.io';
const CANISTER_ID = 'tgyl5-yyaaa-aaaaj-az4wq-cai';

// Global state
let actor = null;
let identity = null;

console.log('[IC Agent] IC Agent loaded');

// Initialize IC agent with delegation chain
async function initializeIC(delegationChain) {
    try {
        // Create base identity with signing capability
        const secretKey = crypto.getRandomValues(new Uint8Array(32));
        const baseIdentity = Secp256k1KeyIdentity.fromSecretKey(secretKey);
        
        // Convert delegation chain data
        const delegations = delegationChain.delegations.map(d => ({
            delegation: {
                pubkey: new Uint8Array(d.delegation.pubkey),
                expiration: BigInt('0x' + d.delegation.expiration.toString(16)), // Convert to hex then BigInt
                targets: d.delegation.targets || []
            },
            signature: new Uint8Array(d.signature)
        }));

        const publicKey = new Uint8Array(delegationChain.publicKey);
        
        // Create delegation chain and identity
        const chain = DelegationChain.fromDelegations(publicKey, delegations);
        identity = new DelegationIdentity(baseIdentity, chain);
        
        // Create agent
        const agent = new HttpAgent({
            host: IC_HOST,
            identity
        });

        // Fetch root key for local development
        if (IC_HOST !== 'https://ic0.app') {
            await agent.fetchRootKey();
        }

        // Create actor
        actor = Actor.createActor(idlFactory, {
            agent,
            canisterId: CANISTER_ID
        });

        console.log('[IC Agent] IC agent initialized successfully');
        return { success: true };
    } catch (error) {
        console.error('[IC Agent] Failed to initialize IC agent:', error);
        return { success: false, error: error.message };
    }
}

// Get user profile
async function getProfile() {
    try {
        if (!actor) {
            throw new Error('IC agent not initialized');
        }
        const result = await actor.getProfile();
        if ('err' in result) {
            throw new Error(result.err);
        }
        return { success: true, profile: result.ok };
    } catch (error) {
        console.error('[IC Agent] Failed to get profile:', error);
        return { success: false, error: error.message };
    }
}

// Clear current session
async function clearSession() {
    actor = null;
    identity = null;
}

// Handle messages from dashboard
window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    
    const { type, data } = event.data;
    let response;
    
    switch (type) {
        case 'INIT_IC_AGENT':
            response = await initializeIC(data.delegationChain);
            break;
        case 'GET_PROFILE':
            response = await getProfile();
            break;
        case 'CLEAR_SESSION':
            await clearSession();
            response = { success: true };
            break;
        default:
            return;
    }
    
    window.postMessage({
        type: `${type}_RESPONSE`,
        data: response
    }, '*');
});

// Expose IC agent interface to window
window.rhinoSpiderIC = {
    initializeIC,
    getProfile,
    clearSession
};

// Listen for messages from extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    logger.debug('Received message:', message);
    
    if (message.type === 'PING') {
        sendResponse({ success: true });
        return true;
    }
    
    if (message.type === 'INIT_IC_AGENT') {
        initializeIC(message.delegationChain)
            .then(sendResponse)
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (message.type === 'GET_ACTOR') {
        getCurrentActor()
            .then(actor => sendResponse({ success: true, actor }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (message.type === 'GET_PROFILE') {
        getProfile()
            .then(sendResponse)
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

// Get current actor instance
async function getCurrentActor() {
    if (!actor) {
        throw new Error('IC agent not initialized');
    }
    return actor;
}
