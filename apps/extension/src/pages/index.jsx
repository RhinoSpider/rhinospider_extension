import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '@rhinospider/web3-client';

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
        <div className="min-h-screen bg-gray-900 text-white p-8">
          <div className="bg-red-900/20 border border-red-500/20 p-4 rounded">
            <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
            <p>Please try reloading the page.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Initialize page component
const initializePage = (PageComponent) => {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Root element not found');
  }

  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <PageComponent />
        </AuthProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
};

export default initializePage;
