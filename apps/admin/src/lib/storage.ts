// Polyfill global
const _global = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};
(window as any).global = _global;

import { Actor, HttpAgent, AnonymousIdentity } from '@dfinity/agent';
import { idlFactory } from '@declarations/storage/storage.did.js';
import { initAuthClient, isAuthenticated, getIdentity } from './auth';

// Environment configuration
export const IS_LOCAL = process.env.NODE_ENV !== 'production';
export const HOST = IS_LOCAL ? 'http://127.0.0.1:8000' : import.meta.env.VITE_IC_HOST || 'http://127.0.0.1:8000';

let actor: any = null;

export const getStorageActor = async () => {
  try {
    // For local development, use anonymous identity
    if (IS_LOCAL) {
      if (!actor) {
        const agent = new HttpAgent({ 
          identity: new AnonymousIdentity(),
          host: HOST
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
    const authClient = await initAuthClient();
    const isAuth = await isAuthenticated();
    
    if (!isAuth) {
      console.log('User not authenticated');
      return null;
    }

    if (!actor) {
      const identity = await getIdentity();
      if (!identity) {
        console.log('No identity available');
        return null;
      }
      
      const agent = new HttpAgent({ 
        identity,
        host: HOST
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
