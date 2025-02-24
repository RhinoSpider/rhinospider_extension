import { AuthClient } from '@dfinity/auth-client';
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from './declarations/consumer/consumer.did.js';

// Constants
const II_URL = 'https://identity.ic0.app';
const IC_HOST = 'https://ic0.app';
const CANISTER_ID = 'tgyl5-yyaaa-aaaaj-az4wq-cai';

// UI Elements
const loginView = document.getElementById('login-container');
const dashboardView = document.getElementById('dashboard-container');
const userProfile = document.getElementById('userProfile');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const loginError = document.getElementById('loginError');

// Services
let actor = null;

// Logger utility
const logger = {
    debug: (msg, ...args) => console.log(' [Dashboard]', msg, ...args),
    error: (msg, ...args) => {
        console.error(' [Dashboard]', msg, ...args);
        if (loginError) {
            loginError.style.display = 'block';
            loginError.textContent = msg instanceof Error ? msg.message : msg;
        }
    }
};

// Show/hide views
function showLoginView() {
    loginView.classList.add('visible');
    dashboardView.classList.add('hidden');
    if (loginError) {
        loginError.style.display = 'none';
    }
}

function showDashboardView() {
    loginView.classList.remove('visible');
    dashboardView.classList.remove('hidden');
    if (loginError) {
        loginError.style.display = 'none';
    }
}

// Setup navigation
function setupNavigation() {
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
            const target = item.dataset.target;
            document.getElementById(target).classList.add('active');
        });
    });
}

// Create agent and actor
async function createAgentAndActor(identity) {
    // Create query agent (no signature verification)
    const queryAgent = new HttpAgent({
        host: IC_HOST,
        identity,
        disableIngressFilter: true,
        verifyQuerySignatures: false
    });

    // Create update agent (with signature verification)
    const updateAgent = new HttpAgent({
        host: IC_HOST,
        identity
    });

    // Create actors for query and update calls
    const queryActor = Actor.createActor(idlFactory, {
        agent: queryAgent,
        canisterId: CANISTER_ID
    });

    const updateActor = Actor.createActor(idlFactory, {
        agent: updateAgent,
        canisterId: CANISTER_ID
    });

    return { queryActor, updateActor };
}

// Format profile data for display
function formatProfileData(profile) {
    return JSON.stringify(profile, (key, value) => {
        // Convert BigInt to string with n suffix
        if (typeof value === 'bigint') {
            return value.toString() + 'n';
        }
        // Handle Principal objects
        if (value && value._isPrincipal) {
            return value.toString();
        }
        return value;
    }, 2);
}

async function handleAuthenticated(authClient) {
    try {
        // Get identity from auth client
        const identity = await authClient.getIdentity();
        const principal = identity.getPrincipal();
        logger.debug('Got principal:', principal.toString());
        
        // Show the dashboard with principal
        userProfile.textContent = principal.toString();
        showDashboardView();
        
        try {
            // Create agents and actors
            logger.debug('Creating agents and actors...');
            const { queryActor, updateActor } = await createAgentAndActor(identity);
            
            // Try to get profile using query actor
            logger.debug('Calling getProfile...');
            const profile = await queryActor.getProfile();
            logger.debug('Got profile response:', profile);
            
            if ('ok' in profile) {
                logger.debug('Profile found:', profile.ok);
                userProfile.textContent = formatProfileData(profile.ok);
            } else if ('err' in profile) {
                const error = profile.err;
                if ('NotFound' in error || 'NotAuthorized' in error) {
                    logger.debug('Profile not found, registering device...');
                    const deviceId = crypto.randomUUID();
                    
                    // Use update actor for registration
                    const registerResult = await updateActor.registerDevice(deviceId);
                    logger.debug('Register result:', registerResult);
                    
                    if ('err' in registerResult) {
                        throw new Error('Failed to register device: ' + formatProfileData(registerResult.err));
                    }
                    
                    // Try getting profile again after registration using query actor
                    const newProfile = await queryActor.getProfile();
                    logger.debug('Profile after registration:', newProfile);
                    
                    if ('err' in newProfile) {
                        throw new Error('Failed to get profile after registration: ' + formatProfileData(newProfile.err));
                    }
                    
                    userProfile.textContent = formatProfileData(newProfile.ok);
                } else {
                    throw new Error('Failed to get profile: ' + formatProfileData(error));
                }
            }
        } catch (error) {
            logger.error('Failed to setup agent/actor:', error);
            throw error;
        }
    } catch (error) {
        logger.error('Failed to handle authentication:', error);
        showLoginView();
    }
}

// Initialize auth client
async function initAuth() {
    try {
        logger.debug('Creating auth client');
        const authClient = await AuthClient.create();
        logger.debug('Auth client created');
        
        // Setup navigation
        setupNavigation();
        
        // Check if already authenticated
        if (await authClient.isAuthenticated()) {
            logger.debug('User is already authenticated');
            await handleAuthenticated(authClient);
        } else {
            logger.debug('User is not authenticated');
            showLoginView();
        }
        
        // Setup login button
        loginButton.onclick = async (e) => {
            e.preventDefault();
            
            try {
                await new Promise((resolve, reject) => {
                    authClient.login({
                        identityProvider: II_URL,
                        onSuccess: resolve,
                        onError: reject
                    });
                });
                
                await handleAuthenticated(authClient);
            } catch (error) {
                logger.error('Login failed:', error);
                showLoginView();
            }
        };
        
        // Setup logout button
        logoutButton.onclick = async () => {
            try {
                await authClient.logout();
                actor = null;
                showLoginView();
                logger.debug('Logged out successfully');
            } catch (error) {
                logger.error('Logout failed:', error);
            }
        };
        
    } catch (error) {
        logger.error('Failed to initialize auth:', error);
        showLoginView();
    }
}

// Initialize on load
window.onload = initAuth;
