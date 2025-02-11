// Polyfill global
const _global = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};
(window as any).global = _global;

import { Actor, HttpAgent, AnonymousIdentity } from '@dfinity/agent';
import { idlFactory } from '@declarations/storage/storage.did.js';

let actor: any = null;

export const getStorageActor = async () => {
  try {
    // For local development, use anonymous identity
    if (process.env.NODE_ENV !== 'production') {
      if (!actor) {
        const agent = new HttpAgent({ 
          identity: new AnonymousIdentity(),
          host: 'http://127.0.0.1:8000'
        });
        
        await agent.fetchRootKey();
        
        actor = Actor.createActor(idlFactory, {
          agent,
          canisterId: import.meta.env.VITE_STORAGE_CANISTER_ID!,
        });
      }
      return actor;
    }

    // For production, use Internet Identity
    const authClient = getAuthClient();
    const state = authClient.getState();
    
    if (!state.isAuthenticated || !state.identity) {
      await authClient.login();
      return null;
    }

    if (!actor) {
      const identity = state.identity;
      const agent = new HttpAgent({ 
        identity,
        host: import.meta.env.VITE_IC_HOST || 'http://127.0.0.1:8000'
      });

      actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: import.meta.env.VITE_STORAGE_CANISTER_ID!,
      });
    }

    return actor;
  } catch (err) {
    console.error('Failed to create storage actor:', err);
    return null;
  }
};

export const clearStorageActor = () => {
  actor = null;
};
