// Consumer canister service
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '../declarations/consumer/consumer.did.js';

// Constants from environment
const IC_HOST = import.meta.env.VITE_IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = import.meta.env.VITE_CONSUMER_CANISTER_ID;
const DFX_NETWORK = import.meta.env.VITE_DFX_NETWORK || 'ic';

// Logger utility
const logger = {
    log: (msg, data) => {
        console.log(`🕷️ [Consumer] ${msg}`, data || '');
    },
    error: (msg, error) => {
        console.error(`❌ [Consumer] ${msg}`, error);
    },
    debug: (msg, data) => {
        console.debug(`🕷️ [Consumer] ${msg}`, data || '');
    }
};

export class ConsumerService {
    constructor(identity) {
        if (!identity) {
            throw new Error('Identity is required');
        }

        // Validate identity has required methods
        if (typeof identity.getPrincipal !== 'function') {
            logger.error('Invalid identity:', {
                type: typeof identity,
                methods: Object.getOwnPropertyNames(Object.getPrototypeOf(identity))
            });
            throw new Error('Invalid identity: missing getPrincipal method');
        }

        this.identity = identity;
        
        try {
            if (!CONSUMER_CANISTER_ID) {
                throw new Error('Consumer canister ID not found in environment');
            }
            
            logger.log('Using consumer canister:', CONSUMER_CANISTER_ID);

            // Create agent with proper fetch handler
            const host = DFX_NETWORK === 'ic' ? IC_HOST : 'http://localhost:4943';
            logger.debug('Creating agent:', { host });

            this.agent = new HttpAgent({
                identity: this.identity,
                host,
                verifyQuerySignatures: false
            });

            // Create actor
            this.actor = Actor.createActor(idlFactory, {
                agent: this.agent,
                canisterId: CONSUMER_CANISTER_ID
            });

            logger.debug('Consumer service initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize consumer service:', error);
            throw error;
        }
    }

    async initAgent() {
        try {
            // Always fetch root key for mainnet
            if (DFX_NETWORK === 'ic') {
                logger.debug('Fetching root key for mainnet');
                await this.agent.fetchRootKey().catch(error => {
                    logger.error('Failed to fetch root key:', error);
                    throw error;
                });
            }
        } catch (error) {
            logger.error('Failed to initialize agent:', error);
            throw error;
        }
    }
    
    // Get topics from admin through consumer
    async getTopics() {
        try {
            logger.log('Getting topics');
            await this.initAgent(); // Ensure agent is initialized
            const result = await this.actor.getTopics();
            
            if ('ok' in result) {
                logger.log('Got topics:', result.ok);
                return result.ok;
            } else {
                throw new Error(result.err);
            }
        } catch (error) {
            logger.error('Failed to get topics:', error);
            throw error;
        }
    }
    
    // Get AI configuration from admin through consumer
    async getAIConfig() {
        try {
            logger.log('Getting AI config');
            await this.initAgent(); // Ensure agent is initialized
            const result = await this.actor.getAIConfig();
            
            if ('ok' in result) {
                logger.log('Got AI config:', result.ok);
                return result.ok;
            } else {
                throw new Error(result.err);
            }
        } catch (error) {
            logger.error('Failed to get AI config:', error);
            throw error;
        }
    }
    
    // Get user profile
    async getProfile() {
        try {
            logger.log('Getting profile');
            await this.initAgent(); // Ensure agent is initialized
            const result = await this.actor.getProfile();
            
            if ('ok' in result) {
                logger.log('Got profile:', result.ok);
                return result.ok;
            } else {
                throw new Error(result.err);
            }
        } catch (error) {
            logger.error('Failed to get profile:', error);
            throw error;
        }
    }
    
    // Submit scraped data through consumer
    async submitScrapedData(data) {
        try {
            logger.log('Submitting scraped data:', data);
            await this.initAgent(); // Ensure agent is initialized
            const result = await this.actor.submitScrapedData(data);
            
            if ('ok' in result) {
                logger.log('Data submitted successfully');
                return true;
            } else {
                throw new Error(result.err);
            }
        } catch (error) {
            logger.error('Failed to submit data:', error);
            throw error;
        }
    }
}
