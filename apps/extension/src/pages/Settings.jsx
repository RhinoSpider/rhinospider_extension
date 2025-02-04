import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '@rhinospider/web3-client';
import { getScrapingConfig, updateScrapingConfig } from '../services/api';

const Settings = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const currentConfig = await getScrapingConfig();
        console.log('Loaded config:', currentConfig);
        setConfig(currentConfig);
      } catch (error) {
        console.error('Error loading config:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

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
        <button
          onClick={handleLogout}
          className="flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5 mr-2" />
          <span className="text-sm">Logout</span>
        </button>
      </div>

      <div className="space-y-6">
        <h1 className="text-xl font-bold text-white">Settings</h1>

        {isLoading ? (
          <div className="text-sm text-gray-400">Loading settings...</div>
        ) : error ? (
          <div className="text-sm text-red-500">{error}</div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4">
              <h2 className="text-base font-semibold text-white mb-2">User Profile</h2>
              <div className="text-sm text-gray-400">
                <p>Principal ID: {user?.principal?.toString()}</p>
              </div>
            </div>

            {config && (
              <div className="bg-white/5 rounded-lg p-4">
                <h2 className="text-base font-semibold text-white mb-2">Scraping Settings</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Status
                    </label>
                    <div className="text-sm text-white">{config.enabled ? 'Active' : 'Inactive'}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Max Requests/Day
                    </label>
                    <div className="text-sm text-white">{config.maxRequestsPerDay || 'Not set'}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Max Bandwidth/Day
                    </label>
                    <div className="text-sm text-white">
                      {config.maxBandwidthPerDay ? `${(config.maxBandwidthPerDay / (1024 * 1024)).toFixed(2)} MB` : 'Not set'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;