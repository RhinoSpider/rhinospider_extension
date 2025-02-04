import React from 'react';
import { createRoot } from 'react-dom/client';
import Popup from './Popup';
import '../index.css';
import './Popup.css';

// Get environment variables
const II_URL = import.meta.env.VITE_II_URL || 'https://identity.ic0.app';
console.log('Identity Provider URL:', II_URL);

// Auth configuration
const authConfig = {
  appName: 'RhinoSpider',
  iiUrl: II_URL,
  debug: true,
};

console.log('Auth Config:', authConfig);

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
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h1>Something went wrong.</h1>
          <p>Please try reloading the extension.</p>
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
      <Popup />
    </ErrorBoundary>
  </React.StrictMode>
);
