import React from 'react';
import { useAuth } from './hooks/useAuth';
import { Login } from './components/Login';

export const App: React.FC = () => {
  const { isAuthenticated, login, logout } = useAuth();

  return (
    <div className="min-h-screen">
      {!isAuthenticated ? (
        <Login onSuccess={login} />
      ) : (
        <div className="min-h-screen bg-gray-100">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h1 className="text-2xl font-semibold text-gray-900">Admin Panel</h1>
                  <button
                    onClick={logout}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-black bg-[#FFD8B4] hover:bg-[#FFC090]"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
