import { AuthClient } from '@dfinity/auth-client';
import { HttpAgent } from '@dfinity/agent';
import { DelegationIdentity } from '@dfinity/identity';

const II_URL = import.meta.env.VITE_II_URL;
const IC_HOST = import.meta.env.VITE_IC_HOST;

class BackgroundAuthManager {
  static instance = null;
  
  constructor() {
    this.authClient = null;
    this.agent = null;
  }

  static getInstance() {
    if (!BackgroundAuthManager.instance) {
      BackgroundAuthManager.instance = new BackgroundAuthManager();
    }
    return BackgroundAuthManager.instance;
  }

  async initialize() {
    if (!this.authClient) {
      this.authClient = await AuthClient.create();
    }

    const isAuthenticated = await this.isAuthenticated();
    
    if (isAuthenticated) {
      const identity = this.authClient.getIdentity();
      await this.createAgent(identity);
    }

    return {
      isAuthenticated,
      principal: isAuthenticated ? this.authClient.getIdentity().getPrincipal().toText() : null
    };
  }

  async createAgent(identity) {
    this.agent = new HttpAgent({
      identity,
      host: IC_HOST
    });

    if (import.meta.env.DEV) {
      await this.agent.fetchRootKey();
    }
  }

  getAgent() {
    return this.agent;
  }

  async refreshAgent() {
    const identity = this.authClient.getIdentity();
    await this.createAgent(identity);
    return this.agent;
  }

  async login(windowFeatures) {
    if (!this.authClient) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.authClient.login({
        identityProvider: II_URL,
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days in nanoseconds
        windowOpenerFeatures: windowFeatures,
        onSuccess: async () => {
          try {
            const identity = this.authClient.getIdentity();
            
            // Verify delegation chain
            if (identity instanceof DelegationIdentity) {
              const chain = identity.getDelegation();
              if (!chain || chain.delegations.length === 0) {
                reject(new Error('Invalid delegation chain'));
                return;
              }

              // Check if delegation is expired
              const now = BigInt(Date.now()) * BigInt(1000_000);
              if (chain.delegations.some(d => d.delegation.expiration < now)) {
                await this.authClient.logout();
                reject(new Error('Delegation chain has expired'));
                return;
              }
            }

            await this.createAgent(identity);
            const principal = identity.getPrincipal().toText();
            
            // Store only serializable auth state
            const authState = {
              isAuthenticated: true,
              principal,
              isInitialized: true,
              error: null,
              timestamp: Date.now()
            };

            try {
              await chrome.storage.local.set({ authState: JSON.stringify(authState) });
            } catch (storageError) {
              console.error('Failed to store auth state:', storageError);
            }

            resolve(authState);
          } catch (error) {
            reject(error);
          }
        },
        onError: reject
      });
    });
  }

  async logout() {
    if (this.authClient) {
      await this.authClient.logout();
      this.agent = null;
      await chrome.storage.local.remove('authState');
      return true;
    }
    return false;
  }

  async isAuthenticated() {
    return this.authClient ? await this.authClient.isAuthenticated() : false;
  }

  getIdentity() {
    return this.authClient ? this.authClient.getIdentity() : null;
  }

  async getAuthState() {
    try {
      const isAuthenticated = await this.isAuthenticated();
      if (!isAuthenticated) {
        return { isAuthenticated: false };
      }

      const identity = this.getIdentity();
      const principal = identity.getPrincipal().toText();

      return {
        isAuthenticated: true,
        principal
      };
    } catch (error) {
      console.error('Error getting auth state:', error);
      return { isAuthenticated: false, error: error.message };
    }
  }
}

export { BackgroundAuthManager };
