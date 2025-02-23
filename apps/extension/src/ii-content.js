// Content script for Internet Identity interaction

// Logger utility
const logger = {
    log: (msg, data) => {
        console.log(` [II Content] ${msg}`, data || '');
    },
    error: (msg, error) => {
        console.error(` [II Content] ${msg}`, error);
    }
};

// Wait for element to be present
function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const checkElement = () => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }
            
            if (Date.now() - startTime > timeout) {
                reject(new Error(`Timeout waiting for element: ${selector}`));
                return;
            }
            
            setTimeout(checkElement, 100);
        };
        
        checkElement();
    });
}

// Send login result and close tab
async function sendLoginResultAndClose(delegationChain) {
    logger.log('Sending login result');
    
    try {
        // Send message to background script
        await chrome.runtime.sendMessage({
            type: 'II_LOGIN_COMPLETE',
            delegationChain: {
                publicKey: Array.from(delegationChain.publicKey),
                delegations: delegationChain.delegations.map(d => ({
                    delegation: {
                        pubkey: Array.from(d.delegation.pubkey),
                        expiration: d.delegation.expiration.toString(16), // Convert to hex string
                        targets: d.delegation.targets || []
                    },
                    signature: Array.from(d.signature)
                }))
            }
        });
        
        // Close the tab
        logger.log('Closing II tab');
        window.close();
    } catch (error) {
        logger.error('Failed to send login result:', error);
        chrome.runtime.sendMessage({
            type: 'II_LOGIN_ERROR',
            error: error.message
        });
    }
}

// Initialize auth client and handle login
async function initializeAuthClient() {
    try {
        logger.log('Initializing auth client');
        
        // Wait for auth container to be present
        await waitForElement('#auth-client-ready');
        logger.log('Auth container found');
        
        // Wait for auth client to be available
        if (!window.ic?.auth) {
            logger.log('Waiting for auth client to be available');
            await new Promise(resolve => {
                const checkAuth = () => {
                    if (window.ic?.auth) {
                        resolve();
                    } else {
                        setTimeout(checkAuth, 100);
                    }
                };
                checkAuth();
            });
        }
        
        // Get auth client instance
        const authClient = window.ic.auth;
        logger.log('Auth client available');
        
        // Check if we're already logged in
        if (await authClient.isAuthenticated()) {
            logger.log('Already authenticated');
            const identity = authClient.getIdentity();
            const delegationChain = await authClient.getDelegation();
            await sendLoginResultAndClose(delegationChain);
            return;
        }
        
        // Start login flow
        await authClient.login({
            identityProvider: 'https://identity.ic0.app',
            onSuccess: async () => {
                logger.log('Login successful');
                const identity = authClient.getIdentity();
                const delegationChain = await authClient.getDelegation();
                await sendLoginResultAndClose(delegationChain);
            },
            onError: (error) => {
                logger.error('Login error:', error);
                chrome.runtime.sendMessage({
                    type: 'II_LOGIN_ERROR',
                    error: error.message
                });
            }
        });
    } catch (error) {
        logger.error('Auth client initialization failed:', error);
        chrome.runtime.sendMessage({
            type: 'II_LOGIN_ERROR',
            error: error.message
        });
    }
}

// Initialize when the page loads
if (window.location.origin === 'https://identity.ic0.app') {
    logger.log('II content script loaded');
    initializeAuthClient();
}
