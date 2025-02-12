import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@rhinospider/web3-client';
import { StorageManager, PointsCalculator } from '@rhinospider/scraping-core';

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
    const fetchStats = async () => {
      const storage = new StorageManager();
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
        
        const scrapingStats = await storage.getStats(dateStr);
        const points = await storage.getDailyPoints(dateStr) || {
          points: PointsCalculator.calculatePoints(scrapingStats, streak),
          date: dateStr,
          streak: streak - i,
          achievements: PointsCalculator.getAchievements(scrapingStats, streak - i)
        };

        totalPoints += points.points.total;
        totalRequests += scrapingStats.requestCount;
        totalBandwidth += (scrapingStats.bytesDownloaded + scrapingStats.bytesUploaded) / (1024 * 1024 * 1024);

        dailyStats.push({
          date: dateStr,
          points: points.points.total,
          requests: scrapingStats.requestCount,
          bandwidth: (scrapingStats.bytesDownloaded + scrapingStats.bytesUploaded) / (1024 * 1024 * 1024),
          achievements: points.achievements
        });

        if (!await storage.getDailyPoints(dateStr)) {
          await storage.updateDailyPoints(points);
        }
      }

      setStats({
        totalPoints,
        totalRequests,
        totalBandwidth,
        dailyStats: dailyStats.reverse()
      });
    };

    fetchStats();
  }, []);

  return (
    <div className="popup-content" style={{ width: '360px', height: '600px', overflow: 'auto' }}>
      {/* Header */}
      <div className="header">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Analytics</h1>
        </div>
        <div className="text-xs text-secondary mt-1">
          {user?.principal?.toString()}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat">
          <h3 className="stat-label">Points</h3>
          <div className="stat-value">{stats.totalPoints.toLocaleString()}</div>
          <div className="stat-change">+{stats.dailyStats[0]?.points || 0} today</div>
        </div>
        <div className="stat">
          <h3 className="stat-label">Requests</h3>
          <div className="stat-value">{stats.totalRequests.toLocaleString()}</div>
          <div className="stat-change">+{stats.dailyStats[0]?.requests || 0} today</div>
        </div>
        <div className="stat">
          <h3 className="stat-label">Bandwidth</h3>
          <div className="stat-value">{stats.totalBandwidth.toFixed(1)} GB</div>
          <div className="stat-change">+{stats.dailyStats[0]?.bandwidth.toFixed(2) || 0} GB today</div>
        </div>
      </div>

      {/* Daily Stats */}
      <div className="stats-table">
        <h2 className="text-sm font-semibold mb-2">Daily Activity</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-secondary">
                <th className="pb-2">Date</th>
                <th className="pb-2">Points</th>
                <th className="pb-2">Requests</th>
                <th className="pb-2">GB</th>
              </tr>
            </thead>
            <tbody>
              {stats.dailyStats.map((day) => (
                <tr key={day.date} className="border-t border-divider">
                  <td className="py-2 text-xs">{day.date.split('-').slice(1).join('/')}</td>
                  <td className="py-2">
                    <div className="flex items-center">
                      <span>{day.points}</span>
                      {day.achievements?.length > 0 && (
                        <span className="ml-1 text-xs text-yellow-400">🏆</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2">{day.requests}</td>
                  <td className="py-2">{day.bandwidth.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Achievements Section */}
      {stats.dailyStats[0]?.achievements?.length > 0 && (
        <div className="achievements mt-4">
          <h2 className="text-sm font-semibold mb-2">Recent Achievements</h2>
          <div className="flex flex-wrap gap-2">
            {stats.dailyStats[0].achievements.map((achievement) => (
              <div key={achievement} className="achievement-badge">
                🏆 {achievement}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
