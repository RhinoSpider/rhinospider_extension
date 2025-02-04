import React from 'react';
import { AuthClient } from '@rhinospider/web3-client';

export function LoginButton() {
  const handleLogin = async () => {
    try {
      // Open auth page in a new tab
      const authURL = chrome.runtime.getURL('build/auth.html');
      window.open(authURL, '_blank', 'width=500,height=600,left=100,top=100');
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <button 
      onClick={handleLogin}
      style={{
        backgroundColor: '#4CAF50',
        border: 'none',
        color: 'white',
        padding: '15px 32px',
        textAlign: 'center',
        textDecoration: 'none',
        display: 'inline-block',
        fontSize: '16px',
        margin: '4px 2px',
        cursor: 'pointer',
        borderRadius: '4px'
      }}
    >
      Login with Internet Identity
    </button>
  );
}
