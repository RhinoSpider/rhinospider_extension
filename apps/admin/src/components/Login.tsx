import React from 'react';
import { useAuth } from '../hooks/useAuth';

interface LoginProps {
}

export const Login: React.FC<LoginProps> = () => {
  const { login, isLoading, error } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#131217] via-[#360D68] to-[#131217]">
      {/* Header */}
      <header className="py-6 px-8 flex items-center">
        <div className="flex items-center space-x-2">
          <span className="text-2xl text-white font-bold">{">"}</span>
          <span className="text-2xl text-white font-bold">{"^"}</span>
          <span className="text-2xl text-white font-bold">{"<"}</span>
          <span className="text-2xl text-white ml-2">RhinoSpider</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex justify-center items-center px-4" style={{ minHeight: 'calc(100vh - 120px)' }}>
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-[#B692F6] rounded-lg opacity-10"></div>
          <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-[#B692F6] rounded-lg opacity-10"></div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md z-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-3 text-[#121212]">Admin Login</h2>
            <p className="text-[#121212]/70">Access RhinoSpider's admin dashboard</p>
          </div>

          <div className="space-y-5">
            <button
              onClick={login}
              disabled={isLoading}
              className={`w-full bg-gradient-to-r from-[#360D68] to-[#B692F6] text-white py-3.5 rounded-lg transition-all font-medium text-sm ${
                isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </div>
              ) : (
                'Login with Internet Identity'
              )}
            </button>

            {error && (
              <div className="text-red-500 text-sm text-center mt-2">
                {error}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
