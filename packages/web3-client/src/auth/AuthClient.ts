import { AuthClient as IcAuthClient } from '@dfinity/auth-client';
import type { Identity } from '@dfinity/agent';
import { AuthConfig, AuthState } from './types';

const II_URL = 'https://identity.ic0.app';

export class AuthClient {
  private static instance: AuthClient;
  private authClient: IcAuthClient | null = null;
  private state: AuthState = {
    isAuthenticated: false,
    identity: null,
    isInitialized: false,
    error: null
  };

  private constructor() {}

  static getInstance(): AuthClient {
    if (!AuthClient.instance) {
      AuthClient.instance = new AuthClient();
    }
    return AuthClient.instance;
  }

  async initialize(): Promise<AuthState> {
    try {
      this.authClient = await IcAuthClient.create();
      const isAuthenticated = await this.authClient.isAuthenticated();
      
      if (isAuthenticated) {
        this.state = {
          isAuthenticated: true,
          identity: this.authClient.getIdentity(),
          isInitialized: true,
          error: null
        };
      } else {
        this.state = {
          isAuthenticated: false,
          identity: null,
          isInitialized: true,
          error: null
        };
      }
    } catch (error) {
      this.state = {
        isAuthenticated: false,
        identity: null,
        isInitialized: true,
        error: error instanceof Error ? error : new Error('Failed to initialize auth client')
      };
    }

    return this.state;
  }

  async login(config?: AuthConfig): Promise<AuthState> {
    if (!this.authClient) {
      throw new Error('AuthClient not initialized');
    }

    return new Promise((resolve) => {
      this.authClient?.login({
        identityProvider: config?.identityProvider || II_URL,
        maxTimeToLive: config?.maxTimeToLive || BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000),
        windowOpenerFeatures: config?.windowOpenerFeatures,
        onSuccess: () => {
          if (!this.authClient) return;
          this.state = {
            isAuthenticated: true,
            identity: this.authClient.getIdentity(),
            isInitialized: true,
            error: null
          };
          config?.onSuccess?.();
          resolve(this.state);
        },
        onError: (error?: string) => {
          this.state = {
            isAuthenticated: false,
            identity: null,
            isInitialized: true,
            error: error ? new Error(error) : new Error('Login failed')
          };
          if (this.state.error && config?.onError) {
            config.onError(this.state.error);
          }
          resolve(this.state);
        }
      });
    });
  }

  async logout(): Promise<void> {
    if (!this.authClient) {
      throw new Error('AuthClient not initialized');
    }

    await this.authClient.logout();
    this.state = {
      isAuthenticated: false,
      identity: null,
      isInitialized: true,
      error: null
    };
  }

  getState(): AuthState {
    return { ...this.state };
  }

  getIdentity(): Identity | null {
    return this.state.identity;
  }
}
