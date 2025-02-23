// Import dependencies
import { AuthClient } from '@dfinity/auth-client';
import { DelegationIdentity } from '@dfinity/identity';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { ConsumerService } from './services/consumer';

// Constants from environment
const II_URL = import.meta.env.VITE_II_URL || 'https://identity.ic0.app';

// Logger utility
const logger = {
    log: (msg, data) => {
        console.log(`🕷️ [Dashboard] ${msg}`, data || '');
    },
    error: (msg, error) => {
        console.error(`❌ [Dashboard] ${msg}`, error);
    },
    debug: (msg, data) => {
        console.debug(`🕷️ [Dashboard] ${msg}`, data || '');
    },
    group: (msg) => {
        console.group(`🕷️ [Dashboard] ${msg}`);
    },
    groupEnd: () => {
        console.groupEnd();
    },
    success: (msg) => {
        console.log(`✅ [Dashboard] ${msg}`);
    }
};

// Initialize services
let authClient = null;
let consumerService = null;

// Initialize auth client
async function initAuthClient() {
    if (!authClient) {
        logger.log('Creating auth client');
        authClient = await AuthClient.create({
            idleOptions: {
                disableIdle: true
            }
        });
    }
    return authClient;
}

// Initialize consumer service
async function initConsumerService(delegationChain) {
    logger.group('Consumer Service Initialization');
    try {
        if (consumerService) {
            logger.debug('Using existing consumer service');
            logger.groupEnd();
            return consumerService;
        }

        logger.debug('No existing consumer service, creating new one');

        // Validate delegation chain
        logger.debug('Validating delegation chain:', {
            isDefined: !!delegationChain,
            hasDelegations: !!delegationChain?.delegations,
            publicKeyExists: !!delegationChain?.publicKey
        });

        if (!delegationChain || !delegationChain.delegations || !delegationChain.publicKey) {
            throw new Error('Invalid delegation chain structure');
        }

        // Inject IC agent script if not already loaded
        if (!window.rhinoSpiderIC) {
            logger.debug('IC agent not found, injecting script');
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('ic-agent.js');
                script.type = 'module';
                script.onload = () => {
                    logger.success('IC agent script loaded');
                    resolve();
                };
                script.onerror = (error) => {
                    logger.error('Failed to load IC agent script:', error);
                    reject(error);
                };
                document.head.appendChild(script);
            });

            // Give the script time to initialize
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Wait for IC agent to be available
        logger.debug('Waiting for IC agent initialization');
        if (!window.rhinoSpiderIC) {
            throw new Error('IC agent not initialized');
        }

        // Initialize IC agent with delegation chain
        logger.debug('Initializing IC agent with delegation chain');
        const identity = await window.rhinoSpiderIC.initializeIC(delegationChain);
        
        if (!identity) {
            throw new Error('Failed to get identity from IC agent');
        }

        // Create consumer service with identity
        logger.debug('Creating consumer service with identity');
        consumerService = new ConsumerService(identity);
        logger.success('Consumer service initialized');

        logger.groupEnd();
        return consumerService;
    } catch (error) {
        logger.error('Failed to initialize consumer service:', error);
        logger.error('Error stack:', error.stack);
        logger.groupEnd();
        throw error;
    }
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    logger.log('Message Received');
    logger.log('Message type:', message.type);
    
    switch (message.type) {
        case 'II_AUTH_COMPLETE':
            handleAuthComplete(message.delegationChain);
            break;
            
        case 'II_AUTH_ERROR':
            handleAuthError(message.error);
            break;
    }
});

// Handle successful authentication
async function handleAuthComplete(delegationChain) {
    logger.group('Authentication Complete');
    try {
        logger.log('Login successful');
        
        // Log delegation chain details
        logger.debug('Received delegation chain:', {
            isDefined: !!delegationChain,
            type: typeof delegationChain,
            hasPublicKey: !!delegationChain?.publicKey,
            hasDelegations: !!delegationChain?.delegations,
            delegationsCount: delegationChain?.delegations?.length
        });

        if (!delegationChain?.delegations) {
            throw new Error('Invalid delegation chain received from auth');
        }

        // Log first delegation for debugging
        if (delegationChain.delegations[0]) {
            logger.debug('First delegation:', {
                hasPubkey: !!delegationChain.delegations[0].delegation?.pubkey,
                hasExpiration: !!delegationChain.delegations[0].delegation?.expiration,
                hasSignature: !!delegationChain.delegations[0].signature
            });
        }

        // Initialize consumer service with raw delegation chain
        await initConsumerService(delegationChain);
        
        // Show dashboard
        showDashboard();
        
        // Initialize dashboard data
        await initializeDashboardData();
        
        logger.success('Authentication flow completed');
        logger.groupEnd();
    } catch (error) {
        logger.error('Failed to handle auth completion:', error);
        logger.error('Error stack:', error.stack);
        logger.groupEnd();
        handleAuthError(error);
    }
}

