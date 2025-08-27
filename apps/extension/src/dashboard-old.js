// Simplified Dashboard Script for RhinoSpider Extension
import { AuthClient } from '@dfinity/auth-client';

// Configuration
const II_URL = import.meta.env.VITE_II_URL || 'https://id.ai';

// Logger
const logger = {
    debug: (msg, ...args) => console.debug(`[Dashboard] ${msg}`, ...args),
    info: (msg, ...args) => console.info(`[Dashboard] ${msg}`, ...args),
    warn: (msg, ...args) => console.warn(`[Dashboard] ${msg}`, ...args),
    error: (msg, ...args) => console.error(`[Dashboard] ${msg}`, ...args),
};

// Global state
let authClient = null;
let isAuthenticated = false;
let currentPrincipal = null;

// DOM elements
let loginContainer, dashboardContainer, loginButton, logoutButton;
let navItems, contentSections;

// Navigation handler
function handleNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Show target content section
            contentSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === target) {
                    section.classList.add('active');
                }
            });
        });
    });
}

// Authentication functions
async function initAuth() {
    try {
        logger.info('Initializing authentication');
        
        authClient = await AuthClient.create({
            idleOptions: {
                disableIdle: true,
                disableDefaultIdleCallback: true
            }
        });

        // Check if already authenticated
        const authenticated = await authClient.isAuthenticated();
        
        if (authenticated) {
            const identity = authClient.getIdentity();
            currentPrincipal = identity.getPrincipal().toString();
            isAuthenticated = true;
            
            // Store in Chrome storage for background script
            await chrome.storage.local.set({ principalId: currentPrincipal });
            
            logger.info('User is authenticated:', currentPrincipal);
            showDashboard();
            await loadUserData();
        } else {
            // Check Chrome storage for existing authentication
            const { principalId } = await chrome.storage.local.get(['principalId']);
            if (principalId) {
                currentPrincipal = principalId;
                isAuthenticated = true;
                logger.info('Using stored principal:', currentPrincipal);
                showDashboard();
                await loadUserData();
            } else {
                logger.info('User not authenticated');
                showLogin();
            }
        }
    } catch (error) {
        logger.error('Auth initialization error:', error);
        showLogin();
    }
}

async function login() {
    try {
        logger.info('Starting login process');
        
        if (!authClient) {
            authClient = await AuthClient.create();
        }
        
        await authClient.login({
            identityProvider: II_URL,
            onSuccess: async () => {
                const identity = authClient.getIdentity();
                currentPrincipal = identity.getPrincipal().toString();
                isAuthenticated = true;
                
                // Store in Chrome storage
                await chrome.storage.local.set({ principalId: currentPrincipal });
                
                // Notify background script
                chrome.runtime.sendMessage({
                    type: 'LOGIN_COMPLETE',
                    principalId: currentPrincipal
                });
                
                logger.info('Login successful:', currentPrincipal);
                showDashboard();
                await loadUserData();
            },
            onError: (error) => {
                logger.error('Login error:', error);
                showError('Login failed. Please try again.');
            }
        });
    } catch (error) {
        logger.error('Login process error:', error);
        showError('Login failed. Please try again.');
    }
}

async function logout() {
    try {
        logger.info('Starting logout process');
        
        if (authClient) {
            await authClient.logout();
        }
        
        // Clear Chrome storage
        await chrome.storage.local.remove(['principalId']);
        
        // Notify background script
        chrome.runtime.sendMessage({ type: 'LOGOUT' });
        
        isAuthenticated = false;
        currentPrincipal = null;
        
        logger.info('Logout successful');
        showLogin();
    } catch (error) {
        logger.error('Logout error:', error);
    }
}

// UI functions
function showLogin() {
    if (loginContainer) loginContainer.classList.add('visible');
    if (dashboardContainer) dashboardContainer.classList.add('hidden');
}

function showDashboard() {
    if (loginContainer) loginContainer.classList.remove('visible');
    if (dashboardContainer) dashboardContainer.classList.remove('hidden');
}

function showError(message) {
    const errorElement = document.getElementById('loginError');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
}

// Data loading functions
async function loadUserData() {
    try {
        logger.info('Loading user data');
        
        // Update user profile display
        const userProfileElement = document.getElementById('userProfile');
        if (userProfileElement) {
            const profileData = {
                principal: currentPrincipal,
                connected: new Date().toLocaleString(),
                status: 'Active'
            };
            userProfileElement.textContent = JSON.stringify(profileData, null, 2);
        }
        
        // Load extension stats
        await loadExtensionStats();
        
        // Load referral data
        await loadReferralData();
        
    } catch (error) {
        logger.error('Error loading user data:', error);
    }
}

