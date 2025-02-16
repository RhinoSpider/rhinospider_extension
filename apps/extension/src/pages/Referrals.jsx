import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@rhinospider/web3-client';

const Referrals = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 12,
    activeReferrals: 8,
    pointsEarned: 450,
  });

  useEffect(() => {
    const loadReferrals = async () => {
      try {
        setIsLoading(true);
        // Load referral data here
      } catch (error) {
        console.error('Error loading referrals:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReferrals();
  }, []);

  const handleCopyReferral = () => {
    navigator.clipboard.writeText('your-referral-link');
    setShowCopyNotification(true);
    setTimeout(() => setShowCopyNotification(false), 2000);
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.close();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="p-4 w-[300px]">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <button
          onClick={handleLogout}
          className="text-red-600 hover:text-red-700 transition-colors text-sm"
        >
          Logout
        </button>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Referrals</h2>
          <div className="bg-white/5 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{referralStats.totalReferrals}</div>
                <div className="text-sm text-gray-400">Total Referrals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{referralStats.activeReferrals}</div>
                <div className="text-sm text-gray-400">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{referralStats.pointsEarned}</div>
                <div className="text-sm text-gray-400">Points Earned</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Your Referral Link</h3>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value="https://rhinospider.io/ref/your-code"
                readOnly
                className="flex-1 bg-white/10 rounded px-3 py-2 text-sm font-mono text-gray-300"
              />
              <button
                onClick={handleCopyReferral}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded transition-all active:scale-[0.98]"
              >
                {showCopyNotification ? (
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Copied
                  </span>
                ) : (
                  'Copy'
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Recent Referrals</h3>
          <div className="bg-white/5 rounded-lg divide-y divide-white/5">
            {[
              { name: 'John D.', date: '2 days ago', status: 'active' },
              { name: 'Sarah M.', date: '5 days ago', status: 'active' },
              { name: 'Mike R.', date: '1 week ago', status: 'pending' },
            ].map((referral, index) => (
              <div key={index} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">{referral.name}</div>
                  <div className="text-sm text-gray-400">{referral.date}</div>
                </div>
                <div className={`text-sm ${
                  referral.status === 'active' ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {referral.status === 'active' ? 'Active' : 'Pending'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Referrals;
