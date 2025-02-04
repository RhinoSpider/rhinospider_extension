import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from '@rhinospider/web3-client';
import Analytics from './Analytics';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <Analytics />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);
