import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@rhinospider/web3-client';

function Settings() {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_SCRAPING_CONFIG' });
        if (response.success) {
          setConfig(response.data);
          console.log('Loaded config:', response.data);
        }
      } catch (error) {
        console.error('Failed to load config:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      window.close();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-4 w-[300px]">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => navigate(-1)}
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
        <h2 className="text-lg font-semibold">Settings</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Scraping Status</div>
              <div className="text-sm text-gray-500">Enable or disable scraping</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config?.enabled}
                onChange={async () => {
                  try {
                    const response = await chrome.runtime.sendMessage({
                      type: 'UPDATE_SCRAPING_CONFIG',
                      data: { enabled: !config?.enabled }
                    });
                    if (response.success) {
                      setConfig(prev => ({ ...prev, enabled: !prev.enabled }));
                    }
                  } catch (error) {
                    console.error('Failed to update config:', error);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <div className="font-medium mb-2">Daily Limits</div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500 mb-1">Requests per day</div>
                <div className="text-sm font-medium">{config?.maxRequestsPerDay || 0}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Bandwidth per day</div>
                <div className="text-sm font-medium">{(config?.maxBandwidthPerDay / 1024 / 1024).toFixed(2)} MB</div>
              </div>
            </div>
          </div>

          <div>
            <div className="font-medium mb-2">User Profile</div>
            <div className="text-sm text-gray-400">
              <p>Principal ID: {user?.principal?.toString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;