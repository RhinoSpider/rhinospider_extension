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
        console.log(` [Consumer] ${msg}`, data || '');
    },
    error: (msg, error) => {
        console.error(` [Consumer] ${msg}`, error);
    },
    debug: (msg, data) => {
        console.debug(` [Consumer] ${msg}`, data || '');
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

            // Get actor from IC agent
            if (!window.rhinoSpiderIC) {
                throw new Error('IC agent not initialized');
            }

            this.actor = window.rhinoSpiderIC.getCurrentActor();
            if (!this.actor) {
                throw new Error('Failed to get actor from IC agent');
            }

            logger.debug('Consumer service initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize consumer service:', error);
            throw error;
        }
    }

    // Get topics from admin through consumer
    async getTopics() {
        try {
            logger.log('Getting topics');
            const result = await this.actor.getTopics();
            
            if ('ok' in result) {
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
            const result = await this.actor.getAIConfig();
            
            if ('ok' in result) {
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
            const result = await this.actor.getProfile();
            
            if ('ok' in result) {
                return result.ok;
            } else if (result.err === 'NotFound') {
                // Profile doesn't exist, register device
                logger.debug('Profile not found, registering device');
                const deviceId = crypto.randomUUID();
                const registerResult = await this.actor.registerDevice(deviceId);
                
                if ('ok' in registerResult) {
                    // Try getting profile again
                    logger.debug('Device registered, getting profile');
                    const profileResult = await this.actor.getProfile();
                    
                    if ('ok' in profileResult) {
                        return profileResult.ok;
                    }
                }
                
                throw new Error('Failed to create profile');
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
            logger.log('Submitting scraped data');
            const result = await this.actor.submitScrapedData(data);
            
            if ('ok' in result) {
                return true;
            } else {
                throw new Error(result.err);
            }
        } catch (error) {
            logger.error('Failed to submit scraped data:', error);
            throw error;
        }
    }
}
