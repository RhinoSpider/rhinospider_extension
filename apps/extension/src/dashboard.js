// Simple dashboard implementation for RhinoSpider extension
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RhinoScan } from './pages/RhinoScan.jsx';
import './analytics.js';

// Configuration
const II_URL = 'https://identity.internetcomputer.org';
// Local development URL - not used in production
// const LOCAL_II_CANISTER = 'http://127.0.0.1:4943/?canisterId=rdmx6-jaaaa-aaaaa-aaadq-cai';

// DOM Elements
let loginContainer;
let dashboardContainer;
let loginButton;
let logoutButton;
let navItems;
let contentSections;
let extensionToggle;
let extensionStatusText;
let userProfileElement;
let pointsElement;
let pagesElement;
let bandwidthUsedElement;
let currentSpeedElement;
let referralCodeDisplay;
let referralStats;

// Auth state
let authClient = null;
let isAuthenticated = false;
let currentPrincipal = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initialize);

async function initialize() {
    // Get DOM elements
    loginContainer = document.getElementById('login-container');
    dashboardContainer = document.getElementById('dashboard-container');
    loginButton = document.getElementById('login-button');
    logoutButton = document.getElementById('logout-button');
    navItems = document.querySelectorAll('.nav-item');
    contentSections = document.querySelectorAll('.content-section');
    extensionToggle = document.getElementById('extensionStatus');
    extensionStatusText = document.getElementById('extensionStatusText');
    userProfileElement = document.getElementById('userProfile');
    pointsElement = document.getElementById('pointsEarned');
    pagesElement = document.getElementById('pagesScraped');
    bandwidthUsedElement = document.getElementById('bandwidthUsed');
    currentSpeedElement = document.getElementById('currentSpeed');
    
    // Storage listener will handle logout trigger from popup (see storage.onChanged below)
    // Set up event listeners
    if (loginButton) loginButton.addEventListener('click', handleLogin);
    if (logoutButton) logoutButton.addEventListener('click', handleLogout);
    
    // Also add listener for header logout button
    const headerLogoutBtn = document.getElementById('headerLogoutBtn');
    if (headerLogoutBtn) headerLogoutBtn.addEventListener('click', handleLogout);
    
    if (extensionToggle) extensionToggle.addEventListener('change', handleExtensionToggle);
    
    // Navigation setup
    navItems.forEach(item => {
        item.addEventListener('click', () => handleNavigation(item.dataset.target));
    });
    
    // Initialize auth client
    authClient = await AuthClient.create();
    
    // Check authentication status
    await checkAuthStatus();
    
    // Update header principal when logged in
    if (currentPrincipal) {
        const headerPrincipal = document.getElementById('headerPrincipal');
        if (headerPrincipal) {
            headerPrincipal.textContent = currentPrincipal.slice(0, 8) + '...';
        }
    }
    
    // Refresh data periodically if authenticated
    setInterval(async () => {
        if (isAuthenticated && currentPrincipal) {
            console.log('Refreshing dashboard data...');
            await loadDashboardData();
        }
    }, 30000); // Every 30 seconds
    
    // Listen for storage changes to update the dashboard in real-time
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
            // Check for logout trigger from popup - JUST LIKE TOGGLE!
            if (changes.triggerLogout && changes.triggerLogout.newValue === true) {
                console.log('Dashboard: Detected logout trigger from popup via storage');
                // Clear the trigger flag immediately
                chrome.storage.local.remove(['triggerLogout', 'triggerLogoutTime']);
                // Call logout
                handleLogout();
            }
            
            // Update extension status if it changes
            if (changes.enabled || changes.isScrapingActive) {
                const enabled = changes.enabled?.newValue || changes.isScrapingActive?.newValue || false;
                if (extensionToggle) {
                    extensionToggle.checked = enabled;
                }
                updateExtensionStatusText(enabled);
            }
            
            // Update ONLY session stats when storage changes (don't overwrite canister data)
            if (changes.sessionPagesScraped) {
                const sessionPagesEl = document.getElementById('sessionPagesScraped');
                if (sessionPagesEl) {
                    sessionPagesEl.textContent = changes.sessionPagesScraped.newValue || 0;
                }
            }
            if (changes.sessionBandwidthUsed) {
                const sessionBandwidthEl = document.getElementById('sessionBandwidthUsed');
                if (sessionBandwidthEl) {
                    sessionBandwidthEl.textContent = formatBandwidth(changes.sessionBandwidthUsed.newValue || 0);
                }
            }
            // Don't update main counters here - they should only show canister data
            if (changes.currentInternetSpeed && currentSpeedElement) {
                const speed = changes.currentInternetSpeed.newValue;
                if (speed && speed.speedMbps) {
                    currentSpeedElement.textContent = `${speed.speedMbps} Mbps`;
                    currentSpeedElement.style.color = getSpeedColor(speed.bandwidthScore);
                }
            }
        }
    });
}

