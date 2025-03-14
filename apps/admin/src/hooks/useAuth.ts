import { useState, useCallback, useEffect } from 'react';
import { Identity } from '@dfinity/agent';
import { initAuthClient, login as authLogin, logout as authLogout, isAuthenticated as checkAuth, getIdentity } from '../lib/auth';

interface AuthState {
  isAuthenticated: boolean;
  identity: Identity | null;
  isInitialized: boolean;
  error: string | null;
  isLoading: boolean;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    identity: null,
    isInitialized: false,
    error: null,
    isLoading: true,
  });

  const checkAuthState = useCallback(async () => {
    try {
      const authenticated = await checkAuth();
      if (authenticated) {
        const identity = await getIdentity();
        if (!identity) {
          throw new Error('Identity not found after authentication');
        }

        // Verify delegation chain
        const delegationChain = identity.getDelegation();
        if (!delegationChain) {
          throw new Error('No valid delegation chain found');
        }

        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          identity,
          isInitialized: true,
          error: null,
          isLoading: false,
        }));
        return true;
      } else {
        setState(prev => ({
          ...prev,
          isAuthenticated: false,
          identity: null,
          isInitialized: true,
          error: null,
          isLoading: false,
        }));
        return false;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        identity: null,
        error: error instanceof Error ? error.message : 'Failed to check auth state',
        isLoading: false,
        isInitialized: true,
      }));
      return false;
    }
  }, []);

  // Set up periodic auth check
  useEffect(() => {
    if (state.isAuthenticated) {
      const interval = setInterval(checkAuthState, 5 * 60 * 1000); // Check every 5 minutes
      return () => clearInterval(interval);
    }
  }, [state.isAuthenticated, checkAuthState]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await initAuthClient();
        await checkAuthState();
      } catch (error) {
        console.error('Auth initialization error:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to initialize auth',
          isLoading: false,
          isInitialized: true,
        }));
      }
    };

    initAuth();
  }, [checkAuthState]);

  const login = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await authLogin();
      // Note: We don't need to check auth state here because we're forcing a page reload
    } catch (error) {
      console.error('Login error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to login',
        isLoading: false,
      }));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await authLogout();
      // Note: We don't need to update state here because we're forcing a page reload
    } catch (error) {
      console.error('Logout error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to logout',
        isLoading: false,
      }));
    }
  }, []);

  return {
    ...state,
    login,
    logout,
  };
};