async function loadExtensionStats() {
    try {
        // Get extension state from Chrome storage
        const { enabled, isScrapingActive } = await chrome.storage.local.get(['enabled', 'isScrapingActive']);
        const isActive = enabled !== false;
        
        // Update toggle states
        const extensionToggle = document.getElementById('extensionStatus');
        const settingsToggle = document.getElementById('settingsExtensionStatus');
        
        if (extensionToggle) {
            extensionToggle.checked = isActive;
        }
        if (settingsToggle) {
            settingsToggle.checked = isActive;
        }
        
        // Update stats (placeholder data for now)
        const pointsElement = document.getElementById('pointsEarned');
        const pagesElement = document.getElementById('pagesScraped');
        
        if (pointsElement) pointsElement.textContent = '0'; // This would come from the canister
        if (pagesElement) pagesElement.textContent = '0'; // This would come from local storage or canister
        
    } catch (error) {
        logger.error('Error loading extension stats:', error);
    }
}

async function loadReferralData() {
    try {
        // Placeholder referral data - this would come from the referral canister
        const referralCodeDisplay = document.getElementById('referral-code-display');
        const referralCount = document.getElementById('referral-count');
        const referralPoints = document.getElementById('referral-points');
        
        if (referralCodeDisplay) {
            // Generate a simple referral code based on principal
            const code = currentPrincipal ? currentPrincipal.slice(-8).toUpperCase() : 'GENERATE';
            referralCodeDisplay.value = code;
        }
        
        if (referralCount) referralCount.textContent = '0'; // From canister
        if (referralPoints) referralPoints.textContent = '0'; // From canister
        
    } catch (error) {
        logger.error('Error loading referral data:', error);
    }
}

// Extension toggle handler
function handleExtensionToggle(isEnabled) {
    logger.info('Extension toggle changed:', isEnabled);
    
    // Update both toggles
    const extensionToggle = document.getElementById('extensionStatus');
    const settingsToggle = document.getElementById('settingsExtensionStatus');
    
    if (extensionToggle) extensionToggle.checked = isEnabled;
    if (settingsToggle) settingsToggle.checked = isEnabled;
    
    // Save to storage
    chrome.storage.local.set({ enabled: isEnabled }, () => {
        logger.info('Extension state saved:', isEnabled);
        
        // Notify background script
        if (isEnabled) {
            chrome.runtime.sendMessage({ type: 'LOGIN_COMPLETE', principalId: currentPrincipal });
        } else {
            chrome.runtime.sendMessage({ type: 'STOP_SCRAPING' });
        }
    });
}

// Referral functions
function copyReferralCode() {
    const codeDisplay = document.getElementById('referral-code-display');
    if (codeDisplay) {
        codeDisplay.select();
        document.execCommand('copy');
        
        const button = document.getElementById('copy-code-button');
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    }
}

async function useReferralCode() {
    const input = document.getElementById('referral-code-input');
    const message = document.getElementById('referral-message');
    
    if (!input || !message) return;
    
    const code = input.value.trim();
    if (!code) {
        message.textContent = 'Please enter a referral code.';
        message.className = 'error';
        return;
    }
    
    try {
        // This would call the referral canister
        // For now, show success message
        message.textContent = 'Referral code applied successfully!';
        message.className = 'success';
        input.value = '';
        
        // Reload referral data
        await loadReferralData();
        
    } catch (error) {
        logger.error('Error using referral code:', error);
        message.textContent = 'Failed to apply referral code.';
        message.className = 'error';
    }
}

// Event listeners
function setupEventListeners() {
    // Login/logout buttons
    loginButton = document.getElementById('login-button');
    logoutButton = document.getElementById('logout-button');
    
    if (loginButton) {
        loginButton.addEventListener('click', login);
    }
    
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
    
    // Extension toggles
    const extensionToggle = document.getElementById('extensionStatus');
    const settingsToggle = document.getElementById('settingsExtensionStatus');
    
    if (extensionToggle) {
        extensionToggle.addEventListener('change', (e) => {
            handleExtensionToggle(e.target.checked);
        });
    }
    
    if (settingsToggle) {
        settingsToggle.addEventListener('change', (e) => {
            handleExtensionToggle(e.target.checked);
        });
    }
    
    // Referral buttons
    const copyButton = document.getElementById('copy-code-button');
    const useButton = document.getElementById('use-code-button');
    
    if (copyButton) {
        copyButton.addEventListener('click', copyReferralCode);
    }
    
    if (useButton) {
        useButton.addEventListener('click', useReferralCode);
    }
    
    // Navigation
    navItems = document.querySelectorAll('.nav-item');
    contentSections = document.querySelectorAll('.content-section');
    
    if (navItems.length > 0) {
        handleNavigation();
    }
}

// Initialize dashboard
async function initDashboard() {
    logger.info('Initializing dashboard');
    
    // Get DOM references
    loginContainer = document.getElementById('login-container');
    dashboardContainer = document.getElementById('dashboard-container');
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize authentication
    await initAuth();
    
    logger.info('Dashboard initialized');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard);

// Export for debugging
window.rhinoSpiderDashboard = {
    login,
    logout,
    loadUserData,
    copyReferralCode,
    useReferralCode
};