async function checkAuthStatus() {
    try {
        // Check if authenticated with Internet Identity
        isAuthenticated = await authClient.isAuthenticated();
        
        if (isAuthenticated) {
            const identity = authClient.getIdentity();
            currentPrincipal = identity.getPrincipal().toString();
            
            // Store principal and authentication status in Chrome storage
            await chrome.storage.local.set({ 
                principalId: currentPrincipal,
                isAuthenticated: true 
            });
            
            showDashboard();
            await loadDashboardData();
        } else {
            // Check Chrome storage for existing auth
            const stored = await chrome.storage.local.get(['principalId']);
            if (stored.principalId) {
                currentPrincipal = stored.principalId;
                isAuthenticated = true;
                // Ensure isAuthenticated is persisted to storage
                await chrome.storage.local.set({ isAuthenticated: true });
                showDashboard();
                await loadDashboardData();
            } else {
                showLogin();
            }
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        showLogin();
    }
}

function showLogin() {
    loginContainer.classList.add('visible');
    dashboardContainer.classList.add('hidden');
}

function showDashboard() {
    loginContainer.classList.remove('visible');
    dashboardContainer.classList.remove('hidden');
}

async function handleLogin() {
    try {
        // Track login attempt
        if (window.analytics) {
            window.analytics.sendEvent('login_attempt', {
                event_category: 'engagement',
                event_label: 'dashboard'
            });
        }
        
        loginButton.disabled = true;
        loginButton.textContent = 'Logging in...';
        
        await authClient.login({
            identityProvider: II_URL,
            windowOpenerFeatures: `
                left=${window.screen.width / 2 - 400},
                top=${window.screen.height / 2 - 300},
                toolbar=0,location=0,menubar=0,width=800,height=600
            `,
            onSuccess: async () => {
                const identity = authClient.getIdentity();
                currentPrincipal = identity.getPrincipal().toString();
                
                // Track successful login
                if (window.analytics) {
                    window.analytics.trackLogin('internet_identity');
                }
                
                // Get the user's actual referral code from the consumer canister
                try {
                    const response = await fetch('https://ic-proxy.rhinospider.com/api/consumer-referral-code', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            principalId: currentPrincipal
                        })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data.referralCode) {
                            // Store the user's actual referral code
                            await chrome.storage.local.set({ 
                                principalId: currentPrincipal,
                                isAuthenticated: true,
                                userReferralCode: data.referralCode,
                                referralCode: data.referralCode
                            });
                            console.log('Got user referral code:', data.referralCode);
                        }
                    }
                } catch (err) {
                    console.log('Could not fetch referral code:', err);
                    // Still continue with login even if we can't get referral code
                    await chrome.storage.local.set({ 
                        principalId: currentPrincipal,
                        isAuthenticated: true 
                    });
                }
                
                // Notify background script
                await chrome.runtime.sendMessage({
                    type: 'LOGIN_COMPLETE',
                    principalId: currentPrincipal
                });
                
                isAuthenticated = true;
                showDashboard();
                await loadDashboardData();
            },
            onError: (error) => {
                console.error('Login error:', error);
                showError('Login failed. Please try again.');
                loginButton.disabled = false;
                loginButton.textContent = 'Login with Internet Identity';
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        showError('Login failed. Please try again.');
        loginButton.disabled = false;
        loginButton.textContent = 'Login with Internet Identity';
    }
}

async function handleLogout() {
    try {
        // Logout from Internet Identity first
        await authClient.logout();
        
        // Notify background script to handle complete logout
        const response = await chrome.runtime.sendMessage({ type: 'LOGOUT' });
        
        if (response && response.success) {
            // Reset local state
            isAuthenticated = false;
            currentPrincipal = null;
            
            // Close the dashboard tab
            window.close();
        } else {
            // If background logout fails, try direct cleanup
            await chrome.storage.local.clear();
            await chrome.storage.session.clear();
            
            // Still try to close the tab
            window.close();
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Even if logout fails, try to clear local data
        await chrome.storage.local.set({ 
            enabled: false, 
            isScrapingActive: false 
        });
        await chrome.storage.local.remove([
            'isAuthenticated',
            'userReferralCode',
            'referralCode'
        ]);
        isAuthenticated = false;
        currentPrincipal = null;
        window.location.reload();
    }
}

let rhinoscanRoot = null;

function handleNavigation(target) {
    // Update active states
    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.target === target);
    });
    
    contentSections.forEach(section => {
        section.classList.toggle('active', section.id === target);
    });
    
    // Load specific section data if needed
    if (target === 'referrals') {
        loadReferralData();
    } else if (target === 'rhinoscan') {
        // Mount RhinoScan React component when selected
        const rhinoscanContainer = document.getElementById('rhinoscan-content');
        if (rhinoscanContainer && !rhinoscanRoot) {
            rhinoscanRoot = ReactDOM.createRoot(rhinoscanContainer);
            rhinoscanRoot.render(React.createElement(RhinoScan));
        }
    } else if (target === 'settings') {
        // Add privacy policy toggle listener when settings section is loaded
        setTimeout(() => {
            const privacyToggleBtn = document.getElementById('privacyPolicyToggle');
            if (privacyToggleBtn && !privacyToggleBtn.hasEventListener) {
                privacyToggleBtn.addEventListener('click', togglePrivacyPolicy);
                privacyToggleBtn.hasEventListener = true;
            }
        }, 100);
    }
}

