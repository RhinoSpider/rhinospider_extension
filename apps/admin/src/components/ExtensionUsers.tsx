import React from 'react';

export const ExtensionUsers: React.FC = () => {
  const users = [
    {
      id: '1',
      principal: '2vxsx-fae',
      status: 'active',
      lastActive: '2 minutes ago',
      pagesScraped: 156,
      dataPoints: 1234,
      rateLimit: 100
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Extension Users</h1>
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Search users..."
            className="bg-[#131217] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#B692F6]"
          />
          <select className="bg-[#131217] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#B692F6]">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
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
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Pages Scraped
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Data Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Rate Limit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131217]">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {user.principal}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {user.lastActive}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {user.pagesScraped}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {user.dataPoints}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {user.rateLimit}/hour
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
