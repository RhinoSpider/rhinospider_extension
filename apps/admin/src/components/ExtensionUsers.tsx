import React, { useState, useEffect } from 'react';
import { getUsers } from '../lib/admin';
import { ExtensionUser } from '../types';
import { Principal } from '@dfinity/principal';

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

export const ExtensionUsers: React.FC = () => {
  const [users, setUsers] = useState<ExtensionUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedUsers = await getUsers();
      setUsers(fetchedUsers);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setError("Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Extension Users</h1>
        {/* Add user registration button here if needed, or remove this section */}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-400 text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-[#360D68] rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#131217]">
            <thead className="bg-[#131217]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Principal ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Devices
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Notifications
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Theme
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131217]">
              {users.map((user, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {user.principal.toText()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {user.role}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {formatTimestamp(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {formatTimestamp(user.lastLogin)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {user.devices.join(', ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {user.preferences.notificationsEnabled ? 'Enabled' : 'Disabled'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {user.preferences.theme}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#B692F6]">
                    <button className="hover:text-white transition-colors">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};