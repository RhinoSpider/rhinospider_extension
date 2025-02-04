import React, { useEffect, useState } from 'react';
import { AuthClient } from '@rhinospider/web3-client';
import { LoginButton } from './components/LoginButton';
import { Dashboard } from './components/Dashboard';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const authClient = AuthClient.getInstance();
        const state = await authClient.initialize();
        setIsAuthenticated(state.isAuthenticated);
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();

    // Listen for login success
    const handleLoginSuccess = (message) => {
      if (message.type === 'LOGIN_SUCCESS') {
        setIsAuthenticated(true);
      }
    };

    chrome.runtime.onMessage.addListener(handleLoginSuccess);
    return () => chrome.runtime.onMessage.removeListener(handleLoginSuccess);
  }, []);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {isAuthenticated ? <Dashboard /> : <LoginButton />}
    </div>
  );
}
