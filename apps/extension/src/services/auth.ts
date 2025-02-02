import { AuthClient } from '@dfinity/auth-client';
import { Identity } from '@dfinity/identity';

export class AuthService {
  private static instance: AuthService;
  private authClient: AuthClient | null = null;
  private identity: Identity | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async initialize(): Promise<void> {
    this.authClient = await AuthClient.create();
    const isAuthenticated = await this.authClient.isAuthenticated();
    
    if (isAuthenticated) {
      this.identity = this.authClient.getIdentity();
    }
  }

  async login(): Promise<Identity | undefined> {
    if (!this.authClient) {
      throw new Error('AuthClient not initialized');
    }

    return new Promise((resolve) => {
      this.authClient?.login({
        identityProvider: process.env.II_URL || 'https://identity.ic0.app',
        onSuccess: () => {
          this.identity = this.authClient?.getIdentity();
          resolve(this.identity || undefined);
        },
        onError: (error) => {
          console.error('Login failed:', error);
          resolve(undefined);
        },
        // Maximum authorization expiration is 8 days
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000)
      });
    });
  }

  async logout(): Promise<void> {
    if (!this.authClient) {
      throw new Error('AuthClient not initialized');
    }

    await this.authClient.logout();
    this.identity = null;
  }

  getIdentity(): Identity | null {
    return this.identity;
  }

  isAuthenticated(): boolean {
    return !!this.identity;
  }

  getPrincipal() {
    return this.identity?.getPrincipal();
  }
}
