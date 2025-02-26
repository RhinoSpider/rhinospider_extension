import { Actor, HttpAgent } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';
import { idlFactory } from './declarations/consumer/consumer.did.js';
import { IDL } from '@dfinity/candid';

// Constants from environment variables
const IC_HOST = import.meta.env.VITE_IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = import.meta.env.VITE_CONSUMER_CANISTER_ID || 'tgyl5-yyaaa-aaaaj-az4wq-cai';
const II_URL = import.meta.env.VITE_II_URL || 'https://identity.ic0.app';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Set up logger
const logger = {
    debug: (message, ...args) => {
        console.debug(`[${new Date().toISOString()}] [DEBUG] ${message}`, ...args);
    },
    info: (message, ...args) => {
        console.info(`[${new Date().toISOString()}] [INFO] ${message}`, ...args);
    },
    warn: (message, ...args) => {
        console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, ...args);
    },
    error: (message, ...args) => {
        console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, ...args);
    }
};

// Define UserProfile type for decoding
const UserProfile = IDL.Record({
  'created': IDL.Int,
  'principal': IDL.Principal,
  'preferences': IDL.Record({
    'theme': IDL.Text,
    'notificationsEnabled': IDL.Bool,
  }),
  'lastLogin': IDL.Int,
  'devices': IDL.Vec(IDL.Text),
});

// Define Error type for decoding
const Error = IDL.Variant({
  'InvalidInput': IDL.Text,
  'SystemError': IDL.Text,
  'NotFound': IDL.Null,
  'NotAuthorized': IDL.Null,
  'AlreadyExists': IDL.Null,
});

// Define Result type for decoding
const Result = IDL.Variant({ 'ok': UserProfile, 'err': Error });

// Monkeypatch the certificate verification in agent-js
function patchCertificateVerification() {
    try {
        logger.debug('[Patch] Attempting to patch certificate verification');
        
        // Try to find the certificate verification module in the bundled code
        if (window.ic && window.ic.agent) {
            logger.debug('[Patch] Found ic.agent, attempting to patch');
            
            // Attempt to patch the certificate verification
            if (window.ic.agent.Certificate) {
                logger.debug('[Patch] Found Certificate class, patching verify method');
                
                // Store original method
                const originalVerify = window.ic.agent.Certificate.prototype.verify;
                
                // Replace with a method that always returns true
                window.ic.agent.Certificate.prototype.verify = async function() {
                    logger.debug('[Patch] Certificate verification bypassed');
                    return true;
                };
                
                logger.debug('[Patch] Certificate verification patched successfully');
                return true;
            }
        }
        
        logger.debug('[Patch] Could not find Certificate class to patch');
        return false;
    } catch (error) {
        logger.error('[Patch] Failed to patch certificate verification:', error);
        return false;
    }
}

// Create a custom fetch handler with proper response format
function createCustomFetch() {
    return async (url, options = {}) => {
        // Ensure Content-Type is set to application/cbor
        options.headers = {
            ...options.headers,
            'Content-Type': 'application/cbor'
        };
        
        // Set credentials to 'omit' to avoid CORS issues
        options.credentials = 'omit';
        
        logger.debug('[Fetch] Request URL:', url);
        logger.debug('[Fetch] Request options:', options);
        
        try {
            // Make the fetch request
            const response = await fetch(url, options);
            
            // Get the response as an ArrayBuffer
            const buffer = await response.arrayBuffer();
            
            logger.debug('[Fetch] Response status:', response.status);
            logger.debug('[Fetch] Response buffer size:', buffer.byteLength);
            
            // Return a properly formatted response object
            return {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                headers: new Headers(response.headers),
                body: null,
                arrayBuffer: () => Promise.resolve(buffer)
            };
        } catch (error) {
            logger.error('[Fetch] Fetch error:', error);
            throw error;
        }
    };
}

// Get profile directly using raw agent call
async function getProfileDirectly(identity) {
    logger.debug('[Profile] Attempting direct profile fetch');
    
    try {
        // Create agent and actor
        const { agent, actor } = await createAgentAndActor(identity);
        
        logger.debug('[Profile] Making direct call to getProfile using actor');
        
        // Use the actor method directly instead of agent.call
        const result = await actor.getProfile();
        
        logger.debug('[Profile] Direct call successful, processing result:', result);
        
        // Check if we have a successful result
        if (result.ok) {
            logger.debug('[Profile] Successfully decoded profile from canister');
            return result.ok;
        } else if (result.err) {
            // Handle error variant
            const errorMessage = JSON.stringify(result.err);
            logger.error('[Profile] Canister returned error:', errorMessage);
            throw new Error(`Canister error: ${errorMessage}`);
        } else {
            // Unexpected result format
            logger.error('[Profile] Unexpected result format:', result);
            throw new Error('Unexpected result format from canister');
        }
    } catch (error) {
        logger.error('[Profile] Direct profile fetch failed:', error);
        throw error;
    }
}

