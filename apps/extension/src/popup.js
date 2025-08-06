// Consolidated popup for RhinoSpider extension
import { AuthClient } from '@dfinity/auth-client';

// Configuration
const II_URL = 'https://identity.ic0.app';

// DOM Elements
let elements = {};
let authClient = null;
let isAuthenticated = false;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initialize);

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
        loginError: document.getElementById('loginError'),
        principalId: document.getElementById('principalId'),
        pointsEarned: document.getElementById('pointsEarned'),
        pagesScraped: document.getElementById('pagesScraped'),
        scrapingToggle: document.getElementById('scrapingToggle')
    };
    
    // Show loading state
    showLoading(true);
    
    try {
        // Initialize auth client
        authClient = await AuthClient.create();
        
        // Check authentication status
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
    // Login button
    elements.loginButton?.addEventListener('click', handleLogin);
    
    // Logout button
    elements.logoutButton?.addEventListener('click', handleLogout);
    
    // Scraping toggle
    elements.scrapingToggle?.addEventListener('change', handleToggle);
}

async function checkAuthStatus() {
    try {
        // First check if authenticated with Internet Identity
        const iiAuthenticated = await authClient.isAuthenticated();
        
        if (iiAuthenticated) {
            const identity = authClient.getIdentity();
            const principal = identity.getPrincipal().toString();
            
            // Store in Chrome storage
            await chrome.storage.local.set({ 
                principalId: principal,
                isAuthenticated: true 
            });
            
            isAuthenticated = true;
            showAuthenticatedView();
        } else {
            // Check Chrome storage for existing auth
            const stored = await chrome.storage.local.get(['principalId', 'isAuthenticated']);
            
            if (stored.principalId && stored.isAuthenticated) {
                isAuthenticated = true;
                showAuthenticatedView();
            } else {
                isAuthenticated = false;
                showLoginView();
            }
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        isAuthenticated = false;
        showLoginView();
    }
}

async function handleLogin() {
    try {
        elements.loginButton.disabled = true;
        elements.loginButton.textContent = 'Logging in...';
        hideError();
        
        await authClient.login({
            identityProvider: II_URL,
            onSuccess: async () => {
                const identity = authClient.getIdentity();
                const principal = identity.getPrincipal().toString();
                
                // Store in Chrome storage
                await chrome.storage.local.set({ 
                    principalId: principal,
                    isAuthenticated: true 
                });
                
                // Notify background script
                await chrome.runtime.sendMessage({
                    type: 'LOGIN_COMPLETE',
                    principalId: principal
                });
                
                isAuthenticated = true;
                showAuthenticatedView();
                await loadState();
            },
            onError: (error) => {
                console.error('Login error:', error);
                showError('Login failed. Please try again.');
                elements.loginButton.disabled = false;
                elements.loginButton.textContent = 'Login with Internet Identity';
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        showError('Login failed. Please try again.');
        elements.loginButton.disabled = false;
        elements.loginButton.textContent = 'Login with Internet Identity';
    }
}

async function handleLogout() {
    try {
        await authClient.logout();
        await chrome.storage.local.remove(['principalId', 'isAuthenticated']);
        
        // Notify background script
        await chrome.runtime.sendMessage({ type: 'LOGOUT' });
        
        isAuthenticated = false;
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
            'totalPagesScraped'
        ]);
        
        // Update principal display
        if (state.principalId && isAuthenticated) {
            elements.principalId.textContent = state.principalId;
        }
        
        // Update toggle state
        const isEnabled = state.enabled !== false;
        elements.scrapingToggle.checked = isEnabled;
        updateStatusBadge(isEnabled);
        
        // Update stats
        elements.pointsEarned.textContent = state.totalPointsEarned || '0';
        elements.pagesScraped.textContent = state.totalPagesScraped || '0';
        
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
        // Update toggle if state changed externally
        if (changes.enabled) {
            elements.scrapingToggle.checked = changes.enabled.newValue !== false;
            updateStatusBadge(changes.enabled.newValue !== false);
        }
    }
});