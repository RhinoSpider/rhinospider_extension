import React, { useState, useEffect } from 'react';
import { Actor, HttpAgent } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';

interface UserProfile {
  principal: string;
  devices: string[];
  created: bigint;
  lastLogin: bigint;
  ipAddress?: string;
  country?: string;
  region?: string;
  city?: string;
  referralCode: string;
  referralCount: bigint;
  points: bigint;
  totalDataScraped: bigint;
  dataVolumeKB: bigint;
  isActive: boolean;
}

// Utility function to format BigInt timestamps
const formatTimestamp = (timestamp: bigint): string => {
  try {
    // Convert nanoseconds to milliseconds
    const milliseconds = Number(timestamp / BigInt(1_000_000));
    const date = new Date(milliseconds);
    return date.toLocaleString();
  } catch (e) {
    console.error("Error formatting timestamp:", e);
    return "Invalid Date";
  }
};

const formatNumber = (num: bigint | number): string => {
  return new Intl.NumberFormat().format(Number(num));
};

const formatDataSize = (kb: bigint): string => {
  const kbNum = Number(kb);
  if (kbNum < 1024) return `${kbNum} KB`;
  const mb = kbNum / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
};

export const ExtensionUsers: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'points' | 'data' | 'lastLogin'>('lastLogin');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
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

      const consumerCanisterId = 't3pjp-kqaaa-aaaao-a4ooq-cai';
      
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
        });
      };

      const consumerActor = Actor.createActor(idlFactory, {
        agent,
        canisterId: consumerCanisterId,
      });

      // Fetch all users
      try {
        const allUsers = await consumerActor.getAllUsers() as [any, any][];
        
        // Process users
        const processedUsers: UserProfile[] = allUsers.map(([principal, profile]) => ({
          principal: principal.toString(),
          devices: profile.devices,
          created: Number(profile.created),
          lastLogin: Number(profile.lastLogin),
          ipAddress: profile.ipAddress?.[0],
          country: profile.country?.[0],
          region: profile.region?.[0],
          city: profile.city?.[0],
          referralCode: profile.referralCode,
          referralCount: Number(profile.referralCount),
          points: Number(profile.points),
          totalDataScraped: Number(profile.totalDataScraped),
          dataVolumeKB: Number(profile.dataVolumeKB),
          isActive: profile.isActive,
        }));

        setUsers(processedUsers);
      } catch (err) {
        setUsers([]);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setError("Failed to fetch extension users from consumer canister.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users
    .filter(user => 
      user.principal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.referralCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.country?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.city?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'points':
          return Number(b.points) - Number(a.points);
        case 'data':
          return Number(b.dataVolumeKB) - Number(a.dataVolumeKB);
        case 'lastLogin':
          return Number(b.lastLogin) - Number(a.lastLogin);
        default:
          return 0;
      }
    });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Extension Users</h1>
          <p className="text-gray-400 text-sm mt-1">
            {users.length} total users • {users.filter(u => u.isActive).length} active
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="bg-[#B692F6] text-white px-4 py-2 rounded-lg hover:bg-[#9B71E6] disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-400 text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-[#360D68] rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            placeholder="Search by principal, referral code, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-[#131217] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B692F6] w-96"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'points' | 'data' | 'lastLogin')}
            className="px-4 py-2 bg-[#131217] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B692F6]"
          >
            <option value="lastLogin">Sort by Last Login</option>
            <option value="points">Sort by Points</option>
            <option value="data">Sort by Data Contributed</option>
          </select>
        </div>
      </div>

      <div className="bg-[#360D68] rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#131217]">
            <thead className="bg-[#131217]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Principal ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Data Contributed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Referral Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Referrals
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131217]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-400">
                    Loading extension users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-400">
                    {searchTerm ? 'No users found matching your search' : 'No extension users registered yet'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => (
                  <tr key={index} className="hover:bg-[#360D68] hover:bg-opacity-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono">
                      {user.principal.substring(0, 8)}...{user.principal.substring(user.principal.length - 6)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {user.city && user.country ? `${user.city}, ${user.country}` : user.country || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">
                      {formatNumber(user.points)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {formatDataSize(user.dataVolumeKB)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#B692F6] font-mono">
                      {user.referralCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {formatNumber(user.referralCount)}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {formatTimestamp(user.lastLogin)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {formatTimestamp(user.created)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length > 0 && (
        <div className="bg-[#1E1E2E] rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">User Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-gray-400 text-sm">Total Points</div>
              <div className="text-2xl font-bold text-white">
                {formatNumber(filteredUsers.reduce((sum, u) => sum + Number(u.points), 0))}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Total Data</div>
              <div className="text-2xl font-bold text-white">
                {formatDataSize(filteredUsers.reduce((sum, u) => sum + Number(u.dataVolumeKB), 0))}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Total Referrals</div>
              <div className="text-2xl font-bold text-white">
                {formatNumber(filteredUsers.reduce((sum, u) => sum + Number(u.referralCount), 0))}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Active Rate</div>
              <div className="text-2xl font-bold text-green-400">
                {filteredUsers.length > 0 
                  ? `${((filteredUsers.filter(u => u.isActive).length / filteredUsers.length) * 100).toFixed(1)}%`
                  : '0%'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};