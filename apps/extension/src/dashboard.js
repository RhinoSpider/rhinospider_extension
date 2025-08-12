// Simple dashboard implementation for RhinoSpider extension
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RhinoScan } from './pages/RhinoScan.jsx';

// Configuration
const II_URL = 'https://identity.ic0.app';
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
    
    // Set up event listeners
    if (loginButton) loginButton.addEventListener('click', handleLogin);
    if (logoutButton) logoutButton.addEventListener('click', handleLogout);
    if (extensionToggle) extensionToggle.addEventListener('change', handleExtensionToggle);
    
    // Navigation setup
    navItems.forEach(item => {
        item.addEventListener('click', () => handleNavigation(item.dataset.target));
    });
    
    // Initialize auth client
    authClient = await AuthClient.create();
    
    // Check authentication status
    await checkAuthStatus();
    
    // Listen for storage changes to update the dashboard in real-time
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
            // Update extension status if it changes
            if (changes.enabled || changes.isScrapingActive) {
                const enabled = changes.enabled?.newValue || changes.isScrapingActive?.newValue || false;
                if (extensionToggle) {
                    extensionToggle.checked = enabled;
                }
                updateExtensionStatusText(enabled);
            }
            
            // Update stats if they change
            if (changes.totalPointsEarned && pointsElement) {
                pointsElement.textContent = changes.totalPointsEarned.newValue || 0;
            }
            if (changes.totalPagesScraped && pagesElement) {
                pagesElement.textContent = changes.totalPagesScraped.newValue || 0;
            }
            if (changes.totalBandwidthUsed && bandwidthUsedElement) {
                const bandwidth = changes.totalBandwidthUsed.newValue || 0;
                bandwidthUsedElement.textContent = formatBandwidth(bandwidth);
            }
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
            
            // Store principal in Chrome storage
            await chrome.storage.local.set({ principalId: currentPrincipal });
            
            showDashboard();
            await loadDashboardData();
        } else {
            // Check Chrome storage for existing auth
            const stored = await chrome.storage.local.get(['principalId']);
            if (stored.principalId) {
                currentPrincipal = stored.principalId;
                isAuthenticated = true;
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
                
                // Store in Chrome storage
                await chrome.storage.local.set({ 
                    principalId: currentPrincipal,
                    isAuthenticated: true 
                });
                
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
        await authClient.logout();
        await chrome.storage.local.remove(['principalId', 'isAuthenticated']);
        
        // Notify background script
        await chrome.runtime.sendMessage({ type: 'LOGOUT' });
        
        isAuthenticated = false;
        currentPrincipal = null;
        showLogin();
    } catch (error) {
        console.error('Logout error:', error);
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

async function loadDashboardData() {
    try {
        // Load extension state
        const state = await chrome.storage.local.get(['enabled', 'isScrapingActive']);
        const isEnabled = state.enabled !== false;
        if (extensionToggle) {
            extensionToggle.checked = isEnabled;
        }
        // Update status text
        updateExtensionStatusText(isEnabled);
        
        // Load user profile
        if (userProfileElement) {
            userProfileElement.textContent = `Principal ID: ${currentPrincipal || 'Not logged in'}`;
        }
        
        // Try to fetch real user data from consumer canister
        try {
            // Get referral code from storage
            const { referralCode } = await chrome.storage.local.get(['referralCode']);
            
            if (referralCode && currentPrincipal) {
                // Use the proxy client to get user profile
                const response = await fetch('https://ic-proxy.rhinospider.com/api/user-profile', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        principalId: currentPrincipal,
                        referralCode: referralCode
                    })
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    
                    // Update display with real data from canister
                    if (pointsElement && userData.points !== undefined) {
                        pointsElement.textContent = userData.points;
                    }
                    if (pagesElement && userData.totalDataScraped !== undefined) {
                        // Convert bytes to page count (rough estimate: 5KB per page)
                        const pageCount = Math.floor(userData.totalDataScraped / 5120);
                        pagesElement.textContent = pageCount;
                    }
                    if (bandwidthUsedElement && userData.totalDataScraped !== undefined) {
                        bandwidthUsedElement.textContent = formatBandwidth(userData.totalDataScraped);
                    }
                    
                    console.log('Loaded user data from canister:', userData);
                } else {
                    console.log('Could not fetch user profile from canister, using local stats');
                    // Fall back to local stats
                    loadLocalStats();
                }
            } else {
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

// Helper function to load local stats as fallback
async function loadLocalStats() {
    const stats = await chrome.storage.local.get(['totalPointsEarned', 'totalPagesScraped', 'totalBandwidthUsed']);
    if (pointsElement) {
        pointsElement.textContent = stats.totalPointsEarned || 0;
    }
    if (pagesElement) {
        pagesElement.textContent = stats.totalPagesScraped || 0;
    }
    if (bandwidthUsedElement) {
        const bandwidth = stats.totalBandwidthUsed || 0;
        bandwidthUsedElement.textContent = formatBandwidth(bandwidth);
    }
}

function updateExtensionStatusText(enabled) {
    if (extensionStatusText) {
        extensionStatusText.textContent = enabled ? 'ON' : 'OFF';
        extensionStatusText.style.color = enabled ? '#4CAF50' : '#9CA3AF';
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
        // For now, use mock data - this can be replaced with real canister calls
        const referralCode = generateReferralCode();
        const referralData = {
            code: referralCode,
            referrals: 0,
            points: 0
        };
        
        // Update referral UI
        const codeDisplay = document.getElementById('referralCode');
        const referralCount = document.getElementById('referralCount');
        const referralPoints = document.getElementById('referralPoints');
        const copyButton = document.getElementById('copyReferralCode');
        const useCodeInput = document.getElementById('useReferralCode');
        const useCodeButton = document.getElementById('applyReferralCode');
        
        if (codeDisplay) codeDisplay.textContent = referralData.code;
        if (referralCount) referralCount.textContent = referralData.referrals;
        if (referralPoints) referralPoints.textContent = referralData.points;
        
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
                    // Here you would validate and apply the referral code
                    showMessage('Referral code applied successfully!', 'success');
                    useCodeInput.value = '';
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
    // Simple message display - can be enhanced
    console.log(`[${type}] ${message}`);
}