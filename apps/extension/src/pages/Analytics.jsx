import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  Download, 
  Clock, 
  Activity,
  ArrowLeft,
  Settings
} from 'lucide-react';
import { useAuthContext } from '@rhinospider/web3-client';
import { theme } from '../styles/theme';
import { getTodayStats, getConfig, updateConfig } from '../services/scraping';

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
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [todayStats, currentConfig] = await Promise.all([
          getTodayStats(),
          getConfig()
        ]);
        setStats(todayStats);
        setConfig(currentConfig);
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    // Refresh every minute
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleScraping = async () => {
    if (config) {
      const newConfig = { ...config, enabled: !config.enabled };
      await updateConfig(newConfig);
      setConfig(newConfig);
      chrome.runtime.sendMessage({ type: 'UPDATE_CONFIG' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F0E13] to-[#1B1B1F] p-6">
        <div className="flex justify-center items-center h-full">
          <div className="text-white">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0E13] to-[#1B1B1F] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-white/60 hover:text-white flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <Logo />
        <button
          onClick={handleToggleScraping}
          className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 ${
            config?.enabled 
              ? 'bg-green-500/20 text-green-500' 
              : 'bg-red-500/20 text-red-500'
          }`}
        >
          <Settings className="w-4 h-4" />
          {config?.enabled ? 'Active' : 'Paused'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <StatCard
          icon={Download}
          label="Downloaded"
          value={formatBytes(stats?.bytesDownloaded || 0)}
          subValue={`${stats?.requestsMade || 0} requests made`}
        />
        <StatCard
          icon={Upload}
          label="Uploaded"
          value={formatBytes(stats?.bytesUploaded || 0)}
        />
      </div>

      {/* Topics */}
      <div className="bg-[#131217]/40 backdrop-blur-sm rounded-lg p-4 mb-6">
        <h3 className="text-white/60 text-sm mb-3">Active Topics</h3>
        <div className="flex flex-wrap gap-2">
          {config?.topics.map((topic) => (
            <span
              key={topic}
              className="px-3 py-1 rounded-full bg-[#B692F6]/20 text-[#B692F6] text-sm"
            >
              {topic}
            </span>
          ))}
        </div>
      </div>

      {/* Bandwidth Limit */}
      <div className="bg-[#131217]/40 backdrop-blur-sm rounded-lg p-4">
        <h3 className="text-white/60 text-sm mb-3">Bandwidth Usage</h3>
        <div className="w-full bg-white/10 rounded-full h-2 mb-2">
          <div
            className="bg-[#B692F6] h-full rounded-full"
            style={{
              width: `${(stats?.bytesDownloaded / config?.maxBandwidthPerDay) * 100}%`
            }}
          />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/60">
            {formatBytes(stats?.bytesDownloaded || 0)}
          </span>
          <span className="text-white/60">
            {formatBytes(config?.maxBandwidthPerDay || 0)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
