// Dashboard script
import { AuthClient } from '@dfinity/auth-client';

// Logger utility
const logger = {
    log: (msg, data) => {
        console.log(`🕷️ [Dashboard] ${msg}`, data || '');
    },
    error: (msg, error) => {
        console.error(`❌ [Dashboard] ${msg}`, error);
    }
};

// Initialize auth client
let authClient = null;
async function initAuthClient() {
    if (!authClient) {
        logger.log('Creating auth client');
        authClient = await AuthClient.create({
            idleOptions: {
                disableIdle: true
            }
        });
        logger.log('Auth client created');
    }
    return authClient;
}

// Check if user is logged in
async function checkLogin() {
    try {
        const client = await initAuthClient();
        const isAuth = await client.isAuthenticated();
        
        if (isAuth) {
            const identity = client.getIdentity();
            // Get delegation chain from identity
            const delegationChain = identity.getDelegation();
            if (!delegationChain) {
                throw new Error('No delegation chain found');
            }
            
            // Store delegation chain
            await chrome.storage.local.set({ delegationChain: {
                publicKey: Array.from(delegationChain.publicKey),
                delegations: delegationChain.delegations.map(d => ({
                    delegation: {
                        pubkey: Array.from(d.delegation.pubkey),
                        expiration: d.delegation.expiration.toString(16),
                        targets: d.delegation.targets || []
                    },
                    signature: Array.from(d.signature)
                }))
            }});
            
            // Show dashboard
            showDashboard();
        } else {
            // Show login page
            showLogin();
        }
    } catch (error) {
        logger.error('Failed to check login:', error);
        showLogin();
    }
}

// Handle login
async function handleLogin() {
    try {
        logger.log('Initiating login');
        const client = await initAuthClient();
        
        await new Promise((resolve, reject) => {
            client.login({
                identityProvider: 'https://identity.ic0.app',
                onSuccess: async () => {
                    logger.log('Login successful');
                    const identity = client.getIdentity();
                    // Get delegation chain from identity
                    const delegationChain = identity.getDelegation();
                    if (!delegationChain) {
                        reject(new Error('No delegation chain found'));
                        return;
                    }
                    
                    // Store delegation chain
                    await chrome.storage.local.set({ delegationChain: {
                        publicKey: Array.from(delegationChain.publicKey),
                        delegations: delegationChain.delegations.map(d => ({
                            delegation: {
                                pubkey: Array.from(d.delegation.pubkey),
                                expiration: d.delegation.expiration.toString(16),
                                targets: d.delegation.targets || []
                            },
                            signature: Array.from(d.signature)
                        }))
                    }});
                    
                    // Show dashboard
                    showDashboard();
                    resolve();
                },
                onError: (error) => {
                    logger.error('Login failed:', error);
                    reject(error);
                }
            });
        });
    } catch (error) {
        logger.error('Login error:', error);
    }
}

// Handle logout
async function handleLogout() {
    try {
        logger.log('Logging out');
        const client = await initAuthClient();
        await client.logout();
        await chrome.storage.local.remove('delegationChain');
        showLogin();
    } catch (error) {
        logger.error('Logout error:', error);
    }
}

// Show login page
function showLogin() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('loginPage').style.justifyContent = 'center';
    document.getElementById('loginPage').style.alignItems = 'center';
    document.getElementById('dashboardContent').classList.remove('authenticated');
}

// Show dashboard
function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboardContent').classList.add('authenticated');
}

// Set up navigation
function setupNavigation() {
    logger.log('Navigation Setup');
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            navItems.forEach(i => i.classList.remove('active'));
            contentSections.forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Show corresponding section
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });
}

// Initialize dashboard
async function initialize() {
    logger.log('Initialization');
    
    // Set up navigation
    setupNavigation();
    
    // Check login state
    logger.log('Checking Login State');
    const { delegationChain } = await chrome.storage.local.get(['delegationChain']);
    logger.log('Delegation chain from storage:', delegationChain);
    
    if (delegationChain) {
        showDashboard();
    } else {
        showLogin();
    }
    
    // Set up login button
    logger.log('Login Button Setup');
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
    }
    
    // Set up logout button
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    
    // Listen for messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        logger.log('Message Received');
        logger.log('Message type:', message.type);
        
        switch (message.type) {
            case 'LOGIN_COMPLETE':
                showDashboard();
                break;
                
            case 'LOGOUT':
                showLogin();
                break;
        }
    });
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', initialize);
