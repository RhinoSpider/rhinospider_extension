// Polyfill global
const _global = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};
(window as any).global = _global;

import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from '@declarations/admin/admin.did.js';
import type { ScrapingTopic, AIConfig, ScrapedData, ExtensionUser } from '../types';
import { getIdentity } from './auth';

let actor: any = null;

export const getAdminActor = async () => {
  try {
    // Get identity
    const identity = await getIdentity();
    if (!identity) {
      console.error('No identity found');
      throw new Error('No identity found');
    }

    console.log('Got identity:', identity.getPrincipal().toString());

    // Create new actor if it doesn't exist or if we have a new identity
    if (!actor || !actor._identity || actor._identity.getPrincipal().toString() !== identity.getPrincipal().toString()) {
      const agent = new HttpAgent({ 
        identity,
        host: import.meta.env.VITE_IC_HOST || 'https://icp0.io'
      });

      if (import.meta.env.DEV) {
        await agent.fetchRootKey();
      }

      const canisterId = import.meta.env.VITE_ADMIN_CANISTER_ID;
      if (!canisterId) {
        throw new Error('Admin canister ID not found in environment variables');
      }

      actor = await Actor.createActor(idlFactory, {
        agent,
        canisterId,
      });

      // Verify that we can access the actor methods
      const methods = Object.keys(actor);
      console.log('Admin actor methods:', methods);
    }

    return actor;
  } catch (error) {
    console.error('Error getting admin actor:', error);
    throw error;
  }
};

// Clear the cached actor (useful for logout)
export const clearAdminActor = () => {
  actor = null;
};

// Topic Management
export async function getTopics(): Promise<ScrapingTopic[]> {
  console.log('Fetching topics...');
  const adminActor = await getAdminActor();
  const result = await adminActor.getTopics();
  if ('err' in result) {
    throw new Error(result.err);
  }
  return result.ok;
}

export async function createTopic(topic: Omit<ScrapingTopic, 'id'>): Promise<ScrapingTopic> {
  const adminActor = await getAdminActor();
  const result = await adminActor.createTopic(topic);
  if ('err' in result) {
    throw new Error(result.err);
  }
  return result.ok;
}

export async function updateTopic(id: string, topic: ScrapingTopic): Promise<ScrapingTopic> {
  const adminActor = await getAdminActor();
  const result = await adminActor.updateTopic(id, topic);
  if ('err' in result) {
    throw new Error(result.err);
  }
  return result.ok;
}

export async function deleteTopic(id: string): Promise<void> {
  const adminActor = await getAdminActor();
  const result = await adminActor.deleteTopic(id);
  if ('err' in result) {
    throw new Error(result.err);
  }
}

// AI Configuration
export async function getAIConfig(): Promise<AIConfig> {
  const adminActor = await getAdminActor();
  const result = await adminActor.getAIConfig();
  if ('err' in result) {
    throw new Error(result.err);
  }
  return result.ok;
}

export async function updateAIConfig(config: AIConfig): Promise<AIConfig> {
  const adminActor = await getAdminActor();
  const result = await adminActor.updateAIConfig(config);
  if ('err' in result) {
    throw new Error(result.err);
  }
  return result.ok;
}

// Scraped Data
export async function getScrapedData(topicId?: string): Promise<ScrapedData[]> {
  const adminActor = await getAdminActor();
  if (!adminActor) throw new Error('Failed to get admin actor');
  return adminActor.get_scraped_data(topicId ? [topicId] : []);
}

// User Management
export async function getUsers(): Promise<ExtensionUser[]> {
  const adminActor = await getAdminActor();
  if (!adminActor) throw new Error('Failed to get admin actor');
  return adminActor.get_users();
}

export async function updateUser(principalId: string, userData: ExtensionUser): Promise<ExtensionUser> {
  const adminActor = await getAdminActor();
  if (!adminActor) throw new Error('Failed to get admin actor');
  return adminActor.update_user(principalId, userData);
}