// Handle authentication error
function handleAuthError(error) {
    logger.error('Authentication failed:', error);
    showLogin();
}

// Initialize dashboard data
async function initializeDashboardData() {
    try {
        // Get extension status
        const { extensionEnabled } = await chrome.storage.local.get(['extensionEnabled']);
        document.getElementById('extensionStatus').checked = extensionEnabled ?? false;
        document.getElementById('settingsExtensionStatus').checked = extensionEnabled ?? false;
        
        // Get user profile and data from consumer
        if (consumerService) {
            try {
                // Get profile with retries
                let profile = null;
                let retries = 3;
                while (retries > 0) {
                    try {
                        profile = await consumerService.getProfile();
                        break;
                    } catch (error) {
                        retries--;
                        if (retries === 0) throw error;
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between retries
                    }
                }
                
                // Get topics
                const topics = await consumerService.getTopics();
                
                // Get AI config
                const aiConfig = await consumerService.getAIConfig();
                
                // Store data
                await chrome.storage.local.set({
                    profile,
                    topics,
                    aiConfig
                });
                
                // Update points display
                if (profile) {
                    const pagesScraped = profile.devices?.length || 0;
                    document.getElementById('pointsEarned').textContent = profile.points || 0;
                    document.getElementById('pagesScraped').textContent = pagesScraped;
                }
            } catch (error) {
                logger.error('Failed to fetch consumer data:', error);
                // Use cached data if available
                const { profile } = await chrome.storage.local.get(['profile']);
                if (profile) {
                    const pagesScraped = profile.devices?.length || 0;
                    document.getElementById('pointsEarned').textContent = profile.points || 0;
                    document.getElementById('pagesScraped').textContent = pagesScraped;
                }
            }
        }
        
        // Set up extension status toggle
        document.getElementById('extensionStatus').addEventListener('change', async (e) => {
            const enabled = e.target.checked;
            await chrome.storage.local.set({ extensionEnabled: enabled });
            document.getElementById('settingsExtensionStatus').checked = enabled;
        });
        
        document.getElementById('settingsExtensionStatus').addEventListener('change', async (e) => {
            const enabled = e.target.checked;
            await chrome.storage.local.set({ extensionEnabled: enabled });
            document.getElementById('extensionStatus').checked = enabled;
        });
    } catch (error) {
        logger.error('Failed to initialize dashboard data:', error);
    }
}

// Check if user is logged in
async function checkLogin() {
    try {
        const { delegationChain } = await chrome.storage.local.get(['delegationChain']);
        logger.log('Delegation chain from storage:', delegationChain);
        
        if (delegationChain) {
            // Initialize consumer service with raw delegation chain
            await initConsumerService(delegationChain);
            
            // Show dashboard
            showDashboard();
            
            // Initialize dashboard data
            await initializeDashboardData();
        } else {
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
                identityProvider: II_URL,
                onSuccess: async () => {
                    logger.log('Login successful');
                    const identity = client.getIdentity();
                    
                    // Get delegation chain from identity
                    if (identity instanceof DelegationIdentity) {
                        const delegationChain = identity.getDelegation();
                        
                        // Initialize consumer service with chain
                        await initConsumerService(delegationChain);
                        
                        // Show dashboard
                        showDashboard();
                        
                        // Initialize dashboard data
                        await initializeDashboardData();
                    } else {
                        throw new Error('Invalid identity type');
                    }
                    
                    resolve();
                },
                onError: (error) => {
                    logger.error('Login failed:', error);
                    reject(error);
                }
            });
        });
    } catch (error) {
        logger.error('Failed to login:', error);
        showLogin();
    }
}

// Handle logout
async function handleLogout() {
    try {
        const client = await initAuthClient();
        await client.logout();
        await chrome.storage.local.remove(['delegationChain', 'profile', 'topics', 'aiConfig']);
        consumerService = null;
        showLogin();
    } catch (error) {
        logger.error('Failed to logout:', error);
    }
}

// Show login page
function showLogin() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('dashboardContent').style.display = 'none';
}

// Show dashboard
function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboardContent').style.display = 'flex';
}

// Set up navigation
function setupNavigation() {
    logger.log('Navigation Setup');
    
    // Handle nav item clicks
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Hide all sections
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
                section.style.display = 'none';
            });
            
            // Show selected section
            const target = item.getAttribute('data-target');
            const section = document.getElementById(target);
            section.classList.add('active');
            section.style.display = 'block';
        });
    });
    
    // Handle login button click
    document.getElementById('loginButton').addEventListener('click', handleLogin);
    
    // Handle logout button click
    document.getElementById('logoutButton').addEventListener('click', handleLogout);
}

// Initialize dashboard
async function initialize() {
    logger.log('Initialization');
    
    setupNavigation();
    
    // Check login state
    logger.log('Checking Login State');
    await checkLogin();
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', initialize);
