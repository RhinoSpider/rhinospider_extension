// Consumer canister service
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '../declarations/consumer/consumer.did.js';
import { config } from '../config';

// Logger utility
const logger = {
    log: (msg, data) => {
        console.log(`🕷️ [Consumer] ${msg}`, data || '');
    },
    error: (msg, error) => {
        console.error(`❌ [Consumer] ${msg}`, error);
    }
};

export class ConsumerService {
    constructor(identity) {
        this.identity = identity;
        
        try {
            // Get canister ID from config
            const canisterId = config.canisters.consumer;
            
            if (!canisterId) {
                throw new Error('Consumer canister ID not found in environment');
            }
            
            logger.log('Using consumer canister:', canisterId);
            
            // Create agent with proper fetch handler
            this.agent = new HttpAgent({
                identity,
                host: config.dfx_network === 'ic' 
                    ? config.network.ic.host 
                    : config.network.local.host,
                fetch: async (resource, init) => {
                    const headers = new Headers(init.headers);
                    headers.set('Content-Type', 'application/cbor');
                    return fetch(resource, {
                        ...init,
                        headers
                    });
                }
            });
            
            // Initialize agent
            this.initAgent();
            
            // Create actor
            this.actor = Actor.createActor(idlFactory, {
                agent: this.agent,
                canisterId: Principal.fromText(canisterId)
            });
            
            logger.log('Consumer service initialized');
        } catch (error) {
            logger.error('Failed to initialize consumer service:', error);
            throw error;
        }
    }
    
    async initAgent() {
        try {
            // Always fetch root key for mainnet
            if (config.dfx_network === 'ic') {
                await this.agent.fetchRootKey().catch(error => {
                    logger.error('Failed to fetch root key:', error);
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
