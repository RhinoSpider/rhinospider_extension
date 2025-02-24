import { AuthClient } from '@dfinity/auth-client';
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from './declarations/consumer/consumer.did.js';

// Logger utility
const logger = {
    log: (msg) => console.log(`✅ [Dashboard] ${msg}`),
    info: (msg) => console.log(`ℹ️ [Dashboard] ${msg}`),
    debug: (msg, data) => console.log(`🔍 [Dashboard] ${msg}`, data || ''),
    error: (msg) => console.error(`❌ [Dashboard] ${msg}`)
};

// Constants
const II_URL = 'https://identity.ic0.app';
const IC_HOST = 'https://icp0.io';
const CANISTER_ID = 'tgyl5-yyaaa-aaaaj-az4wq-cai';

// UI Elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginButton = document.getElementById('login-button');

// Services
let authClient = null;
let actor = null;

function showLoginView() {
    if (loginContainer) loginContainer.style.display = 'flex';
    if (dashboardContainer) dashboardContainer.style.display = 'none';
}

function showDashboardView() {
    if (loginContainer) loginContainer.style.display = 'none';
    if (dashboardContainer) dashboardContainer.style.display = 'flex';
}

function showError(message) {
    const errorElement = document.getElementById('loginError');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    logger.error(message);
}

async function login() {
    try {
        logger.info('Initiating login');
        logger.debug('Login config:', { II_URL });

        if (!authClient) {
            authClient = await AuthClient.create();
        }

        await authClient.login({
            identityProvider: II_URL,
            onSuccess: handleAuthComplete,
            onError: handleAuthError,
            windowOpenerFeatures: 
                `left=${window.screen.width / 2 - 525},` +
                `top=${window.screen.height / 2 - 705},` +
                `toolbar=0,location=0,menubar=0,width=1050,height=1410`
        });
    } catch (error) {
        logger.error('Login failed:', error);
        showError(error.message);
    }
}

async function createActor(identity) {
    try {
        logger.debug('Creating actor with identity');
        
        // Create agent with identity directly from II
        const agent = new HttpAgent({
            host: IC_HOST,
            identity: identity
        });
        
        // Fetch root key for local development
        if (IC_HOST !== 'https://ic0.app') {
            await agent.fetchRootKey();
        }
        
        // Create actor
        const newActor = Actor.createActor(idlFactory, {
            agent,
            canisterId: CANISTER_ID
        });
        
        logger.debug('Actor created successfully');
        return newActor;
    } catch (error) {
        logger.error('Failed to create actor:', error);
        throw error;
    }
}

async function handleAuthComplete() {
    try {
        logger.log('Auth complete');

        // Get identity from auth client
        const identity = await authClient.getIdentity();
        logger.debug('Got identity:', identity);
        
        // Just verify we can get the delegation chain
        const chain = identity.getDelegation();
        logger.debug('Got delegation chain:', chain);
        
        // For now just show the principal
        const principal = identity.getPrincipal();
        logger.debug('Got principal:', principal.toString());
        
        // Create actor
        actor = await createActor(identity);
        
        // Try a simple call to verify actor works
        const profile = await actor.getProfile();
        logger.debug('Got profile:', profile);
        
        // Show dashboard view
        showDashboardView();
        
        // Show the principal and profile in the dashboard
        const profileElement = document.getElementById('userProfile');
        if (profileElement) {
            profileElement.textContent = `Principal: ${principal.toString()}\n\nProfile: ${JSON.stringify(profile, null, 2)}`;
        }

    } catch (error) {
        logger.error('Auth completion failed:', error);
        showError('Failed to complete authentication: ' + error.message);
        showLoginView();
    }
}

function handleAuthError(error) {
    logger.error('Login failed:', error);
    showError('Authentication failed: ' + error.message);
    showLoginView();
}

async function initialize() {
    try {
        // Create auth client
        logger.log('Creating auth client');
        authClient = await AuthClient.create();
        logger.log('Auth client created');

        // Check if user is already logged in
        logger.log('Checking Login State');
        const isAuthenticated = await authClient.isAuthenticated();

        if (!isAuthenticated) {
            logger.info('User is not authenticated');
            showLoginView();
            // Set up login button handler
            if (loginButton) {
                loginButton.onclick = login;
            }
        } else {
            logger.info('User is authenticated');
            await handleAuthComplete();
        }
    } catch (error) {
        logger.error('Initialization failed:', error);
        showError('Failed to initialize: ' + error.message);
        showLoginView();
    }
}

// Initialize dashboard when page loads
window.addEventListener('load', initialize);
