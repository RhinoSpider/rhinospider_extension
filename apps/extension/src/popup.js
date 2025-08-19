// Simplified popup for RhinoSpider extension
import './analytics.js';

document.addEventListener('DOMContentLoaded', initialize);

// DOM Elements
let elements = {};

async function initialize() {
    // Get all DOM elements
    elements = {
        loadingState: document.getElementById('loadingState'),
        mainContent: document.getElementById('mainContent'),
        loginView: document.getElementById('loginView'),
        authenticatedView: document.getElementById('authenticatedView'),
        statusBadge: document.getElementById('statusBadge'),
        statusText: document.getElementById('statusText'),
        loginButton: document.getElementById('loginButton'),
        logoutButton: document.getElementById('logoutButton'),
        dashboardButton: document.getElementById('dashboardButton'),
        loginError: document.getElementById('loginError'),
        principalId: document.getElementById('principalId'),
        pointsEarned: document.getElementById('pointsEarned'),
        pagesScraped: document.getElementById('pagesScraped'),
        bandwidthUsedPopup: document.getElementById('bandwidthUsedPopup'),
        currentSpeedPopup: document.getElementById('currentSpeedPopup'),
        scrapingToggle: document.getElementById('scrapingToggle')
    };
    
    // Show loading state
    showLoading(true);
    
    try {
        // Check authentication status from storage
        await checkAuthStatus();
        
        // Set up event listeners
        setupEventListeners();
        
        // Load initial state
        await loadState();
        
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize extension');
    } finally {
        showLoading(false);
    }
}

function setupEventListeners() {
    // Login button - opens dashboard for auth
    elements.loginButton?.addEventListener('click', handleLogin);
    
    // Logout button
    if (elements.logoutButton) {
        console.log('Popup: Logout button found, adding listener');
        elements.logoutButton.addEventListener('click', handleLogout);
    } else {
        console.error('Popup: Logout button NOT found!');
    }
    
    // Dashboard button
    elements.dashboardButton?.addEventListener('click', handleDashboard);
    
    // Scraping toggle
    elements.scrapingToggle?.addEventListener('change', handleToggle);
}

async function checkAuthStatus() {
    try {
        // Check Chrome storage for existing auth
        const stored = await chrome.storage.local.get(['principalId', 'isAuthenticated']);
        console.log('Popup: checkAuthStatus - stored data:', stored);
        
        // If we have a principalId, we're authenticated (even if isAuthenticated flag is missing)
        if (stored.principalId) {
            console.log('Popup: Found principalId, showing authenticated view');
            // Make sure isAuthenticated is set
            if (!stored.isAuthenticated) {
                await chrome.storage.local.set({ isAuthenticated: true });
            }
            showAuthenticatedView();
        } else {
            console.log('Popup: No principalId found, showing login view');
            showLoginView();
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        showLoginView();
    }
}

async function handleLogin() {
    try {
        // Open dashboard for proper Internet Identity authentication
        await chrome.tabs.create({
            url: chrome.runtime.getURL('pages/dashboard.html')
        });
        
        // Close popup to let user complete auth in dashboard
        window.close();
    } catch (error) {
        console.error('Error opening dashboard:', error);
        showError('Failed to open login page');
    }
}

async function handleDashboard() {
    try {
        // Track dashboard open
        if (window.analytics) {
            window.analytics.trackDashboardOpen();
        }
        
        // Open dashboard in new tab
        await chrome.tabs.create({
            url: chrome.runtime.getURL('pages/dashboard.html')
        });
        
        // Close popup
        window.close();
    } catch (error) {
        console.error('Error opening dashboard:', error);
        showError('Failed to open dashboard');
    }
}

async function handleLogout() {
    console.log('Popup: handleLogout called!');
    try {
        // Use storage change to trigger logout - EXACTLY like toggle does!
        // Set a special flag that dashboard will see
        await chrome.storage.local.set({ 
            triggerLogout: true,
            triggerLogoutTime: Date.now() 
        });
        console.log('Popup: Set triggerLogout flag in storage');
        
        // Give dashboard a moment to see the change and start logout
        setTimeout(() => {
            // Close popup after dashboard gets the signal
            window.close();
        }, 100);
    } catch (error) {
        console.error('Popup: Logout error:', error);
        // Fallback - clear storage and close
        chrome.storage.local.remove(['principalId', 'isAuthenticated']);
        window.close();
    }
}

async function handleToggle() {
    const enabled = elements.scrapingToggle.checked;
    
    // Track extension toggle
    if (window.analytics) {
        window.analytics.trackExtensionToggle(enabled);
    }
    
    try {
        // Update storage
        await chrome.storage.local.set({ 
            enabled, 
            isScrapingActive: enabled 
        });
        
        // Notify background script
        await chrome.runtime.sendMessage({
            type: 'SET_STATE',
            enabled,
            isScrapingActive: enabled
        });
        
        // Update status badge
        updateStatusBadge(enabled);
        
    } catch (error) {
        console.error('Error toggling scraping:', error);
        // Revert toggle on error
        elements.scrapingToggle.checked = !enabled;
    }
}

async function loadState() {
    try {
        // Load all state from storage
        const state = await chrome.storage.local.get([
            'principalId',
            'userReferralCode',
            'referralCode',
            'enabled',
            'isScrapingActive',
            'totalPointsEarned',
            'totalPagesScraped',
            'totalBandwidthUsed',
            'currentInternetSpeed'
        ]);
        
        // Update principal display
        if (state.principalId) {
            elements.principalId.textContent = state.principalId;
        }
        
        // Update toggle state
        const isEnabled = state.enabled !== false;
        elements.scrapingToggle.checked = isEnabled;
        updateStatusBadge(isEnabled);
        
        // ALWAYS fetch user's real data from canister - NO LOCAL FALLBACKS
        if (state.principalId) {
            try {
                // Try to get user data by principal (more reliable than referral code)
                const response = await fetch('https://ic-proxy.rhinospider.com/api/user-profile-by-principal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        principalId: state.principalId
                    })
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    console.log('Popup: Loaded YOUR data from canister:', userData);
                    
                    // Show ONLY the user's real data from canister - same as dashboard
                    elements.pointsEarned.textContent = userData.points || '0';
                    
                    // Show pages scraped from canister - same as dashboard
                    const totalPagesFromCanister = userData.scrapedUrls ? userData.scrapedUrls.length : 0;
                    elements.pagesScraped.textContent = totalPagesFromCanister;
                    
                    // Show real bandwidth from YOUR account
                    if (elements.bandwidthUsedPopup) {
                        const bandwidth = userData.totalDataScraped || 0;
                        elements.bandwidthUsedPopup.textContent = formatBandwidth(bandwidth);
                    }
                } else {
                    console.log('User not found in canister yet - showing zeros');
                    // User doesn't exist yet - show zeros, not anonymous data
                    elements.pointsEarned.textContent = '0';
                    elements.pagesScraped.textContent = '0';
                    if (elements.bandwidthUsedPopup) {
                        elements.bandwidthUsedPopup.textContent = '0 KB';
                    }
                }
            } catch (error) {
                console.error('Popup: Error fetching user data:', error);
                // On error, show zeros - NEVER show anonymous data
                elements.pointsEarned.textContent = '0';
                elements.pagesScraped.textContent = '0';
                if (elements.bandwidthUsedPopup) {
                    elements.bandwidthUsedPopup.textContent = '0 KB';
                }
            }
        } else {
            // Not logged in - show zeros
            elements.pointsEarned.textContent = '0';
            elements.pagesScraped.textContent = '0';
            if (elements.bandwidthUsedPopup) {
                elements.bandwidthUsedPopup.textContent = '0 KB';
            }
        }
        if (elements.currentSpeedPopup) {
            const speed = state.currentInternetSpeed;
            if (speed && speed.speedMbps) {
                elements.currentSpeedPopup.textContent = `${speed.speedMbps} Mbps`;
                elements.currentSpeedPopup.style.color = getSpeedColor(speed.bandwidthScore);
            } else {
                elements.currentSpeedPopup.textContent = 'Testing...';
            }
        }
        
    } catch (error) {
        console.error('Error loading state:', error);
    }
}

