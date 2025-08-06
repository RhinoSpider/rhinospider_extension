// Simple dashboard implementation for RhinoSpider extension
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';

// Configuration
const II_URL = 'https://identity.ic0.app';

// DOM Elements
let loginContainer;
let dashboardContainer;
let loginButton;
let logoutButton;
let navItems;
let contentSections;
let extensionToggle;
let userProfileElement;
let pointsElement;
let pagesElement;
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
    userProfileElement = document.getElementById('userProfile');
    pointsElement = document.getElementById('pointsEarned');
    pagesElement = document.getElementById('pagesScraped');
    
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
        if (extensionToggle) {
            extensionToggle.checked = state.enabled !== false;
        }
        
        // Load user profile
        if (userProfileElement) {
            userProfileElement.textContent = `Principal ID: ${currentPrincipal || 'Not logged in'}`;
        }
        
        // Load stats from storage
        const stats = await chrome.storage.local.get(['totalPointsEarned', 'totalPagesScraped']);
        if (pointsElement) {
            pointsElement.textContent = stats.totalPointsEarned || 0;
        }
        if (pagesElement) {
            pagesElement.textContent = stats.totalPagesScraped || 0;
        }
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
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