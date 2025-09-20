import { useState, useEffect } from 'react';
import { User } from '../types';
import marketplaceService from '../services/marketplace';
import { useAuth } from '../hooks/useAuth';
import {
  UserCircleIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  CalendarIcon,
  CheckBadgeIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

export default function Profile() {
  const { principal, identity } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (identity) {
        await marketplaceService.setIdentity(identity);
        const profile = await marketplaceService.getUserProfile();
        setUser(profile);
      }
      setLoading(false);
    };
    loadProfile();
  }, [identity]);

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTierBadge = (tier: string) => {
    const badges = {
      free: { bg: 'bg-gray-100', text: 'text-gray-700', icon: '🆓' },
      starter: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '⭐' },
      enterprise: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '🚀' }
    };
    return badges[tier] || badges.free;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <UserCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Complete Your Profile</h2>
        <p className="text-gray-600 mb-6">
          Set up your profile to access marketplace features
        </p>
        <button
          onClick={() => window.location.href = '/onboarding'}
          className="btn-primary"
        >
          Complete Profile Setup
        </button>
      </div>
    );
  }

  const tierBadge = getTierBadge(user.account_tier);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center">
              <UserCircleIcon className="h-12 w-12 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user.company || 'User Profile'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Principal: {principal?.toString().slice(0, 16)}...
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tierBadge.bg} ${tierBadge.text}`}>
                  {tierBadge.icon} {user.account_tier.charAt(0).toUpperCase() + user.account_tier.slice(1)} Tier
                </span>
                {user.kyc_verified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <CheckBadgeIcon className="h-3 w-3" />
                    KYC Verified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Details */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h2>
            <div className="space-y-3">
              {user.email && (
                <div className="flex items-center gap-3">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{user.email}</p>
                  </div>
                </div>
              )}
              {user.company && (
                <div className="flex items-center gap-3">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Company</p>
                    <p className="text-sm font-medium text-gray-900">{user.company}</p>
                  </div>
                </div>
              )}
              {user.industry && (
                <div className="flex items-start gap-3">
                  <SparklesIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Industry</p>
                    <p className="text-sm font-medium text-gray-900">{user.industry}</p>
                  </div>
                </div>
              )}
              {user.company_size && (
                <div className="flex items-start gap-3">
                  <UserCircleIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Company Size</p>
                    <p className="text-sm font-medium text-gray-900">{user.company_size}</p>
                  </div>
                </div>
              )}
              {user.use_case && (
                <div className="flex items-start gap-3">
                  <CheckBadgeIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Primary Use Case</p>
                    <p className="text-sm font-medium text-gray-900">{user.use_case}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Account Activity */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Activity</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Member Since</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(user.registered_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Last Login</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(user.last_login)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-6">
          {/* Usage Stats */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage Statistics</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm text-gray-600">Total Purchases</span>
                  <span className="text-2xl font-bold text-gray-900">{user.purchase_count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full"
                    style={{ width: `${Math.min(user.purchase_count * 10, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm text-gray-600">API Calls</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {user.api_calls_total.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${Math.min(user.api_calls_total / 1000, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Spent</span>
                  <span className="text-xl font-bold text-green-600">
                    {user.total_spent.toLocaleString()} ICP
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Payment Method</span>
                  <span className="text-sm font-medium text-gray-900">
                    {user.preferred_payment}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => window.location.href = '/catalog'}
                className="w-full btn-secondary text-sm"
              >
                Browse Datasets
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="w-full btn-secondary text-sm"
              >
                View Dashboard
              </button>
              {user.account_tier === 'free' && (
                <button className="w-full btn-primary text-sm">
                  Upgrade to Starter
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}