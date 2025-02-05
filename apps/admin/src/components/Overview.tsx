import React from 'react';

export const Overview: React.FC = () => {
  const stats = [
    { label: 'Active Extensions', value: '127', change: '+12%' },
    { label: 'Pages Scraped Today', value: '1,234', change: '+5%' },
    { label: 'Data Points Collected', value: '45,678', change: '+8%' },
    { label: 'Active Topics', value: '15', change: '0%' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-[#360D68] rounded-lg p-6 shadow-lg"
          >
            <div className="text-[#B692F6] text-sm font-medium">
              {stat.label}
            </div>
            <div className="mt-2 flex items-baseline">
              <div className="text-2xl font-semibold text-white">
                {stat.value}
              </div>
              <div className={`ml-2 text-sm font-medium ${
                stat.change.startsWith('+') ? 'text-green-400' : 'text-gray-400'
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
          <div className="space-y-4">
            {/* Add activity feed here */}
            <p className="text-[#B692F6]">Activity feed coming soon...</p>
          </div>
        </div>

        <div className="bg-[#360D68] rounded-lg p-6 shadow-lg">
          <h2 className="text-lg font-medium text-white mb-4">System Status</h2>
          <div className="space-y-4">
            {/* Add system status here */}
            <p className="text-[#B692F6]">System status coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
};
