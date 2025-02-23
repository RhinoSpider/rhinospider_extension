// Configuration for the extension
export const config = {
    // Canister IDs
    canisters: {
        // Use the consumer canister ID from environment
        consumer: import.meta.env.VITE_CONSUMER_CANISTER_ID,
    },
    
    // Network configuration
    network: {
        local: {
            host: 'http://localhost:8000',
        },
        ic: {
            host: import.meta.env.VITE_IC_HOST || 'https://icp0.io',
        }
    },
    
    // Internet Identity URL
    ii_url: import.meta.env.VITE_II_URL || 'https://identity.ic0.app',
    
    // Network
    dfx_network: import.meta.env.VITE_DFX_NETWORK || 'local',
    
    // Scraper service
    scraper_url: import.meta.env.VITE_SCRAPER_URL
};
