import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Settings from '../pages/Settings';
import Profile from '../pages/Profile';
import Referrals from '../pages/Referrals';
import Home from './Home';
import Analytics from './Analytics';
import './Popup.css';
import { AuthClient } from '@dfinity/auth-client';

// Constants
const II_URL = 'https://identity.ic0.app';
const MAX_TTL = BigInt(30 * 60 * 1000 * 1000 * 1000); // 30 minutes in nanoseconds

const Popup = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [principal, setPrincipal] = useState(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [points, setPoints] = useState(9130);
  const [uptime, setUptime] = useState('2 hrs 45 mins');
  const [isPluginActive, setIsPluginActive] = useState(true);
  const [bandwidthSpeed, setBandwidthSpeed] = useState('medium');
  const [currentSpeed, setCurrentSpeed] = useState('2.5 MB/s');
  const userMenuRef = useRef(null);
  const [authClient, setAuthClient] = useState(null);
  const [avatar, setAvatar] = useState(null);

  // Default avatar
  const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iI0U1RTdFQiIvPjxwYXRoIGQ9Ik0yMCAxOUMyMi43NjE0IDE5IDI1IDIxLjIzODYgMjUgMjRDMjUgMjYuNzYxNCAyMi43NjE0IDI5IDIwIDI5QzE3LjIzODYgMjkgMTUgMjYuNzYxNCAxNSAyNEMxNSAyMS4yMzg2IDE3LjIzODYgMTkgMjAgMTlaIiBmaWxsPSIjOUVBM0FCIi8+PC9zdmc+';

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Create auth client
        const client = await AuthClient.create({
          idleOptions: {
            idleTimeout: 30 * 60 * 1000, // 30 minutes
            disableDefaultIdleCallback: true
          }
        });
        setAuthClient(client);

        // Check if already authenticated
        const isAuthed = await client.isAuthenticated();
        if (isAuthed) {
          const identity = client.getIdentity();
          if (!identity.getPrincipal().isAnonymous()) {
            setIsAuthenticated(true);
            setPrincipal(identity.getPrincipal().toText());
            setAvatar(DEFAULT_AVATAR);
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setError('Failed to initialize authentication');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const handleLogin = async () => {
    setError(null);
    try {
      // Initialize auth client
      const authClient = await AuthClient.create({
        idleOptions: {
          idleTimeout: 30 * 60 * 1000,
          disableDefaultIdleCallback: true
        }
      });

      // Start login in a popup window
      await new Promise((resolve, reject) => {
        authClient.login({
          identityProvider: II_URL,
          maxTimeToLive: MAX_TTL,
          windowOpenerFeatures: 
            'width=500,' +
            'height=700,' +
            'left=' + Math.max(0, Math.floor((window.screen.width - 500) / 2)) + ',' +
            'top=' + Math.max(0, Math.floor((window.screen.height - 700) / 2)) + ',' +
            'popup=yes,location=no',
          onSuccess: async () => {
            try {
              const identity = authClient.getIdentity();
              if (identity.getPrincipal().isAnonymous()) {
                reject(new Error('Anonymous principal not allowed'));
                return;
              }

              // Get delegation chain for storage
              const delegation = identity.getDelegation();
              const delegationChain = delegation ? {
                delegations: delegation.delegations.map(d => ({
                  delegation: {
                    pubkey: Array.from(d.delegation.pubkey),
                    expiration: d.delegation.expiration.toString(),
                    targets: d.delegation.targets?.map(t => t.toText())
                  },
                  signature: Array.from(d.signature)
                })),
                publicKey: Array.from(delegation.publicKey)
              } : null;

              // Store auth state
              const authState = {
                isAuthenticated: true,
                principal: identity.getPrincipal().toText(),
                delegationChain
              };

              // Store in extension storage
              await chrome.storage.local.set({ authState });

              // Notify background script
              await chrome.runtime.sendMessage({
                type: 'AUTH_STATE_CHANGED',
                data: authState
              });

              // Update UI
              setIsAuthenticated(true);
              setPrincipal(identity.getPrincipal().toText());
              setAvatar(DEFAULT_AVATAR);
              resolve();
            } catch (error) {
              console.error('Login error:', error);
              reject(error);
            }
          },
          onError: (error) => {
            console.error('Login error:', error);
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('Login failed:', error);
      setError(error.message || 'Failed to login');
    }
  };

  const handleLogout = async () => {
    try {
      if (authClient) {
        await authClient.logout();
        setIsAuthenticated(false);
        setPrincipal(null);
        setAvatar(null);
        setIsUserMenuOpen(false);

        // Clear stored auth state
        await chrome.storage.local.remove('authState');

        // Notify background script
        await chrome.runtime.sendMessage({
          type: 'AUTH_STATE_CHANGED',
          data: {
            isAuthenticated: false,
            principal: null
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      setError('Failed to logout');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Simulating bandwidth speed updates
    const updateSpeed = () => {
      // This would be replaced with actual speed measurement
      const speeds = ['low', 'medium', 'high'];
      const speedValues = ['1.2 MB/s', '2.5 MB/s', '5.0 MB/s'];
      const randomIndex = Math.floor(Math.random() * speeds.length);
      setBandwidthSpeed(speeds[randomIndex]);
      setCurrentSpeed(speedValues[randomIndex]);
    };

    const interval = setInterval(updateSpeed, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const togglePlugin = () => {
    setIsPluginActive(!isPluginActive);
  };

  const navigateToPage = (page) => {
    navigate(`/${page}`);
    setIsUserMenuOpen(false);
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
            className="w-full bg-white/20 hover:bg-white/30 text-white font-medium py-3 px-4 rounded-lg transition-colors mb-8"
          >
            Login with Internet Identity
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
    <div className="w-[400px] min-h-[600px] bg-gradient-to-br from-[#131217] via-[#360D68] to-[#B692F6] text-white">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <span className="font-mono text-lg">{">^<"}</span>
          <span className="font-semibold text-white">RhinoSpider</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateToPage('settings')}
            className="p-2 hover:bg-white/10 rounded-lg"
            title="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-2 p-2 hover:bg-white/10 rounded-lg"
            >
              {avatar ? (
                <img src={avatar} alt="User" className="w-6 h-6 rounded-full" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}
            </button>
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#1B1B1F] rounded-lg shadow-xl border border-white/10 py-1 z-50">
                <div className="px-4 py-2 text-sm text-gray-300 border-b border-white/10">
                  <div className="font-medium">Your Account</div>
                  <div className="text-xs text-gray-400 truncate">
                    {principal}
                  </div>
                </div>
                <button
                  onClick={() => navigateToPage('profile')}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10"
                >
                  Profile
                </button>
                <button
                  onClick={() => navigateToPage('analytics')}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10"
                >
                  Analytics
                </button>
                <button
                  onClick={() => navigateToPage('referrals')}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10"
                >
                  Referrals
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 border-t border-white/10"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6">
        <Home 
          points={points} 
          uptime={uptime} 
          isPluginActive={isPluginActive} 
          togglePlugin={togglePlugin}
          bandwidthSpeed={bandwidthSpeed}
          currentSpeed={currentSpeed}
        />
      </div>
    </div>
  );
};

export default Popup;
