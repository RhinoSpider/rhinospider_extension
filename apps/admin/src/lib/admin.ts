// Polyfill global
const _global = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};
(window as any).global = _global;

import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '../../../../src/declarations/admin/admin.did.js';
import type { ScrapingTopic, AIConfig, ScrapedData, ExtensionUser } from '../types';

const adminCanisterId = import.meta.env.VITE_ADMIN_CANISTER_ID;

let actor: any = null;

export async function getAdminActor() {
  if (!actor) {
    const agent = new HttpAgent({
      host: import.meta.env.VITE_DFX_NETWORK === 'ic' 
        ? 'https://ic0.app' 
        : 'http://127.0.0.1:8000'
    });

    if (import.meta.env.VITE_DFX_NETWORK !== 'ic') {
      await agent.fetchRootKey();
    }

    actor = Actor.createActor(idlFactory, {
      agent,
      canisterId: adminCanisterId!
    });
  }
  return actor;
}

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
