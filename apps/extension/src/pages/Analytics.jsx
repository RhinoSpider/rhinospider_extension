import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@rhinospider/web3-client';

const Analytics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPoints: 0,
    totalRequests: 0,
    totalBandwidth: 0,
    dailyStats: [],
  });

  useEffect(() => {
    // TODO: Fetch analytics data
    setStats({
      totalPoints: 15420,
      totalRequests: 1205,
      totalBandwidth: 2.5, // GB
      dailyStats: [
        { date: '2025-02-04', points: 150, requests: 45, bandwidth: 0.3 },
        { date: '2025-02-03', points: 200, requests: 60, bandwidth: 0.4 },
        { date: '2025-02-02', points: 180, requests: 55, bandwidth: 0.35 },
        { date: '2025-02-01', points: 160, requests: 50, bandwidth: 0.32 },
      ],
    });
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => window.close()}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        </div>
        <div className="text-sm text-gray-400">
          Welcome back, {user?.principal?.toString()}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/5 rounded-xl p-6">
          <h3 className="text-gray-400 text-sm mb-2">Total Points Earned</h3>
          <div className="text-3xl font-bold">{stats.totalPoints.toLocaleString()}</div>
          <div className="text-green-400 text-sm mt-2">+150 points today</div>
        </div>
        <div className="bg-white/5 rounded-xl p-6">
          <h3 className="text-gray-400 text-sm mb-2">Total Requests</h3>
          <div className="text-3xl font-bold">{stats.totalRequests.toLocaleString()}</div>
          <div className="text-green-400 text-sm mt-2">+45 requests today</div>
        </div>
        <div className="bg-white/5 rounded-xl p-6">
          <h3 className="text-gray-400 text-sm mb-2">Total Bandwidth</h3>
          <div className="text-3xl font-bold">{stats.totalBandwidth.toFixed(1)} GB</div>
          <div className="text-green-400 text-sm mt-2">+0.3 GB today</div>
        </div>
      </div>

      {/* Daily Stats Table */}
      <div className="bg-white/5 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Daily Statistics</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm">
                <th className="pb-4">Date</th>
                <th className="pb-4">Points Earned</th>
                <th className="pb-4">Requests Made</th>
                <th className="pb-4">Bandwidth Used</th>
              </tr>
            </thead>
            <tbody>
              {stats.dailyStats.map((day) => (
                <tr key={day.date} className="border-t border-white/10">
                  <td className="py-4">{day.date}</td>
                  <td className="py-4">{day.points} points</td>
                  <td className="py-4">{day.requests} requests</td>
                  <td className="py-4">{day.bandwidth.toFixed(2)} GB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white/5 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Points Trend</h2>
          <div className="h-64 flex items-center justify-center text-gray-400">
            Chart coming soon...
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Request Distribution</h2>
          <div className="h-64 flex items-center justify-center text-gray-400">
            Chart coming soon...
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
