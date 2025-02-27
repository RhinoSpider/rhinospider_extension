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
    
    // Proxy server configuration
    proxy: {
        url: import.meta.env.VITE_PROXY_URL || 'http://143.244.133.154:3001',
        apiPassword: import.meta.env.VITE_API_PASSWORD || 'ffGpA2saNS47qr',
    },
    
    // Network
    dfx_network: import.meta.env.VITE_DFX_NETWORK || 'local',
    
    // Scraper service
    scraper_url: import.meta.env.VITE_SCRAPER_URL
};