function showLoading(show) {
    if (show) {
        elements.loadingState.style.display = 'block';
        elements.mainContent.classList.add('hidden');
    } else {
        elements.loadingState.style.display = 'none';
        elements.mainContent.classList.remove('hidden');
    }
}

function showLoginView() {
    elements.loginView.classList.remove('hidden');
    elements.authenticatedView.classList.add('hidden');
}

function showAuthenticatedView() {
    elements.loginView.classList.add('hidden');
    elements.authenticatedView.classList.remove('hidden');
}

function updateStatusBadge(enabled) {
    if (enabled) {
        elements.statusBadge.classList.remove('inactive');
        elements.statusText.textContent = 'Active';
    } else {
        elements.statusBadge.classList.add('inactive');
        elements.statusText.textContent = 'Inactive';
    }
}

function showError(message) {
    elements.loginError.textContent = message;
    elements.loginError.style.display = 'block';
}

function hideError() {
    elements.loginError.style.display = 'none';
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

// Listen for state updates from background script
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        // Don't update stats from storage - we want canister data only
        // Stats are fetched from canister in loadState()
        // Bandwidth is also fetched from canister, not local storage
        if (changes.currentInternetSpeed && elements.currentSpeedPopup) {
            const speed = changes.currentInternetSpeed.newValue;
            if (speed && speed.speedMbps) {
                elements.currentSpeedPopup.textContent = `${speed.speedMbps} Mbps`;
                elements.currentSpeedPopup.style.color = getSpeedColor(speed.bandwidthScore);
            }
        }
        // Update toggle if state changed externally
        if (changes.enabled) {
            elements.scrapingToggle.checked = changes.enabled.newValue !== false;
            updateStatusBadge(changes.enabled.newValue !== false);
        }
        // Update auth state if it changed
        if (changes.isAuthenticated || changes.principalId) {
            // Force immediate auth check when login status changes
            if (changes.isAuthenticated?.newValue === true && changes.principalId?.newValue) {
                // User just logged in
                showAuthenticatedView();
                elements.principalId.textContent = changes.principalId.newValue;
                // Reload state to get fresh data
                loadState();
            } else if (changes.isAuthenticated?.newValue === false) {
                // User logged out
                showLoginView();
            } else {
                checkAuthStatus();
            }
            if (changes.principalId?.newValue) {
                elements.principalId.textContent = changes.principalId.newValue;
            }
        }
    }
});