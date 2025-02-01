import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  Download, 
  Clock, 
  Activity,
  ArrowLeft
} from 'lucide-react';
import { useAuthContext } from '@rhinospider/web3-client';
import { theme } from '../styles/theme';

const Logo = () => (
  <div className="text-white text-2xl font-mono tracking-wider">
    {'>^<'}
  </div>
);

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

const StatCard = ({ icon: Icon, label, value, subValue }) => (
  <div className="bg-[#131217]/40 backdrop-blur-sm rounded-lg p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4 text-[#B692F6]" />
      <span className="text-white/60 text-sm">{label}</span>
    </div>
    <div className="text-white text-xl font-semibold">{value}</div>
    {subValue && (
      <div className="text-white/60 text-sm mt-1">{subValue}</div>
    )}
  </div>
);

const Analytics = () => {
  const navigate = useNavigate();
  const { identity } = useAuthContext();
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
  const [internetSpeed, setInternetSpeed] = useState('Checking...');
  const [uptime, setUptime] = useState('0 mins');

  const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

  useEffect(() => {
    if (!identity) {
      navigate('/login');
      return;
    }

    // Only set up message listeners in extension mode
    if (isExtension) {
      const bandwidthListener = (message) => {
        if (message.type === 'BANDWIDTH_UPDATE') {
          setBandwidthStats(message.stats);
          setCurrentSpeeds(message.currentSpeeds || { download: 0, upload: 0 });
        }
      };

      chrome.runtime.onMessage.addListener(bandwidthListener);
      return () => {
        chrome.runtime.onMessage.removeListener(bandwidthListener);
      };
    } else {
      // In development mode, simulate some data updates
      const interval = setInterval(() => {
        setBandwidthStats(prev => ({
          currentSession: {
            bytesDownloaded: prev.currentSession.bytesDownloaded + 1024 * 100,
            bytesUploaded: prev.currentSession.bytesUploaded + 1024 * 50,
            startTime: prev.currentSession.startTime || Date.now()
          },
          total: {
            bytesDownloaded: prev.total.bytesDownloaded + 1024 * 100,
            bytesUploaded: prev.total.bytesUploaded + 1024 * 50,
            sessions: 1
          }
        }));
        setCurrentSpeeds({
          download: 1024 * 1024 * 2, // 2 MB/s
          upload: 1024 * 1024 // 1 MB/s
        });
        setInternetSpeed('100 Mbps');
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [identity, navigate]);

  // Update uptime
  useEffect(() => {
    const startTime = bandwidthStats.currentSession.startTime;
    if (startTime) {
      const updateUptime = () => {
        const diff = Date.now() - startTime;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        if (hours > 0) {
          setUptime(`${hours}h ${minutes % 60}m`);
        } else {
          setUptime(`${minutes}m`);
        }
      };

      updateUptime();
      const interval = setInterval(updateUptime, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [bandwidthStats.currentSession.startTime]);

  return (
    <div 
      className="w-[400px] h-[600px] overflow-auto"
      style={{ background: theme.colors.background.gradient }}
    >
      {/* Header */}
      <div className="p-4 flex justify-between items-center sticky top-0 z-10 backdrop-blur-sm bg-[#131217]/40">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/')}
            className="p-1 hover:bg-white/10 rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <Logo />
          <span className="text-white text-lg">Analytics</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Current Session */}
        <div className="space-y-4">
          <h2 className="text-white text-lg">Current Session</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={Upload}
              label="Upload"
              value={formatBytes(bandwidthStats.currentSession.bytesUploaded)}
              subValue={formatSpeed(currentSpeeds.upload)}
            />
            <StatCard
              icon={Download}
              label="Download"
              value={formatBytes(bandwidthStats.currentSession.bytesDownloaded)}
              subValue={formatSpeed(currentSpeeds.download)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={Clock}
              label="Uptime"
              value={uptime}
            />
            <StatCard
              icon={Activity}
              label="Speed"
              value={internetSpeed}
            />
          </div>
        </div>

        {/* Total Stats */}
        <div className="space-y-4 mt-6">
          <h2 className="text-white text-lg">Total Statistics</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={Upload}
              label="Total Upload"
              value={formatBytes(bandwidthStats.total.bytesUploaded)}
            />
            <StatCard
              icon={Download}
              label="Total Download"
              value={formatBytes(bandwidthStats.total.bytesDownloaded)}
            />
          </div>
          <StatCard
            icon={Clock}
            label="Total Sessions"
            value={bandwidthStats.total.sessions}
          />
        </div>
      </div>
    </div>
  );
};

export default Analytics;
