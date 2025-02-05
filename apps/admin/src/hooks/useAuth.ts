import { useCallback, useEffect, useState } from 'react';
import { AuthClient } from '@rhinospider/web3-client';
import type { AuthState } from '@rhinospider/web3-client/src/auth/types';

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    identity: null,
    isInitialized: false,
    error: null,
  });

  const checkAuthStatus = useCallback(async () => {
    try {
      const authClient = AuthClient.getInstance();
      const newState = await authClient.initialize();
      setState(newState);
    } catch (error) {
      console.error('Failed to check auth status:', error);
      setState(prev => ({ ...prev, error: error as Error }));
    }
  }, []);

  // Initialize auth state and set up window focus handler
  useEffect(() => {
    checkAuthStatus();

    // Check auth status when window regains focus
    const handleFocus = () => {
      checkAuthStatus();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkAuthStatus]);

  const login = useCallback(async () => {
    try {
      const authClient = AuthClient.getInstance();
      await authClient.login();
      // After login completes, check auth status
      await checkAuthStatus();
    } catch (error) {
      console.error('Failed to login:', error);
      setState(prev => ({ ...prev, error: error as Error }));
    }
  }, [checkAuthStatus]);

  const logout = useCallback(async () => {
    try {
      const authClient = AuthClient.getInstance();
      await authClient.logout();
      setState({
        isAuthenticated: false,
        identity: null,
        isInitialized: true,
        error: null,
      });
    } catch (error) {
      console.error('Failed to logout:', error);
      setState(prev => ({ ...prev, error: error as Error }));
    }
  }, []);

  return {
    isAuthenticated: state.isAuthenticated,
    identity: state.identity,
    isInitialized: state.isInitialized,
    error: state.error,
    login,
    logout,
  };
}
