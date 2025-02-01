import React, { createContext, useContext, ReactNode } from 'react';
import { Identity } from '@dfinity/agent';
import { useNFID } from '../hooks/useNFID';

interface AuthContextType {
  isAuthenticated: boolean;
  identity: Identity | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  appName: string;
  logo?: string;
  host?: string;
}

export function AuthProvider({ children, appName, logo, host }: AuthProviderProps) {
  const auth = useNFID({ appName, logo, host });

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
