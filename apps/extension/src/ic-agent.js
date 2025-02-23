// Import dependencies
const { Actor, HttpAgent } = await import('@dfinity/agent');
const { DelegationChain, DelegationIdentity } = await import('@dfinity/identity');
const { Secp256k1KeyIdentity } = await import('@dfinity/identity-secp256k1');
const { idlFactory } = await import('./declarations/consumer/consumer.did.js');
const { config } = await import('./config.js');

// Constants from environment
const IC_HOST = import.meta.env.VITE_IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = import.meta.env.VITE_CONSUMER_CANISTER_ID;
const DFX_NETWORK = import.meta.env.VITE_DFX_NETWORK || 'ic';

// Global state
let currentIdentity = null;
let consumerActor = null;

// Logger setup
const logger = {
    group: (msg) => console.group(`🔒 [IC Agent] ${msg}`),
    log: (msg, data) => console.log(`🔒 [IC Agent] ${msg}`, data || ''),
    debug: (msg, data) => console.log(`🔍 [IC Agent] ${msg}`, data || ''),
    error: (msg, error) => console.error(`❌ [IC Agent] ${msg}`, error || ''),
    success: (msg) => console.log(`✅ [IC Agent] ${msg}`),
    warn: (msg) => console.warn(`⚠️ [IC Agent] ${msg}`),
    groupEnd: () => console.groupEnd()
};

// Create identity with delegation chain
async function createIdentity(delegationChain) {
    logger.group('Creating Identity');
    try {
        // Create base identity with signing capability
        const secretKey = crypto.getRandomValues(new Uint8Array(32));
        const baseIdentity = Secp256k1KeyIdentity.fromSecretKey(secretKey);
        
        // Create delegation identity
        const identity = new DelegationIdentity(baseIdentity, delegationChain);
        logger.success('Identity created successfully');

        // Verify identity
        const principal = identity.getPrincipal();
        logger.debug('Identity verified:', { principal: principal.toText() });

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
        const host = DFX_NETWORK === 'ic' ? IC_HOST : config.network.local.host;
        const agent = new HttpAgent({ identity, host });

        // Fetch root key for local network
        if (DFX_NETWORK !== 'ic') {
            await agent.fetchRootKey();
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
        const agent = await createAgent(identity);
        
        if (!CONSUMER_CANISTER_ID) {
            throw new Error('Consumer canister ID not found in environment');
        }

        const actor = Actor.createActor(idlFactory, {
            agent,
            canisterId: CONSUMER_CANISTER_ID
        });

        logger.success('Actor initialized successfully');
        logger.groupEnd();
        return actor;
    } catch (error) {
        logger.error('Failed to initialize actor:', error);
        logger.groupEnd();
        throw error;
    }
}

// Initialize IC connection
async function initializeIC(delegationChain) {
    logger.group('Initializing IC Connection');
    try {
        currentIdentity = await createIdentity(delegationChain);
        consumerActor = await initializeActor(currentIdentity);
        logger.success('IC connection initialized successfully');
        logger.groupEnd();
        return currentIdentity;
    } catch (error) {
        logger.error('Failed to initialize IC connection:', error);
        logger.groupEnd();
        throw error;
    }
}

// Get current identity
function getCurrentIdentity() {
    return currentIdentity;
}

// Get current actor
function getCurrentActor() {
    return consumerActor;
}

// Clear session
function clearSession() {
    currentIdentity = null;
    consumerActor = null;
    logger.success('Session cleared');
}

// Export functions for content script
window.rhinoSpiderIC = {
    initializeIC,
    getCurrentIdentity,
    getCurrentActor,
    clearSession
};

logger.success('IC agent script loaded');
