import { AuthClient } from '@dfinity/auth-client';

async function handleLogin() {
    try {
        const authClient = await AuthClient.create();
        await new Promise((resolve, reject) => {
            authClient.login({
                identityProvider: 'https://identity.internetcomputer.org',
                onSuccess: resolve,
                onError: reject
            });
        });
        
        // Get delegation chain from identity
        const identity = authClient.getIdentity();
        const delegationChain = identity.getDelegation();
        
        // Store delegation chain
        await chrome.storage.local.set({ 
            delegationChain: {
                publicKey: Array.from(delegationChain.publicKey),
                delegations: delegationChain.delegations.map(d => ({
                    delegation: {
                        pubkey: Array.from(d.delegation.pubkey),
                        expiration: d.delegation.expiration.toString(16),
                        targets: d.delegation.targets || []
                    },
                    signature: Array.from(d.signature)
                }))
            }
        });
        
        // Redirect to dashboard
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Login failed:', error);
    }
}

// Setup login button
document.getElementById('loginButton').addEventListener('click', handleLogin);
