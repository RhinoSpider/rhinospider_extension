import React, { useEffect, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { checkIsAdmin } from './lib/admin';

export const App: React.FC = () => {
  const { isAuthenticated, isInitialized, identity, logout } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  useEffect(() => {
    const verifyAdminAccess = async () => {
      if (isAuthenticated && identity) {
        setCheckingAdmin(true);
        try {
          const adminStatus = await checkIsAdmin();
          setIsAdmin(adminStatus);
          
          if (!adminStatus) {
            // If not admin, don't logout immediately - show error
            console.warn('User is not authorized as admin:', identity?.getPrincipal().toString());
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        } finally {
          setCheckingAdmin(false);
        }
      }
    };

    verifyAdminAccess();
  }, [isAuthenticated, identity, logout]);

  if (!isInitialized || checkingAdmin) {
    return (
      <div className="min-h-screen bg-[#131217] flex items-center justify-center">
        <div className="text-white">
          {checkingAdmin ? 'Verifying admin access...' : 'Loading...'}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-[#131217] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Access Denied</h1>
          <p className="text-white mb-4">You are not authorized to access the admin panel.</p>
          <p className="text-gray-400 mb-6">
            Your principal: {identity?.getPrincipal().toString() || 'Unknown'}
          </p>
          <button
            onClick={logout}
            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#131217] text-white">
      <div className="container mx-auto px-4 py-8">
        <Dashboard />
      </div>
    </div>
  );
};
