import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { useAuth } from '@rhinospider/web3-client';

export default function Referrals() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Generate a referral code based on user's email
        const baseCode = user?.email?.split('@')[0]?.substring(0, 4)?.toUpperCase() || 'RS';
        setReferralCode(baseCode + '-' + Math.random().toString(36).substring(2, 6).toUpperCase());
        
        // Mock referral data
        setReferrals([
          { id: 1, email: 'user1@example.com', joinedDate: '2024-01-01', points: 100 },
          { id: 2, email: 'user2@example.com', joinedDate: '2024-01-15', points: 250 },
        ]);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user]);

  const copyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

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
          <h1 className="text-3xl font-bold">Referrals</h1>
        </div>
        
        <div className="bg-[#131217]/40 backdrop-blur-sm rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Referral Code</h2>
          <div className="flex items-center gap-4">
            <code className="bg-[#1B1B1F]/50 px-4 py-2 rounded font-mono text-lg flex-1">
              {referralCode}
            </code>
            <button
              onClick={copyReferralCode}
              className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded text-sm font-medium transition-colors flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-[#131217]/40 backdrop-blur-sm rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Your Referrals</h2>
          {referrals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-white/60 text-sm">
                    <th className="pb-4">Email</th>
                    <th className="pb-4">Joined</th>
                    <th className="pb-4 text-right">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map(referral => (
                    <tr key={referral.id} className="border-t border-white/10">
                      <td className="py-4">{referral.email}</td>
                      <td className="py-4">{new Date(referral.joinedDate).toLocaleDateString()}</td>
                      <td className="py-4 text-right">{referral.points.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-white/60">
              No referrals yet. Share your code to get started!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