async function handleExtensionToggle() {
    const enabled = extensionToggle.checked;
    
    try {
        await chrome.storage.local.set({ enabled, isScrapingActive: enabled });
        await chrome.runtime.sendMessage({
            type: 'SET_STATE',
            enabled,
            isScrapingActive: enabled
        });
        
        // Update status text immediately
        updateExtensionStatusText(enabled);
        
        // Update badge
        chrome.action.setBadgeText({ text: enabled ? 'ON' : 'OFF' });
        chrome.action.setBadgeBackgroundColor({ color: enabled ? '#4CAF50' : '#9E9E9E' });
    } catch (error) {
        console.error('Error toggling extension:', error);
    }
}

// Refresh dashboard data (called after actions like applying referral)
async function refreshDashboardData() {
    console.log('Refreshing dashboard data...');
    await loadDashboardData();
    // loadExtensionStats is not defined, skip it
    await loadReferralData();
}

async function loadDashboardData() {
    try {
        // Load extension state and statistics
        const state = await chrome.storage.local.get([
            'enabled', 
            'isScrapingActive', 
            'usedReferralCode', 
            'referredBy',
            'sessionStartTime',
            'sessionPagesScraped',
            'sessionSuccessCount',
            'sessionFailureCount',
            'totalScrapeTime',
            'lastScrapeTime'
        ]);
        const isEnabled = state.enabled !== false;
        if (extensionToggle) {
            extensionToggle.checked = isEnabled;
        }
        // Update status text
        updateExtensionStatusText(isEnabled);
        
        // Update scraping statistics dynamically
        updateScrapingStatistics(state);
        
        // Set up interval to update statistics every 5 seconds while extension is active
        if (state.enabled && !window.statsUpdateInterval) {
            window.statsUpdateInterval = setInterval(async () => {
                const currentState = await chrome.storage.local.get([
                    'sessionStartTime',
                    'sessionPagesScraped',
                    'sessionSuccessCount',
                    'sessionFailureCount',
                    'totalScrapeTime',
                    'enabled'
                ]);
                
                if (currentState.enabled) {
                    updateScrapingStatistics(currentState);
                } else {
                    // Clear interval if extension is disabled
                    clearInterval(window.statsUpdateInterval);
                    window.statsUpdateInterval = null;
                }
            }, 5000);
        } else if (!state.enabled && window.statsUpdateInterval) {
            // Clear interval if extension is disabled
            clearInterval(window.statsUpdateInterval);
            window.statsUpdateInterval = null;
        }
        
        // Load user profile
        if (userProfileElement) {
            userProfileElement.textContent = `Principal ID: ${currentPrincipal || 'Not logged in'}`;
        }
        
        // Display referral history if user was referred
        if (state.usedReferralCode) {
            const referralHistoryEl = document.getElementById('referral-history');
            if (referralHistoryEl) {
                referralHistoryEl.innerHTML = `
                    <div style="background: #e3f2fd; padding: 10px; border-radius: 5px; margin: 10px 0;">
                        <strong>Referral Status:</strong><br>
                        You were referred with code: <code>${state.usedReferralCode}</code><br>
                        <small>Referred by: ${state.referredBy || 'Unknown'}</small>
                    </div>
                `;
            }
        }
        
        // ALWAYS fetch real user data from consumer canister by principal
        try {
            console.log('Fetching user profile for principal:', currentPrincipal);
            
            if (currentPrincipal) {
                // Get user profile by principal ID - more reliable than referral code
                const response = await fetch('https://ic-proxy.rhinospider.com/api/user-profile-by-principal', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        principalId: currentPrincipal
                    })
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    
                    // Update display with YOUR real data from canister - NO MIXING WITH LOCAL
                    if (pointsElement) {
                        pointsElement.textContent = userData.points || 0;
                    }
                    
                    // Update split points display
                    const pointsFromScrapingEl = document.getElementById('pointsFromScraping');
                    const pointsFromReferralsEl = document.getElementById('pointsFromReferrals');
                    
                    // Use canister-provided points breakdown if available, otherwise calculate
                    let referralPoints = 0;
                    let scrapingPoints = 0;
                    
                    if (userData.pointsFromReferrals !== undefined && userData.pointsFromScraping !== undefined) {
                        // Use the actual values from canister (most accurate)
                        referralPoints = userData.pointsFromReferrals;
                        scrapingPoints = userData.pointsFromScraping;
                        console.log('Using canister-provided points breakdown:', { referralPoints, scrapingPoints });
                    } else {
                        // Fall back to calculated values for older accounts
                        console.log('Canister missing points breakdown, calculating from referralCount');
                        const referralCount = userData.referralCount || 0;
                        
                        // Calculate using tiered system
                        if (referralCount <= 10) {
                            referralPoints = referralCount * 100;
                        } else if (referralCount <= 30) {
                            referralPoints = 1000 + (referralCount - 10) * 50;
                        } else if (referralCount <= 70) {
                            referralPoints = 2000 + (referralCount - 30) * 25;
                        } else {
                            referralPoints = 3000 + (referralCount - 70) * 5;
                        }
                        
                        // Scraping points = total - referral points
                        scrapingPoints = Math.max(0, (userData.points || 0) - referralPoints);
                    }
                    
                    if (pointsFromScrapingEl) {
                        pointsFromScrapingEl.textContent = scrapingPoints;
                    }
                    if (pointsFromReferralsEl) {
                        pointsFromReferralsEl.textContent = referralPoints;
                    }
                    
                    // Show pages scraped - combine canister total with local session
                    if (pagesElement) {
                        // Use totalPagesScraped field from canister (more reliable than scrapedUrls array)
                        // The scrapedUrls array might be truncated for performance
                        const totalPagesFromCanister = userData.totalPagesScraped || 0;
                        const scrapedUrlsCount = userData.scrapedUrls ? userData.scrapedUrls.length : 0;
                        
                        // Use the maximum of both values to ensure accuracy
                        const actualTotalPages = Math.max(totalPagesFromCanister, scrapedUrlsCount);
                        
                        console.log('[Dashboard] Page counts from canister:', {
                            totalPagesScraped: userData.totalPagesScraped,
                            scrapedUrlsLength: scrapedUrlsCount,
                            actualTotal: actualTotalPages,
                            rawUserData: userData
                        });
                        
                        pagesElement.textContent = actualTotalPages;
                        
                        // Get local session stats
                        const localStats = await chrome.storage.local.get(['sessionPagesScraped']);
                        
                        // Update session and total pages displays
                        const sessionPagesEl = document.getElementById('sessionPagesScraped');
                        const totalPagesEl = document.getElementById('totalPagesScraped');
                        if (sessionPagesEl) sessionPagesEl.textContent = localStats.sessionPagesScraped || 0;
                        // Show the actual total from canister
                        if (totalPagesEl) totalPagesEl.textContent = actualTotalPages;
                    }
                    
                    // Show YOUR bandwidth used
                    if (bandwidthUsedElement) {
                        bandwidthUsedElement.textContent = formatBandwidth(userData.totalDataScraped || 0);
                    }
                    
                    // Update session and total bandwidth
                    const sessionBandwidthEl = document.getElementById('sessionBandwidthUsed');
                    const totalBandwidthEl = document.getElementById('totalBandwidthUsed');
                    if (sessionBandwidthEl) {
                        const sessionBandwidth = await chrome.storage.local.get(['sessionBandwidthUsed']);
                        sessionBandwidthEl.textContent = formatBandwidth(sessionBandwidth.sessionBandwidthUsed || 0);
                    }
                    if (totalBandwidthEl) {
                        totalBandwidthEl.textContent = formatBandwidth(userData.totalDataScraped || 0);
                    }
                    
                    // Update header principal display
                    const headerPrincipal = document.getElementById('headerPrincipal');
                    if (headerPrincipal) {
                        headerPrincipal.textContent = currentPrincipal.slice(0, 8) + '...';
                    }
                    
                    // Update location display
                    const userLocationEl = document.getElementById('userLocation');
                    if (userLocationEl) {
                        const city = userData.city || 'Unknown';
                        const country = userData.country || 'Unknown';
                        if (city !== 'Unknown' && country !== 'Unknown') {
                            userLocationEl.textContent = `${city}, ${country}`;
                        } else if (country !== 'Unknown') {
                            userLocationEl.textContent = country;
                        } else {
                            userLocationEl.textContent = 'Location not detected';
                        }
                    }
                    
                    // Show referral history if available
                    if (userData.referralHistory && userData.referralHistory.length > 0) {
                        const referralListEl = document.getElementById('referralHistoryList');
                        if (referralListEl) {
                            referralListEl.innerHTML = userData.referralHistory.map((ref, index) => `
                                <div style="padding: 8px; background: rgba(255,255,255,0.05); margin: 4px 0; border-radius: 4px;">
                                    <strong>User:</strong> ${ref.userPrincipal || 'Unknown'}<br>
                                    <strong>When:</strong> ${new Date(Number(ref.timestamp) / 1000000).toLocaleDateString()}<br>
                                    <strong>Points:</strong> ${ref.pointsAwarded}
                                </div>
                            `).join('');
                        }
                    }
                    
                    console.log('Loaded YOUR data from canister:', userData);
                    console.log('Points breakdown:', {
                        totalPoints: userData.points,
                        pointsFromScraping: userData.pointsFromScraping,
                        pointsFromReferrals: userData.pointsFromReferrals,
                        referralCount: userData.referralCount,
                        calculatedReferralPoints: userData.referralCount ? (userData.referralCount <= 10 ? userData.referralCount * 100 : 0) : 0
                    });
                } else {
                    console.log('User not found in canister - showing zeros');
                    // User doesn't exist yet - show zeros, NOT anonymous data
                    if (pointsElement) pointsElement.textContent = '0';
                    if (pagesElement) pagesElement.textContent = '0';  
                    if (bandwidthUsedElement) bandwidthUsedElement.textContent = '0 KB';
                }
            } else {
                console.log('Missing data for API call:', { 
                    hasReferralCode: !!actualReferralCode, 
                    hasPrincipal: !!currentPrincipal,
                    referralCode: actualReferralCode,
                    principal: currentPrincipal
                });
                // No referral code or principal, use local stats
                loadLocalStats();
            }
        } catch (error) {
            console.error('Error fetching user profile from canister:', error);
            // Fall back to local stats
            loadLocalStats();
        }
        
        // Always load current speed
        const { currentInternetSpeed } = await chrome.storage.local.get(['currentInternetSpeed']);
        if (currentSpeedElement) {
            const speed = currentInternetSpeed;
            if (speed && speed.speedMbps) {
                currentSpeedElement.textContent = `${speed.speedMbps} Mbps`;
                currentSpeedElement.style.color = getSpeedColor(speed.bandwidthScore);
            } else {
                currentSpeedElement.textContent = 'Testing...';
            }
        }
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Helper function to load local stats as fallback (when no canister data)
async function loadLocalStats() {
    // When there's no canister data, show zeros for main counters
    // and only show session data in session fields
    const stats = await chrome.storage.local.get(['sessionPointsEarned', 'sessionPagesScraped', 'sessionBandwidthUsed']);
    if (pointsElement) {
        pointsElement.textContent = 0; // No canister data means 0 all-time points
    }
    if (pagesElement) {
        pagesElement.textContent = 0; // No canister data means 0 all-time pages
    }
    if (bandwidthUsedElement) {
        bandwidthUsedElement.textContent = '0 B'; // No canister data means 0 all-time bandwidth
    }
    
    // Update session displays
    const sessionPagesEl = document.getElementById('sessionPagesScraped');
    const sessionBandwidthEl = document.getElementById('sessionBandwidthUsed');
    if (sessionPagesEl) sessionPagesEl.textContent = stats.sessionPagesScraped || 0;
    if (sessionBandwidthEl) sessionBandwidthEl.textContent = formatBandwidth(stats.sessionBandwidthUsed || 0);
}

