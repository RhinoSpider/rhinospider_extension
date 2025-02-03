import type { Identity } from '@dfinity/agent';

export interface AuthConfig {
  identityProvider?: string;
  maxTimeToLive?: bigint;
  windowOpenerFeatures?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface AuthState {
  isAuthenticated: boolean;
  identity: Identity | null;
  isInitialized: boolean;
  error: Error | null;
}
