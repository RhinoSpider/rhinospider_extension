import React, { createContext, useContext, useState } from 'react';
import { AuthProvider as Web3AuthProvider } from '@rhinospider/web3-client';

const AuthContext = createContext(null);

// Re-export the AuthProvider with any extension-specific configuration
export const AuthProvider = ({ children }) => (
  <Web3AuthProvider>
    {children}
  </Web3AuthProvider>
);

// Re-export hooks
export { useAuth } from '@rhinospider/web3-client';