function updateExtensionStatusText(enabled) {
    if (extensionStatusText) {
        extensionStatusText.textContent = enabled ? 'ON' : 'OFF';
        extensionStatusText.style.color = enabled ? '#4CAF50' : '#9CA3AF';
    }
}

// Update scraping statistics dynamically
function updateScrapingStatistics(state) {
    // Calculate session duration
    const sessionDurationEl = document.getElementById('sessionDuration');
    if (sessionDurationEl) {
        if (state.sessionStartTime) {
            const duration = Date.now() - state.sessionStartTime;
            const minutes = Math.floor(duration / 60000);
            sessionDurationEl.textContent = `${minutes} min`;
        } else {
            sessionDurationEl.textContent = '0 min';
        }
    }
    
    // Calculate average scrape time
    const avgScrapeTimeEl = document.getElementById('avgScrapeTime');
    if (avgScrapeTimeEl) {
        if (state.totalScrapeTime && state.sessionPagesScraped > 0) {
            const avgTime = Math.round(state.totalScrapeTime / state.sessionPagesScraped / 1000);
            avgScrapeTimeEl.textContent = `${avgTime}s`;
        } else {
            avgScrapeTimeEl.textContent = '0s';
        }
    }
    
    // Calculate success rate
    const successRateEl = document.getElementById('successRate');
    if (successRateEl) {
        const successCount = state.sessionSuccessCount || 0;
        const failureCount = state.sessionFailureCount || 0;
        const total = successCount + failureCount;
        if (total > 0) {
            const rate = Math.round((successCount / total) * 100);
            successRateEl.textContent = `${rate}%`;
            successRateEl.style.color = rate >= 80 ? '#00FF88' : (rate >= 50 ? '#FFA500' : '#FF4444');
        } else {
            successRateEl.textContent = '100%';
        }
    }
    
    // Update data quality based on success rate
    const dataQualityEl = document.getElementById('dataQuality');
    if (dataQualityEl) {
        const successCount = state.sessionSuccessCount || 0;
        const failureCount = state.sessionFailureCount || 0;
        const total = successCount + failureCount;
        if (total > 0) {
            const rate = (successCount / total) * 100;
            if (rate >= 90) {
                dataQualityEl.textContent = 'Excellent';
                dataQualityEl.style.color = '#00FF88';
            } else if (rate >= 75) {
                dataQualityEl.textContent = 'Good';
                dataQualityEl.style.color = '#4CAF50';
            } else if (rate >= 50) {
                dataQualityEl.textContent = 'Fair';
                dataQualityEl.style.color = '#FFA500';
            } else {
                dataQualityEl.textContent = 'Poor';
                dataQualityEl.style.color = '#FF4444';
            }
        } else {
            dataQualityEl.textContent = 'Good';
        }
    }
}

