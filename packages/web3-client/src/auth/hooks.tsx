import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthClient } from './AuthClient';
import { AuthState } from './types';

const AuthContext = createContext<{
  state: AuthState;
  login: () => Promise<AuthState>;
  logout: () => Promise<void>;
}>({
  state: {
    isAuthenticated: false,
    identity: null,
    isInitialized: false,
    error: null
  },
  login: async () => {
    throw new Error('AuthContext not initialized');
  },
  logout: async () => {
    throw new Error('AuthContext not initialized');
  }
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    identity: null,
    isInitialized: false,
    error: null
  });

  useEffect(() => {
    const init = async () => {
      const authClient = AuthClient.getInstance();
      const state = await authClient.initialize();
      setState(state);
    };
    init();
  }, []);

  const login = async () => {
    const authClient = AuthClient.getInstance();
    const state = await authClient.login();
    setState(state);
    return state;
  };

  const logout = async () => {
    const authClient = AuthClient.getInstance();
    await authClient.logout();
    setState(authClient.getState());
  };

  return (
    <AuthContext.Provider value={{ state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
