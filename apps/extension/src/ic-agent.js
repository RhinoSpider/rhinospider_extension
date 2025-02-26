import { Actor, HttpAgent } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { DelegationIdentity } from '@dfinity/identity';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { DelegationChain } from '@dfinity/identity';
import { idlFactory } from './declarations/consumer';

// Constants
const IC_HOST = import.meta.env.VITE_IC_HOST;
const CONSUMER_CANISTER_ID = import.meta.env.VITE_CONSUMER_CANISTER_ID;

// Logger utility
const logger = {
    log: (msg) => console.log(`[IC Agent] ${msg}`),
    error: (msg, error) => console.error(`[IC Agent] ${msg}`, error),
    debug: (msg, data) => console.debug(`[IC Agent] ${msg}`, data || ''),
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
        // Convert stored format to DelegationChain format
        const delegations = storedChain.delegations.map(d => ({
            delegation: {
                pubkey: new Uint8Array(d.delegation.pubkey),
                expiration: BigInt('0x' + d.delegation.expiration), // Critical: convert hex to BigInt
                targets: d.delegation.targets || []
            },
            signature: new Uint8Array(d.signature)
        }));
        
        // Create DelegationChain using the library
        const publicKey = new Uint8Array(storedChain.publicKey);
        const chain = DelegationChain.fromDelegations(publicKey, delegations);
        logger.debug('Created delegation chain:', chain);
        return chain;
    } catch (error) {
        logger.error('Failed to create delegation chain:', error);
        throw error;
    }
};

// Get or create persistent base identity
const getOrCreateBaseIdentity = () => {
    const BASE_IDENTITY_KEY = 'rhinospider_base_identity';
    let storedKey = localStorage.getItem(BASE_IDENTITY_KEY);
    
    if (!storedKey) {
        // Create new key if none exists
        const secretKey = crypto.getRandomValues(new Uint8Array(32));
        storedKey = Array.from(secretKey).join(',');
        localStorage.setItem(BASE_IDENTITY_KEY, storedKey);
    }
    
    // Convert stored string back to Uint8Array
    const secretKey = new Uint8Array(storedKey.split(',').map(Number));
    return Secp256k1KeyIdentity.fromSecretKey(secretKey);
};

// IC Agent Interface
export const rhinoSpiderIC = {
    async initializeIC(delegationChainData) {
        try {
            logger.log('Initializing IC Connection');
            logger.debug('Delegation chain data:', delegationChainData);
            
            // Get or create persistent base identity
            const baseIdentity = getOrCreateBaseIdentity();
            
            // Create delegation chain and identity
            const delegationChain = createDelegationChain(delegationChainData);
            const identity = new DelegationIdentity(baseIdentity, delegationChain);
            
            // Only create new actor if identity changes
            if (!actor || !currentIdentity || currentIdentity.getPrincipal().toString() !== identity.getPrincipal().toString()) {
                currentIdentity = identity;
                
                // Create agent with proper configuration
                const agent = new HttpAgent({
                    identity,
                    host: IC_HOST,
                    fetchRootKey: true,
                    disableIngressFilter: false
                });

                // Fetch root key for non-local environments
                if (!IC_HOST.includes('localhost')) {
                    await agent.fetchRootKey();
                }

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

            return actor;
        } catch (error) {
            logger.error('Failed to initialize IC connection:', error);
            throw error;
        }
    },
    getCurrentActor() {
        if (!actor) {
            throw new Error('Actor not initialized');
        }
        return actor;
    },
    clearSession() {
        actor = null;
        currentIdentity = null;
    }
};

logger.log('IC Agent loaded');
