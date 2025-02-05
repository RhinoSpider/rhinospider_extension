import React, { useEffect } from 'react';
import { getAuthClient } from './lib/auth';
import { useAuth } from './hooks/useAuth';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';

export const App: React.FC = () => {
  const { isAuthenticated, isInitialized } = useAuth();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const authClient = getAuthClient();
        await authClient.initialize();
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      }
    };
    initAuth();
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#131217] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[#131217] text-white">
      <div className="container mx-auto px-4 py-8">
        <Dashboard />
      </div>
    </div>
  );
};
