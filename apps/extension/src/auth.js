import { AuthClient } from '@rhinospider/web3-client';

export class AuthManager {
  constructor() {
    this.authClient = null;
    this.isAuthenticated = false;
    this.principal = null;
  }

  async initAuthClient() {
    if (!this.authClient) {
      console.log('Creating new auth client...');
      this.authClient = AuthClient.getInstance();
      console.log('Auth client created');
    }
    return this.authClient;
  }

  async initialize() {
    try {
      const client = await this.initAuthClient();
      const state = await client.initialize();
      
      this.isAuthenticated = state.isAuthenticated;
      if (state.isAuthenticated && state.identity) {
        this.principal = state.identity.getPrincipal();
      }

      // Store serializable auth state
      await this.updateAuthState();
      
      return {
        isAuthenticated: this.isAuthenticated,
        principal: this.principal ? this.principal.toString() : null
      };
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      throw error;
    }
  }

  async login() {
    const client = await this.initAuthClient();
    const identityProviderUrl = 'https://identity.ic0.app';

    // Open auth page in a popup window
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    return new Promise((resolve, reject) => {
      client.login({
        identityProvider: identityProviderUrl,
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days in nanoseconds
        windowOpenerFeatures: `width=${width},height=${height},left=${left},top=${top}`,
        onSuccess: async () => {
          console.log('Login successful');
          this.isAuthenticated = true;
          const identity = client.getIdentity();
          this.principal = identity.getPrincipal();
          await this.updateAuthState();
          resolve();
        },
        onError: (error) => {
          console.error('Login failed:', error);
          reject(error);
        },
      });
    });
  }

  async logout() {
    if (!this.authClient) {
      console.warn('No auth client to logout from');
      return;
    }
    await this.authClient.logout();
    this.isAuthenticated = false;
    this.principal = null;
    await this.updateAuthState();
  }

  async updateAuthState() {
    try {
      // Store only serializable data
      const authState = {
        isAuthenticated: this.isAuthenticated,
        principal: this.principal ? this.principal.toString() : null
      };

      // Use chrome.storage.local which is more suitable for extension state
      await chrome.storage.local.set({ authState });
    } catch (error) {
      console.error('Failed to update auth state:', error);
      throw error;
    }
  }

  async getAuthState() {
    try {
      const result = await chrome.storage.local.get(['authState']);
      return result.authState || {
        isAuthenticated: false,
        principal: null
      };
    } catch (error) {
      console.error('Failed to get auth state:', error);
      throw error;
    }
  }

  getIdentity() {
    const client = AuthClient.getInstance();
    if (!client.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    return client.getIdentity();
  }
}
