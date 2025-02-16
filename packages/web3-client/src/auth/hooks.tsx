import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
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
  principal: string | null;
  isInitialized: boolean;
  error: string | null;
  login: (options?: LoginOptions) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  principal: null,
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
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    principal: null,
    isInitialized: false,
    error: null,
  });

  // Load state from storage
  useEffect(() => {
    const loadState = async () => {
      try {
        console.log('Starting to load auth state...');
        // Try to load from chrome storage first
        const result = await chrome.storage.local.get(['authState']);
        console.log('Raw storage result:', result);
        
        let loadedState: AuthState | null = null;

        if (result.authState) {
          try {
            console.log('Found stored auth state, attempting to parse:', result.authState);
            const parsed = JSON.parse(result.authState);
            console.log('Successfully parsed stored state:', parsed);
            
            // Validate the parsed state has the correct shape
            if (typeof parsed === 'object' && 
                'isAuthenticated' in parsed && 
                'principal' in parsed && 
                'isInitialized' in parsed) {
              loadedState = parsed as AuthState;
              console.log('Validated auth state shape:', loadedState);
            } else {
              console.log('Invalid auth state shape:', parsed);
            }
          } catch (parseError) {
            console.error('Failed to parse stored auth state:', parseError);
          }
        } else {
          console.log('No stored auth state found');
        }

        if (!loadedState) {
          console.log('Initializing new auth state from client...');
          // If no valid stored state, check auth client
          const authClient = AuthClient.getInstance();
          loadedState = await authClient.initialize();
          console.log('New auth state from client:', loadedState);
          
          // Store the new state
          try {
            const stateToStore = {
              isAuthenticated: loadedState.isAuthenticated,
              principal: loadedState.principal,
              isInitialized: loadedState.isInitialized,
              error: loadedState.error
            };
            console.log('Attempting to store state:', stateToStore);
            await chrome.storage.local.set({ 
              authState: JSON.stringify(stateToStore)
            });
            console.log('Successfully stored auth state');
          } catch (storageError) {
            console.error('Failed to store auth state:', storageError);
          }
        }

        setState(loadedState);
      } catch (error) {
        console.error('Failed to load auth state:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to load auth state',
          isInitialized: true
        }));
      }
    };

    loadState();
  }, []);

  const login = useCallback(async (options?: LoginOptions) => {
    try {
      console.log('Starting login process...');
      const authClient = AuthClient.getInstance();
      await authClient.login();
      const newState = authClient.getState();
      console.log('Got new auth state after login:', newState);

      // Store the new state
      try {
        const stateToStore = {
          isAuthenticated: newState.isAuthenticated,
          principal: newState.principal,
          isInitialized: newState.isInitialized,
          error: newState.error
        };
        console.log('Attempting to store login state:', stateToStore);
        await chrome.storage.local.set({ 
          authState: JSON.stringify(stateToStore)
        });
        console.log('Successfully stored login state');
      } catch (storageError) {
        console.error('Failed to store auth state:', storageError);
      }

      setState(newState);
    } catch (error) {
      console.error('Login failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Login failed',
        isAuthenticated: false
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('Starting logout process...');
      const authClient = AuthClient.getInstance();
      await authClient.logout();
      const newState = authClient.getState();
      console.log('Got new auth state after logout:', newState);
      setState(newState);

      // Clear stored state
      try {
        await chrome.storage.local.remove('authState');
        console.log('Successfully cleared auth state');
      } catch (storageError) {
        console.error('Failed to clear auth state:', storageError);
      }
    } catch (error) {
      console.error('Logout failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Logout failed',
      }));
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