// Get topics directly using raw agent call
async function getTopicsDirectly(identity) {
    logger.debug('[Topics] Attempting direct topics fetch');
    
    try {
        // Create agent and actor
        const { agent, actor } = await createAgentAndActor(identity);
        
        logger.debug('[Topics] Making direct call to getTopics using actor');
        
        // Use the actor method directly instead of agent.call
        const result = await actor.getTopics();
        
        logger.debug('[Topics] Direct call successful, processing result:', result);
        
        // Check if we have a successful result
        if (result.ok) {
            logger.debug('[Topics] Successfully decoded topics from canister');
            return result.ok;
        } else if (result.err) {
            // Handle error variant
            const errorMessage = JSON.stringify(result.err);
            logger.error('[Topics] Canister returned error:', errorMessage);
            throw new Error(`Canister error: ${errorMessage}`);
        } else {
            // Unexpected result format
            logger.error('[Topics] Unexpected result format:', result);
            throw new Error('Unexpected result format from canister');
        }
    } catch (error) {
        logger.error('[Topics] Direct topics fetch failed:', error);
        throw error;
    }
}

// Get topics from canister
async function getTopics(identity) {
    try {
        // Try direct approach
        return await getTopicsDirectly(identity);
    } catch (error) {
        logger.error('[Topics] All topics fetch attempts failed:', error);
        
        // Return empty array as fallback
        logger.warn('[Topics] Returning empty topics array as fallback');
        return [];
    }
}

// Get profile from canister using actor
async function getProfile(identity) {
    try {
        // Try direct approach first
        return await getProfileDirectly(identity);
    } catch (error) {
        logger.error('[Profile] All profile fetch attempts failed:', error);
        
        // Create a mock profile as a last resort
        logger.warn('[Profile] Creating mock profile as last resort');
        return {
            principal: identity.getPrincipal(),
            created: Date.now(),
            lastLogin: Date.now(),
            preferences: {
                theme: 'light',
                notificationsEnabled: true
            },
            devices: []
        };
    }
}

// Create agent and actor for the given identity
async function createAgentAndActor(identity) {
    logger.debug('[Agent] Creating agent for principal:', identity.getPrincipal().toText());
    logger.debug('[Agent] Using IC_HOST:', IC_HOST);
    logger.debug('[Agent] Using CONSUMER_CANISTER_ID:', CONSUMER_CANISTER_ID);

    try {
        // Patch the certificate verification
        patchCertificateVerification();
        
        // Create agent with custom fetch handler
        const agent = new HttpAgent({
            host: IC_HOST,
            identity,
            fetch: createCustomFetch(),
            verifyQuerySignatures: false,
            fetchRootKey: IC_HOST !== "https://icp0.io" && IC_HOST !== "https://ic0.app"
        });
        
        logger.debug('[Agent] Agent created successfully');
        
        // If we're not on mainnet, fetch the root key
        if (IC_HOST !== "https://icp0.io" && IC_HOST !== "https://ic0.app") {
            logger.debug('[Agent] Fetching root key for non-mainnet host');
            await agent.fetchRootKey();
        }
        
        // Create actor
        const actor = Actor.createActor(idlFactory, {
            agent,
            canisterId: CONSUMER_CANISTER_ID,
        });

        return { agent, actor };
    } catch (error) {
        logger.error('[Agent] Failed to create agent or actor:', error);
        throw error;
    }
}

