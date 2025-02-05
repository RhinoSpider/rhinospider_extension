// Polyfill global
const _global = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};
(window as any).global = _global;

import { Actor, HttpAgent, AnonymousIdentity } from '@dfinity/agent';
import { idlFactory } from '@declarations/admin/admin.did.js';
import type { ScrapingTopic, AIConfig, ScrapedData, ExtensionUser } from '../types';
import { getAuthClient } from './auth';

let actor: any = null;

export const getAdminActor = async () => {
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
          canisterId: import.meta.env.VITE_ADMIN_CANISTER_ID!,
        });
      }
      return actor;
    }

    // For production, use Internet Identity
    const authClient = getAuthClient();
    const state = authClient.getState();
    console.log('Auth state:', state);
    
    if (!state.isAuthenticated || !state.identity) {
      console.log('Not authenticated, starting login...');
      await authClient.login();
      return null;
    }

    if (!actor) {
      const identity = state.identity;
      console.log('Got identity:', identity.getPrincipal().toString());

      const agent = new HttpAgent({ 
        identity,
        host: 'http://127.0.0.1:8000'
      });

      // Fetch root key for local development
      if (process.env.NODE_ENV !== 'production') {
        try {
          console.log('Fetching root key...');
          await agent.fetchRootKey();
        } catch (err) {
          console.warn('Could not fetch root key. Proceeding anyway:', err);
        }
      }

      // Create actor with retry
      let retries = 3;
      while (retries > 0) {
        try {
          actor = Actor.createActor(idlFactory, {
            agent,
            canisterId: import.meta.env.VITE_ADMIN_CANISTER_ID!,
          });
          console.log('Actor created successfully');
          break;
        } catch (err) {
          console.error(`Failed to create actor (${retries} retries left):`, err);
          retries--;
          if (retries === 0) throw err;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    return actor;
  } catch (error) {
    console.error('Failed to create admin actor:', error);
    throw error;
  }
};

export const clearAdminActor = () => {
  actor = null;
};

// Topic Management
export async function getTopics(): Promise<ScrapingTopic[]> {
  const actor = await getAdminActor();
  const result = await actor.getTopics();
  if ('Ok' in result) {
    return result.Ok;
  }
  throw new Error(result.Err);
}

export async function createTopic(topic: Omit<ScrapingTopic, 'id'>): Promise<ScrapingTopic> {
  const actor = await getAdminActor();
  const result = await actor.createTopic(topic);
  if ('Ok' in result) {
    return result.Ok;
  }
  throw new Error(result.Err);
}

export async function updateTopic(id: string, topic: ScrapingTopic): Promise<ScrapingTopic> {
  const actor = await getAdminActor();
  const result = await actor.updateTopic(id, topic);
  if ('Ok' in result) {
    return result.Ok;
  }
  throw new Error(result.Err);
}

export async function deleteTopic(id: string): Promise<void> {
  const actor = await getAdminActor();
  const result = await actor.deleteTopic(id);
  if ('Err' in result) {
    throw new Error(result.Err);
  }
}

// AI Configuration
export async function getAIConfig(): Promise<AIConfig> {
  const actor = await getAdminActor();
  const result = await actor.getAIConfig();
  if ('Ok' in result) {
    return result.Ok;
  }
  throw new Error(result.Err);
}

export async function updateAIConfig(config: AIConfig): Promise<AIConfig> {
  const actor = await getAdminActor();
  const result = await actor.updateAIConfig(config);
  if ('Ok' in result) {
    return result.Ok;
  }
  throw new Error(result.Err);
}

// Scraped Data
export async function getScrapedData(topicId?: string): Promise<ScrapedData[]> {
  const actor = await getAdminActor();
  const result = await actor.getScrapedData(topicId || null);
  if ('Ok' in result) {
    return result.Ok;
  }
  throw new Error(result.Err);
}

// User Management
export async function getUsers(): Promise<ExtensionUser[]> {
  const actor = await getAdminActor();
  const result = await actor.getUsers();
  if ('Ok' in result) {
    return result.Ok;
  }
  throw new Error(result.Err);
}

export async function updateUser(principalId: string, userData: ExtensionUser): Promise<ExtensionUser> {
  const actor = await getAdminActor();
  const result = await actor.updateUser(principalId, userData);
  if ('Ok' in result) {
    return result.Ok;
  }
  throw new Error(result.Err);
}
