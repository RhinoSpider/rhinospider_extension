import { AuthClient } from '@rhinospider/web3-client';

let authClient: AuthClient | null = null;

export const getAuthClient = (): AuthClient => {
  if (!authClient) {
    console.log('Creating new auth client...');
    authClient = AuthClient.getInstance({
      identityProvider: 'http://127.0.0.1:8000?canisterId=be2us-64aaa-aaaaa-qaabq-cai'
    });
    console.log('Auth client created');
  }
  return authClient;
};

export const login = async (): Promise<void> => {
  const client = getAuthClient();
  await client.login();
};

export const logout = async (): Promise<void> => {
  const client = getAuthClient();
  await client.logout();
  authClient = null;
};

export const isAuthenticated = async (): Promise<boolean> => {
  const client = getAuthClient();
  return client.isAuthenticated();
};
