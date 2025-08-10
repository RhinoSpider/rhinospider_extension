import React, { useState, useEffect } from 'react';
import { getExtensionUsers } from '../lib/admin';

interface ExtensionUser {
  id: string;
  principalId: string;
  deviceId: string;
  dataContributed: number;
  lastActive: string;
  joinDate: string;
  isActive: boolean;
  ipAddress: string;
  location: string;
  points?: number;
  referralCount?: number;
  referralCode?: string;
}

// Utility function to format ISO date strings
const formatTimestamp = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    
    return date.toLocaleString();
  } catch (e) {
    console.error("Error formatting timestamp:", e);
    return "Invalid Date";
  }
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};

const formatDataSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
};

export const ExtensionUsers: React.FC = () => {
  const [users, setUsers] = useState<ExtensionUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'data' | 'lastActive'>('lastActive');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const extensionUsers = await getExtensionUsers();
      setUsers(extensionUsers);
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
      user.principalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.referralCode?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      user.location.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'data':
          return b.dataContributed - a.dataContributed;
        case 'lastActive':
          return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
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
            onChange={(e) => setSortBy(e.target.value as 'data' | 'lastActive')}
            className="px-4 py-2 bg-[#131217] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B692F6]"
          >
            <option value="lastActive">Sort by Last Active</option>
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
                  Data Contributed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Join Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131217]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                    Loading extension users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                    {searchTerm ? 'No users found matching your search' : 'No extension users registered yet'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => (
                  <tr key={index} className="hover:bg-[#360D68] hover:bg-opacity-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono">
                      {user.principalId.substring(0, 8)}...{user.principalId.substring(user.principalId.length - 6)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {user.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {formatDataSize(user.dataContributed)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {user.ipAddress}
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
                      {formatTimestamp(user.lastActive)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {formatTimestamp(user.joinDate)}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-gray-400 text-sm">Total Data</div>
              <div className="text-2xl font-bold text-white">
                {formatDataSize(filteredUsers.reduce((sum, u) => sum + u.dataContributed, 0))}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Average Data per User</div>
              <div className="text-2xl font-bold text-white">
                {filteredUsers.length > 0 
                  ? formatDataSize(filteredUsers.reduce((sum, u) => sum + u.dataContributed, 0) / filteredUsers.length)
                  : formatDataSize(0)}
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