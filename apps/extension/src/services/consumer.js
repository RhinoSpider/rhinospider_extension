// Consumer canister service
import { Principal } from '@dfinity/principal';
import { initializeIC, getCurrentActor } from '../ic-agent';

// Constants from environment
const IC_HOST = import.meta.env.VITE_IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = import.meta.env.VITE_CONSUMER_CANISTER_ID;
const DFX_NETWORK = import.meta.env.VITE_DFX_NETWORK || 'ic';

// Logger utility
const logger = {
    log: (msg) => console.log(` [Consumer] ${msg}`),
    error: (msg, error) => console.error(` [Consumer] ${msg}`, error),
    debug: (msg, data) => console.debug(` [Consumer] ${msg}`, data || ''),
    success: (msg) => console.log(` [Consumer] ${msg}`),
    info: (msg) => console.log(` [Consumer] ${msg}`)
};

export class ConsumerService {
    constructor(identity) {
        if (!identity) {
            throw new Error('Identity is required');
        }
        this.identity = identity;
    }

    async getActor() {
        try {
            // Try to get existing actor
            try {
                return getCurrentActor();
            } catch (e) {
                // Initialize new actor if none exists
                logger.log('Initializing new IC connection');
                return await initializeIC(this.identity);
            }
        } catch (error) {
            logger.error('Failed to get actor:', error);
            throw error;
        }
    }

    async submitContent(content) {
        const actor = await this.getActor();
        const result = await actor.submitContent(content);
        if ('err' in result) {
            throw new Error(result.err);
        }
        return result.ok;
    }

    async getProfile() {
        try {
            const actor = await this.getActor();
            const result = await actor.getProfile();
            if ('err' in result) {
                throw new Error(result.err);
            }
            return result.ok;
        } catch (error) {
            logger.error('Failed to get profile:', error);
            throw error;
        }
    }

    async updateProfile(profile) {
        const actor = await this.getActor();
        const result = await actor.updateProfile(profile);
        if ('err' in result) {
            throw new Error(result.err);
        }
        return result.ok;
    }
}