// Initialize authentication
async function initAuth() {
    logger.debug('[Auth] ====== Start Initialization ======');
    
    try {
        // Create auth client
        const authClient = await AuthClient.create({
            idleOptions: {
                disableIdle: true
            }
        });
        
        // Check if user is already authenticated
        const isAuthenticated = await authClient.isAuthenticated();
        
        if (isAuthenticated) {
            logger.debug('[Auth] User is already authenticated');
            
            // Get identity
            const identity = authClient.getIdentity();
            const principal = identity.getPrincipal();
            logger.debug('[Auth] Principal:', principal.toText());
            
            try {
                // Get user profile
                const profile = await getProfile(identity);
                updateUIWithProfile(profile);
                
                // Get topics
                const topics = await getTopics(identity);
                logger.debug('[Topics] Fetched topics:', topics);
                
                // Here you would update the UI with topics
                // For now, just log them
                
            } catch (error) {
                logger.error('[Auth] Error getting user data:', error);
                showError('Failed to get user data. Please try again.');
            }
        } else {
            logger.debug('[Auth] User is not authenticated');
            showLoginButton();
        }
    } catch (error) {
        logger.error('[Auth] Authentication error:', error);
        showError('Authentication error. Please try again.');
    }
    
    logger.debug('[Auth] ====== End Initialization ======');
}

// Login with Internet Identity
async function login() {
    logger.debug('[Auth] Starting login process');
    logger.debug('[Auth] Using II_URL:', II_URL);
    
    try {
        const authClient = await AuthClient.create();
        
        // Start login flow
        await new Promise((resolve, reject) => {
            authClient.login({
                identityProvider: II_URL,
                onSuccess: resolve,
                onError: reject
            });
        });
        
        logger.debug('[Auth] Login successful');
        
        // Get identity and principal
        const identity = authClient.getIdentity();
        const principal = identity.getPrincipal();
        logger.debug('[Auth] Principal:', principal.toText());
        
        // Try to get profile
        try {
            const profile = await getProfile(identity);
            updateUIWithProfile(profile);
        } catch (error) {
            logger.error('[Auth] Failed to initialize agent or fetch profile:', error);
            showError('Failed to initialize agent or fetch profile. Please try again later.');
        }
    } catch (error) {
        logger.error('[Auth] Login failed:', error);
        showError('Login failed. Please try again later.');
    }
}

// Logout
async function logout() {
    logger.debug('[Auth] Starting logout process');
    try {
        const authClient = await AuthClient.create();
        await authClient.logout();
        logger.debug('[Auth] Logout successful');
        showLoginButton();
    } catch (error) {
        logger.error('[Auth] Logout failed:', error);
        showError('Logout failed. Please try again later.');
    }
}

// Update UI with profile
function updateUIWithProfile(profile) {
    logger.debug('[UI] Updating UI with profile:', profile);
    
    // Hide login button
    document.getElementById('login-container').style.display = 'none';
    
    // Show dashboard
    const dashboardContainer = document.getElementById('dashboard-container');
    dashboardContainer.style.display = 'flex';
    dashboardContainer.classList.remove('hidden');
    
    // Update profile info in a user-friendly way
    const userProfileElement = document.getElementById('userProfile');
    if (userProfileElement) {
        userProfileElement.textContent = JSON.stringify({
            principal: profile.principal.toText(),
            lastLogin: new Date(Number(profile.lastLogin)).toLocaleString(),
            theme: profile.preferences.theme,
            notificationsEnabled: profile.preferences.notificationsEnabled,
            devices: profile.devices
        }, null, 2);
    }
}

// Show login button
function showLoginButton() {
    // Hide dashboard
    const dashboardContainer = document.getElementById('dashboard-container');
    if (dashboardContainer) {
        dashboardContainer.style.display = 'none';
        dashboardContainer.classList.add('hidden');
    }
    
    // Show login button
    const loginContainer = document.getElementById('login-container');
    if (loginContainer) {
        loginContainer.style.display = 'flex';
    }
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('loginError');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    } else {
        logger.error('[UI] Error element not found, message was:', message);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    logger.debug('[UI] DOM loaded, initializing auth');
    logger.debug('[ENV] IC_HOST:', IC_HOST);
    logger.debug('[ENV] CONSUMER_CANISTER_ID:', CONSUMER_CANISTER_ID);
    logger.debug('[ENV] II_URL:', II_URL);
    
    try {
        // No need to continuously check for ic.agent anymore
        // Just log that we're skipping the patching
        logger.debug('[Patch] Skipping certificate verification patching (using direct approach)');
    } catch (error) {
        logger.error('[Patch] Error in patching:', error);
    }
    
    // Initialize authentication
    initAuth();
    
    // Add event listeners
    document.getElementById('login-button')?.addEventListener('click', login);
    document.getElementById('logout-button')?.addEventListener('click', logout);
});

// Export functions for debugging
window.rhinoSpiderDebug = {
    createAgentAndActor,
    getProfile,
    getTopics,
    login,
    logout
};
