import { AnonymousIdentity } from '@dfinity/agent';

export class AuthManager {
  constructor() {
    this.identity = new AnonymousIdentity();
    this.isAuthenticated = false;
    this.principal = null;
  }

  async initialize() {
    try {
      // For now, we're using anonymous identity as per MEMORY
      this.identity = new AnonymousIdentity();
      this.isAuthenticated = true;
      this.principal = this.identity.getPrincipal();

      // Store serializable auth state
      await this.updateAuthState();
      
      return {
        isAuthenticated: this.isAuthenticated,
        principal: this.principal.toString()
      };
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      throw error;
    }
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
    return this.identity;
  }
}
