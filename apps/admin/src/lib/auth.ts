import { AuthClient } from '@dfinity/auth-client';
import { Identity } from '@dfinity/agent';

let authClient: AuthClient | null = null;

// Time before expiry to trigger renewal (1 day in nanoseconds)
const RENEWAL_THRESHOLD = BigInt(24 * 60 * 60 * 1000 * 1000 * 1000);
// Default session duration (7 days in nanoseconds)
const DEFAULT_SESSION_DURATION = BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000);

export const initAuthClient = async (): Promise<AuthClient> => {
  if (!authClient) {
    console.log('Creating new auth client...');
    authClient = await AuthClient.create();
    console.log('Auth client created');
  }
  return authClient;
};

export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const client = await initAuthClient();
    const isAuth = await client.isAuthenticated();
    
    if (isAuth) {
      // Check if identity needs renewal
      const identity = client.getIdentity();
      const delegationChain = identity.getDelegation();
      
      if (delegationChain) {
        const timeUntilExpiry = delegationChain.delegations[0].delegation.expiration - BigInt(Date.now()) * BigInt(1000_000);
        
        if (timeUntilExpiry < RENEWAL_THRESHOLD) {
          console.log('Identity expiring soon, attempting renewal...');
          await renewIdentity();
        }
      }
    }
    
    return isAuth;
  } catch (error) {
    console.error('Failed to check auth:', error);
    return false;
  }
};

export const renewIdentity = async (): Promise<void> => {
  const client = await initAuthClient();
  if (!await client.isAuthenticated()) {
    throw new Error('Cannot renew identity - not authenticated');
  }
  
  try {
    // Get current identity
    const identity = client.getIdentity();
    const delegationChain = identity.getDelegation();
    
    if (!delegationChain) {
      throw new Error('No delegation chain found');
    }
    
    // Attempt to renew the delegation
    await client.login({
      identityProvider: import.meta.env.VITE_II_URL || 'http://127.0.0.1:8000/?canisterId=br5f7-7uaaa-aaaaa-qaaca-cai',
      maxTimeToLive: DEFAULT_SESSION_DURATION,
      onSuccess: () => console.log('Identity renewed successfully'),
      onError: (error) => { throw error; }
    });
  } catch (error) {
    console.error('Failed to renew identity:', error);
    throw error;
  }
};

export const login = async (): Promise<void> => {
  const client = await initAuthClient();
  const identityProviderUrl = import.meta.env.VITE_II_URL || 'http://127.0.0.1:8000/?canisterId=br5f7-7uaaa-aaaaa-qaaca-cai';

  await new Promise<void>((resolve, reject) => {
    client.login({
      identityProvider: identityProviderUrl,
      maxTimeToLive: DEFAULT_SESSION_DURATION,
      onSuccess: async () => {
        console.log('Login successful');
        // Verify delegation chain
        const identity = client.getIdentity();
        const delegationChain = identity.getDelegation();
        
        if (!delegationChain) {
          console.error('No delegation chain found after login');
          reject(new Error('Invalid delegation chain'));
          return;
        }

        // Force a page reload to ensure all state is updated
        window.location.reload();
        resolve();
      },
      onError: (error) => {
        console.error('Login failed:', error);
        reject(error);
      },
    });
  });
};

export const logout = async (): Promise<void> => {
  try {
    const client = await initAuthClient();
    await client.logout();
    console.log('Logged out successfully');
    
    // Force a page reload to ensure all state is updated
    window.location.reload();
  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
};

export const getIdentity = async (): Promise<Identity | null> => {
  try {
    const client = await initAuthClient();
    return client.getIdentity();
  } catch (error) {
    console.error('Failed to get identity:', error);
    return null;
  }
};
