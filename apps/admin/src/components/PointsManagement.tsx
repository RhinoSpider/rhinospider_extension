import React, { useState, useEffect } from 'react';
import { Actor, HttpAgent } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';

interface UserPointsData {
  principal: string;
  points: bigint;
  totalDataScraped: bigint;
  dataVolumeKB: bigint;
  referralCode: string;
  referralCount: bigint;
  referredBy: string | null;
  country: string | null;
  lastActive: bigint;
  isActive: boolean;
}

interface PointsStats {
  totalPointsDistributed: bigint;
  averagePointsPerUser: number;
  topContributors: [string, bigint][];
  totalReferrals: bigint;
  activeUsers: bigint;
}

export const PointsManagement: React.FC = () => {
  const [users, setUsers] = useState<UserPointsData[]>([]);
  const [stats, setStats] = useState<PointsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'points' | 'data' | 'referrals'>('points');
  const [awardingPoints, setAwardingPoints] = useState<string | null>(null);
  const [bonusAmount, setBonusAmount] = useState('');

  useEffect(() => {
    loadPointsData();
  }, []);

  const loadPointsData = async () => {
    try {
      setLoading(true);
      setError(null);

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

      const consumerCanisterId = 'tgyl5-yyaaa-aaaaj-az4wq-cai';
      
      // Create actor for consumer canister
      const idlFactory = ({ IDL }: any) => {
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
          getAllUsers: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, UserProfile))], ['query']),
          getTopContributors: IDL.Func([IDL.Nat], [IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat))], ['query']),
          awardPoints: IDL.Func([IDL.Principal, IDL.Nat], [IDL.Variant({ ok: IDL.Null, err: IDL.Text })], []),
        });
      };

      const consumerActor = Actor.createActor(idlFactory, {
        agent,
        canisterId: consumerCanisterId,
      });

      // Fetch all users and calculate stats
      try {
        const allUsers = await consumerActor.getAllUsers() as [Principal, any][];
        const topContributors = await consumerActor.getTopContributors(10) as [Principal, bigint][];
        
        // Process users
        const processedUsers: UserPointsData[] = allUsers.map(([principal, profile]) => ({
          principal: principal.toString(),
          points: profile.points,
          totalDataScraped: profile.totalDataScraped,
          dataVolumeKB: profile.dataVolumeKB,
          referralCode: profile.referralCode,
          referralCount: profile.referralCount,
          referredBy: profile.referredBy?.[0]?.toString() || null,
          country: profile.country?.[0] || null,
          lastActive: profile.lastActive,
          isActive: profile.isActive,
        }));

        // Calculate stats
        const totalPoints = processedUsers.reduce((sum, user) => sum + Number(user.points), 0);
        const totalReferrals = processedUsers.reduce((sum, user) => sum + Number(user.referralCount), 0);
        const activeUsers = processedUsers.filter(user => user.isActive).length;
        const avgPoints = processedUsers.length > 0 ? totalPoints / processedUsers.length : 0;

        setUsers(processedUsers);
        setStats({
          totalPointsDistributed: BigInt(totalPoints),
          averagePointsPerUser: avgPoints,
          topContributors: topContributors.map(([p, points]) => [p.toString(), points]),
          totalReferrals: BigInt(totalReferrals),
          activeUsers: BigInt(activeUsers),
        });
      } catch (err) {
        console.warn('getAllUsers not implemented, using mock data');
        // Use mock data for demonstration
        setUsers([]);
        setStats({
          totalPointsDistributed: BigInt(0),
          averagePointsPerUser: 0,
          topContributors: [],
          totalReferrals: BigInt(0),
          activeUsers: BigInt(0),
        });
      }
    } catch (err) {
      console.error('Error loading points data:', err);
      setError('Failed to load points data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAwardPoints = async (principal: string) => {
    if (!bonusAmount || Number(bonusAmount) <= 0) {
      alert('Please enter a valid points amount');
      return;
    }

    try {
      setAwardingPoints(principal);
      
      const authClient = await AuthClient.create();
      const identity = authClient.getIdentity();
      const agent = new HttpAgent({
        identity,
        host: process.env.DFX_NETWORK === 'local' 
          ? 'http://localhost:4943' 
          : 'https://ic0.app',
      });

      const adminCanisterId = 'wvset-niaaa-aaaao-a4osa-cai';
      
      // Call through admin canister to award points
      const idlFactory = ({ IDL }: any) => {
        return IDL.Service({
          awardUserPoints: IDL.Func([IDL.Principal, IDL.Nat], [IDL.Variant({ ok: IDL.Null, err: IDL.Text })], []),
        });
      };

      const adminActor = Actor.createActor(idlFactory, {
        agent,
        canisterId: adminCanisterId,
      });

      const result = await adminActor.awardUserPoints(
        Principal.fromText(principal),
        BigInt(bonusAmount)
      );

      if ('err' in result) {
        throw new Error(result.err);
      }

      alert(`Successfully awarded ${bonusAmount} points!`);
      setBonusAmount('');
      await loadPointsData(); // Reload data
    } catch (err) {
      console.error('Error awarding points:', err);
      alert('Failed to award points. Make sure you have admin permissions.');
    } finally {
      setAwardingPoints(null);
    }
  };

  const formatNumber = (num: bigint | number): string => {
    return new Intl.NumberFormat().format(Number(num));
  };

  const formatDataSize = (bytes: bigint): string => {
    const kb = Number(bytes) / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(2)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  const filteredUsers = users
    .filter(user => 
      user.principal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.referralCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.country?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'points':
          return Number(b.points) - Number(a.points);
        case 'data':
          return Number(b.dataVolumeKB) - Number(a.dataVolumeKB);
        case 'referrals':
          return Number(b.referralCount) - Number(a.referralCount);
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading points data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Points Management</h1>
        <p className="text-gray-400">Monitor and manage user points and rewards</p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-[#360D68] rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-2">Total Points</div>
            <div className="text-2xl font-bold text-white">
              {formatNumber(stats.totalPointsDistributed)}
            </div>
          </div>
          
          <div className="bg-[#360D68] rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-2">Avg Points/User</div>
            <div className="text-2xl font-bold text-white">
              {formatNumber(Math.round(stats.averagePointsPerUser))}
            </div>
          </div>
          
          <div className="bg-[#360D68] rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-2">Total Users</div>
            <div className="text-2xl font-bold text-white">
              {users.length}
            </div>
          </div>
          
          <div className="bg-[#360D68] rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-2">Active Users</div>
            <div className="text-2xl font-bold text-green-400">
              {formatNumber(stats.activeUsers)}
            </div>
          </div>
          
          <div className="bg-[#360D68] rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-2">Total Referrals</div>
            <div className="text-2xl font-bold text-white">
              {formatNumber(stats.totalReferrals)}
            </div>
          </div>
        </div>
      )}

      {/* Points Configuration */}
      <div className="bg-[#1E1E2E] rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Points Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Points per KB:</span>
            <span className="text-white font-semibold">10</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Referral Tier 1 (1-10):</span>
            <span className="text-white font-semibold">100 points</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Referral Tier 2 (11-30):</span>
            <span className="text-white font-semibold">50 points</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Referral Tier 3 (31-70):</span>
            <span className="text-white font-semibold">25 points</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Referral Tier 4 (71+):</span>
            <span className="text-white font-semibold">5 points</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Referral Commission:</span>
            <span className="text-white font-semibold">10%</span>
          </div>
        </div>
      </div>

      {/* Top Contributors */}
      {stats && stats.topContributors.length > 0 && (
        <div className="bg-[#1E1E2E] rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Top Contributors</h2>
          <div className="space-y-2">
            {stats.topContributors.map(([principal, points], index) => (
              <div key={principal} className="flex items-center justify-between p-3 bg-[#360D68] rounded">
                <div className="flex items-center space-x-3">
                  <span className="text-[#B692F6] font-bold">#{index + 1}</span>
                  <span className="text-white text-sm font-mono">
                    {principal.substring(0, 8)}...{principal.substring(principal.length - 6)}
                  </span>
                </div>
                <span className="text-white font-semibold">{formatNumber(points)} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Points Table */}
      <div className="bg-[#1E1E2E] rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">User Points Details</h2>
            <div className="flex space-x-4">
              <input
                type="text"
                placeholder="Search by principal, code, or country..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 bg-[#360D68] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B692F6]"
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'points' | 'data' | 'referrals')}
                className="px-4 py-2 bg-[#360D68] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B692F6]"
              >
                <option value="points">Sort by Points</option>
                <option value="data">Sort by Data</option>
                <option value="referrals">Sort by Referrals</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#360D68]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Principal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Data Contributed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Referral Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Referrals
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Country
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.slice(0, 50).map((user) => (
                  <tr key={user.principal} className="hover:bg-[#360D68] hover:bg-opacity-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono">
                      {user.principal.substring(0, 8)}...{user.principal.substring(user.principal.length - 6)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">
                      {formatNumber(user.points)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatDataSize(user.totalDataScraped)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#B692F6] font-mono">
                      {user.referralCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {formatNumber(user.referralCount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {user.country || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.isActive 
                          ? 'bg-green-500 bg-opacity-20 text-green-400' 
                          : 'bg-gray-500 bg-opacity-20 text-gray-400'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          placeholder="Points"
                          value={awardingPoints === user.principal ? bonusAmount : ''}
                          onChange={(e) => {
                            setAwardingPoints(user.principal);
                            setBonusAmount(e.target.value);
                          }}
                          className="w-20 px-2 py-1 bg-[#360D68] text-white rounded text-xs"
                        />
                        <button
                          onClick={() => handleAwardPoints(user.principal)}
                          disabled={awardingPoints !== null && awardingPoints !== user.principal}
                          className="px-3 py-1 bg-[#B692F6] text-white rounded text-xs hover:bg-[#9B71E6] disabled:opacity-50"
                        >
                          Award
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length > 50 && (
          <div className="p-4 text-center text-gray-400 text-sm">
            Showing first 50 users. Use search to find specific users.
          </div>
        )}
      </div>
    </div>
  );
};