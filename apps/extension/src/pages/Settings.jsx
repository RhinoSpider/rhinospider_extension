import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@rhinospider/web3-client';

function Settings() {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Get extension state
        const state = await chrome.storage.local.get(['enabled', 'isScrapingActive']);
        setIsEnabled(state.enabled === true);
        
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
    
    // Listen for state changes
    const handleStorageChange = (changes, areaName) => {
      if (areaName === 'local' && changes.enabled) {
        setIsEnabled(changes.enabled.newValue === true);
      }
    };
    
    chrome.storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);
  
  const handleToggle = async () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    
    // Update storage
    await chrome.storage.local.set({ 
      enabled: newState, 
      isScrapingActive: newState 
    });
    
    // Notify background script - use UPDATE_SCRAPING_CONFIG for consistency
    await chrome.runtime.sendMessage({
      type: 'UPDATE_SCRAPING_CONFIG',
      data: { enabled: newState }
    });
  };

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
        <h2 className="text-lg font-semibold">Settings</h2>

        <div className="space-y-4">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                <div className="font-medium text-white">Extension Status</div>
              </div>
              <button
                onClick={handleToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isEnabled ? 'bg-green-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="text-sm text-gray-400">
              {isEnabled ? (
                <span className="text-green-400">✓ Extension is active and scraping data</span>
              ) : (
                <span className="text-gray-400">Extension is inactive. Click the toggle to activate.</span>
              )}
            </div>
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