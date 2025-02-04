import React, { useState, useEffect, useRef } from 'react';
import { AuthClient } from '@rhinospider/web3-client';
import './Popup.css';

const Popup = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginPending, setIsLoginPending] = useState(false);
  const [error, setError] = useState(null);
  const [avatar, setAvatar] = useState(null);
  const [points, setPoints] = useState(9130);
  const [uptime, setUptime] = useState('2 hrs 45 mins');
  const [isPluginActive, setIsPluginActive] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        const authClient = AuthClient.getInstance();
        const state = await authClient.initialize();
        console.log('Initial auth state:', state);
        
        if (state.isAuthenticated && state.identity) {
          setIsAuthenticated(true);
          try {
            const userData = await authClient.getUserData();
            if (userData?.avatar) {
              setAvatar(userData.avatar);
            }
          } catch (err) {
            console.error('Failed to fetch user data:', err);
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setError('Failed to initialize authentication');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogin = async () => {
    try {
      setIsLoginPending(true);
      setError(null);
      
      const authClient = AuthClient.getInstance();
      await authClient.login();
      
      const state = authClient.getState();
      console.log('Auth state after login:', state);
      
      if (state.isAuthenticated && state.identity) {
        setIsAuthenticated(true);
        try {
          const userData = await authClient.getUserData();
          if (userData?.avatar) {
            setAvatar(userData.avatar);
          }
        } catch (err) {
          console.error('Failed to fetch user data:', err);
        }
      } else {
        throw new Error('Authentication failed');
      }
    } catch (err) {
      console.error('Login failed:', err);
      setError('Login failed. Please try again.');
      setIsAuthenticated(false);
    } finally {
      setIsLoginPending(false);
    }
  };

  const handleLogout = async () => {
    try {
      const authClient = AuthClient.getInstance();
      await authClient.logout();
      setIsAuthenticated(false);
      setAvatar(null);
      setIsUserMenuOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const togglePlugin = () => {
    setIsPluginActive(!isPluginActive);
  };

  const navigateToPage = (page) => {
    const url = chrome.runtime.getURL(`pages/${page}.html`);
    chrome.tabs.create({ url });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-[360px] h-[600px] bg-[#131217]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col w-[360px] h-[600px] bg-gradient-to-b from-[#131217] via-[#360D68] to-[#131217] text-white overflow-hidden">
        <div className="p-6">
          <div className="flex items-center mb-8">
            <span className="text-xl mr-3 font-mono text-white">{'>^<'}</span>
            <span className="text-xl font-semibold">RhinoSpider</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6">
          <h1 className="text-2xl font-bold mb-3">Sign in</h1>
          <p className="text-gray-300 mb-6">Please login to continue to your account.</p>
          
          {error && (
            <div className="bg-red-900/20 border border-red-500/20 text-red-200 p-3 rounded mb-6">
              {error}
            </div>
          )}
          
          <button
            onClick={handleLogin}
            disabled={isLoginPending}
            className="w-full bg-white/20 hover:bg-white/30 text-white font-medium py-3 px-4 rounded-lg transition-colors mb-8"
          >
            {isLoginPending ? 'Signing in...' : 'Login with Internet Identity'}
          </button>
          
          <div className="text-sm text-gray-300">
            <div className="flex items-center mb-4">
              <span className="mr-2">🔒</span>
              <span>Your data is secure and encrypted</span>
            </div>
            <p>
              By continuing, you agree to our{' '}
              <a href="#" className="text-purple-300 hover:text-purple-200">
                Terms of Service
              </a>
            </p>
          </div>
        </div>

        <div className="h-20"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-[360px] h-[600px] bg-gradient-to-b from-[#131217] via-[#360D68] to-[#131217] text-white overflow-hidden">
      <header className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <span className="text-xl font-mono">{'>^<'}</span>
          <span className="text-xl font-semibold">RhinoSpider</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateToPage('analytics')}
            className="p-2 hover:bg-white/10 rounded-lg"
            title="Analytics"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" />
              <path d="M18 9l-6 6-3-3-5 5" />
            </svg>
          </button>
          <button
            onClick={() => navigateToPage('settings')}
            className="p-2 hover:bg-white/10 rounded-lg"
            title="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors"
            >
              {avatar ? (
                <img src={avatar} alt="User" className="w-8 h-8 rounded-full" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </button>
            
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg bg-[#1A1A1F] border border-white/10 shadow-lg py-1 z-10">
                <div className="px-4 py-2 text-sm text-gray-300 border-b border-white/10">
                  <div className="font-medium">Your Account</div>
                  <div className="text-xs text-gray-400 truncate">Principal ID: {AuthClient.getInstance().getState()?.identity?.getPrincipal()}</div>
                </div>
                <button
                  onClick={() => navigateToPage('profile')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10"
                >
                  Profile Settings
                </button>
                <button
                  onClick={() => navigateToPage('referrals')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10"
                >
                  My Referrals
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/10"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col">
        <div className="text-center mb-6">
          <h2 className="text-lg text-gray-200 mb-2">Current Earnings</h2>
          <div className="text-4xl font-bold mb-4 text-white">{points.toLocaleString()} Points</div>
        </div>

        <button
          onClick={togglePlugin}
          className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center transition-all ${
            isPluginActive ? 'bg-white/20 hover:bg-white/30' : 'bg-white/10 hover:bg-white/20'
          }`}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
            <line x1="12" y1="2" x2="12" y2="12" />
          </svg>
        </button>

        <div className="text-center mb-6">
          <div className={`text-sm font-medium ${isPluginActive ? 'text-green-400' : 'text-red-400'}`}>
            {isPluginActive ? 'Your plugin is active. No action required.' : 'Plugin is disconnected. Click to connect!'}
          </div>
          <div className="text-sm text-gray-200 mt-2">
            <span className="font-medium">Uptime:</span> {uptime}
          </div>
          <div className="text-sm text-gray-300 mt-1">
            Great job! Keep contributing to secure your next milestone reward.
          </div>
        </div>

        <div className="mt-auto space-y-3 pb-4">
          <button
            onClick={() => navigator.clipboard.writeText('your-referral-link')}
            className="w-full bg-white/20 hover:bg-white/30 text-white py-3 rounded-lg transition-colors"
          >
            Copy Your Referral Link
          </button>
          <button
            onClick={() => navigateToPage('referrals')}
            className="w-full bg-white/20 hover:bg-white/30 text-white py-3 rounded-lg transition-colors"
          >
            View My Referrals
          </button>
          <button
            onClick={() => navigateToPage('analytics')}
            className="w-full bg-white/20 hover:bg-white/30 text-white py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <span>Desktop Dashboard</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        </div>
      </main>
    </div>
  );
};

export default Popup;
