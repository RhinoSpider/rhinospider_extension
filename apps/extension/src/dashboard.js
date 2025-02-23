// Import dependencies
import { AuthClient } from '@dfinity/auth-client';
import { ConsumerService } from './services/consumer';

// Constants
const II_URL = import.meta.env.VITE_II_URL || 'https://identity.ic0.app';
const IC_HOST = import.meta.env.VITE_IC_HOST || 'https://icp0.io';

// Logger utility
const logger = {
    log: (msg) => console.log(`✅ [Dashboard] ${msg}`),
    error: (msg, error) => console.error(`❌ [Dashboard] ${msg}`, error),
    debug: (msg, data) => console.debug(`🔍 [Dashboard] ${msg}`, data || ''),
    success: (msg) => console.log(`✨ [Dashboard] ${msg}`),
    info: (msg) => console.log(`ℹ️ [Dashboard] ${msg}`)
};

// Initialize services
let authClient = null;
let consumerService = null;

// Initialize auth client
async function initAuthClient() {
    if (!authClient) {
        logger.log('Creating auth client');
        authClient = await AuthClient.create();
    }
    return authClient;
}

// Initialize consumer service
async function initConsumerService() {
    try {
        logger.log('Consumer Service Initialization');
        
        // Get identity from auth client
        const client = await initAuthClient();
        
        // Wait for identity to be ready
        if (!client.isAuthenticated()) {
            logger.error('Not authenticated');
            return null;
        }
        
        const identity = client.getIdentity();
        if (!identity) {
            logger.error('No identity found');
            return null;
        }

        // Check if we already have a service
        if (consumerService) {
            logger.log('Using existing consumer service');
            return consumerService;
        }

        // Create new service
        logger.log('Creating consumer service with identity');
        consumerService = new ConsumerService(identity);
        logger.success('Consumer service initialized');
        
        return consumerService;
    } catch (error) {
        logger.error('Failed to initialize consumer service:', error);
        throw error;
    }
}

// Handle login
async function handleLogin() {
    try {
        logger.info('Initiating login');
        const client = await initAuthClient();
        
        logger.debug('Login config:', {
            II_URL,
            IC_HOST
        });
        
        await client.login({
            identityProvider: II_URL,
            maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days
            onSuccess: async () => {
                logger.success('Login successful');
                await onSuccess();
            },
            onError: (error) => {
                logger.error('Login error:', error);
                handleAuthError(error);
            }
        });
    } catch (error) {
        logger.error('Login failed:', error);
        handleAuthError(error);
    }
}

// Handle successful login
async function onSuccess() {
    try {
        logger.log('Auth complete');
        
        // Initialize consumer service
        await initConsumerService();
        
        // Show dashboard and initialize data
        showDashboard();
        await initializeDashboard();
    } catch (error) {
        logger.error('Failed to handle login success:', error);
        handleAuthError(error);
    }
}

// Handle auth error
function handleAuthError(error) {
    logger.error('Auth error:', error);
    const errorMsg = error.message || 'Authentication failed';
    document.getElementById('loginError').textContent = errorMsg;
    document.getElementById('loginError').style.display = 'block';
}

// Initialize dashboard
async function initializeDashboard() {
    try {
        logger.log('Initializing dashboard');
        const service = await initConsumerService();
        
        if (!service) {
            throw new Error('Failed to initialize consumer service');
        }
        
        // Get user profile
        const profile = await service.getProfile();
        if (profile) {
            document.getElementById('userProfile').textContent = JSON.stringify(profile, null, 2);
        }
        
        logger.success('Dashboard initialized');
    } catch (error) {
        logger.error('Failed to initialize dashboard:', error);
        handleAuthError(error);
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

// Initialize UI
function initializeUI() {
    // Add login button handler
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
    }

    // Add logout button handler
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    // Add navigation handlers
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
            if (section) {
                section.classList.add('active');
                section.style.display = 'block';
            }
        });
    });
}

// Check login state on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize UI first
        initializeUI();

        logger.log('Checking Login State');
        const client = await initAuthClient();
        const isAuth = await client.isAuthenticated();
        
        if (isAuth) {
            // Initialize consumer service
            await initConsumerService();
            
            // Show dashboard and initialize data
            showDashboard();
            await initializeDashboard();
        } else {
            showLogin();
        }
    } catch (error) {
        logger.error('Failed to check login state:', error);
        handleAuthError(error);
    }
});

// Handle logout
async function handleLogout() {
    try {
        const client = await initAuthClient();
        await client.logout();
        consumerService = null;
        showLogin();
    } catch (error) {
        logger.error('Failed to logout:', error);
        handleAuthError(error);
    }
}