function formatBandwidth(bytes) {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getSpeedColor(score) {
    if (score >= 80) return '#00FF88';  // Green - Excellent
    if (score >= 60) return '#FFD700';  // Yellow - Good  
    if (score >= 40) return '#FF9500';  // Orange - Average
    if (score >= 20) return '#FF6B6B';  // Red - Poor
    return '#9CA3AF';                   // Gray - Very Poor
}

async function loadReferralData() {
    try {
        // Get the actual referral code from storage or API
        const stored = await chrome.storage.local.get(['userReferralCode', 'principalId']);
        let referralCode = stored.userReferralCode;
        let referralCount = 0;
        let referralPoints = 0;
        
        // Always fetch fresh data from API to get updated counts
        if (stored.principalId) {
            try {
                const response = await fetch('https://ic-proxy.rhinospider.com/api/user-profile-by-principal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ principalId: stored.principalId })
                });
                if (response.ok) {
                    const data = await response.json();
                    referralCode = data.referralCode;
                    referralCount = data.referralCount || 0;
                    // Use canister-provided referral points if available
                    if (data.pointsFromReferrals !== undefined) {
                        referralPoints = data.pointsFromReferrals;
                        console.log('Referral page: Using canister referral points:', referralPoints);
                    } else {
                        // Fall back to calculated tier system for older accounts
                        console.log('Referral page: Calculating referral points from count:', referralCount);
                        if (referralCount <= 10) {
                            referralPoints = referralCount * 100;
                        } else if (referralCount <= 30) {
                            referralPoints = 1000 + (referralCount - 10) * 50;
                        } else if (referralCount <= 70) {
                            referralPoints = 2000 + (referralCount - 30) * 25;
                        } else {
                            referralPoints = 3000 + (referralCount - 70) * 5;
                        }
                    }
                    
                    // Save referral code to storage for quick access
                    if (referralCode) {
                        await chrome.storage.local.set({ userReferralCode: referralCode });
                    }
                }
            } catch (err) {
                console.error('Error fetching referral data:', err);
            }
        }
        
        const referralData = {
            code: referralCode || 'Loading...',
            referrals: referralCount,
            points: referralPoints
        };
        
        // Update referral UI
        const codeDisplay = document.getElementById('referralCode');
        const referralCountEl = document.getElementById('referralCount');
        const referralPointsEl = document.getElementById('referralPoints');
        const copyButton = document.getElementById('copyReferralCode');
        const useCodeInput = document.getElementById('useReferralCode');
        const useCodeButton = document.getElementById('applyReferralCode');
        
        if (codeDisplay) codeDisplay.textContent = referralData.code;
        if (referralCountEl) referralCountEl.textContent = referralData.referrals;
        if (referralPointsEl) referralPointsEl.textContent = referralData.points;
        
        // Set up copy functionality
        if (copyButton) {
            copyButton.onclick = () => {
                navigator.clipboard.writeText(referralData.code);
                copyButton.textContent = 'Copied!';
                setTimeout(() => copyButton.textContent = 'Copy', 2000);
            };
        }
        
        // Set up apply referral code
        if (useCodeButton) {
            useCodeButton.onclick = async () => {
                const code = useCodeInput.value.trim();
                if (code) {
                    // Add loading state
                    useCodeButton.disabled = true;
                    const originalText = useCodeButton.textContent;
                    useCodeButton.textContent = 'Applying...';
                    useCodeButton.style.opacity = '0.7';
                    
                    try {
                        // Apply the referral code via the proxy
                        const response = await fetch('https://ic-proxy.rhinospider.com/api/consumer-use-referral', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ 
                                code: code,
                                principalId: currentPrincipal
                            })
                        });
                        
                        const result = await response.json();
                        
                        // Reset button state
                        useCodeButton.disabled = false;
                        useCodeButton.textContent = originalText;
                        useCodeButton.style.opacity = '1';
                        
                        if (result.ok) {
                            // Success - show message below the input
                            const messageEl = document.getElementById('referralMessage');
                            if (messageEl) {
                                messageEl.innerHTML = `✅ Referral code applied successfully! Code: ${code}`;
                                messageEl.className = 'message success';
                                messageEl.style.display = 'block';
                            }
                            
                            // Clear the input
                            useCodeInput.value = '';
                            
                            // Store that we've used a referral
                            await chrome.storage.local.set({ 
                                usedReferralCode: code,
                                referredBy: result.referrer || 'Unknown'
                            });
                            
                            // Refresh user data to show updated points
                            setTimeout(() => refreshDashboardData(), 2000);
                            
                            // Hide message after 5 seconds
                            setTimeout(() => {
                                if (messageEl) {
                                    messageEl.style.display = 'none';
                                }
                            }, 5000);
                        } else {
                            // Error - show message below the input
                            const messageEl = document.getElementById('referralMessage');
                            if (messageEl) {
                                messageEl.innerHTML = `❌ Error: ${result.err || 'Failed to apply referral code'}`;
                                messageEl.className = 'message error';
                                messageEl.style.display = 'block';
                                
                                // Hide error after 5 seconds
                                setTimeout(() => {
                                    messageEl.style.display = 'none';
                                }, 5000);
                            }
                        }
                    } catch (error) {
                        console.error('Error applying referral code:', error);
                        
                        // Reset button state on error
                        useCodeButton.disabled = false;
                        useCodeButton.textContent = originalText;
                        useCodeButton.style.opacity = '1';
                        
                        const messageEl = document.getElementById('referralMessage');
                        if (messageEl) {
                            messageEl.innerHTML = '❌ Failed to apply referral code. Please try again.';
                            messageEl.className = 'message error';
                            messageEl.style.display = 'block';
                            
                            // Hide error after 5 seconds
                            setTimeout(() => {
                                messageEl.style.display = 'none';
                            }, 5000);
                        }
                    }
                }
            };
        }
        
    } catch (error) {
        console.error('Error loading referral data:', error);
    }
}

