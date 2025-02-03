import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Power, Settings, BarChart2 } from 'lucide-react';
import { useAuth } from '@rhinospider/web3-client';
import { Logo, Navbar } from '@rhinospider/ui';

const Dashboard = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [points, setPoints] = useState(9130);
  const [uptime, setUptime] = useState('2 hrs 45 mins');
  const navigate = useNavigate();
  const { state } = useAuth();

  useEffect(() => {
    if (!state.isAuthenticated) {
      navigate('/login');
    }
  }, [state.isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1b1e] to-[#2B2F31] text-white p-4">
      <Navbar onNavigate={navigate} />

      <main className="mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#131217]/40 backdrop-blur-sm rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Connection</span>
                <div className="flex items-center">
                  <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                  <Power 
                    className={`w-4 h-4 ml-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`} 
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Points</span>
                <span>{points.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Uptime</span>
                <span>{uptime}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#131217]/40 backdrop-blur-sm rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => navigate('/settings')}
                className="flex items-center justify-center space-x-2 p-4 rounded-lg bg-white/5 hover:bg-white/10"
              >
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </button>
              <button 
                onClick={() => navigate('/analytics')}
                className="flex items-center justify-center space-x-2 p-4 rounded-lg bg-white/5 hover:bg-white/10"
              >
                <BarChart2 className="w-5 h-5" />
                <span>Analytics</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;