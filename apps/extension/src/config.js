// Configuration for the extension
export const config = {
    // Canister IDs
    canisters: {
        // Use the consumer canister ID from environment
        consumer: import.meta.env.VITE_CONSUMER_CANISTER_ID,
        // Storage canister ID - same as used in the admin app
        storage: import.meta.env.VITE_STORAGE_CANISTER_ID || 'nwy3f-jyaaa-aaaao-a4htq-cai',
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
        // Use the IC proxy URL for operations
        url: import.meta.env.VITE_PROXY_URL || 'https://ic-proxy.rhinospider.com',
        // No longer using API password
    },
    
    // Direct storage server configuration
    directStorage: {
        // Use a specific URL for direct storage API
        url: import.meta.env.VITE_DIRECT_STORAGE_URL || 'http://143.244.133.154:3002',
        // No longer using API password
    },
    
    // Network
    dfx_network: import.meta.env.VITE_DFX_NETWORK || 'local',
    
    // Scraper service
    scraper_url: import.meta.env.VITE_SCRAPER_URL
};
