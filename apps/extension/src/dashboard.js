import { AuthClient } from '@dfinity/auth-client';
import { Actor, HttpAgent } from '@dfinity/agent';
import { DelegationIdentity, DelegationChain } from '@dfinity/identity';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { idlFactory } from './declarations/consumer/consumer.did.js';

// Logger utility
const logger = {
    log: (msg) => console.log(`✅ [Dashboard] ${msg}`),
    info: (msg) => console.log(`ℹ️ [Dashboard] ${msg}`),
    debug: (msg, data) => console.log(`🔍 [Dashboard] ${msg}`, data || ''),
    error: (msg, data) => console.error(`❌ [Dashboard] ${msg}`, data || '')
};

// Constants
const II_URL = 'https://identity.ic0.app';
const IC_HOST = 'https://ic0.app';
const CANISTER_ID = 'tgyl5-yyaaa-aaaaj-az4wq-cai';
const DELEGATION_KEY = 'delegation_chain';

// UI Elements
const loginView = document.getElementById('login-container');
const dashboardView = document.getElementById('dashboard-container');
const loginButton = document.getElementById('login-button');
const principalDisplay = document.getElementById('userProfile');
const logoutButton = document.getElementById('logout-button');

// Services
let authClient = null;
let actor = null;

function showLoginView() {
    loginView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
}

function showDashboardView() {
    loginView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    dashboardView.classList.add('active');
}

async function createBaseIdentity() {
    const secretKey = crypto.getRandomValues(new Uint8Array(32));
    return Secp256k1KeyIdentity.fromSecretKey(secretKey);
}

async function loadDelegation() {
    try {
        const storedChain = JSON.parse(localStorage.getItem(DELEGATION_KEY));
        if (!storedChain) {
            logger.debug('No stored delegation chain found');
            return null;
        }

        const delegations = storedChain.delegations.map(d => ({
            delegation: {
                pubkey: new Uint8Array(d.delegation.pubkey),
                expiration: BigInt('0x' + d.delegation.expiration), // Convert hex to BigInt
                targets: d.delegation.targets || []
            },
            signature: new Uint8Array(d.signature)
        }));
        
        const publicKey = new Uint8Array(storedChain.publicKey);
        return DelegationChain.fromDelegations(publicKey, delegations);
    } catch (error) {
        logger.error('Failed to load delegation chain:', error);
        return null;
    }
}

async function storeDelegation(delegation) {
    try {
        // Convert delegation chain to storable format
        const delegationJson = {
            publicKey: Array.from(delegation.publicKey),
            delegations: delegation.delegations.map(d => ({
                delegation: {
                    pubkey: Array.from(d.delegation.pubkey),
                    expiration: d.delegation.expiration.toString(16), // Store as hex string
                    targets: d.delegation.targets
                },
                signature: Array.from(d.signature)
            }))
        };
        localStorage.setItem(DELEGATION_KEY, JSON.stringify(delegationJson));
        logger.debug('Stored delegation chain');
    } catch (error) {
        logger.error('Failed to store delegation chain:', error);
        throw error;
    }
}

