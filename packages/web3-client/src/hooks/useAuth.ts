import { useState, useEffect, useCallback } from 'react';
import { Identity } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';

export interface AuthConfig {
  appName: string;
  logo?: string;
  // Internet Identity URL
  iiUrl?: string;
}

interface AuthHook {
  isAuthenticated: boolean;
  identity: Identity | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  error: Error | null;
}

export function useAuth(config: AuthConfig): AuthHook {
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Initialize Internet Identity client
        const client = await AuthClient.create({
          idleOptions: {
            // Idle timeout of 30 minutes
            idleTimeout: 30 * 60 * 1000,
            // Show dialog 1 minute before timeout
            disableDefaultIdleCallback: true,
          }
        });
        setAuthClient(client);

        // Check if user is already authenticated
        const currentIdentity = client.getIdentity();
        const principal = currentIdentity.getPrincipal();
        if (principal && !principal.isAnonymous()) {
          setIdentity(currentIdentity);
          setIsAuthenticated(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize auth'));
      }
    };

    init();
  }, []);

  const login = useCallback(async () => {
    if (!authClient) {
      throw new Error('Internet Identity client not initialized');
    }

    try {
      const iiUrl = config.iiUrl || 'https://identity.ic0.app';
      return new Promise<void>((resolve, reject) => {
        authClient.login({
          identityProvider: iiUrl,
          maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days
          derivationOrigin: window.location.origin,
          windowOpenerFeatures: 
            'toolbar=0,location=0,menubar=0,width=500,height=500,left=100,top=100',
          onSuccess: () => {
            const currentIdentity = authClient.getIdentity();
            setIdentity(currentIdentity);
            setIsAuthenticated(true);
            setError(null);
            resolve();
          },
          onError: (error: unknown) => {
            const loginError = error instanceof Error ? error : new Error('Login failed');
            setError(loginError);
            setIsAuthenticated(false);
            reject(loginError);
          }
        });
      });
    } catch (err) {
      const loginError = err instanceof Error ? err : new Error('Login failed');
      setError(loginError);
      setIsAuthenticated(false);
      throw loginError;
    }
  }, [authClient, config.iiUrl]);

  const logout = useCallback(async () => {
    if (!authClient) return;

    try {
      await authClient.logout();
      setIdentity(null);
      setIsAuthenticated(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Logout failed'));
    }
  }, [authClient]);

  return {
    isAuthenticated,
    identity,
    login,
    logout,
    error
  };
}
