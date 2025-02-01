import React, { createContext, useContext } from 'react';
import { Identity } from '@dfinity/agent';
import { useAuth, AuthConfig } from '../hooks/useAuth';

interface AuthContextType {
  isAuthenticated: boolean;
  identity: Identity | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps extends AuthConfig {
  children: React.ReactNode;
}

export const AuthProvider = ({ children, ...config }: AuthProviderProps) => {
  const auth = useAuth(config);

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};
