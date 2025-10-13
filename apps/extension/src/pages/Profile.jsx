import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@rhinospider/web3-client';
import WalletConnect from '../components/WalletConnect';
import TokenConversion from '../components/TokenConversion';

const Profile = () => {
  const navigate = useNavigate();
  const { principal, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(0);
  const [walletConnected, setWalletConnected] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        // get user points from storage
        const stats = await chrome.storage.local.get(['userStats']);
        if (stats.userStats?.points) {
          setUserPoints(stats.userStats.points);
        }

        // check wallet connection status
        const wallet = await chrome.storage.local.get(['connectedWallet']);
        if (wallet.connectedWallet) {
          setWalletConnected(true);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      window.close();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleWalletConnect = (walletData) => {
    setWalletConnected(true);
    console.log('Wallet connected:', walletData);
  };

  const handleWalletDisconnect = () => {
    setWalletConnected(false);
  };

  return (
    <div className="p-4 w-[400px] max-h-[600px] overflow-y-auto">
      <div className="flex justify-between items-center mb-4 sticky top-0 bg-gradient-to-b from-gray-900 to-transparent pb-2 z-10">
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <button
          onClick={handleLogout}
          className="text-red-400 hover:text-red-300 transition-colors text-sm"
        >
          Logout
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Profile</h2>

        {/* Account Details */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-300">Account Details</h3>
          <div className="bg-white/5 rounded-lg divide-y divide-white/5">
            <div className="p-3">
              <div className="text-xs text-gray-400">Principal ID</div>
              <div className="mt-1 font-mono text-xs break-all">
                {principal}
              </div>
            </div>
            <div className="p-3">
              <div className="text-xs text-gray-400">Member Since</div>
              <div className="mt-1 text-sm">
                {new Date().toLocaleDateString()}
              </div>
            </div>
            <div className="p-3">
              <div className="text-xs text-gray-400">Total Points Earned</div>
              <div className="mt-1 text-lg font-bold text-yellow-400">
                {userPoints.toLocaleString()} points
              </div>
            </div>
          </div>
        </div>

        {/* Wallet Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-300">Wallet</h3>
          <WalletConnect
            onConnect={handleWalletConnect}
            onDisconnect={handleWalletDisconnect}
          />
        </div>

        {/* Token Conversion */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-300">Convert to Tokens</h3>
          <TokenConversion
            points={userPoints}
            walletConnected={walletConnected}
          />
        </div>
      </div>
    </div>
  );
};

export default Profile;
