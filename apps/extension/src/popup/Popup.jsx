import { AuthClient } from '@dfinity/auth-client';
import { HttpAgent, Actor, AnonymousIdentity } from '@dfinity/agent';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { idlFactory } from '../declarations/consumer/consumer.did.js';
import Home from './Home';
import Settings from '../pages/Settings';
import Profile from '../pages/Profile';
import Referrals from '../pages/Referrals';
import Analytics from './Analytics';
import { Routes, Route } from 'react-router-dom';
import { DelegationChain, DelegationIdentity } from '@dfinity/identity';
import { Principal } from '@dfinity/principal';
import { toHex, derToRaw } from '../utils/hex';

// Environment variables
const CONSUMER_CANISTER_ID = import.meta.env.VITE_CONSUMER_CANISTER_ID;
const II_URL = import.meta.env.VITE_II_URL;
const IC_HOST = import.meta.env.VITE_IC_HOST;

console.log('Environment variables:', {
  CONSUMER_CANISTER_ID,
  II_URL,
  IC_HOST
});

// Constants for II configuration
const MAX_TTL = BigInt(30 * 60 * 1000 * 1000 * 1000); // 30 minutes in nanoseconds
const LOGIN_WINDOW_FEATURES = 
  `left=${window.screen.width / 2 - 250},` +
  `top=${window.screen.height / 2 - 350},` +
  `width=500,height=700,` +
  `popup=yes,toolbar=no,menubar=no,` +
  `resizable=no,location=no`;

