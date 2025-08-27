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

// Wait for auth client to be ready
function waitForAuthClient(timeout = 30000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const checkAuthClient = () => {
            // Check for either the auth client or the login button
            if (window.ic?.auth || document.querySelector('#loginButton')) {
                resolve(window.ic?.auth);
                return;
            }
            
            if (Date.now() - startTime > timeout) {
                reject(new Error('Timeout waiting for auth client'));
                return;
            }
            
            setTimeout(checkAuthClient, 100);
        };
        
        checkAuthClient();
    });
}

// Send login result and close tab
async function sendLoginResultAndClose(delegationChain) {
    logger.log('Sending authentication result');
    
    try {
        // Send message to background script
        await chrome.runtime.sendMessage({
            type: 'II_AUTH_COMPLETE',
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
        logger.error('Failed to send authentication result:', error);
        chrome.runtime.sendMessage({
            type: 'II_AUTH_ERROR',
            error: error.message
        });
    }
}

// Initialize auth client and handle login
async function initializeAuthClient() {
    try {
        logger.log('Initializing auth client');
        
        // Wait for auth client to be ready
        const authClient = await waitForAuthClient();
        logger.log('Auth client available');
        
        // If we got the auth client directly
        if (authClient) {
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
                identityProvider: 'https://id.ai',
                onSuccess: async () => {
                    logger.log('Login successful');
                    const identity = authClient.getIdentity();
                    const delegationChain = await authClient.getDelegation();
                    await sendLoginResultAndClose(delegationChain);
                },
                onError: (error) => {
                    logger.error('Login error:', error);
                    chrome.runtime.sendMessage({
                        type: 'II_AUTH_ERROR',
                        error: error.message
                    });
                }
            });
        }
        // If we found the login button instead
        else {
            // Wait for click events to be processed
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Click the login button
            const loginButton = document.querySelector('#loginButton');
            if (loginButton) {
                loginButton.click();
            }
        }
    } catch (error) {
        logger.error('Auth client initialization failed:', error);
        chrome.runtime.sendMessage({
            type: 'II_AUTH_ERROR',
            error: error.message
        });
    }
}

// Initialize when the page loads
if (window.location.origin === 'https://id.ai' || window.location.origin === 'https://identity.internetcomputer.org' || window.location.origin === 'https://identity.ic0.app') {
    logger.log('II content script loaded');
    // Give the page a moment to load
    setTimeout(initializeAuthClient, 500);
}
