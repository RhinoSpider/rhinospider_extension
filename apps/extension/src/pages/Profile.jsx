import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@rhinospider/web3-client';

const Profile = () => {
  const navigate = useNavigate();
  const { principal, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        // Load profile data here
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      window.close();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="p-4 w-[300px]">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => navigate('/')}
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <button
          onClick={handleLogout}
          className="text-red-600 hover:text-red-700 transition-colors text-sm"
        >
          Logout
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Profile</h2>

        <div className="space-y-4">
          <div>
            <div className="text-sm text-gray-500">Principal ID</div>
            <div className="text-sm font-medium break-all">{principal}</div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Account Details</h3>
            <div className="bg-white/5 rounded-lg divide-y divide-white/5">
              <div className="p-4">
                <div className="text-sm text-gray-400">Account ID</div>
                <div className="mt-1 font-mono text-sm">
                  {principal}
                </div>
              </div>
              <div className="p-4">
                <div className="text-sm text-gray-400">Member Since</div>
                <div className="mt-1">
                  {new Date().toLocaleDateString()}
                </div>
              </div>
              <div className="p-4">
                <div className="text-sm text-gray-400">Total Points Earned</div>
                <div className="mt-1">9,130 points</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Security</h3>
            <div className="bg-white/5 rounded-lg p-4">
              <button className="w-full bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded transition-colors text-sm">
                Change Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
