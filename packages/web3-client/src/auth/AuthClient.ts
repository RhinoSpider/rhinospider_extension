import { AuthClient as IcAuthClient } from '@dfinity/auth-client';
import type { Identity } from '@dfinity/agent';
import { AuthState } from './types';

const II_URL = import.meta.env.VITE_II_URL;
const STORAGE_CANISTER_ID = import.meta.env.VITE_STORAGE_CANISTER_ID;
const USER_PROFILE_CANISTER_ID = import.meta.env.VITE_USER_PROFILE_CANISTER_ID;

if (!II_URL) {
  throw new Error('VITE_II_URL environment variable is not set');
}

if (!STORAGE_CANISTER_ID) {
  throw new Error('VITE_STORAGE_CANISTER_ID environment variable is not set');
}

if (!USER_PROFILE_CANISTER_ID) {
  throw new Error('VITE_USER_PROFILE_CANISTER_ID environment variable is not set');
}

export class AuthClient {
  private static instance: AuthClient;
  private authClient: IcAuthClient | null = null;
  private state: AuthState = {
    isAuthenticated: false,
    identity: null,
    isInitialized: true,
    error: null
  };

  private constructor() {}

  static getInstance(): AuthClient {
    if (!AuthClient.instance) {
      AuthClient.instance = new AuthClient();
    }
    return AuthClient.instance;
  }

  private async ensureAuthClient() {
    if (!this.authClient) {
      this.authClient = await IcAuthClient.create({
        idleOptions: {
          disableDefaultIdleCallback: true,
          disableIdle: true
        }
      });
      
      // Check if we're already authenticated
      const isAuthenticated = await this.authClient.isAuthenticated();
      if (isAuthenticated) {
        const identity = this.authClient.getIdentity();
        this.state = {
          isAuthenticated: true,
          identity: {
            getPrincipal: () => identity.getPrincipal().toString()
          },
          isInitialized: true,
          error: null
        };
        // Store auth state in chrome.storage for persistence
        await chrome.storage.local.set({ 
          authState: {
            isAuthenticated: true,
            isInitialized: true,
            error: null,
            principalId: identity.getPrincipal().toString()
          },
          canisterIds: {
            storage: STORAGE_CANISTER_ID,
            userProfile: USER_PROFILE_CANISTER_ID
          }
        });
      }
    }
    return this.authClient;
  }

  async initialize(): Promise<AuthState> {
    try {
      const authClient = await this.ensureAuthClient();
      
      // Check if we're already authenticated with Internet Identity
      const isAuthenticated = await authClient.isAuthenticated();
      
      if (isAuthenticated) {
        const identity = authClient.getIdentity();
        const serializedIdentity = {
          getPrincipal: () => identity.getPrincipal().toString()
        };
        
        this.state = {
          isAuthenticated: true,
          identity: serializedIdentity,
          isInitialized: true,
          error: null
        };

        // Store auth state in chrome.storage
        await chrome.storage.local.set({ 
          authState: {
            isAuthenticated: true,
            isInitialized: true,
            error: null,
            principalId: identity.getPrincipal().toString()
          },
          canisterIds: {
            storage: STORAGE_CANISTER_ID,
            userProfile: USER_PROFILE_CANISTER_ID
          }
        });

        return this.state;
      }

      // Not authenticated
      this.state = {
        isAuthenticated: false,
        identity: null,
        isInitialized: true,
        error: null
      };
      
      // Clear any stale state
      await chrome.storage.local.remove(['authState', 'canisterIds']);
      
      return this.state;
    } catch (error: any) {
      this.state = {
        isAuthenticated: false,
        identity: null,
        isInitialized: true,
        error: new Error(error?.message || 'Failed to initialize auth')
      };
      return this.state;
    }
  }

  async login(): Promise<void> {
    try {
      const authClient = await this.ensureAuthClient();
      
      return new Promise((resolve, reject) => {
        authClient.login({
          identityProvider: II_URL,
          onSuccess: async () => {
            try {
              const identity = authClient.getIdentity();
              // Convert identity to a serializable format
              const serializedIdentity = {
                getPrincipal: () => identity.getPrincipal().toString()
              };
              
              this.state = {
                isAuthenticated: true,
                identity: serializedIdentity,
                isInitialized: true,
                error: null
              };

              // Store auth state in chrome.storage
              await chrome.storage.local.set({ 
                authState: {
                  isAuthenticated: true,
                  isInitialized: true,
                  error: null,
                  principalId: identity.getPrincipal().toString()
                },
                canisterIds: {
                  storage: STORAGE_CANISTER_ID,
                  userProfile: USER_PROFILE_CANISTER_ID
                }
              });
              
              resolve();
            } catch (error) {
              reject(error);
            }
          },
          onError: (error) => {
            reject(error);
          },
          // Open in a new window instead of a popup for better compatibility with Chrome extension
          windowOpenerFeatures: `toolbar=0,location=0,menubar=0,width=500,height=600,left=${screen.width/2-250},top=${screen.height/2-300}`,
          maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days in nanoseconds
        });
      });
    } catch (error: any) {
      this.state = {
        ...this.state,
        error: new Error(error?.message || 'Login failed')
      };
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      const authClient = await this.ensureAuthClient();
      await authClient.logout();
      
      this.state = {
        isAuthenticated: false,
        identity: null,
        isInitialized: true,
        error: null
      };
      
      await chrome.storage.local.remove(['authState', 'canisterIds']);
    } catch (error: any) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  getState(): AuthState {
    return {
      ...this.state,
      // Ensure we return a clean state object without non-serializable values
      identity: this.state.identity ? {
        getPrincipal: () => this.state.identity.getPrincipal().toString()
      } : null
    };
  }

  getIdentity(): Identity | null {
    return this.state.identity ? {
      getPrincipal: () => this.state.identity.getPrincipal()
    } : null;
  }

  private async setAuthState(newState: Partial<AuthState>) {
    this.state = {
      ...this.state,
      ...newState
    };
    await chrome.storage.local.set({ authState: this.state });
  }

  async getUserData() {
    if (!this.state.isAuthenticated || !this.state.identity) {
      throw new Error('Not authenticated');
    }

    // Get user data from the user profile canister
    // This is a placeholder - implement actual canister call
    return {
      username: 'johndoe',
      email: 'johndoe@gmail.com',
      avatar: null
    };
  }
}
