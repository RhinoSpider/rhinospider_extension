import React from 'react';
import { useAuth } from '@rhinospider/web3-client';
import { Logo } from '../common/Logo';

interface LoginProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess, onError }) => {
  const auth = useAuth({ appName: 'RhinoSpider' });
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Logo className="mx-auto h-12 w-auto" />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {loading ? 'Signing in...' : 'Sign in with Internet Identity'}
          </button>
        </div>
      </div>
    </div>
  );
};
