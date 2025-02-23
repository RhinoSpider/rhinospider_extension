// Import dependencies
const { Actor, HttpAgent } = await import('@dfinity/agent');
const { DelegationChain, DelegationIdentity } = await import('@dfinity/identity');
const { Secp256k1KeyIdentity } = await import('@dfinity/identity-secp256k1');
const { idlFactory } = await import('../declarations/consumer/consumer.did.js');
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
    groupEnd: () => console.groupEnd()
};

// Convert binary data to Uint8Array
function toBinaryArray(data) {
    if (!data) {
        throw new Error('Data is undefined or null');
    }

    if (data instanceof Uint8Array) {
        return data;
    }

    if (Array.isArray(data)) {
        return new Uint8Array(data);
    }

    if (typeof data === 'string') {
        // Handle hex string
        if (data.startsWith('0x')) {
            const hex = data.slice(2);
            const bytes = new Uint8Array(hex.length / 2);
            for (let i = 0; i < hex.length; i += 2) {
                bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
            }
            return bytes;
        }
        // Handle base64
        if (data.match(/^[a-zA-Z0-9+/]*={0,2}$/)) {
            const binary = atob(data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
        }
    }

    // Handle object with data property
    if (data && typeof data === 'object' && 'data' in data) {
        return toBinaryArray(data.data);
    }

    throw new Error(`Cannot convert to binary array: ${typeof data}`);
}

// Create identity with delegation chain
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

        try {
            // Convert stored chain back to proper format
            const delegations = delegationChain.delegations.map(d => ({
                delegation: {
                    pubkey: new Uint8Array(d.delegation.pubkey),
                    expiration: BigInt('0x' + d.delegation.expiration),
                    targets: d.delegation.targets || []
                },
                signature: new Uint8Array(d.signature)
            }));

            const publicKey = new Uint8Array(delegationChain.publicKey);
            const chain = DelegationChain.fromDelegations(publicKey, delegations);

            logger.debug('DelegationChain created:', {
                chainValid: !!chain,
                delegationCount: chain?.delegations?.length,
                publicKeyLength: chain?.publicKey?.length
            });

            // Create delegation identity
            const identity = new DelegationIdentity(baseIdentity, chain);
            logger.success('Identity created successfully');

            // Verify identity
            const principal = identity.getPrincipal();
            logger.debug('Identity verified:', { principal: principal.toText() });

            logger.groupEnd();
            return identity;
        } catch (error) {
            logger.error('Failed to process delegation chain:', error);
            logger.error('Raw delegation chain:', delegationChain);
            throw new Error(`Delegation chain processing failed: ${error.message}`);
        }
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
        const host = DFX_NETWORK === 'ic' ? IC_HOST : config.network.local.host;
        logger.debug('Initializing HttpAgent', { host });
        
        const agent = new HttpAgent({
            identity,
            host,
            verifyQuerySignatures: false
        });

        // Always fetch root key for mainnet
        logger.debug('Fetching root key');
        if (DFX_NETWORK !== 'ic') {
            await agent.fetchRootKey().catch(error => {
                logger.warn('Failed to fetch root key, using fallback', error);
            });
        }
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
        
        const actor = Actor.createActor(idlFactory, {
            agent,
            canisterId: CONSUMER_CANISTER_ID
        });

        // Verify actor creation
        if (!actor) {
            throw new Error('Actor creation failed - actor is null');
        }

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
        // Create identity
        logger.debug('Creating identity with delegation chain', { isDefined: !!delegationChain, type: typeof delegationChain });
        const identity = await createIdentity(delegationChain);
        currentIdentity = identity; // Store the identity

        // Create agent
        logger.group('Creating Agent');
        try {
            logger.debug('Initializing HttpAgent', { host: IC_HOST });
            const agent = new HttpAgent({
                identity,
                host: IC_HOST,
                verifyQuerySignatures: false
            });

            // Fetch root key in local development
            logger.debug('Fetching root key');
            if (DFX_NETWORK !== 'ic') {
                await agent.fetchRootKey();
            }
            logger.success('Agent initialized');

            // Create actor
            logger.group('Initializing Actor');
            try {
                if (!CONSUMER_CANISTER_ID) {
                    throw new Error('Consumer canister ID not found in environment');
                }

                logger.debug('Creating actor with IDL', { canisterId: CONSUMER_CANISTER_ID });
                consumerActor = Actor.createActor(idlFactory, {
                    agent,
                    canisterId: CONSUMER_CANISTER_ID
                });
                
                logger.success('Actor initialized successfully');
            } catch (error) {
                logger.error('Failed to initialize actor:', error);
                throw error;
            } finally {
                logger.groupEnd();
            }

            logger.success('Agent created successfully');
            logger.success('IC connection initialized successfully');
            logger.groupEnd();
            return identity; // Return the identity instead of the agent
        } catch (error) {
            logger.error('Failed to create agent:', error);
            throw error;
        } finally {
            logger.groupEnd();
        }
    } catch (error) {
        logger.error('Failed to initialize IC connection:', error);
        logger.error('Error stack:', error.stack);
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

// Export functions for content script
window.rhinoSpiderIC = {
    initializeIC,
    getCurrentIdentity,
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

logger.success('IC agent script loaded');
