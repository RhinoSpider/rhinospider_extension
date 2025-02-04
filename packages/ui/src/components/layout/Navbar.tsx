import React from 'react';
import { LogOut } from 'lucide-react';
import { Logo } from '../common/Logo';
import { useAuth } from '@rhinospider/web3-client';

interface NavbarProps {
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLogout }) => {
  const auth = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await auth.logout();
      onLogout?.();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!auth.isAuthenticated) {
    return null;
  }

  return (
    <nav className="bg-gradient-to-r from-[#131217] via-[#360D68] to-[#B692F6] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Logo className="h-8 w-8" />
            <span className="ml-2 text-xl font-semibold text-white">RhinoSpider</span>
          </div>

          <div className="flex items-center">
            {auth.user?.avatar && (
              <img
                src={auth.user.avatar}
                alt="User avatar"
                className="h-8 w-8 rounded-full mr-4"
              />
            )}
            <button
              onClick={handleLogout}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-white/20 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                'Logging out...'
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
