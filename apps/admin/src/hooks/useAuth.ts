import { useState, useCallback, useEffect } from 'react';
import { AuthClient } from '@rhinospider/web3-client';
import { Identity } from '@dfinity/agent';

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
    isLoading: false,
  });

  const login = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const authClient = AuthClient.getInstance();
      await authClient.login();
      const identity = authClient.getIdentity();
      setState({
        isAuthenticated: true,
        identity,
        isInitialized: true,
        error: null,
        isLoading: false,
      });
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
      const authClient = AuthClient.getInstance();
      await authClient.logout();
      setState({
        isAuthenticated: false,
        identity: null,
        isInitialized: true,
        error: null,
        isLoading: false,
      });
    } catch (error) {
      console.error('Logout error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to logout',
        isLoading: false,
      }));
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        const authClient = AuthClient.getInstance();
        const isAuthenticated = await authClient.isAuthenticated();
        
        if (isAuthenticated) {
          const identity = authClient.getIdentity();
          setState({
            isAuthenticated: true,
            identity,
            isInitialized: true,
            error: null,
            isLoading: false,
          });
        } else {
          setState({
            isAuthenticated: false,
            identity: null,
            isInitialized: true,
            error: null,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setState(prev => ({
          ...prev,
          isInitialized: true,
          error: error instanceof Error ? error.message : 'Failed to initialize',
          isLoading: false,
        }));
      }
    };

    init();
  }, []);

  return {
    ...state,
    login,
    logout,
  };
};
