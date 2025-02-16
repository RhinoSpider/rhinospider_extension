import { AuthClient as IcAuthClient, Identity } from '@dfinity/auth-client';
import { II_URL } from '../constants';

export interface AuthState {
  isAuthenticated: boolean;
  principal: string | null;
  isInitialized: boolean;
  error: string | null;
}

export class AuthClient {
  private static instance: AuthClient;
  private authClient: IcAuthClient | null = null;
  private identity: Identity | null = null;
  private state: AuthState = {
    isAuthenticated: false,
    principal: null,
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

  private setState(newState: Partial<AuthState>) {
    console.log('Setting new auth state:', newState);
    this.state = {
      ...this.state,
      ...newState
    };
    console.log('Updated auth state:', this.state);
  }

  async initialize(): Promise<AuthState> {
    try {
      console.log('Initializing auth client...');
      const authClient = await this.ensureAuthClient();
      const isAuthenticated = await authClient.isAuthenticated();
      console.log('Is authenticated?', isAuthenticated);
      
      if (isAuthenticated) {
        this.identity = authClient.getIdentity();
        const principal = this.identity.getPrincipal().toText();
        console.log('Got identity:', principal);
        this.setState({
          isAuthenticated: true,
          principal,
          isInitialized: true,
          error: null
        });
      }

      return this.state;
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      this.setState({
        isAuthenticated: false,
        principal: null,
        isInitialized: true,
        error: error instanceof Error ? error.message : 'Failed to initialize auth'
      });
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
          windowOpenerFeatures: 'toolbar=0,location=0,menubar=0,width=500,height=500,left=' + (window.screen.width - 500) / 2 + ',top=' + (window.screen.height - 500) / 2,
          onSuccess: async () => {
            try {
              console.log('Login successful, getting identity...');
              this.identity = authClient.getIdentity();
              const principal = this.identity.getPrincipal().toText();
              console.log('Got identity:', principal);
              
              this.setState({
                isAuthenticated: true,
                principal,
                isInitialized: true,
                error: null
              });

              resolve();
            } catch (error) {
              console.error('Error in onSuccess:', error);
              reject(error);
            }
          },
          onError: (error) => {
            console.log('Login error type:', error);
            // Handle user interruption (closing the popup) differently
            if (error === 'UserInterrupt') {
              this.setState({
                error: null // Don't set an error for user interruption
              });
              resolve(); // Resolve without error
              return;
            }

            // For other errors, maintain error state
            const errorMessage = error === 'UserInterrupt' 
              ? 'Login cancelled'
              : error instanceof Error 
                ? error.message 
                : 'Login failed';
            
            this.setState({
              error: errorMessage
            });
            reject(new Error(errorMessage));
          }
        });
      });

      // Return immediately after successful login
      return;
    } catch (error) {
      // Don't throw for user interruption
      if (error instanceof Error && error.message === 'Login cancelled') {
        return;
      }
      console.error('Login process error:', error);
      this.setState({
        error: error instanceof Error ? error.message : 'Failed to login'
      });
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      console.log('Starting logout process...');
      const authClient = await this.ensureAuthClient();
      await authClient.logout();
      console.log('Logged out from auth client');
      
      // Clear state
      this.identity = null;
      this.setState({
        isAuthenticated: false,
        principal: null,
        isInitialized: true,
        error: null
      });

      // Force page reload to clear any cached state
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
      this.setState({
        error: error instanceof Error ? error.message : 'Failed to logout'
      });
      throw error;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const authClient = await this.ensureAuthClient();
    return authClient.isAuthenticated();
  }

  getIdentity(): Identity | null {
    return this.identity;
  }

  getState(): AuthState {
    return this.state;
  }
}
