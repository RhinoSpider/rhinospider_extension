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
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      setError(error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="w-80 min-h-96 bg-gradient-to-b from-gray-900 to-purple-900 p-6 text-white">
        <div className="flex justify-center items-center h-64">
          <div className="text-white">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-80 min-h-96 bg-gradient-to-b from-gray-900 to-purple-900 p-6 text-white">
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 min-h-96 bg-gradient-to-b from-gray-900 to-purple-900 p-6 text-white">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-xl font-mono text-white">{">^<"}</span>
            <span className="text-xl font-semibold">RhinoSpider</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-gray-400 mb-2">Account</h2>
          <div className="space-y-2">
            <div className="px-4 py-2 bg-gray-800/50 rounded-lg">
              <div className="text-sm text-gray-400">Username</div>
              <div>{user?.email?.split('@')[0] || 'Not available'}</div>
            </div>
            <div className="px-4 py-2 bg-gray-800/50 rounded-lg">
              <div className="text-sm text-gray-400">Email</div>
              <div>{user?.email || 'Not available'}</div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-gray-400 mb-2">Scraping Settings</h2>
          <div className="space-y-2">
            <div className="px-4 py-2 bg-gray-800/50 rounded-lg">
              <div className="text-sm text-gray-400">Status</div>
              <div>{config?.enabled ? 'Active' : 'Inactive'}</div>
            </div>
            <div className="px-4 py-2 bg-gray-800/50 rounded-lg">
              <div className="text-sm text-gray-400">Max Requests/Day</div>
              <div>{config?.maxRequestsPerDay || 'Not set'}</div>
            </div>
            <div className="px-4 py-2 bg-gray-800/50 rounded-lg">
              <div className="text-sm text-gray-400">Max Bandwidth/Day</div>
              <div>{config?.maxBandwidthPerDay ? `${(config.maxBandwidthPerDay / (1024 * 1024)).toFixed(2)} MB` : 'Not set'}</div>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors"
        >
          <span>Logout</span>
          <LogOut size={16} />
        </button>

        <a
          href="https://rhinospider.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-purple-500/20 hover:bg-purple-500/30 rounded-lg p-2 text-sm flex items-center justify-center gap-2 transition-colors"
        >
          Open Web Dashboard
          <ChevronDown size={16} />
        </a>
      </div>
    </div>
  );
};

export default Settings;