async function handleAuthenticated(authClient) {
    try {
        const identity = await authClient.getIdentity();
        logger.debug('Got raw identity:', identity);
        
        const principal = identity.getPrincipal();
        logger.debug('Got principal:', principal.toString());
        
        // Store delegation chain
        if (identity._delegation) {
            await storeDelegation(identity._delegation);
        }
        
        // Show the dashboard with principal
        principalDisplay.textContent = principal.toString();
        showDashboardView();
        
        try {
            // Create base identity and load delegation
            const baseIdentity = await createBaseIdentity();
            const delegationChain = await loadDelegation();
            if (!delegationChain) {
                throw new Error('No valid delegation chain found');
            }
            
            const delegationIdentity = new DelegationIdentity(baseIdentity, delegationChain);
            logger.debug('Created delegation identity');
            
            // Create basic agent
            logger.debug('Creating agent...');
            const agent = new HttpAgent({
                host: IC_HOST,
                identity: delegationIdentity
            });

            // Always fetch root key
            logger.debug('Fetching root key...');
            await agent.fetchRootKey().catch(err => {
                logger.error('Failed to fetch root key:', err);
                throw new Error('Failed to fetch root key: ' + err.message);
            });
            
            // Create actor
            logger.debug('Creating actor...');
            logger.debug('IDL factory:', idlFactory);
            actor = Actor.createActor(idlFactory, {
                agent,
                canisterId: CANISTER_ID
            });
            logger.debug('Created actor:', actor);
            
            // Try to get profile
            logger.debug('Calling getProfile...');
            try {
                const result = await actor.getProfile().catch(err => {
                    logger.error('getProfile call failed:', {
                        name: err.name,
                        message: err.message,
                        stack: err.stack,
                        cause: err.cause,
                        toString: err.toString()
                    });
                    throw err;
                });
                
                logger.debug('GetProfile response:', result);
                
                if ('err' in result) {
                    const error = result.err;
                    logger.debug('Got error response:', error);
                    
                    if ('NotAuthorized' in error || 'NotFound' in error) {
                        // Need to register first
                        logger.debug('Profile not found, registering device...');
                        const deviceId = crypto.randomUUID();
                        logger.debug('Generated device ID:', deviceId);
                        
                        const registerResult = await actor.registerDevice(deviceId).catch(err => {
                            logger.error('registerDevice call failed:', {
                                name: err.name,
                                message: err.message,
                                stack: err.stack,
                                cause: err.cause,
                                toString: err.toString()
                            });
                            throw err;
                        });
                        
                        logger.debug('Register result:', registerResult);
                        
                        if ('err' in registerResult) {
                            throw new Error(`Failed to register device: ${JSON.stringify(registerResult.err)}`);
                        }
                        
                        logger.debug('Device registered successfully, getting profile again...');
                        const profileResult = await actor.getProfile().catch(err => {
                            logger.error('Second getProfile call failed:', {
                                name: err.name,
                                message: err.message,
                                stack: err.stack,
                                cause: err.cause,
                                toString: err.toString()
                            });
                            throw err;
                        });
                        
                        logger.debug('Second profile attempt result:', profileResult);
                        
                        if ('err' in profileResult) {
                            throw new Error(`Failed to get profile after registration: ${JSON.stringify(profileResult.err)}`);
                        }
                        
                        const profile = profileResult.ok;
                        logger.debug('Connected to consumer canister:', profile);
                    } else if ('SystemError' in error) {
                        throw new Error(`System error: ${error.SystemError}`);
                    } else if ('InvalidInput' in error) {
                        throw new Error(`Invalid input: ${error.InvalidInput}`);
                    } else {
                        throw new Error(`Consumer error: ${JSON.stringify(error)}`);
                    }
                } else {
                    const profile = result.ok;
                    logger.debug('Connected to consumer canister:', profile);
                }
            } catch (error) {
                logger.error('Failed to get profile:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    cause: error.cause,
                    toString: error.toString()
                });
                throw error;
            }
        } catch (error) {
            logger.error('Failed to setup agent/actor:', {
                name: error.name,
                message: error.message,
                stack: error.stack,
                cause: error.cause,
                toString: error.toString()
            });
            throw error;
        }
    } catch (error) {
        logger.error('Failed to handle authentication:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause,
            toString: error.toString()
        });
        showLoginView();
    }
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
            onSuccess: () => handleAuthenticated(authClient),
            onError: handleAuthError,
            maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days
            windowOpenerFeatures: 
                `left=${window.screen.width / 2 - 525},` +
                `top=${window.screen.height / 2 - 705},` +
                `toolbar=0,location=0,menubar=0,width=1050,height=1410`
        });
    } catch (error) {
        logger.error('Login failed:', error);
        handleAuthError(error);
    }
}

async function logout() {
    try {
        if (authClient) {
            await authClient.logout();
            actor = null;
            localStorage.removeItem(DELEGATION_KEY);
            showLoginView();
            logger.log('Logged out successfully');
        }
    } catch (error) {
        logger.error('Logout failed:', error);
    }
}

function handleAuthError(error) {
    logger.error('Login failed:', error);
    showLoginView();
}

async function initialize() {
    try {
        // Create auth client
        logger.log('Creating auth client');
        authClient = await AuthClient.create();
        logger.log('Auth client created');

        // Check if user is already logged in
        if (await authClient.isAuthenticated()) {
            logger.log('User is already authenticated');
            handleAuthenticated(authClient);
        } else {
            logger.log('User needs to login');
            showLoginView();
        }
    } catch (error) {
        logger.error('Failed to initialize:', error);
        showLoginView();
    }
}

// Initialize dashboard when page loads
window.addEventListener('load', initialize);

// Add event listeners
loginButton.addEventListener('click', login);
logoutButton.addEventListener('click', logout);
