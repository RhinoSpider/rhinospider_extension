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
        host: import.meta.env.VITE_IC_HOST || 'http://127.0.0.1:8000'
      });

      if (process.env.NODE_ENV !== 'production') {
        await agent.fetchRootKey();
      }

      actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: import.meta.env.VITE_ADMIN_CANISTER_ID!,
      });
    }

    return actor;
  } catch (error) {
    console.error('Failed to get admin actor:', error);
    return null;
  }
};

// Clear the cached actor (useful for logout)
export const clearAdminActor = () => {
  actor = null;
};

// Topic Management
export async function getTopics(): Promise<ScrapingTopic[]> {
  const actor = await getAdminActor();
  if (!actor) throw new Error('Failed to get admin actor');
  return actor.getTopics();
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
export const getAIConfig = async (): Promise<AIConfig | null> => {
  try {
    const actor = await getAdminActor();
    if (!actor) return null;

    const result = await actor.getAIConfig();
    if ('ok' in result) {
      return result.ok;
    }
    console.error('Failed to get AI config:', result.err);
    return null;
  } catch (error) {
    console.error('Failed to get AI config:', error);
    return null;
  }
};

export const updateAIConfig = async (config: AIConfig): Promise<AIConfig | null> => {
  try {
    const actor = await getAdminActor();
    if (!actor) return null;

    const result = await actor.updateAIConfig(config);
    if ('ok' in result) {
      const getResult = await actor.getAIConfig();
      if ('ok' in getResult) {
        return getResult.ok;
      }
    }
    console.error('Failed to update AI config:', result.err);
    return null;
  } catch (error) {
    console.error('Failed to update AI config:', error);
    return null;
  }
};

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
