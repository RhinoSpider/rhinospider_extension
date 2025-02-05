import { AuthClient as IcAuthClient, Identity } from '@dfinity/auth-client';
import { II_URL } from '../constants';

export interface AuthState {
  isAuthenticated: boolean;
  identity: any;
  isInitialized: boolean;
  error: Error | null;
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
    }
    return this.authClient;
  }

  async initialize(): Promise<AuthState> {
    try {
      const authClient = await this.ensureAuthClient();
      const isAuthenticated = await authClient.isAuthenticated();
      
      if (isAuthenticated) {
        const identity = authClient.getIdentity();
        this.state = {
          isAuthenticated: true,
          identity: {
            getPrincipal: () => identity.getPrincipal().toString()
          },
          isInitialized: true,
          error: null
        };
      }

      // Try to load state from chrome.storage if in extension environment
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const { authState } = await chrome.storage.local.get('authState');
        if (authState) {
          this.state = {
            ...this.state,
            ...authState
          };
        }
      }

      return this.state;
    } catch (error) {
      this.state.error = error instanceof Error ? error : new Error('Failed to initialize auth');
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

              // Store auth state in chrome.storage if in extension environment
              if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({ 
                  authState: {
                    isAuthenticated: true,
                    isInitialized: true,
                    error: null,
                    principalId: identity.getPrincipal().toString()
                  }
                });
              }

              resolve();
            } catch (error) {
              reject(error);
            }
          },
          onError: (error) => {
            this.state.error = error instanceof Error ? error : new Error('Login failed');
            reject(this.state.error);
          }
        });
      });
    } catch (error) {
      this.state.error = error instanceof Error ? error : new Error('Login failed');
      throw this.state.error;
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

      // Clear auth state from chrome.storage if in extension environment
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove('authState');
      }
    } catch (error) {
      this.state.error = error instanceof Error ? error : new Error('Logout failed');
      throw this.state.error;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const authClient = await this.ensureAuthClient();
    return authClient.isAuthenticated();
  }

  getIdentity(): Identity | null {
    return this.state.identity;
  }

  getState(): AuthState {
    return this.state;
  }
}
