import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from '@rhinospider/web3-client';
import Settings from './Settings';
import '../popup/Popup.css';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <div className="w-full min-h-screen bg-gradient-to-br from-[#0F0E13] to-[#1B1B1F] text-white">
          <div className="max-w-[400px] mx-auto min-h-screen bg-gradient-to-br from-[#131217] to-[#1B1B1F] shadow-xl">
            <Settings />
          </div>
        </div>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);
