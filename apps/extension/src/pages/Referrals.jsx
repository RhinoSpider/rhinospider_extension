import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@rhinospider/web3-client';
import { Actor, HttpAgent } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { idlFactory } from '../declarations/consumer/consumer.did.js';

const CONSUMER_CANISTER_ID = import.meta.env.VITE_CONSUMER_CANISTER_ID;
const IC_HOST = import.meta.env.VITE_IC_HOST;

const Referrals = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    activeReferrals: 0,
    pointsEarned: 0,
    referralBonus: 0,
  });

  useEffect(() => {
    const loadReferrals = async () => {
      try {
        setIsLoading(true);
        
        // Get auth client and identity
        const authClient = await AuthClient.create();
        const identity = authClient.getIdentity();
        
        // Create agent and actor
        const agent = new HttpAgent({
          host: IC_HOST,
          identity
        });
        
        const actor = Actor.createActor(idlFactory, {
          agent,
          canisterId: CONSUMER_CANISTER_ID
        });
        
        // Get user's referral code
        const codeResult = await actor.getReferralCode();
        if ('ok' in codeResult) {
          setReferralCode(codeResult.ok);
        }
        
        // Get user profile to get referral stats
        const principal = identity.getPrincipal();
        const userResult = await actor.getUserByPrincipal(principal);
        if (userResult && userResult.length > 0) {
          const user = userResult[0];
          // Calculate referral bonus based on tiers
          const referralCount = Number(user.referralCount || 0);
          let bonusPerReferral = 100; // Default
          if (referralCount >= 50) bonusPerReferral = 500;
          else if (referralCount >= 20) bonusPerReferral = 300;
          else if (referralCount >= 10) bonusPerReferral = 200;
          else if (referralCount >= 5) bonusPerReferral = 150;
          
          const totalReferralBonus = referralCount * bonusPerReferral;
          
          setReferralStats({
            totalReferrals: referralCount,
            activeReferrals: referralCount, // All referrals are considered active for now
            pointsEarned: Number(user.points || 0),
            referralBonus: totalReferralBonus,
          });
        }
      } catch (error) {
        console.error('Error loading referrals:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReferrals();
  }, []);

  const handleCopyReferral = () => {
    const referralLink = `https://rhinospider.io/ref/${referralCode}`;
    navigator.clipboard.writeText(referralLink);
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
          onClick={() => navigate('/')}
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
                <div className="text-2xl font-bold text-white">{referralStats.referralBonus}</div>
                <div className="text-sm text-gray-400">Referral Points</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Your Referral Link</h3>
          <p className="text-sm text-gray-400">
            Share your referral link to earn bonus points! You'll receive:
          </p>
          <ul className="text-sm text-gray-300 mt-2 space-y-1">
            <li>• 100 points for 1-4 referrals</li>
            <li>• 150 points for 5-9 referrals</li>
            <li>• 200 points for 10-19 referrals</li>
            <li>• 300 points for 20-49 referrals</li>
            <li>• 500 points for 50+ referrals</li>
            <li>• Plus 10% of points your referrals earn!</li>
          </ul>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={referralCode ? `https://rhinospider.io/ref/${referralCode}` : 'Loading...'}
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
          <h3 className="text-lg font-medium text-white">Referral System Info</h3>
          <div className="bg-white/5 rounded-lg p-4 space-y-3">
            <div className="text-sm text-gray-300">
              <strong className="text-white">How it works:</strong>
            </div>
            <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
              <li>Share your unique referral link with friends</li>
              <li>When they sign up using your link, you both benefit</li>
              <li>You earn bonus points based on your total referral count</li>
              <li>You also earn 10% of all points your referrals generate</li>
              <li>The more people you refer, the higher your bonus tier!</li>
            </ol>
          </div>
          {referralStats.totalReferrals > 0 && (
            <div className="bg-white/5 rounded-lg divide-y divide-white/5">
              <h4 className="text-md font-medium text-white p-4">Your Referrals ({referralStats.totalReferrals})</h4>
              {[...Array(Math.min(referralStats.totalReferrals, 3))].map((_, index) => (
                <div key={index} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">User {index + 1}</div>
                    <div className="text-sm text-gray-400">Contributing data</div>
                  </div>
                  <div className="text-sm text-green-400">
                    Active
                  </div>
                </div>
              ))}
              {referralStats.totalReferrals > 3 && (
                <div className="p-4 text-center text-sm text-gray-400">
                  And {referralStats.totalReferrals - 3} more...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Referrals;