function generateReferralCode() {
    // Generate a simple referral code based on principal
    if (currentPrincipal) {
        const hash = currentPrincipal.substring(0, 8).toUpperCase();
        return `RHINO-${hash}`;
    }
    return 'RHINO-XXXXX';
}

function showError(message) {
    const errorEl = document.getElementById('loginError');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    }
}

function showMessage(message, type = 'info') {
    // Show message in console
    console.log(`[${type}] ${message}`);
    
    // Create or update UI message element
    let messageEl = document.getElementById('system-message');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'system-message';
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-weight: 500;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            max-width: 400px;
        `;
        document.body.appendChild(messageEl);
    }
    
    // Set color based on type
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        info: '#2196F3',
        warning: '#ff9800'
    };
    
    messageEl.style.backgroundColor = colors[type] || colors.info;
    messageEl.style.color = 'white';
    messageEl.textContent = message;
    messageEl.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

// Privacy Policy toggle function
function togglePrivacyPolicy() {
    const content = document.getElementById('privacyPolicyContent');
    const toggle = document.getElementById('privacyToggle');
    
    if (content && toggle) {
        if (content.style.display === 'none' || content.style.display === '') {
            content.style.display = 'block';
            toggle.style.transform = 'rotate(180deg)';
        } else {
            content.style.display = 'none';
            toggle.style.transform = 'rotate(0deg)';
        }
    }
}

// Add event listener for privacy policy toggle when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    const privacyToggleBtn = document.getElementById('privacyPolicyToggle');
    if (privacyToggleBtn) {
        privacyToggleBtn.addEventListener('click', togglePrivacyPolicy);
    }
});