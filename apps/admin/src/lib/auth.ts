import { AuthClient } from '@dfinity/auth-client';
import { Identity } from '@dfinity/agent';

let authClient: AuthClient | null = null;

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
    return await client.isAuthenticated();
  } catch (error) {
    console.error('Failed to check auth:', error);
    return false;
  }
};

export const login = async (): Promise<void> => {
  const client = await initAuthClient();
  const identityProviderUrl = import.meta.env.VITE_II_URL || 'https://identity.ic0.app';

  await new Promise<void>((resolve, reject) => {
    client.login({
      identityProvider: identityProviderUrl,
      maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days in nanoseconds
      onSuccess: async () => {
        console.log('Login successful');
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
  if (!authClient) {
    console.warn('No auth client to logout from');
    return;
  }
  await authClient.logout();
  authClient = null;
  // Force a page reload to clear state
  window.location.reload();
};

export const getIdentity = async (): Promise<Identity | null> => {
  const client = await initAuthClient();
  if (await isAuthenticated()) {
    return client.getIdentity();
  }
  return null;
};
