import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="w-80 min-h-96 bg-gradient-to-b from-gray-900 to-purple-900 p-6 text-white">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-2">
  <span className="text-xl font-mono text-white">{">^<"}</span>
  <span className="text-xl font-semibold">RhinoSpider</span>
</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded-lg transition-colors"
          >
            Reconnect
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-gray-400 mb-2">Dashboard</h2>
          <button
            onClick={() => navigate('/')}
            className="w-full text-left px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        <div>
          <h2 className="text-gray-400 mb-2">Username</h2>
          <div className="px-4 py-2 bg-gray-800/50 rounded-lg">
            {user?.email?.split('@')[0] || 'Not available'}
          </div>
        </div>

        <div>
          <h2 className="text-gray-400 mb-2">Email</h2>
          <div className="px-4 py-2 bg-gray-800/50 rounded-lg">
            {user?.email || 'Not available'}
          </div>
        </div>

        <div className="space-y-2">
          <button className="w-full flex items-center justify-between px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors">
            App Settings
            <ChevronDown size={16} />
          </button>
          
          <button className="w-full flex items-center justify-between px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors">
            Advance Settings
            <ChevronDown size={16} />
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg text-red-400 transition-colors"
        >
          <span>Logout</span>
          <LogOut size={16} />
        </button>

        <button className="w-full bg-purple-500/20 hover:bg-purple-500/30 rounded-lg p-2 text-sm flex items-center justify-center gap-2 transition-colors">
          Desktop Dashboard
          <ChevronDown size={16} />
        </button>
      </div>
    </div>
  );
};

export default Settings;