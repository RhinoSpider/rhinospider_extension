// Import dependencies
const { Actor, HttpAgent } = await import('@dfinity/agent');
const { DelegationChain, DelegationIdentity, Delegation } = await import('@dfinity/identity');
const { Secp256k1KeyIdentity } = await import('@dfinity/identity-secp256k1');
const { idlFactory } = await import('./declarations/consumer/consumer.did.js');
const { config } = await import('./config.js');

// Constants from environment
const IC_HOST = import.meta.env.VITE_IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = import.meta.env.VITE_CONSUMER_CANISTER_ID;
const DFX_NETWORK = import.meta.env.VITE_DFX_NETWORK || 'ic';

// Global state
let currentActor = null;

// Logger setup
const logger = {
    group: (msg) => console.group(`🔒 [IC Agent] ${msg}`),
    log: (msg, data) => console.log(`🔒 [IC Agent] ${msg}`, data || ''),
    debug: (msg, data) => console.log(`🔍 [IC Agent] ${msg}`, data || ''),
    error: (msg, error) => console.error(`❌ [IC Agent] ${msg}`, error || ''),
    success: (msg) => console.log(`✅ [IC Agent] ${msg}`),
    warn: (msg) => console.warn(`⚠️ [IC Agent] ${msg}`),
    groupEnd: () => console.groupEnd(),
    info: (msg) => console.info(`🔒 [IC Agent] ${msg}`)
};

// Get crypto API, handling both window and worker contexts
const getCrypto = () => {
    // Check window.crypto first
    if (typeof window !== 'undefined' && window.crypto) {
        return window.crypto;
    }
    // Check self.crypto for worker context
    if (typeof self !== 'undefined' && self.crypto) {
        return self.crypto;
    }
    // Fallback to global crypto
    if (typeof crypto !== 'undefined') {
        return crypto;
    }
    throw new Error('Web Crypto API not available');
};

// Create identity with delegation chain
async function createIdentity(rawChain) {
    try {
        logger.info('Creating Identity');
        
        // Validate chain
        if (!rawChain?.delegations?.length) {
            throw new Error('Invalid delegation chain format');
        }

        // Create base identity with signing capability
        const secretKey = new Uint8Array(32);
        window.crypto.getRandomValues(secretKey);
        const baseIdentity = Secp256k1KeyIdentity.fromSecretKey(secretKey);

        // Convert session key from raw format
        const sessionKey = new Uint8Array(rawChain.sessionKey);

        // Format delegations
        const delegations = rawChain.delegations.map(d => ({
            delegation: {
                ...d.delegation,
                pubkey: new Uint8Array(d.delegation.pubkey),
                expiration: BigInt('0x' + d.delegation.expiration)
            },
            signature: new Uint8Array(d.signature)
        }));

        // Create delegation chain
        const chain = DelegationChain.fromDelegations(sessionKey, delegations);

        // Create delegation identity
        const identity = new DelegationIdentity(baseIdentity, chain);

        // Verify identity was created successfully
        const principal = identity.getPrincipal().toString();
        logger.debug('Identity verified:', {
            principal,
            sessionKey: rawChain.sessionKey?.length
        });

        return identity;
    } catch (error) {
        logger.error('Failed to create identity:', error);
        throw error;
    }
}

// Initialize IC connection
async function initializeIC(delegationChain) {
    try {
        logger.info('Initializing IC Connection');

        // Get identity from delegation chain
        const identity = await createIdentity(delegationChain);
        
        // Create agent
        logger.info('Creating Agent');
        const agent = new HttpAgent({
            identity,
            host: IC_HOST
        });

        // Only fetch root key in development
        if (process.env.NODE_ENV !== 'production') {
            await agent.fetchRootKey();
        }
        logger.success('Agent created successfully');

        // Create actor
        logger.info('Initializing Actor');
        const actor = Actor.createActor(idlFactory, {
            agent,
            canisterId: CONSUMER_CANISTER_ID
        });
        logger.success('Actor initialized successfully');

        // Store current actor
        currentActor = actor;
        logger.success('IC connection initialized successfully');

        return identity;
    } catch (error) {
        logger.error('Failed to initialize IC connection:', error);
        throw error;
    }
}

// Get current actor
function getCurrentActor() {
    return currentActor;
}

// Clear session
function clearSession() {
    currentActor = null;
    logger.success('Session cleared');
}

// Export functions for content script
window.rhinoSpiderIC = {
    initializeIC,
    getCurrentActor,
    clearSession
};

logger.success('IC agent script loaded');
