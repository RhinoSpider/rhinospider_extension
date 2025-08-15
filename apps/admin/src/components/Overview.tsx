import React, { useState, useEffect } from 'react';
import { Actor, HttpAgent } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';

interface DashboardStats {
  activeExtensions: number;
  pagesScrapedToday: number;
  totalDataPoints: number;
  activeTopics: number;
  recentActivity: {
    timestamp: bigint;
    action: string;
    principal: string;
    details: string;
  }[];
  systemStatus: {
    consumerCanister: 'online' | 'offline';
    storageCanister: 'online' | 'offline';
    adminCanister: 'online' | 'offline';
    lastUpdate: bigint;
  };
}

export const Overview: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    activeExtensions: 0,
    pagesScrapedToday: 0,
    totalDataPoints: 0,
    activeTopics: 0,
    recentActivity: [],
    systemStatus: {
      consumerCanister: 'offline',
      storageCanister: 'offline',
      adminCanister: 'online',
      lastUpdate: BigInt(0),
    },
  });
  const [loading, setLoading] = useState(true);
  const [prevStats, setPrevStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const authClient = await AuthClient.create();
      const identity = authClient.getIdentity();
      
      const agent = new HttpAgent({
        identity,
        host: process.env.DFX_NETWORK === 'local' 
          ? 'http://localhost:4943' 
          : 'https://ic0.app',
      });

      if (process.env.DFX_NETWORK === 'local') {
        await agent.fetchRootKey();
      }

      // Consumer canister ID
      const consumerCanisterId = 't3pjp-kqaaa-aaaao-a4ooq-cai';
      
      // Admin canister ID  
      const adminCanisterId = 'wvset-niaaa-aaaao-a4osa-cai';
      
      // Storage canister ID
      const storageCanisterId = 'hhaip-uiaaa-aaaao-a4khq-cai';

      // Create actor for consumer canister
      const consumerIdlFactory = ({ IDL }: any) => {
        const RhinoScanStats = IDL.Record({
          totalNodes: IDL.Nat,
          activeNodes: IDL.Nat,
          totalDataIndexed: IDL.Nat,
          uniqueCountries: IDL.Nat,
        });

        const UserProfile = IDL.Record({
          principal: IDL.Principal,
          devices: IDL.Vec(IDL.Text),
          created: IDL.Int,
          lastLogin: IDL.Int,
          ipAddress: IDL.Opt(IDL.Text),
          country: IDL.Opt(IDL.Text),
          region: IDL.Opt(IDL.Text),
          city: IDL.Opt(IDL.Text),
          latitude: IDL.Opt(IDL.Float64),
          longitude: IDL.Opt(IDL.Float64),
          lastActive: IDL.Int,
          isActive: IDL.Bool,
          dataVolumeKB: IDL.Nat,
          referralCode: IDL.Text,
          referralCount: IDL.Nat,
          points: IDL.Nat,
          totalDataScraped: IDL.Nat,
          referredBy: IDL.Opt(IDL.Principal),
          preferences: IDL.Record({
            notificationsEnabled: IDL.Bool,
            theme: IDL.Text,
          }),
        });

        return IDL.Service({
          getRhinoScanStats: IDL.Func([], [RhinoScanStats], ['query']),
          getAllUsers: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, UserProfile))], ['query']),
        });
      };

      const consumerActor = Actor.createActor(consumerIdlFactory, {
        agent,
        canisterId: consumerCanisterId,
      });

      // Create actor for admin canister
      const adminIdlFactory = ({ IDL }: any) => {
        const Topic = IDL.Record({
          id: IDL.Text,
          name: IDL.Text,
          description: IDL.Text,
          status: IDL.Text, // "active" | "inactive"
          
          // Search Configuration
          searchQueries: IDL.Vec(IDL.Text),
          preferredDomains: IDL.Opt(IDL.Vec(IDL.Text)),
          excludeDomains: IDL.Opt(IDL.Vec(IDL.Text)),
          requiredKeywords: IDL.Vec(IDL.Text),
          excludeKeywords: IDL.Opt(IDL.Vec(IDL.Text)),
          
          // Extraction Configuration
          contentSelectors: IDL.Vec(IDL.Text),
          titleSelectors: IDL.Opt(IDL.Vec(IDL.Text)),
          excludeSelectors: IDL.Vec(IDL.Text),
          minContentLength: IDL.Nat,
          maxContentLength: IDL.Nat,
          
          // Operational Settings
          maxUrlsPerBatch: IDL.Nat,
          scrapingInterval: IDL.Nat,
          priority: IDL.Nat,
          
          // Geo settings
          geolocationFilter: IDL.Opt(IDL.Text),
          percentageNodes: IDL.Opt(IDL.Nat),
          randomizationMode: IDL.Opt(IDL.Text),
          
          // Tracking
          createdAt: IDL.Int,
          lastScraped: IDL.Int,
          totalUrlsScraped: IDL.Nat,
        });

        return IDL.Service({
          getAllTopics: IDL.Func([], [IDL.Vec(Topic)], ['query']),
        });
      };

      const adminActor = Actor.createActor(adminIdlFactory, {
        agent,
        canisterId: adminCanisterId,
      });

      // Create actor for storage canister to get scraped data count
      const storageIdlFactory = ({ IDL }: any) => {
        const ScrapedData = IDL.Record({
          id: IDL.Text,
          url: IDL.Text,
          topic: IDL.Text,
          content: IDL.Text,
          source: IDL.Text,
          timestamp: IDL.Int,
          client_id: IDL.Principal,
          status: IDL.Text,
          scraping_time: IDL.Int,
        });

        return IDL.Service({
          getAllData: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, ScrapedData))], ['query']),
          getDataCount: IDL.Func([], [IDL.Nat], ['query']),
          getDataPaginated: IDL.Func([IDL.Nat, IDL.Nat], [IDL.Record({
            data: IDL.Vec(IDL.Tuple(IDL.Text, ScrapedData)),
            totalCount: IDL.Nat
          })], ['query']),
        });
      };

      const storageActor = Actor.createActor(storageIdlFactory, {
        agent,
        canisterId: storageCanisterId,
      });

      // Fetch data from canisters
      const [rhinoScanStats, allUsers, topics] = await Promise.all([
        consumerActor.getRhinoScanStats().catch(() => ({
          totalNodes: BigInt(0),
          activeNodes: BigInt(0),
          totalDataIndexed: BigInt(0),
          uniqueCountries: BigInt(0),
        })),
        consumerActor.getAllUsers().catch(() => []),
        adminActor.getAllTopics().catch(() => []),
      ]);

      // Try to get data count from storage canister
      let dataCount = BigInt(0);
      let todayScrapedCount = 0;
      let systemStatus = {
        consumerCanister: 'online' as 'online' | 'offline',
        storageCanister: 'online' as 'online' | 'offline',
        adminCanister: 'online' as 'online' | 'offline',
      };
      
      try {
        // Get total count efficiently
        dataCount = await storageActor.getDataCount();
        
        // Get only recent data (last 100 items) to calculate today's count
        const recentData = await storageActor.getDataPaginated(0, 100);
        
        // Calculate today's scraped pages from recent data
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime() * 1000000; // Convert to nanoseconds
        
        todayScrapedCount = recentData.data.filter(([_, data]: any) => 
          Number(data.timestamp) >= todayTimestamp
        ).length;
        
        // If all 100 recent items are from today, we might have more
        if (todayScrapedCount === 100) {
          // Get more to count properly
          const moreData = await storageActor.getDataPaginated(100, 400);
          todayScrapedCount += moreData.data.filter(([_, data]: any) => 
            Number(data.timestamp) >= todayTimestamp
          ).length;
        }
      } catch (e) {
        // Storage canister method might not be implemented yet
        console.error('Could not fetch storage data:', e);
        dataCount = BigInt(0);
        todayScrapedCount = 0;
        
        // Set storage canister as offline if getDataCount fails
        systemStatus.storageCanister = 'offline';
      }

      // Calculate active extensions (users active in last 24 hours)
      const oneDayAgo = Date.now() * 1000000 - (24 * 60 * 60 * 1000000000); // 24 hours in nanoseconds
      const activeUsers = (allUsers as any[]).filter(([_, profile]) => 
        Number(profile.lastActive) > oneDayAgo
      );

      // Get active topics - filter by status field
      const activeTopics = (topics as any[]).filter(topic => {
        console.log('Topic:', topic.id, 'Status:', topic.status);
        return topic.status === 'active';
      });
      console.log('Topics received:', topics);
      console.log('Active topics found:', activeTopics.length);

      // Create recent activity from users
      const recentActivity = (allUsers as any[])
        .sort((a, b) => Number(b[1].lastActive) - Number(a[1].lastActive))
        .slice(0, 5)
        .map(([principal, profile]) => ({
          timestamp: profile.lastActive,
          action: profile.totalDataScraped > 0 ? 'Data Submitted' : 'User Login',
          principal: principal.toString().substring(0, 8) + '...',
          details: profile.country?.[0] || 'Unknown Location',
        }));

      // Save previous stats for comparison
      if (!prevStats) {
        setPrevStats(stats);
      }

      const newStats: DashboardStats = {
        activeExtensions: activeUsers.length,
        pagesScrapedToday: todayScrapedCount,
        totalDataPoints: Number(dataCount),
        activeTopics: activeTopics.length,
        recentActivity,
        systemStatus: {
          consumerCanister: systemStatus.consumerCanister,
          storageCanister: systemStatus.storageCanister,
          adminCanister: systemStatus.adminCanister,
          lastUpdate: BigInt(Date.now()),
        },
      };

      setStats(newStats);
      setPrevStats(newStats);
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  };

  const calculateChange = (current: number, previous: number): string => {
    if (!previous || previous === 0) return '+0%';
    const change = ((current - previous) / previous) * 100;
    return change >= 0 ? `+${change.toFixed(0)}%` : `${change.toFixed(0)}%`;
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  const formatTimestamp = (timestamp: bigint): string => {
    const date = new Date(Number(timestamp) / 1000000); // Convert from nanoseconds
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const statsData = [
    { 
      label: 'Active Extensions', 
      value: formatNumber(stats.activeExtensions),
      change: prevStats ? calculateChange(stats.activeExtensions, prevStats.activeExtensions) : '+0%',
      icon: '🔌'
    },
    { 
      label: 'Pages Scraped Today', 
      value: formatNumber(stats.pagesScrapedToday),
      change: prevStats ? calculateChange(stats.pagesScrapedToday, prevStats.pagesScrapedToday) : '+0%',
      icon: '📄'
    },
    { 
      label: 'Data Points Collected', 
      value: formatNumber(stats.totalDataPoints),
      change: prevStats ? calculateChange(stats.totalDataPoints, prevStats.totalDataPoints) : '+0%',
      icon: '📊'
    },
    { 
      label: 'Active Topics', 
      value: formatNumber(stats.activeTopics),
      change: prevStats ? calculateChange(stats.activeTopics, prevStats.activeTopics) : '0%',
      icon: '🎯'
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
        <div className="text-sm text-gray-400">
          Auto-refreshes every 30 seconds
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat) => (
          <div
            key={stat.label}
            className="bg-[#360D68] rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-[#B692F6] text-sm font-medium">
                {stat.label}
              </div>
              <div className="text-2xl">{stat.icon}</div>
            </div>
            <div className="mt-2 flex items-baseline">
              <div className="text-2xl font-semibold text-white">
                {stat.value}
              </div>
              <div className={`ml-2 text-sm font-medium ${
                stat.change.startsWith('+') && stat.change !== '+0%' ? 'text-green-400' : 
                stat.change.startsWith('-') ? 'text-red-400' : 'text-gray-400'
              }`}>
                {stat.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-[#360D68] rounded-lg p-6 shadow-lg">
          <h2 className="text-lg font-medium text-white mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {stats.recentActivity.length === 0 ? (
              <p className="text-gray-400 text-sm">No recent activity</p>
            ) : (
              stats.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 text-sm">
                  <div className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full mt-1.5"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{activity.action}</span>
                      <span className="text-gray-400 text-xs">{formatTimestamp(activity.timestamp)}</span>
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      {activity.principal} • {activity.details}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-[#360D68] rounded-lg p-6 shadow-lg">
          <h2 className="text-lg font-medium text-white mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Consumer Canister</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                stats.systemStatus.consumerCanister === 'online' 
                  ? 'bg-green-500 bg-opacity-20 text-green-400' 
                  : 'bg-red-500 bg-opacity-20 text-red-400'
              }`}>
                {stats.systemStatus.consumerCanister}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Storage Canister</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                stats.systemStatus.storageCanister === 'online' 
                  ? 'bg-green-500 bg-opacity-20 text-green-400' 
                  : 'bg-red-500 bg-opacity-20 text-red-400'
              }`}>
                {stats.systemStatus.storageCanister}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Admin Canister</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                stats.systemStatus.adminCanister === 'online' 
                  ? 'bg-green-500 bg-opacity-20 text-green-400' 
                  : 'bg-red-500 bg-opacity-20 text-red-400'
              }`}>
                {stats.systemStatus.adminCanister}
              </span>
            </div>
            <div className="border-t border-gray-700 pt-3 mt-3">
              <div className="text-xs text-gray-400">
                Last updated: {formatTimestamp(stats.systemStatus.lastUpdate)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
