import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { StorageManager } from '../utils/storage';

const Analytics = () => {
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

        for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          try {
            const scrapingStats = await storage.getStats(dateStr);
            const points = await storage.getDailyPoints(dateStr);

            if (scrapingStats) {
              totalRequests += scrapingStats.requestCount || 0;
              totalBandwidth += ((scrapingStats.bytesDownloaded || 0) + (scrapingStats.bytesUploaded || 0)) / (1024 * 1024 * 1024);
            }

            if (points) {
              totalPoints += points.total || 0;
            }

            if (mounted) {
              dailyStats.push({
                date: dateStr,
                points: points?.total || 0,
                pointsBreakdown: points?.breakdown || { requests: 0, bandwidth: 0, streak: 0 },
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
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-lg p-4">
          <h3 className="text-sm text-gray-400">Total Points</h3>
          <p className="text-2xl font-semibold mt-1">{stats.totalPoints.toLocaleString()}</p>
          {stats.dailyStats[0]?.points > 0 && (
            <p className="text-xs text-green-500 mt-1">
              +{stats.dailyStats[0].points} today
            </p>
          )}
        </div>
        <div className="bg-white/5 rounded-lg p-4">
          <h3 className="text-sm text-gray-400">Total Requests</h3>
          <p className="text-2xl font-semibold mt-1">{stats.totalRequests.toLocaleString()}</p>
          {stats.dailyStats[0]?.requests > 0 && (
            <p className="text-xs text-green-500 mt-1">
              +{stats.dailyStats[0].requests} today
            </p>
          )}
        </div>
        <div className="bg-white/5 rounded-lg p-4">
          <h3 className="text-sm text-gray-400">Total Bandwidth</h3>
          <p className="text-2xl font-semibold mt-1">{stats.totalBandwidth.toFixed(2)} GB</p>
          {stats.dailyStats[0]?.bandwidth > 0 && (
            <p className="text-xs text-green-500 mt-1">
              +{stats.dailyStats[0].bandwidth.toFixed(2)} GB today
            </p>
          )}
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Daily Activity</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-sm text-gray-400">
                <th className="text-left pb-2">Date</th>
                <th className="text-right pb-2">Points</th>
                <th className="text-right pb-2">Requests</th>
                <th className="text-right pb-2">Bandwidth</th>
              </tr>
            </thead>
            <tbody>
              {stats.dailyStats.map((day) => (
                <tr key={day.date} className="border-t border-white/10">
                  <td className="py-2">{new Date(day.date).toLocaleDateString()}</td>
                  <td className="text-right py-2">
                    <div className="flex flex-col items-end">
                      <span>{day.points}</span>
                      {day.pointsBreakdown && (
                        <span className="text-xs text-gray-400">
                          +{day.pointsBreakdown.streak} streak bonus
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-right py-2">{day.requests}</td>
                  <td className="text-right py-2">{day.bandwidth.toFixed(2)} GB</td>
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
