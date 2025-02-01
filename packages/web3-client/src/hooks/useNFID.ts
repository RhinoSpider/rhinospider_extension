import { useState, useEffect, useCallback } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import { Actor, Identity } from '@dfinity/agent';

interface NFIDConfig {
  appName: string;
  logo?: string;
  host?: string;
}

interface NFIDHook {
  isAuthenticated: boolean;
  identity: Identity | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  error: Error | null;
}

export function useNFID(config: NFIDConfig): NFIDHook {
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    AuthClient.create()
      .then(client => {
        setAuthClient(client);
        const currentIdentity = client.getIdentity();
        setIdentity(currentIdentity);
        setIsAuthenticated(!currentIdentity.getPrincipal().isAnonymous());
      })
      .catch(err => setError(err));
  }, []);

  const login = useCallback(async () => {
    if (!authClient) return;

    try {
      const success = await authClient.login({
        identityProvider: config.host || 'https://nfid.one',
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days
        derivationOrigin: window.location.origin,
        windowOpenerFeatures: 
          'toolbar=0,location=0,menubar=0,width=500,height=500,left=100,top=100',
        onSuccess: () => {
          const currentIdentity = authClient.getIdentity();
          setIdentity(currentIdentity);
          setIsAuthenticated(true);
          setError(null);
        },
      });

      if (!success) {
        throw new Error('Login failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error during login'));
      setIsAuthenticated(false);
    }
  }, [authClient, config.host]);

  const logout = useCallback(async () => {
    if (!authClient) return;

    try {
      await authClient.logout();
      setIdentity(null);
      setIsAuthenticated(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error during logout'));
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
