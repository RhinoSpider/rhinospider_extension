// IC Agent Content Script
(() => {
    // Logger utility
    const logger = {
        log: (msg) => console.log(`[Content IC Agent] ${msg}`),
        error: (msg, error) => console.error(`[Content IC Agent] ${msg}`, error),
        debug: (msg, data) => console.debug(`[Content IC Agent] ${msg}`, data || ''),
    };

    let actor = null;
    let currentIdentity = null;

    // Create delegation chain from stored format
    const createDelegationChain = (storedChain) => {
        logger.debug('Creating delegation chain from:', storedChain);
        
        if (!storedChain || !storedChain.delegations) {
            logger.error('Invalid stored chain format:', storedChain);
            throw new Error('Invalid delegation chain format');
        }

        try {
            const delegations = storedChain.delegations.map(d => ({
                delegation: {
                    pubkey: Uint8Array.from(d.delegation.pubkey),
                    expiration: BigInt('0x' + d.delegation.expiration),
                    targets: d.delegation.targets || []
                },
                signature: Uint8Array.from(d.signature)
            }));
            
            const publicKey = Uint8Array.from(storedChain.publicKey);
            const chain = DelegationChain.fromDelegations(publicKey, delegations);
            logger.debug('Created delegation chain:', chain);
            return chain;
        } catch (error) {
            logger.error('Failed to create delegation chain:', error);
            throw error;
        }
    };

    // Initialize IC agent
    async function initializeIC(delegationChainData) {
        try {
            logger.log('Initializing IC Connection');
            logger.debug('Delegation chain data:', delegationChainData);
            
            // Create base identity with signing capability
            const secretKey = crypto.getRandomValues(new Uint8Array(32));
            const baseIdentity = Secp256k1KeyIdentity.fromSecretKey(secretKey);
            
            // Create delegation chain and identity
            const delegationChain = createDelegationChain(delegationChainData);
            const identity = new DelegationIdentity(baseIdentity, delegationChain);
            
            // Only create new actor if identity changes
            if (!actor || !currentIdentity || currentIdentity.getPrincipal().toString() !== identity.getPrincipal().toString()) {
                currentIdentity = identity;
                
                // Create agent
                const agent = new HttpAgent({
                    identity,
                    host: IC_HOST
                });

                // Create actor
                if (!CONSUMER_CANISTER_ID) {
                    throw new Error('Consumer canister ID not found');
                }

                actor = Actor.createActor(idlFactory, {
                    agent,
                    canisterId: CONSUMER_CANISTER_ID
                });
                logger.log('Actor initialized successfully');
            }

            return { success: true };
        } catch (error) {
            logger.error('Failed to initialize IC connection:', error);
            return { success: false, error: error.message };
        }
    }

    // Handle messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        logger.debug('Received message:', message);
        
        if (message.type === 'INIT_IC_AGENT') {
            initializeIC(message.delegationChain)
                .then(sendResponse)
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
        }
        
        if (message.type === 'CALL_CANISTER') {
            if (!actor) {
                sendResponse({ success: false, error: 'Actor not initialized' });
                return true;
            }
            
            const { method, args } = message;
            actor[method](...(args || []))
                .then(result => sendResponse({ success: true, result }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
        }
    });

    logger.log('Content script loaded');
})();
