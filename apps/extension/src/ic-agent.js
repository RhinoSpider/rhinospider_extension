// Polyfill global
const _global = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};
window.global = _global;

import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from './declarations/consumer/consumer.did.js';

// Constants
const IC_HOST = import.meta.env.VITE_IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = import.meta.env.VITE_CONSUMER_CANISTER_ID;

// Logger utility
const logger = {
    log: (msg) => console.log(`[IC Agent] ${msg}`),
    error: (msg, error) => console.error(`[IC Agent] ${msg}`, error),
    debug: (msg) => console.debug(`[IC Agent] ${msg}`),
};

let actor = null;

export async function initializeIC(identity) {
    try {
        logger.log('Initializing IC Connection');
        
        // Create new actor only if it doesn't exist or if identity changes
        if (!actor || !actor._identity || actor._identity.getPrincipal().toString() !== identity.getPrincipal().toString()) {
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
}

export function getCurrentActor() {
    if (!actor) {
        throw new Error('Actor not initialized');
    }
    return actor;
}

export function clearSession() {
    actor = null;
}
