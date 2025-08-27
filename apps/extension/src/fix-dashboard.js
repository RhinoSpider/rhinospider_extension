import { Actor, HttpAgent } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';
import { idlFactory, UserProfile, Error } from './declarations/consumer/consumer.did.js';
import { IDL } from '@dfinity/candid';

// Constants
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 't3pjp-kqaaa-aaaao-a4ooq-cai';
const II_URL = process.env.II_URL || 'https://identity.internetcomputer.org';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Set up logger
const logger = {
    debug: (message, ...args) => {
        console.debug(`[${new Date().toISOString()}] [DEBUG] ${message}`, ...args);
    },
    info: (message, ...args) => {
        console.info(`[${new Date().toISOString()}] [INFO] ${message}`, ...args);
    },
    warn: (message, ...args) => {
        console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, ...args);
    },
    error: (message, ...args) => {
        console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, ...args);
    }
};

// Create agent and actor for the given identity
async function createAgentAndActor(identity) {
    logger.debug('[Agent] Creating agent for principal:', identity.getPrincipal().toText());

    try {
        // Create custom fetch function for agent
        const customFetch = async (url, options = {}) => {
            // Ensure proper headers
            options.headers = options.headers || {};
            options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/cbor';
            options.credentials = 'omit';
            
            // Make the fetch call
            const response = await fetch(url, options);
            
            // Log response details for debugging
            logger.debug('[Agent] Response status:', response.status);
            if (!response.ok) {
                const text = await response.text();
                logger.debug('[Agent] Response error:', text);
                return {
                    ok: response.ok,
                    status: response.status,
                    statusText: response.statusText,
                    headers: new Headers(response.headers),
                    arrayBuffer: async () => {
                        throw new Error(`HTTP error: ${response.status} - ${text}`);
                    }
                };
            }
            
            const buffer = await response.arrayBuffer();
            
            // Return a properly formatted response object
            return {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                headers: new Headers(response.headers),
                arrayBuffer: () => Promise.resolve(buffer)
            };
        };

        // Create agent with proper configuration
        const agent = new HttpAgent({
            host: IC_HOST,
            identity,
            verifyQuerySignatures: false,
            fetchRootKey: false,
            disableHandshake: true,
            retryTimes: 3,
            fetch: customFetch
        });

        // Fetch root key (required for local development)
        logger.debug('[Agent] Fetching root key...');
        await agent.fetchRootKey();
        logger.debug('[Agent] Root key fetched successfully');

        // Create actor with proper configuration
        const actor = Actor.createActor(idlFactory, {
            agent,
            canisterId: CONSUMER_CANISTER_ID,
        });

        return { agent, actor };
    } catch (error) {
        logger.error('[Agent] Failed to create agent or actor:', error);
        throw error;
    }
}

// Get profile from canister
async function getProfile(identity) {
    try {
        const { agent, actor } = await createAgentAndActor(identity);
        if (!actor) {
            throw new Error('Failed to create actor');
        }

        logger.debug('[Profile] Attempting actor call');
        try {
            // Try actor call first
            const result = await actor.getProfile();
            if ('ok' in result) {
                return result.ok;
            } else {
                throw new Error(`Actor call returned error: ${JSON.stringify(result.err)}`);
            }
        } catch (error) {
            logger.error('[Profile] Actor call failed:', error);
            
            // Try direct agent call as fallback
            logger.debug('[Profile] Trying direct agent call');
            try {
                // Use the agent's call method directly
                const response = await agent.call(
                    Principal.fromText(CONSUMER_CANISTER_ID),
                    'getProfile',
                    new Uint8Array()
                );
                
                // Decode response
                const result = IDL.decode([IDL.Variant({
                    'ok': UserProfile,
                    'err': Error
                })], response)[0];
                
                if ('ok' in result) {
                    return result.ok;
                } else {
                    throw new Error(`Direct call returned error: ${JSON.stringify(result.err)}`);
                }
            } catch (error) {
                logger.error('[API] Direct agent call failed:', error);
                throw error;
            }
        }
    } catch (error) {
        logger.error('[Profile] Failed to get profile:', error);
        throw error;
    }
}

// Export functions
window.createAgentAndActor = createAgentAndActor;
window.getProfile = getProfile;
