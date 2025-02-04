import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings } from 'lucide-react';
import { useAuth } from '@rhinospider/web3-client';
import { getTodayStats, getScrapingConfig, updateScrapingConfig } from '../services/api';

export default function Analytics() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [todayStats, currentConfig] = await Promise.all([
          getTodayStats(),
          getScrapingConfig()
        ]);
        setStats(todayStats);
        setConfig(currentConfig);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const toggleScraping = async () => {
    try {
      const updatedConfig = {
        ...config,
        enabled: !config.enabled
      };
      await updateScrapingConfig(updatedConfig);
      setConfig(updatedConfig);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F0E13] to-[#1B1B1F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F0E13] to-[#1B1B1F] text-white p-8">
        <div className="bg-red-500/20 border border-red-500/20 p-4 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0E13] to-[#1B1B1F] text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => window.close()}
            className="text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleScraping}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                config?.enabled
                  ? 'bg-purple-500/20 hover:bg-purple-500/30'
                  : 'bg-gray-500/20 hover:bg-gray-500/30'
              }`}
            >
              {config?.enabled ? 'Active' : 'Inactive'}
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="text-white/60 hover:text-white"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#131217]/40 backdrop-blur-sm rounded-lg p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 text-white/60 mb-2">
                  <span className="transform rotate-180">↓</span>
                  Upload Speed
                </div>
                <div className="text-2xl font-semibold">
                  {stats?.bytesUploaded ? `${(stats.bytesUploaded / 1024).toFixed(2)} KB/s` : '0 B/s'}
                </div>
                <div className="text-sm text-white/60">Current</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-white/60 mb-2">
                  <span>↓</span>
                  Download Speed
                </div>
                <div className="text-2xl font-semibold">
                  {stats?.bytesDownloaded ? `${(stats.bytesDownloaded / 1024).toFixed(2)} KB/s` : '0 B/s'}
                </div>
                <div className="text-sm text-white/60">Current</div>
              </div>
            </div>
          </div>

          <div className="bg-[#131217]/40 backdrop-blur-sm rounded-lg p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 text-white/60 mb-2">
                  <span>⏱</span>
                  Active Time
                </div>
                <div className="text-2xl font-semibold">
                  {stats?.activeTime ? `${Math.round(stats.activeTime / 60)} min` : '0 min'}
                </div>
                <div className="text-sm text-white/60">Today</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-white/60 mb-2">
                  <span>📊</span>
                  Requests
                </div>
                <div className="text-2xl font-semibold">{stats?.requestCount || 0}</div>
                <div className="text-sm text-white/60">Today</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
