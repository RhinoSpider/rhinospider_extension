// Consumer canister service
import { Principal } from '@dfinity/principal';

// Constants from environment
const IC_HOST = import.meta.env.VITE_IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = import.meta.env.VITE_CONSUMER_CANISTER_ID;
const DFX_NETWORK = import.meta.env.VITE_DFX_NETWORK || 'ic';

// Logger utility
const logger = {
    log: (msg) => console.log(`[Consumer] ${msg}`),
    error: (msg, error) => console.error(`[Consumer] ${msg}`, error),
    debug: (msg, data) => console.debug(`[Consumer] ${msg}`, data || '')
};

export class ConsumerService {
    constructor(actor) {
        this.actor = actor;
    }

    async getProfile() {
        try {
            if (!this.actor) {
                throw new Error('Consumer service not initialized');
            }

            const result = await this.actor.getProfile();
            if ('err' in result) {
                throw new Error(result.err);
            }

            return result.ok;
        } catch (error) {
            logger.error('Failed to get profile:', error);
            throw error;
        }
    }
}
