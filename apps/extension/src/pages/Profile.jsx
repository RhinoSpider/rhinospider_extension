import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@rhinospider/web3-client';

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setUserData({
          name: user?.email?.split('@')[0] || 'Anonymous User',
          email: user?.email || 'No email provided',
          principalId: user?.principalId || 'Not available',
          memberSince: Date.now(),
          points: 0,
          stats: {
            totalScrapes: 0,
            activeDays: 0
          }
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F0E13] to-[#1B1B1F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F0E13] to-[#1B1B1F] text-white p-8">
        <div className="bg-red-500/20 border border-red-500/20 p-4 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0E13] to-[#1B1B1F] text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="text-white/60 hover:text-white mr-4"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold">Profile</h1>
        </div>
        
        <div className="bg-[#131217]/40 backdrop-blur-sm rounded-lg p-6 mb-8">
          <div className="flex items-center mb-6">
            <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center text-2xl font-mono mr-6">
              {userData?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{userData?.name}</h2>
              <p className="text-white/60">{userData?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">Principal ID</label>
              <p className="text-sm font-mono bg-[#1B1B1F]/50 p-2 rounded">{userData?.principalId}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">Member Since</label>
              <p>{userData?.memberSince ? new Date(userData.memberSince).toLocaleDateString() : 'Not available'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">Total Points</label>
              <p>{userData?.points?.toLocaleString() || '0'} points</p>
            </div>
          </div>
        </div>

        <div className="bg-[#131217]/40 backdrop-blur-sm rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Activity Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#1B1B1F]/50 p-4 rounded-lg">
              <p className="text-sm text-white/60">Total Scrapes</p>
              <p className="text-2xl font-semibold">{userData?.stats?.totalScrapes}</p>
            </div>
            <div className="bg-[#1B1B1F]/50 p-4 rounded-lg">
              <p className="text-sm text-white/60">Active Days</p>
              <p className="text-2xl font-semibold">{userData?.stats?.activeDays}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
