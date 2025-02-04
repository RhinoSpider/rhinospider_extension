import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@rhinospider/web3-client';

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span className="text-sm">Back</span>
        </button>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Profile</h2>
          <div className="bg-white/5 rounded-lg p-4 space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-white">
                  {user?.name || 'Anonymous User'}
                </div>
                <div className="text-sm text-gray-400">
                  {user?.email || 'No email provided'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Account Details</h3>
          <div className="bg-white/5 rounded-lg divide-y divide-white/5">
            <div className="p-4">
              <div className="text-sm text-gray-400">Account ID</div>
              <div className="mt-1 font-mono text-sm">
                {user?.id || 'Not available'}
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
  );
};

export default Profile;
