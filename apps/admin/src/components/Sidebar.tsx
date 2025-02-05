import React from 'react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'config', label: 'Scraping Config', icon: '⚙️' },
    { id: 'users', label: 'Extension Users', icon: '👥' },
    { id: 'data', label: 'Scraped Data', icon: '📑' },
  ];

  return (
    <div className="w-64 bg-[#360D68] min-h-screen p-4">
      <nav>
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onViewChange(item.id)}
                className={`w-full text-left px-4 py-2 rounded-lg flex items-center space-x-3 ${
                  currentView === item.id
                    ? 'bg-[#B692F6] text-[#131217]'
                    : 'text-white hover:bg-[#B692F6] hover:bg-opacity-20'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};
