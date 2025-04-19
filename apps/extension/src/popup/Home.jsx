import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = ({ points, uptime, isPluginActive, togglePlugin, bandwidthSpeed, currentSpeed }) => {
  const navigate = useNavigate();
  const [showCopyNotification, setShowCopyNotification] = useState(false);

  const getBandwidthColor = (speed) => {
    switch (speed) {
      case 'low':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'high':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const handleCopyReferral = () => {
    navigator.clipboard.writeText('your-referral-link');
    setShowCopyNotification(true);
    setTimeout(() => setShowCopyNotification(false), 2000);
  };

  const testSearchProxy = () => {
    console.log('Testing search proxy API...');
    chrome.runtime.sendMessage({ type: 'SEARCH_PROXY_TEST' }, (response) => {
      if (response && response.success) {
        console.log('Search proxy test successful:', response.result);
        alert('Search proxy test successful! Check console for details.');
      } else {
        console.error('Search proxy test failed:', response?.error || 'Unknown error');
        alert('Search proxy test failed. Check console for details.');
      }
    });
  };
  
  const checkSearchProxyHealth = () => {
    console.log('Checking search proxy health...');
    chrome.runtime.sendMessage({ type: 'SEARCH_PROXY_HEALTH' }, (response) => {
      if (response && response.success) {
        console.log('Search proxy health check:', response.isHealthy ? 'HEALTHY' : 'UNHEALTHY');
        alert(`Search proxy is ${response.isHealthy ? 'HEALTHY' : 'UNHEALTHY'}. Check console for details.`);
      } else {
        console.error('Search proxy health check failed:', response?.error || 'Unknown error');
        alert('Search proxy health check failed. Check console for details.');
      }
    });
  };
  
  const openDirectTest = () => {
    console.log('Opening direct test page...');
    chrome.runtime.sendMessage({ type: 'OPEN_DIRECT_TEST' });
  };
  
  const testUrlFetching = () => {
    console.log('Testing URL fetching process directly...');
    chrome.runtime.sendMessage({ type: 'TEST_URL_FETCHING' }, (response) => {
      if (response && response.success) {
        console.log(`Successfully fetched URL for topic ${response.topic}: ${response.url}`);
        alert(`Successfully fetched URL for topic ${response.topic}: ${response.url}`);
      } else {
        console.error('URL fetching test failed:', response?.error || 'Unknown error');
        alert('URL fetching test failed. Check console for details.');
      }
    });
  };

  return (
    <main className="flex-1 p-4 flex flex-col">
      <div className="text-center mb-6">
        <h2 className="text-lg text-gray-200 mb-2">Current Earnings</h2>
        <div className="text-4xl font-bold mb-4 text-white">{points.toLocaleString()} Points</div>
      </div>

      <button
        onClick={togglePlugin}
        className={`relative w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center transition-all ${
          isPluginActive 
            ? 'bg-white/20 hover:bg-white/30 shadow-lg' 
            : 'bg-white/10 hover:bg-white/20'
        }`}
      >
        <svg 
          width="32" 
          height="32" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          className={`transition-transform ${isPluginActive ? 'scale-110' : 'scale-100'}`}
        >
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
          <line x1="12" y1="2" x2="12" y2="12" />
        </svg>
        {isPluginActive && (
          <div className="absolute inset-0 rounded-full animate-pulse bg-green-400/20"></div>
        )}
      </button>

      <div className="text-center mb-6">
        <div className={`text-sm font-medium ${isPluginActive ? 'text-green-400' : 'text-red-400'}`}>
          {isPluginActive ? 'Your plugin is active. No action required.' : 'Plugin is disconnected. Click to connect!'}
        </div>
        <div className="text-sm text-gray-200 mt-2">
          <span className="font-medium">Uptime:</span> {uptime}
        </div>
        <div className="text-sm text-gray-200 mt-2">
          <span className="font-medium">Current Speed:</span>{' '}
          <span className={`font-semibold ${getBandwidthColor(bandwidthSpeed)}`}>
            {currentSpeed}
          </span>
        </div>
        <div className="text-sm text-gray-300 mt-1">
          Great job! Keep contributing to secure your next milestone reward.
        </div>
      </div>

      <div className="mt-auto space-y-3 pb-4">
        {/* Developer Tools Section */}
        <div className="mb-4 border-t border-gray-700 pt-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Developer Tools</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={testSearchProxy}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm transition-all active:scale-[0.98]"
            >
              Test Search Proxy
            </button>
            <button
              onClick={checkSearchProxyHealth}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-sm transition-all active:scale-[0.98]"
            >
              Check Proxy Health
            </button>
            <button
              onClick={openDirectTest}
              className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded-lg text-sm transition-all active:scale-[0.98]"
            >
              Open Advanced Test Page
            </button>
            <button
              onClick={testUrlFetching}
              className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-3 rounded-lg text-sm transition-all active:scale-[0.98]"
            >
              Test URL Fetching
            </button>
          </div>
        </div>

        <button
          onClick={handleCopyReferral}
          className="relative w-full bg-white/20 hover:bg-white/30 text-white py-3 rounded-lg transition-all active:scale-[0.98]"
        >
          {showCopyNotification ? (
            <span className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Copied!
            </span>
          ) : (
            'Copy Your Referral Link'
          )}
        </button>
      </div>
    </main>
  );
};

export default Home;
