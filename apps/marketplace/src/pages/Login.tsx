import { useAuth } from '../hooks/useAuth';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';

export default function Login() {
  const { login, isLoading, error } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50">
      <div className="max-w-md w-full">
        <div className="card">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <ShieldCheckIcon className="h-8 w-8 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome to RhinoSpider Marketplace
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Access enterprise-grade datasets with secure authentication
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={login}
              disabled={isLoading}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="h-5 w-5" />
                  <span>Sign in with Internet Identity v2</span>
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="text-center text-xs text-gray-500 mt-6">
              <p>By signing in, you agree to our Terms of Service</p>
              <p className="mt-1">Enterprise-grade security with ICP</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}