import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Power, Settings, BarChart2, User } from 'lucide-react';
import { useAuthContext } from '@rhinospider/web3-client';
import { theme } from '../styles/theme';

const Logo = () => (
  <div className="text-white text-2xl font-mono tracking-wider">
    {'>^<'}
  </div>
);

const UserAvatar = ({ onClick }) => (
  <button 
    onClick={onClick}
    className="w-8 h-8 rounded-full bg-[#131217]/40 backdrop-blur-sm flex items-center justify-center hover:bg-[#131217]/60"
  >
    <User className="w-5 h-5 text-white" />
  </button>
);

const UserDropdown = ({ onReconnect, onLogout, onClose }) => (
  <div className="absolute right-0 top-full mt-1 w-48 py-2 bg-[#131217]/90 backdrop-blur-sm rounded-lg shadow-lg">
    <button 
      onClick={onReconnect}
      className="w-full px-4 py-2 text-left text-white text-sm hover:bg-white/10"
    >
      Reconnect
    </button>
    <button 
      onClick={onLogout}
      className="w-full px-4 py-2 text-left text-white text-sm hover:bg-white/10"
    >
      Logout
    </button>
  </div>
);

const Dashboard = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [points, setPoints] = useState(9130);
  const [uptime, setUptime] = useState('2 hrs 45 mins');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const navigate = useNavigate();
  const { identity, logout } = useAuthContext();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserDropdown && !event.target.closest('.user-dropdown')) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showUserDropdown]);

  return (
    <div 
      className="w-[400px] h-[600px] overflow-hidden"
      style={{ background: theme.colors.background.gradient }}
    >
      {/* Header */}
      <div className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="text-white text-lg">RhinoSpider</span>
        </div>
        <div className="flex items-center gap-3 relative user-dropdown">
          <button
            onClick={() => {}}
            className="w-8 h-8 rounded-full bg-[#131217]/40 backdrop-blur-sm flex items-center justify-center hover:bg-[#131217]/60"
          >
            <Settings className="w-4 h-4 text-white" />
          </button>
          <UserAvatar onClick={() => setShowUserDropdown(!showUserDropdown)} />
          {showUserDropdown && (
            <UserDropdown
              onReconnect={() => {
                // Add reconnect logic here
                setShowUserDropdown(false);
              }}
              onLogout={() => {
                handleLogout();
                setShowUserDropdown(false);
              }}
              onClose={() => setShowUserDropdown(false)}
            />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6">
        <div className="text-center mb-8">
          <h2 className="text-white text-lg mb-2">Current Earnings</h2>
          <div className="text-4xl font-bold text-white mb-4">
            {points.toLocaleString()} Points
          </div>

          {/* Power Button */}
          <div className="flex justify-center mb-6">
            <button
              onClick={() => setIsConnected(!isConnected)}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                isConnected 
                  ? 'bg-[#B692F6] text-white' 
                  : 'bg-[#131217]/40 backdrop-blur-sm text-[#B692F6]'
              }`}
            >
              <Power className="w-12 h-12" />
            </button>
          </div>

          {/* Status */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#B692F6]' : 'bg-red-500'}`} />
            <span className="text-white text-sm">
              {isConnected ? 'Your plugin is active. No action required.' : 'Plugin is disconnected. Click to connect!'}
            </span>
          </div>

          {/* Uptime */}
          <div className="bg-[#131217]/40 backdrop-blur-sm rounded-full px-4 py-2 inline-block mb-4">
            <div className="flex items-center gap-2">
              <span className="text-white/60 text-sm">Uptime</span>
              <span className="text-white text-sm">{uptime}</span>
            </div>
          </div>

          <div className="text-white/60 text-sm italic">
            Great job! Keep contributing to secure your next milestone reward.
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-6 justify-center">
            <button className="px-4 py-2 rounded-full bg-[#131217]/40 backdrop-blur-sm text-white text-sm hover:bg-[#131217]/60">
              Copy Your Referral Link
            </button>
            <button className="px-4 py-2 rounded-full bg-[#131217]/40 backdrop-blur-sm text-white text-sm hover:bg-[#131217]/60">
              View My Referrals
            </button>
          </div>

          {/* Bottom Actions */}
          <div className="mt-6 space-y-2">
            <button 
              onClick={() => navigate('/analytics')} 
              className="flex items-center gap-2 mx-auto px-4 py-2 rounded-full bg-[#131217]/40 backdrop-blur-sm text-white text-sm hover:bg-[#131217]/60"
            >
              <BarChart2 className="w-4 h-4" />
              <span>View Analytics</span>
            </button>
            <button className="flex items-center gap-2 mx-auto px-4 py-2 rounded-full bg-[#B692F6] text-white text-sm hover:bg-[#B692F6]/90">
              <span>Desktop Dashboard</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">↗</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;