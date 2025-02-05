import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export const Navbar: React.FC = () => {
  const { logout, isLoading, error } = useAuth();
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <nav className="bg-[#360D68] shadow-lg relative">
      {showError && error && (
        <div className="absolute top-full left-0 right-0 bg-red-500 text-white px-4 py-2 text-sm text-center">
          {error}
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex items-center space-x-2">
              <span className="text-2xl text-white font-bold">{">"}</span>
              <span className="text-2xl text-white font-bold">{"^"}</span>
              <span className="text-2xl text-white font-bold">{"<"}</span>
              <span className="text-2xl text-white ml-2">RhinoSpider</span>
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={logout}
              disabled={isLoading}
              className={`flex items-center justify-center min-w-[100px] bg-[#B692F6] text-[#131217] px-4 py-2 rounded-lg transition-all ${
                isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4 text-[#131217]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Logging out...</span>
                </div>
              ) : (
                'Logout'
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
