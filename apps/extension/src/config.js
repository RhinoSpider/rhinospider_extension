/**
 * Configuration - HTTPS Only for Chrome Web Store Compliance
 * 
 * This configuration file ensures all connections use HTTPS
 * for Chrome Web Store compliance. No HTTP fallbacks are included.
 */

const config = {
  // IC Proxy configuration - HTTPS only
  icProxy: {
    // IC Proxy URL - HTTPS only
    url: import.meta.env.VITE_PROXY_URL || 'https://ic-proxy.rhinospider.com',
    
    // API Key for the IC Proxy
    apiKey: import.meta.env.VITE_PROXY_API_KEY || 'rhinospider-api-key-2024'
  },
  
  // Search Proxy configuration - HTTPS only
  searchProxy: {
    // Search Proxy URL - HTTPS only
    url: import.meta.env.VITE_SEARCH_PROXY_URL || 'https://search-proxy.rhinospider.com',
    
    // API Key for the Search Proxy
    apiKey: import.meta.env.VITE_SEARCH_PROXY_API_KEY || 'rhinospider-api-key-2024'
  },
  
  // Direct Storage configuration - HTTPS only
  directStorage: {
    // Direct Storage URL - HTTPS only (using IC Proxy as storage endpoint)
    url: import.meta.env.VITE_DIRECT_STORAGE_URL || 'https://ic-proxy.rhinospider.com',
    
    // API Key for Direct Storage
    apiKey: import.meta.env.VITE_DIRECT_STORAGE_API_KEY || 'rhinospider-api-key-2024'
  },
  
  // Internet Computer network configuration
  network: {
    ic: {
      // IC network host - HTTPS only
      host: import.meta.env.VITE_IC_HOST || 'https://ic0.app',
      
      // Use production network
      isLocal: false
    }
  },
  
  // Canister IDs (production)
  canisters: {
    storage: 'hhaip-uiaaa-aaaao-a4khq-cai',
    consumer: 't3pjp-kqaaa-aaaao-a4ooq-cai',
    admin: 'wvset-niaaa-aaaao-a4osa-cai',
    adminFrontend: 'sxsvc-aqaaa-aaaaj-az4ta-cai',
    auth: 'rdmx6-jaaaa-aaaaa-aaadq-cai'
  }
};

export default config;