// config file - all HTTPS for chrome web store requirements
// no http fallbacks because chrome store doesn't allow it

const config = {
  icProxy: {
    url: import.meta.env.VITE_PROXY_URL || 'https://ic-proxy.rhinospider.com',
    apiKey: import.meta.env.VITE_PROXY_API_KEY || 'rhinospider-api-key-2024'
  },

  searchProxy: {
    url: import.meta.env.VITE_SEARCH_PROXY_URL || 'https://search-proxy.rhinospider.com',
    apiKey: import.meta.env.VITE_SEARCH_PROXY_API_KEY || 'rhinospider-api-key-2024'
  },

  // direct storage endpoint (just uses IC proxy)
  directStorage: {
    url: import.meta.env.VITE_DIRECT_STORAGE_URL || 'https://ic-proxy.rhinospider.com',
    apiKey: import.meta.env.VITE_DIRECT_STORAGE_API_KEY || 'rhinospider-api-key-2024'
  },

  network: {
    ic: {
      host: import.meta.env.VITE_IC_HOST || 'https://ic0.app',
      isLocal: false
    }
  },

  // production canister ids
  canisters: {
    storage: 'hhaip-uiaaa-aaaao-a4khq-cai',
    consumer: 't3pjp-kqaaa-aaaao-a4ooq-cai',
    admin: 'wvset-niaaa-aaaao-a4osa-cai',
    adminFrontend: 'sxsvc-aqaaa-aaaaj-az4ta-cai',
    auth: 'rdmx6-jaaaa-aaaaa-aaadq-cai'
  }
};

export default config;