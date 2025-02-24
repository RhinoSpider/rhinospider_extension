import { Actor, HttpAgent } from '@dfinity/agent';
import { DelegationIdentity } from '@dfinity/identity';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { DelegationChain } from '@dfinity/identity';
import { idlFactory } from './declarations/consumer/consumer.did.js';

// Constants
const IC_HOST = import.meta.env.VITE_IC_HOST || 'https://icp0.io';
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

// IC Agent Interface
export const rhinoSpiderIC = {
    async initializeIC(delegationChainData) {
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
