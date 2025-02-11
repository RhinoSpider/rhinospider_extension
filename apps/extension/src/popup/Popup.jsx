import React, { useState, useEffect, useRef } from 'react';
import { AuthClient, AuthProvider } from '@rhinospider/web3-client';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Settings from '../pages/Settings';
import Profile from '../pages/Profile';
import Referrals from '../pages/Referrals';
import Home from './Home';
import './Popup.css';

const Popup = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginPending, setIsLoginPending] = useState(false);
  const [error, setError] = useState(null);
  const [avatar, setAvatar] = useState(null);
  const [points, setPoints] = useState(9130);
  const [uptime, setUptime] = useState('2 hrs 45 mins');
  const [isPluginActive, setIsPluginActive] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [bandwidthSpeed, setBandwidthSpeed] = useState('medium'); // Can be 'low', 'medium', 'high'
  const [currentSpeed, setCurrentSpeed] = useState('2.5 MB/s');
  const [principal, setPrincipal] = useState(null);
  const userMenuRef = useRef(null);

  // Default avatar data URL (a simple grey circle)
  const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iI0U1RTdFQiIvPjxwYXRoIGQ9Ik0yMCAxOUMyMi43NjE0IDE5IDI1IDIxLjIzODYgMjUgMjRDMjUgMjYuNzYxNCAyMi43NjE0IDI5IDIwIDI5QzE3LjIzODYgMjkgMTUgMjYuNzYxNCAxNSAyNEMxNSAyMS4yMzg2IDE3LjIzODYgMTkgMjAgMTlaIiBmaWxsPSIjOUVBM0FCIi8+PC9zdmc+';

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        const authClient = AuthClient.getInstance();
        const state = await authClient.initialize();
        
        // Update background script with auth state
        await chrome.runtime.sendMessage({ type: 'UPDATE_AUTH_STATE', state });
        
        if (state.isAuthenticated && state.identity) {
          setIsAuthenticated(true);
          setAvatar(DEFAULT_AVATAR);
          
          // Store principal as string
          if (state.identity.getPrincipal) {
            setPrincipal(state.identity.getPrincipal().toString());
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

    // Listen for auth state changes
    const handleAuthStateChange = (message) => {
      if (message.type === 'AUTH_STATE_CHANGED') {
        const newState = message.state;
        if (newState.isAuthenticated) {
          setIsAuthenticated(true);
          setAvatar(DEFAULT_AVATAR);
          
          // Store principal as string
          if (newState.identity?.getPrincipal) {
            setPrincipal(newState.identity.getPrincipal().toString());
          }
        } else {
          setIsAuthenticated(false);
          setAvatar(null);
          setPrincipal(null);
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleAuthStateChange);
    return () => chrome.runtime.onMessage.removeListener(handleAuthStateChange);
  }, []);

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

  const handleLogin = async () => {
    try {
      setIsLoginPending(true);
      setError(null);
      const authClient = AuthClient.getInstance();
      await authClient.login();
      const state = authClient.getState();
      
      // Update background script with auth state
      await chrome.runtime.sendMessage({ type: 'UPDATE_AUTH_STATE', state });
      
      if (state.isAuthenticated) {
        setIsAuthenticated(true);
        setAvatar(DEFAULT_AVATAR);
        
        // Store principal as string
        if (state.identity?.getPrincipal) {
          setPrincipal(state.identity.getPrincipal().toString());
        }
      } else if (state.error) {
        // Only show error if it's not a user cancellation
        if (state.error.message !== 'Login cancelled') {
          setError(state.error.message);
        }
      }
    } catch (error) {
      console.error('Login failed:', error);
      // Only show error if it's not a user cancellation
      if (error.message !== 'Login cancelled') {
        setError(error.message || 'Failed to login');
      }
    } finally {
      setIsLoginPending(false);
    }
  };

  const handleLogout = async () => {
    try {
      const authClient = AuthClient.getInstance();
      await authClient.logout();
      const state = authClient.getState();
      
      // Update background script with auth state
      await chrome.runtime.sendMessage({ type: 'UPDATE_AUTH_STATE', state });
      
      setIsAuthenticated(false);
      setAvatar(null);
      setIsUserMenuOpen(false);
      setPrincipal(null);
    } catch (error) {
      console.error('Logout failed:', error);
      setError('Failed to logout');
    }
  };

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
    <AuthProvider>
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
                    onClick={() => window.open(chrome.runtime.getURL('pages/analytics.html'), '_blank')}
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

        <Routes>
          <Route path="/" element={
            <Home 
              points={points} 
              uptime={uptime} 
              isPluginActive={isPluginActive} 
              togglePlugin={togglePlugin}
              bandwidthSpeed={bandwidthSpeed}
              currentSpeed={currentSpeed}
            />
          } />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/referrals" element={<Referrals />} />
        </Routes>
      </div>
    </AuthProvider>
  );
};

export default Popup;
