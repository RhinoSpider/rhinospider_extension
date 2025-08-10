// Simplified popup for RhinoSpider extension
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
    elements.logoutButton?.addEventListener('click', handleLogout);
    
    // Dashboard button
    elements.dashboardButton?.addEventListener('click', handleDashboard);
    
    // Scraping toggle
    elements.scrapingToggle?.addEventListener('change', handleToggle);
}

async function checkAuthStatus() {
    try {
        // Check Chrome storage for existing auth
        const stored = await chrome.storage.local.get(['principalId', 'isAuthenticated']);
        
        if (stored.principalId && stored.isAuthenticated) {
            showAuthenticatedView();
        } else {
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
    try {
        await chrome.storage.local.remove(['principalId', 'isAuthenticated']);
        
        // Notify background script
        await chrome.runtime.sendMessage({ type: 'LOGOUT' });
        
        showLoginView();
        
        // Reset stats display
        elements.pointsEarned.textContent = '0';
        elements.pagesScraped.textContent = '0';
        elements.scrapingToggle.checked = false;
    } catch (error) {
        console.error('Logout error:', error);
        showError('Logout failed. Please try again.');
    }
}

async function handleToggle() {
    const enabled = elements.scrapingToggle.checked;
    
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
        
        // Update stats
        elements.pointsEarned.textContent = state.totalPointsEarned || '0';
        elements.pagesScraped.textContent = state.totalPagesScraped || '0';
        
        // Update bandwidth and speed
        if (elements.bandwidthUsedPopup) {
            const bandwidth = state.totalBandwidthUsed || 0;
            elements.bandwidthUsedPopup.textContent = formatBandwidth(bandwidth);
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
        // Update stats if they changed
        if (changes.totalPointsEarned) {
            elements.pointsEarned.textContent = changes.totalPointsEarned.newValue || '0';
        }
        if (changes.totalPagesScraped) {
            elements.pagesScraped.textContent = changes.totalPagesScraped.newValue || '0';
        }
        // Update bandwidth and speed display
        if (changes.totalBandwidthUsed && elements.bandwidthUsedPopup) {
            const bandwidth = changes.totalBandwidthUsed.newValue || 0;
            elements.bandwidthUsedPopup.textContent = formatBandwidth(bandwidth);
        }
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
            checkAuthStatus();
            if (changes.principalId?.newValue) {
                elements.principalId.textContent = changes.principalId.newValue;
            }
        }
    }
});