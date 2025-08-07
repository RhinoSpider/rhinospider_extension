/**
 * Configuration
 * 
 * This file contains the configuration for the extension.
 */

const config = {
  // IC Proxy configuration
  icProxy: {
    // IC Proxy URL (with fallback to HTTP if HTTPS fails)
    url: import.meta.env.VITE_PROXY_URL || 'https://ic-proxy.rhinospider.com',
    
    // Alternative HTTP URL for fallback
    httpFallbackUrl: 'http://ic-proxy.rhinospider.com',
    
    // API Key for the IC Proxy
    apiKey: import.meta.env.VITE_PROXY_API_KEY || 'test-api-key'
  },
  
  // Search Proxy configuration
  searchProxy: {
    // Search Proxy URL (with fallback to HTTP if HTTPS fails)
    url: import.meta.env.VITE_SEARCH_PROXY_URL || 'https://search-proxy.rhinospider.com',
    
    // Alternative HTTP URL for fallback
    httpFallbackUrl: 'http://search-proxy.rhinospider.com',
    
    // API Key for the Search Proxy
    apiKey: import.meta.env.VITE_SEARCH_PROXY_API_KEY || 'test-api-key'
  },
  
  // Direct Storage configuration
  directStorage: {
    // Direct Storage URL (with fallback to HTTP if HTTPS fails)
    url: import.meta.env.VITE_DIRECT_STORAGE_URL || 'https://ic-proxy.rhinospider.com',
    
    // Alternative HTTP URL for fallback
    httpFallbackUrl: 'http://ic-proxy.rhinospider.com',
    
    // API Key for Direct Storage
    apiKey: import.meta.env.VITE_DIRECT_STORAGE_API_KEY || 'test-api-key'
  },
  
  // Referral Canister ID
  referralCanisterId: import.meta.env.VITE_REFERRAL_CANISTER_ID || 'woxyw-xqaaa-aaaao-a4oqq-cai'
};

export default config;
