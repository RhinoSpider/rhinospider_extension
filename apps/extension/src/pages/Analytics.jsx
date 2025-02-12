import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@rhinospider/web3-client';
import { StorageManager } from '../utils/storage';

const Analytics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPoints: 0,
    totalRequests: 0,
    totalBandwidth: 0,
    dailyStats: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const storage = new StorageManager();

    const fetchStats = async () => {
      try {
        setLoading(true);
        await storage.init();
        
        // Get last 7 days of stats
        const dailyStats = [];
        let totalPoints = 0;
        let totalRequests = 0;
        let totalBandwidth = 0;

        // Get current streak
        const streak = await storage.getPointsStreak();

        for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          try {
            const scrapingStats = await storage.getStats(dateStr);
            if (scrapingStats) {
              totalRequests += scrapingStats.requestCount || 0;
              totalBandwidth += ((scrapingStats.bytesDownloaded || 0) + (scrapingStats.bytesUploaded || 0)) / (1024 * 1024 * 1024);
            }

            const points = await storage.getDailyPoints(dateStr);
            if (points) {
              totalPoints += points.total || 0;
            }

            if (mounted) {
              dailyStats.push({
                date: dateStr,
                points: points?.total || 0,
                requests: scrapingStats?.requestCount || 0,
                bandwidth: ((scrapingStats?.bytesDownloaded || 0) + (scrapingStats?.bytesUploaded || 0)) / (1024 * 1024 * 1024)
              });
            }
          } catch (err) {
            console.warn(`Failed to fetch stats for ${dateStr}:`, err);
          }
        }

        if (mounted) {
          setStats({
            totalPoints,
            totalRequests,
            totalBandwidth,
            dailyStats: dailyStats.reverse()
          });
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        if (mounted) {
          setError('Failed to load analytics data. Please try again later.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchStats();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="popup-content" style={{ width: '360px', height: '600px', overflow: 'auto' }}>
        <div className="header">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Analytics</h1>
        </div>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="popup-content" style={{ width: '360px', height: '600px', overflow: 'auto' }}>
        <div className="header">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Analytics</h1>
        </div>
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-red-500">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="popup-content" style={{ width: '360px', height: '600px', overflow: 'auto' }}>
      <div className="header">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <div className="text-xs text-secondary mt-1">
          {user?.principal?.toString()}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <h3 className="stat-label">Points</h3>
          <p className="stat-value">{stats.totalPoints.toLocaleString()}</p>
        </div>
        <div className="stat">
          <h3 className="stat-label">Requests</h3>
          <p className="stat-value">{stats.totalRequests.toLocaleString()}</p>
        </div>
        <div className="stat">
          <h3 className="stat-label">Bandwidth</h3>
          <p className="stat-value">{stats.totalBandwidth.toFixed(2)} GB</p>
        </div>
      </div>

      <div className="stats-table">
        <h2 className="text-sm font-semibold mb-2">Daily Activity</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">Date</th>
                <th className="text-right">Points</th>
                <th className="text-right">Requests</th>
                <th className="text-right">Bandwidth</th>
              </tr>
            </thead>
            <tbody>
              {stats.dailyStats.map((day) => (
                <tr key={day.date}>
                  <td>{new Date(day.date).toLocaleDateString()}</td>
                  <td className="text-right">{day.points}</td>
                  <td className="text-right">{day.requests}</td>
                  <td className="text-right">{day.bandwidth.toFixed(2)} GB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
