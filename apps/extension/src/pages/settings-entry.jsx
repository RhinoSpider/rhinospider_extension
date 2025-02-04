import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from '@rhinospider/web3-client';
import Settings from './Settings';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <div className="min-h-screen bg-gradient-to-br from-[#0F0E13] to-[#1B1B1F] flex items-center justify-center">
          <Settings />
        </div>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);
