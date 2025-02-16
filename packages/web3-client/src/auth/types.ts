import type { Identity } from '@dfinity/agent';

export interface SerializableIdentity {
  getPrincipal: () => string;
}

export interface AuthConfig {
  identityProvider?: string;
  maxTimeToLive?: bigint;
  windowOpenerFeatures?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface AuthState {
  isAuthenticated: boolean;
  principal: string | null;
  isInitialized: boolean;
  error: string | null;
}
