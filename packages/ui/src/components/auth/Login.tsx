import React from 'react';
import { useAuth } from '@rhinospider/web3-client';
import { Logo } from '../common/Logo';

interface LoginProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess, onError }) => {
  const auth = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await auth.login();
      onSuccess?.();
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Login failed'));
    } finally {
      setLoading(false);
    }
  };

  if (auth.isAuthenticated) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#131217] via-[#360D68] to-[#B692F6] p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <Logo className="h-12 w-12 mb-4" />
          <h2 className="text-3xl font-bold text-white">Welcome back</h2>
          <p className="mt-2 text-sm text-gray-300">
            Please sign in to continue to RhinoSpider
          </p>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-white/20 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Signing in...' : 'Sign in with Internet Identity'}
        </button>
      </div>
    </div>
  );
};
