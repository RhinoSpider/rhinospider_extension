// API configuration management

class APIConfig {
  constructor() {
    this.initialized = false;
    this.icHost = 'https://ic0.app';  // ICP mainnet
    this.adminCanisterId = process.env.VITE_ADMIN_CANISTER_ID || 'bkyz2-fmaaa-aaaaa-qaaaq-cai';
    this.storageCanisterId = process.env.VITE_STORAGE_CANISTER_ID || 'hhaip-uiaaa-aaaao-a4khq-cai';
  }

  async init() {
    if (this.initialized) return;
    
    try {
      const result = await chrome.storage.sync.get(['admin_canister_id', 'storage_canister_id']);
      this.adminCanisterId = result.admin_canister_id || this.adminCanisterId;
      this.storageCanisterId = result.storage_canister_id || this.storageCanisterId;
      this.initialized = true;
    } catch (error) {
      console.error('Error loading config:', error);
    }
  }

  get adminUrl() {
    return `${this.icHost}/api/${this.adminCanisterId}`;
  }

  get storageUrl() {
    return `${this.icHost}/api/${this.storageCanisterId}`;
  }
}

export const apiConfig = new APIConfig();
