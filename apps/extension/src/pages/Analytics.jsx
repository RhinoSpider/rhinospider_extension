import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@rhinospider/web3-client';
import { StorageManager } from '../utils/storage';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Analytics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPoints: 0,
    totalRequests: 0,
    totalBandwidth: 0,
    dailyStats: [],
    realTimeStats: {
      bandwidthUsed: 0,
      requestsProcessed: 0,
      lastUpdate: null
    }
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
              totalBandwidth += ((scrapingStats.bytesDownloaded || 0) + (scrapingStats.bytesUploaded || 0)) / (1024 * 1024);
              
              dailyStats.unshift({
                date: dateStr,
                points: (await storage.getDailyPoints(dateStr))?.total || 0,
                bandwidth: ((scrapingStats.bytesDownloaded || 0) + (scrapingStats.bytesUploaded || 0)) / (1024 * 1024),
                requests: scrapingStats.requestCount || 0
              });
            }

            const points = await storage.getDailyPoints(dateStr);
            if (points) {
              totalPoints += points.total || 0;
            }
          } catch (error) {
            console.error(`Error fetching stats for ${dateStr}:`, error);
          }
        }

        if (mounted) {
          setStats({
            totalPoints,
            totalRequests,
            totalBandwidth,
            dailyStats,
            streak,
            realTimeStats: stats.realTimeStats
          });
        }
      } catch (error) {
        if (mounted) {
          setError(error.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchStats();

    // Set up real-time updates
    const updateInterval = setInterval(async () => {
      const today = new Date().toISOString().split('T')[0];
      const currentStats = await storage.getStats(today);
      if (currentStats && mounted) {
        setStats(prev => ({
          ...prev,
          realTimeStats: {
            bandwidthUsed: ((currentStats.bytesDownloaded || 0) + (currentStats.bytesUploaded || 0)) / (1024 * 1024),
            requestsProcessed: currentStats.requestCount || 0,
            lastUpdate: new Date()
          }
        }));
      }
    }, 5000); // Update every 5 seconds

    return () => {
      mounted = false;
      clearInterval(updateInterval);
    };
  }, []);

  const chartData = {
    labels: stats.dailyStats.map(stat => stat.date),
    datasets: [
      {
        label: 'Points',
        data: stats.dailyStats.map(stat => stat.points),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      },
      {
        label: 'Bandwidth (MB)',
        data: stats.dailyStats.map(stat => stat.bandwidth),
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1
      }
    ]
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <button onClick={() => navigate(-1)} className="mr-4">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Today's Bandwidth</h3>
          <p className="text-2xl">{stats.realTimeStats.bandwidthUsed.toFixed(2)} MB</p>
          <p className="text-sm text-gray-400">Last updated: {stats.realTimeStats.lastUpdate?.toLocaleTimeString()}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Today's Requests</h3>
          <p className="text-2xl">{stats.realTimeStats.requestsProcessed}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Current Streak</h3>
          <p className="text-2xl">{stats.streak} days</p>
          <p className="text-sm text-gray-400">+{(stats.streak * 0.1 * 100).toFixed(0)}% bonus</p>
        </div>
      </div>

      {/* Total Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Total Points</h3>
          <p className="text-2xl">{stats.totalPoints.toFixed(0)}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Total Bandwidth</h3>
          <p className="text-2xl">{stats.totalBandwidth.toFixed(2)} MB</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Total Requests</h3>
          <p className="text-2xl">{stats.totalRequests}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">7-Day Activity</h3>
        <Line data={chartData} options={{
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            },
            x: {
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            }
          }
        }} />
      </div>
    </div>
  );
};

export default Analytics;
