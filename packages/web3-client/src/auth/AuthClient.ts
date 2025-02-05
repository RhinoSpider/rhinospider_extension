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
      console.log('Creating new auth client...');
      this.authClient = await IcAuthClient.create({
        idleOptions: {
          disableDefaultIdleCallback: true,
          disableIdle: true
        }
      });
      console.log('Auth client created successfully');
    }
    return this.authClient;
  }

  async initialize(): Promise<AuthState> {
    try {
      console.log('Initializing auth client...');
      const authClient = await this.ensureAuthClient();
      const isAuthenticated = await authClient.isAuthenticated();
      console.log('Is authenticated?', isAuthenticated);
      
      if (isAuthenticated) {
        const identity = authClient.getIdentity();
        console.log('Got identity:', identity.getPrincipal().toString());
        this.state = {
          isAuthenticated: true,
          identity,
          isInitialized: true,
          error: null
        };
      }

      return this.state;
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      this.state.error = error instanceof Error ? error : new Error('Failed to initialize auth');
      return this.state;
    }
  }

  async login(): Promise<void> {
    try {
      console.log('Starting login process...');
      const authClient = await this.ensureAuthClient();
      
      await new Promise<void>((resolve, reject) => {
        authClient.login({
          identityProvider: II_URL,
          maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days in nanoseconds
          onSuccess: async () => {
            try {
              console.log('Login successful, getting identity...');
              const identity = authClient.getIdentity();
              console.log('Got identity:', identity.getPrincipal().toString());
              
              this.state = {
                isAuthenticated: true,
                identity,
                isInitialized: true,
                error: null
              };

              // Force state update by reloading the page
              window.location.reload();
              resolve();
            } catch (error) {
              console.error('Error in onSuccess:', error);
              reject(error);
            }
          },
          onError: (error) => {
            console.error('Login error:', error);
            this.state.error = error instanceof Error ? error : new Error('Login failed');
            reject(this.state.error);
          }
        });
      });
    } catch (error) {
      console.error('Login process error:', error);
      this.state.error = error instanceof Error ? error : new Error('Failed to login');
      throw this.state.error;
    }
  }

  async logout(): Promise<void> {
    try {
      console.log('Starting logout process...');
      const authClient = await this.ensureAuthClient();
      await authClient.logout();
      console.log('Logged out from auth client');
      
      // Clear state
      this.state = {
        isAuthenticated: false,
        identity: null,
        isInitialized: true,
        error: null
      };

      // Force page reload to clear any cached state
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
      this.state.error = error instanceof Error ? error : new Error('Failed to logout');
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
