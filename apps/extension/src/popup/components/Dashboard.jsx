import React from 'react';
import { AuthClient } from '@rhinospider/web3-client';

export function Dashboard() {
  const handleLogout = async () => {
    const authClient = AuthClient.getInstance();
    await authClient.logout();
    window.location.reload();
  };

  return (
    <div>
      <h2>Welcome to RhinoSpider!</h2>
      <button 
        onClick={handleLogout}
        style={{
          backgroundColor: '#f44336',
          border: 'none',
          color: 'white',
          padding: '10px 20px',
          textAlign: 'center',
          textDecoration: 'none',
          display: 'inline-block',
          fontSize: '14px',
          margin: '4px 2px',
          cursor: 'pointer',
          borderRadius: '4px'
        }}
      >
        Logout
      </button>
    </div>
  );
}
