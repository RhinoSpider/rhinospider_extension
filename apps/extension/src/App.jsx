import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@rhinospider/web3-client';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Referrals from './pages/Referrals';
import Popup from './popup/Popup';
import './App.css';

// Get environment variables
const II_URL = import.meta.env.VITE_II_URL;
if (!II_URL) {
  throw new Error('VITE_II_URL environment variable is required');
}

// Simple auth guard component
function AuthGuard({ children }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-900 text-white">
        <div className="text-2xl mb-4">&gt;^&lt;</div>
        <h1 className="text-xl mb-4">Please Login First</h1>
        <p className="text-gray-400 text-center">
          Open the RhinoSpider extension popup and login with Internet Identity to access this page.
        </p>
      </div>
    );
  }

  return children;
}

// Auth configuration
const authConfig = {
  appName: 'RhinoSpider',
  iiUrl: II_URL,
  logo: chrome.runtime.getURL('icons/icon128.png'),
  identityProvider: II_URL,
};

export default function App() {
  // Check if we're in popup mode
  const isPopup = window.location.pathname === '/popup.html';

  if (isPopup) {
    return (
      <AuthProvider config={authConfig}>
        <Popup />
      </AuthProvider>
    );
  }

  // Pages mode (settings, analytics, etc)
  return (
    <AuthProvider config={authConfig}>
      <HashRouter>
        <Routes>
          <Route 
            path="/analytics" 
            element={
              <AuthGuard>
                <Analytics />
              </AuthGuard>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <AuthGuard>
                <Settings />
              </AuthGuard>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <AuthGuard>
                <Profile />
              </AuthGuard>
            } 
          />
          <Route 
            path="/referrals" 
            element={
              <AuthGuard>
                <Referrals />
              </AuthGuard>
            } 
          />
          <Route path="*" element={<Navigate to="/analytics" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
