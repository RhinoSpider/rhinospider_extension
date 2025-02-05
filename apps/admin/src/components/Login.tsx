import React from 'react';

interface LoginProps {
  onSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
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
              onClick={onSuccess}
              className="w-full bg-gradient-to-r from-[#360D68] to-[#B692F6] text-white py-3.5 rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
            >
              Login with Internet Identity
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
