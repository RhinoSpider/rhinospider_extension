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
    this.isBackground = !globalThis.window;
  }

  static getInstance() {
    if (!BackgroundAuthManager.instance) {
      BackgroundAuthManager.instance = new BackgroundAuthManager();
    }
    return BackgroundAuthManager.instance;
  }

  async initialize() {
    try {
      // In background script, try to restore auth state from storage
      if (this.isBackground) {
        const stored = await chrome.storage.local.get(['authState', 'delegationChain']);
        if (stored.authState && stored.delegationChain) {
          const authState = JSON.parse(stored.authState);
          const chain = JSON.parse(stored.delegationChain);
          
          if (authState.isAuthenticated && chain) {
            try {
              // Verify delegation chain expiration
              const now = BigInt(Date.now()) * BigInt(1000_000);
              if (chain.delegations.some(d => d.delegation.expiration < now)) {
                console.log('Delegation chain expired, clearing auth state');
                await chrome.storage.local.remove(['authState', 'delegationChain']);
                return { isAuthenticated: false };
              }

              // Create delegation identity
              const identity = DelegationIdentity.fromDelegation(chain.publicKey, chain);
              
              // Create agent with delegation identity
              this.agent = new HttpAgent({
                identity,
                host: IC_HOST
              });

              // Only fetch root key in development
              if (import.meta.env.DEV) {
                await this.agent.fetchRootKey();
              }
              
              // Notify about successful restoration
              chrome.runtime.sendMessage({
                type: 'AUTH_STATE_CHANGED',
                data: {
                  isAuthenticated: true,
                  principal: authState.principal,
                  isInitialized: true,
                  error: null
                }
              }).catch(() => {});
              
              return {
                isAuthenticated: true,
                principal: authState.principal
              };
            } catch (error) {
              console.error('Failed to restore delegation chain:', error);
              await chrome.storage.local.remove(['authState', 'delegationChain']);
            }
          }
        }
        return { isAuthenticated: false };
      }

      // In popup/content script, create auth client normally
      if (!this.authClient) {
        this.authClient = await AuthClient.create({
          idleOptions: {
            disableDefaultIdleCallback: true, // Disable default idle behavior
            disableIdle: true // Completely disable idle timeout
          }
        });
      }

      const isAuthenticated = await this.isAuthenticated();
      
      if (isAuthenticated) {
        const identity = this.authClient.getIdentity();
        
        // Create agent with identity
        this.agent = new HttpAgent({
          identity,
          host: IC_HOST
        });

        // Only fetch root key in development
        if (import.meta.env.DEV) {
          await this.agent.fetchRootKey();
        }
      }

      return {
        isAuthenticated,
        principal: isAuthenticated ? this.authClient.getIdentity().getPrincipal().toText() : null
      };
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      return { isAuthenticated: false, error: error.message };
    }
  }

  async createAgent(identity) {
    this.agent = new HttpAgent({
      identity,
      host: IC_HOST
    });

    // Only fetch root key in development
    if (import.meta.env.DEV) {
      await this.agent.fetchRootKey();
    }
  }

  async isAuthenticated() {
    if (this.isBackground) {
      const stored = await chrome.storage.local.get(['authState']);
      return stored.authState ? JSON.parse(stored.authState).isAuthenticated : false;
    }
    return this.authClient ? this.authClient.isAuthenticated() : false;
  }

  getAgent() {
    return this.agent;
  }

  async logout() {
    if (this.authClient) {
      await this.authClient.logout();
    }
    this.agent = null;
    await chrome.storage.local.remove(['authState', 'delegationChain']);
  }
}

export { BackgroundAuthManager };