const Popup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Auth states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [principal, setPrincipal] = useState(null);
  const [authClient, setAuthClient] = useState(null);

  // UI states
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [points, setPoints] = useState(9130);
  const [uptime, setUptime] = useState('2 hrs 45 mins');
  const [isPluginActive, setIsPluginActive] = useState(true);
  const [bandwidthSpeed, setBandwidthSpeed] = useState('medium');
  const [currentSpeed, setCurrentSpeed] = useState('2.5 MB/s');
  const [avatar, setAvatar] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const userMenuRef = useRef(null);

  // Initialize auth on component mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Create auth client
        console.log('Creating AuthClient...');
        const client = await AuthClient.create({
          idleOptions: {
            disableDefaultIdleCallback: true,
            disableIdle: true
          }
        });
        console.log('AuthClient created successfully');
        setAuthClient(client);

        // Check if already authenticated
        const isAuthed = await client.isAuthenticated();
        console.log('Initial auth check:', isAuthed);
        
        if (isAuthed) {
          console.log('User is already authenticated, getting identity...');
          await handleAuthenticated(client);
        } else {
          console.log('User is not authenticated');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        setError('Failed to initialize authentication');
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  useEffect(() => {
    // Listen for speed updates from background script
    const messageListener = (message) => {
      if (message.type === 'SPEED_UPDATE') {
        setCurrentSpeed(message.data.currentSpeed);
        setBandwidthSpeed(message.data.bandwidthSpeed);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Cleanup listener on unmount
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  useEffect(() => {
    console.log('Current speed:', currentSpeed);
    console.log('Current bandwidth level:', bandwidthSpeed);
  }, [currentSpeed, bandwidthSpeed]);

  const handleAuthenticated = async (client) => {
    try {
      console.log('Getting identity...');
      const identity = client.getIdentity();
      console.log('Identity:', {
        type: identity?.constructor.name,
        principal: identity?.getPrincipal()?.toText()
      });

      // Get delegation chain from identity
      const delegation = await identity.getDelegation();
      console.log('Raw delegation:', {
        type: delegation?.constructor?.name,
        hasDelegations: !!delegation?.delegations,
        delegationsLength: delegation?.delegations?.length
      });
      
      // Validate delegation chain
      if (!delegation?.delegations?.length) {
        throw new Error('Invalid delegation chain from Internet Identity');
      }

      // Extract first delegation
      const firstDelegation = delegation.delegations[0];
      if (!firstDelegation?.delegation?.pubkey || !firstDelegation?.signature) {
        throw new Error('Missing required fields in delegation');
      }

      // Convert binary data to arrays for Chrome message passing
      const delegationChain = {
        delegations: [{
          delegation: {
            pubkey: Array.from(new Uint8Array(firstDelegation.delegation.pubkey)),
            expiration: firstDelegation.delegation.expiration.toString(), // Send as decimal string
            targets: firstDelegation.delegation.targets ? firstDelegation.delegation.targets.map(t => t.toText()) : []
          },
          signature: Array.from(new Uint8Array(firstDelegation.signature))
        }]
      };

      // Use same pubkey for chain public key
      delegationChain.publicKey = delegationChain.delegations[0].delegation.pubkey;

      // Log what we're sending
      console.log('Sending delegation chain:', {
        publicKey: {
          type: 'Array',
          length: delegationChain.publicKey.length,
          sample: delegationChain.publicKey.slice(0, 5)
        },
        delegations: delegationChain.delegations.map(d => ({
          pubkey: {
            type: 'Array',
            length: d.delegation.pubkey.length,
            sample: d.delegation.pubkey.slice(0, 5)
          },
          expiration: d.delegation.expiration,
          signature: {
            type: 'Array',
            length: d.signature.length,
            sample: d.signature.slice(0, 5)
          }
        }))
      });

      // Send to background script using Chrome messaging
      await chrome.runtime.sendMessage({
        type: 'LOGIN_COMPLETE',
        delegationChain,
        principalId: identity.getPrincipal().toText()
      });

      // Store auth state and notify background
      const principal = identity.getPrincipal().toText();
      
      // Create delegation chain with principal
      const delegationChainWithPrincipal = {
        ...delegationChain,
        principal  // Add principal as string
      };

      // Store delegation chain in Chrome's local storage for background script
      await chrome.storage.local.set({
        delegationChain: delegationChainWithPrincipal,
        principalId: principal
      });

      // Store auth state
      await chrome.storage.local.set({
        authState: JSON.stringify({
          isAuthenticated: true,
          principal,
          isInitialized: true,
          error: null
        })
      });

      // Update UI state
      setIsAuthenticated(true);
      setPrincipal(principal);
      setError(null);
      setIsLoading(false);
    } catch (error) {
      console.error('Error in handleAuthenticated:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        error: JSON.stringify(error, Object.getOwnPropertyNames(error))
      });
      setError('Failed to initialize authentication: ' + error.message);
      setIsLoading(false);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      if (authClient) {
        await authClient.logout();
      }

      // Create anonymous actor to notify consumer
      const agent = new HttpAgent({
        host: IC_HOST,
        identity: new AnonymousIdentity()
      });

      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: CONSUMER_CANISTER_ID
      });

      // Notify consumer of logout
      await actor.clearAuth();

      // Clear local state
      setIsAuthenticated(false);
      setPrincipal(null);
      setError(null);

      // Clear delegation chain
      await chrome.storage.local.remove(['identityInfo']);

      // Notify background
      await chrome.runtime.sendMessage({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
      setError('Failed to logout');
    }
  };

  const login = async () => {
    try {
      console.log('Starting login process...');
      setIsLoading(true);
      setError(null);

      if (!authClient) {
        console.error('Auth client not initialized');
        throw new Error('Auth client not initialized');
      }

      if (!II_URL) {
        console.error('II_URL not configured');
        throw new Error('Internet Identity URL not configured');
      }

      console.log('Starting II login with URL:', II_URL);
      await authClient.login({
        identityProvider: II_URL,
        maxTimeToLive: MAX_TTL,
        windowOpenerFeatures: LOGIN_WINDOW_FEATURES,
        onSuccess: async () => {
          console.log('II login successful, getting identity...');
          await handleAuthenticated(authClient);
        },
        onError: (error) => {
          console.error('II login error:', error);
          setError('Failed to login with Internet Identity');
          setIsLoading(false);
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to start login process: ' + error.message);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Update activeTab based on current route
    const path = location.pathname.substring(1) || 'home';
    setActiveTab(path);
  }, [location]);

  const navigateToPage = (page) => {
    navigate(`/${page}`);
    setIsUserMenuOpen(false); // Close menu when navigating
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const agent = new HttpAgent({ host: IC_HOST });
      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: CONSUMER_CANISTER_ID,
      });
      const response = await actor.checkAuthStatus();
      setIsAuthenticated(response.isAuthenticated);
      if (response.principal) {
        setPrincipal(response.principal);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setError('Failed to check authentication status');
    }
  };

  const fetchTopics = async () => {
    try {
      const agent = new HttpAgent({ host: IC_HOST });
      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: CONSUMER_CANISTER_ID,
      });
      const response = await actor.getTopics();
      setTopics(response.topics);
    } catch (error) {
      console.error('Error fetching topics:', error);
      setError('Failed to fetch topics');
    }
  };

  const togglePlugin = async () => {
    try {
      // Toggle the plugin state
      const newState = !isPluginActive;
      setIsPluginActive(newState);
      
      // Send message to background script to update scraping state
      const response = await chrome.runtime.sendMessage({ 
        type: newState ? 'START_SCRAPING' : 'STOP_SCRAPING' 
      });
      
      console.log('Background script response:', response);
      
      // Also update the storage state
      await chrome.storage.local.set({ isActive: newState });
      
      // If we want to trigger an immediate scrape when activated
      if (newState) {
        chrome.runtime.sendMessage({ type: 'PERFORM_SCRAPE' });
      }
    } catch (error) {
      console.error('Error toggling plugin state:', error);
      // Revert UI state if there was an error
      setIsPluginActive(!newState);
    }
  };

  // Default avatar
  const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iI0U1RTdFQiIvPjxwYXRoIGQ9Ik0yMCAxOUMyMi43NjE0IDE5IDI1IDIxLjIzODYgMjUgMjRDMjUgMjYuNzYxNCAyMi43NjE0IDI5IDIwIDI5QzE3LjIzODYgMjkgMTUgMjYuNzYxNCAxNSAyNEMxNSAyMS4yMzg2IDE3LjIzODYgMTkgMjAgMTlaIiBmaWxsPSIjOUVBM0FCIi8+PC9zdmc+';

  return (
    <div className="w-[360px] min-h-[600px] bg-gradient-to-b from-[#131217] via-[#360D68] to-[#131217] text-white">
      {!isAuthenticated ? (
        <div className="flex flex-col h-full">
          <div className="p-6">
            <div className="flex items-center mb-8">
              <span className="text-xl mr-3 font-mono text-white">{'>.<'}</span>
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
              onClick={login}
              className={`w-full font-medium py-3 px-4 rounded-lg transition-colors mb-8 ${
                isLoading 
                ? 'bg-white/10 text-white/50 cursor-not-allowed' 
                : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"></div>
                  <span>Connecting...</span>
                </div>
              ) : (
                'Login with Internet Identity'
              )}
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
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-lg">{">.<"}</span>
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
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/10"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4">
            {isAuthenticated && (
              <Routes>
                <Route path="/" element={<Home points={points} uptime={uptime} isPluginActive={isPluginActive} togglePlugin={togglePlugin} bandwidthSpeed={bandwidthSpeed} currentSpeed={currentSpeed} />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/referrals" element={<Referrals />} />
              </Routes>
            )}
          </div>
        </div>
      )}
    </div>
  );

};

export default Popup;
