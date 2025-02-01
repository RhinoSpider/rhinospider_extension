import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Power, ChevronDown, Wifi, Upload, Download, Key, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiConfig } from '../utils/apiConfig';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatSpeed = (bytesPerSec) => {
  return `${formatBytes(bytesPerSec)}/s`;
};

const Dashboard = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [uptime, setUptime] = useState('0 mins');
  const [points, setPoints] = useState(0);
  const [internetSpeed, setInternetSpeed] = useState('Checking...');
  const [bandwidthStats, setBandwidthStats] = useState({
    currentSession: {
      bytesDownloaded: 0,
      bytesUploaded: 0,
      startTime: null
    },
    total: {
      bytesDownloaded: 0,
      bytesUploaded: 0,
      sessions: 0
    }
  });
  const [currentSpeeds, setCurrentSpeeds] = useState({
    download: 0,
    upload: 0
  });

  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Listen for bandwidth updates
    const bandwidthListener = (message) => {
      if (message.type === 'BANDWIDTH_UPDATE') {
        setBandwidthStats(message.stats);
        
        // Calculate current speeds
        if (message.stats.currentSession.startTime) {
          const sessionDuration = (Date.now() - message.stats.currentSession.startTime) / 1000; // in seconds
          setCurrentSpeeds({
            download: message.stats.currentSession.bytesDownloaded / sessionDuration,
            upload: message.stats.currentSession.bytesUploaded / sessionDuration
          });
        }
      }
    };

    chrome.runtime.onMessage.addListener(bandwidthListener);
    
    // Get initial bandwidth stats
    chrome.runtime.sendMessage({ type: 'GET_BANDWIDTH_STATS' }, (response) => {
      if (response) setBandwidthStats(response);
    });

    return () => {
      chrome.runtime.onMessage.removeListener(bandwidthListener);
    };
  }, []);

  // Function to get network information
  const measureInternetSpeed = async () => {
    setInternetSpeed('Checking...');
    
    try {
      const connection = navigator.connection || 
                        navigator.mozConnection || 
                        navigator.webkitConnection;

      if (connection) {
        const { effectiveType, downlink, rtt } = connection;
        let speedInfo = `${downlink} Mbps`;
        setInternetSpeed(speedInfo);
      } else {
        setInternetSpeed('Unknown');
      }
    } catch (error) {
      setInternetSpeed('Error measuring speed');
    }
  };

  // Function to toggle scraping
  const toggleScraping = async () => {
    if (!hasConsent) {
      alert('Please accept the terms first to enable scraping.');
      return;
    }

    const newState = !isConnected;
    setIsConnected(newState);

    chrome.runtime.sendMessage({
      type: newState ? 'START_SCRAPING' : 'STOP_SCRAPING'
    });
  };

  useEffect(() => {
    measureInternetSpeed();
    
    chrome.storage.local.get(['hasConsent'], (result) => {
      setHasConsent(result.hasConsent || false);
    });
  }, []);

  const handleConsent = () => {
    setHasConsent(true);
    chrome.storage.local.set({ hasConsent: true });
  };

  const APIKeyConfig = () => {
    const [apiKey, setApiKey] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      loadAPIKey();
    }, []);

    async function loadAPIKey() {
      const key = await apiConfig.getAPIKey();
      setApiKey(key || '');
    }

    async function handleSave() {
      setLoading(true);
      setStatus('Validating...');

      const validation = await apiConfig.validateAPIKey(apiKey);
      
      if (validation.valid) {
        await apiConfig.setAPIKey(apiKey);
        setStatus('API key saved successfully');
        setIsEditing(false);
      } else {
        setStatus(`Error: ${validation.error}`);
      }
      
      setLoading(false);
    }

    async function handleClear() {
      await apiConfig.clearAPIKey();
      setApiKey('');
      setStatus('API key cleared');
    }

    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Key size={20} />
            OpenAI API Configuration
          </h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <Settings size={20} />
          </button>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your OpenAI API key"
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                <Save size={16} />
                Save Key
              </button>
              
              <button
                onClick={handleClear}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                <Trash2 size={16} />
                Clear Key
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            {apiKey ? 'API key is configured' : 'No API key configured'}
          </div>
        )}

        {status && (
          <div className={`mt-4 p-2 rounded ${
            status.includes('Error') 
              ? 'bg-red-100 text-red-700' 
              : 'bg-green-100 text-green-700'
          }`}>
            {status}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      {!hasConsent && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold mb-2">Welcome to RhinoSpider!</h2>
          <p className="mb-4">
            By enabling this extension, you agree to:
          </p>
          <ul className="list-disc pl-5 mb-4">
            <li>Share your unused bandwidth for web scraping</li>
            <li>Allow the extension to collect public web data</li>
            <li>Earn points for your contribution</li>
          </ul>
          <button
            onClick={handleConsent}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            I Agree
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <button onClick={() => navigate('/settings')}>
            <Settings className="w-6 h-6" />
          </button>
        </div>

        <div className="grid gap-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Power className={isConnected ? "text-green-500" : "text-gray-400"} />
              <div>
                <h3 className="font-semibold">Status</h3>
                <p className="text-sm text-gray-600">
                  {isConnected ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleScraping}
              disabled={!hasConsent}
              className={`px-4 py-2 rounded ${
                isConnected 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              } ${!hasConsent ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isConnected ? 'Stop' : 'Start'}
            </button>
          </div>

          {/* Bandwidth Usage Section */}
          <div className="grid gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Current Session</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Downloaded</p>
                    <p className="text-sm text-gray-600">
                      {formatBytes(bandwidthStats.currentSession.bytesDownloaded)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatSpeed(currentSpeeds.download)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Uploaded</p>
                    <p className="text-sm text-gray-600">
                      {formatBytes(bandwidthStats.currentSession.bytesUploaded)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatSpeed(currentSpeeds.upload)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Total Usage</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Total Downloaded</p>
                    <p className="text-sm text-gray-600">
                      {formatBytes(bandwidthStats.total.bytesDownloaded)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Total Uploaded</p>
                    <p className="text-sm text-gray-600">
                      {formatBytes(bandwidthStats.total.bytesUploaded)}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Total Sessions: {bandwidthStats.total.sessions}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold">Points Earned</h3>
              <p className="text-sm text-gray-600">{points}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold">Network Speed</h3>
              <p className="text-sm text-gray-600">{internetSpeed}</p>
            </div>
          </div>

          <APIKeyConfig />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;