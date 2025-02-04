import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthClient } from '@rhinospider/web3-client';

function Auth() {
  useEffect(() => {
    const login = async () => {
      try {
        const authClient = AuthClient.getInstance();
        await authClient.login();
        window.close();
      } catch (error) {
        console.error('Login failed:', error);
      }
    };

    login();
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2>Connecting to Internet Identity...</h2>
        <p>Please wait while we redirect you.</p>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<Auth />);
