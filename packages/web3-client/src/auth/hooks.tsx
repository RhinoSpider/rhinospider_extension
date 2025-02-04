import React, { createContext, useContext } from 'react';
import { AuthClient } from './AuthClient';
import { AuthState } from './types';

export interface LoginOptions {
  identityProvider?: string;
  windowOpenerFeatures?: string;
}

export interface AuthConfig {
  appName: string;
  iiUrl: string;
  logo?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  identity: any;
  isInitialized: boolean;
  error: Error | null;
  login: (options?: LoginOptions) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  identity: null,
  isInitialized: false,
  error: null,
  login: async () => {
    throw new Error('AuthContext not initialized');
  },
  logout: async () => {
    throw new Error('AuthContext not initialized');
  }
});

interface AuthProviderProps {
  children: React.ReactNode;
  config: AuthConfig;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, config }) => {
  const auth = useAuth();

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: auth.isAuthenticated,
        identity: auth.identity,
        isInitialized: auth.isInitialized,
        error: auth.error,
        login: auth.login,
        logout: auth.logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

import { useCallback, useEffect, useState } from 'react';
import { AuthClient } from './AuthClient';
import type { AuthState } from './types';

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    identity: null,
    isInitialized: false,
    error: null,
  });

  // Load state from storage
  useEffect(() => {
    const loadState = async () => {
      try {
        const result = await chrome.storage.local.get(['authState']);
        if (result.authState) {
          setState(result.authState);
        } else {
          // If no stored state, check auth client
          const authClient = AuthClient.getInstance();
          const newState = await authClient.initialize();
          setState(newState);
          await chrome.storage.local.set({ authState: newState });
        }
      } catch (error) {
        console.error('Failed to load auth state:', error);
      }
    };

    loadState();
  }, []);

  const login = useCallback(async () => {
    try {
      const authClient = AuthClient.getInstance();
      const newState = await authClient.login();
      setState(newState);
      await chrome.storage.local.set({ authState: newState });
    } catch (error: any) {
      console.error('Login failed:', error);
      setState(prev => ({
        ...prev,
        error,
        isAuthenticated: false
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const authClient = AuthClient.getInstance();
      const newState = await authClient.logout();
      setState(newState);
      await chrome.storage.local.set({ authState: newState });
    } catch (error: any) {
      console.error('Logout failed:', error);
      setState(prev => ({
        ...prev,
        error,
      }));
      throw error;
    }
  }, []);

  return {
    ...state,
    login,
    logout,
  };
}
