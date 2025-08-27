import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from '@rhinospider/web3-client';
import Popup from './Popup';
import '../index.css';
import './Popup.css';

// Get environment variables
const II_URL = import.meta.env.VITE_II_URL || 'https://id.ai';
const IC_HOST = import.meta.env.VITE_IC_HOST || 'https://ic0.app';

const authConfig = {
  identityProvider: II_URL,
  host: IC_HOST,
  storage: {
    get: async (key) => {
      try {
        const result = await chrome.storage.local.get([key]);
        return result[key];
      } catch (error) {
        console.error('Failed to get from storage:', error);
        return null;
      }
    },
    set: async (key, value) => {
      try {
        await chrome.storage.local.set({ [key]: value });
      } catch (error) {
        console.error('Failed to set in storage:', error);
      }
    },
    remove: async (key) => {
      try {
        await chrome.storage.local.remove(key);
      } catch (error) {
        console.error('Failed to remove from storage:', error);
      }
    }
  }
};

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>Something went wrong.</h1>
          <button onClick={() => window.location.reload()}>
            Reload Extension
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <AuthProvider config={authConfig}>
          <Popup />
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
