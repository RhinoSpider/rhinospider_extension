import { AuthClient } from '@dfinity/auth-client';
import { Identity } from '@dfinity/agent';

let authClient: AuthClient | null = null;

const RENEWAL_THRESHOLD = BigInt(24 * 60 * 60 * 1000 * 1000 * 1000); // 1 day
const DEFAULT_SESSION_DURATION = BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000); // 7 days

export const initAuthClient = async (): Promise<AuthClient> => {
  if (!authClient) {
    authClient = await AuthClient.create({
      idleOptions: {
        disableDefaultIdleCallback: true,
        disableIdle: true
      }
    });
  }
  return authClient;
};

export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const client = await initAuthClient();
    const isAuth = await client.isAuthenticated();

    if (isAuth) {
      const identity = client.getIdentity();
      const delegationChain = identity.getDelegation();

      if (delegationChain) {
        const timeUntilExpiry = delegationChain.delegations[0].delegation.expiration -
          BigInt(Date.now()) * BigInt(1000_000);

        if (timeUntilExpiry < RENEWAL_THRESHOLD) {
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
    const identity = client.getIdentity();
    const delegationChain = identity.getDelegation();

    if (!delegationChain) {
      throw new Error('No delegation chain found');
    }

    await client.login({
      identityProvider: import.meta.env.VITE_II_URL || 'https://id.ai',
      maxTimeToLive: DEFAULT_SESSION_DURATION,
      onSuccess: () => {},
      onError: (error) => { throw error; }
    });
  } catch (error) {
    console.error('Failed to renew identity:', error);
    throw error;
  }
};

export const login = async (): Promise<void> => {
  const client = await initAuthClient();
  const identityProviderUrl = import.meta.env.VITE_II_URL || 'https://id.ai';

  await new Promise<void>((resolve, reject) => {
    client.login({
      identityProvider: identityProviderUrl,
      maxTimeToLive: DEFAULT_SESSION_DURATION,
      windowOpenerFeatures: 'toolbar=0,location=0,menubar=0,width=500,height=600',
      onSuccess: async () => {
        const identity = client.getIdentity();
        const delegationChain = identity.getDelegation();

        if (!delegationChain) {
          reject(new Error('Invalid delegation chain'));
          return;
        }

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