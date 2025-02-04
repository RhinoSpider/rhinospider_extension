import { useCallback } from 'react';
import { Identity } from '@dfinity/agent';
import { useAuth as useAuthContext } from '../auth/hooks';

export interface AuthConfig {
  appName: string;
  logo?: string;
  iiUrl?: string;
}

interface AuthHook {
  isAuthenticated: boolean;
  identity: Identity | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  error: Error | null;
}

export function useAuth(config: AuthConfig): AuthHook {
  const { state, login: contextLogin, logout: contextLogout } = useAuthContext();

  const handleLogin = useCallback(async () => {
    try {
      await contextLogin({
        identityProvider: config.iiUrl,
        windowOpenerFeatures: 
          `left=${window.screen.width / 2 - 525 / 2},` +
          `top=${window.screen.height / 2 - 705 / 2},` +
          `toolbar=0,location=0,menubar=0,width=525,height=705`
      });
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    }
  }, [config.iiUrl, contextLogin]);

  return {
    isAuthenticated: state.isAuthenticated,
    identity: state.identity,
    login: handleLogin,
    logout: contextLogout,
    error: state.error
  };
}
