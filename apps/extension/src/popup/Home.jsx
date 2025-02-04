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
          <span className={getBandwidthColor(bandwidthSpeed)}>
            {currentSpeed} ({bandwidthSpeed})
          </span>
        </div>
        <div className="text-sm text-gray-300 mt-1">
          Great job! Keep contributing to secure your next milestone reward.
        </div>
      </div>

      <div className="mt-auto space-y-3 pb-4">
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
