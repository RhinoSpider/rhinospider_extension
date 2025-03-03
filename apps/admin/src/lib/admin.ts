// Polyfill global
const _global = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};
(window as any).global = _global;

import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from '../declarations/admin/admin.did.js';
import type { ScrapingTopic, AIConfig, ScrapedData, ExtensionUser, Result, CreateTopicRequest } from '../types';
import { getIdentity } from './auth';
import { Principal } from '@dfinity/principal';

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

      // Hardcoded canister ID for local testing
      const canisterId = import.meta.env.VITE_ADMIN_CANISTER_ID || 'bkyz2-fmaaa-aaaaa-qaaaq-cai';
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
  return result.ok || [];
}

export async function createTopic(topic: CreateTopicRequest): Promise<ScrapingTopic> {
  const adminActor = await getAdminActor();
  const result = await adminActor.createTopic(topic);
  if ('err' in result) {
    throw new Error(result.err);
  }
  return result.ok;
}

export async function updateTopic(id: string, topic: Partial<ScrapingTopic>): Promise<ScrapingTopic> {
  const adminActor = await getAdminActor();
  
  // Log the input topic for debugging
  console.log('Original topic:', JSON.stringify(topic, null, 2));

  // Create the update request with proper opt text formatting
  const updateRequest = {
    name: topic.name ? [topic.name] : [],
    description: topic.description ? [topic.description] : [],
    urlPatterns: topic.urlPatterns ? [topic.urlPatterns] : [],
    status: topic.status ? [topic.status] : [],
    extractionRules: topic.extractionRules ? [{
      fields: topic.extractionRules.fields.map(field => {
        // Handle aiPrompt - ensure it's not an array
        const aiPrompt = Array.isArray(field.aiPrompt) 
          ? field.aiPrompt[0] 
          : field.aiPrompt;

        return {
          name: field.name,
          fieldType: field.fieldType,
          required: field.required,
          aiPrompt: typeof aiPrompt === 'string' ? [aiPrompt] : []
        };
      }),
      customPrompt: typeof topic.extractionRules.customPrompt === 'string' 
        ? [topic.extractionRules.customPrompt] 
        : []
    }] : [],
    articleUrlPatterns: topic.articleUrlPatterns ? [topic.articleUrlPatterns] : [],
    siteTypeClassification: topic.siteTypeClassification ? [topic.siteTypeClassification] : [],
    contentIdentifiers: topic.contentIdentifiers ? [{
      selectors: topic.contentIdentifiers.selectors,
      keywords: topic.contentIdentifiers.keywords
    }] : [],
    paginationPatterns: topic.paginationPatterns ? [topic.paginationPatterns] : [],
    sampleArticleUrls: topic.sampleArticleUrls ? [topic.sampleArticleUrls] : [],
    urlGenerationStrategy: topic.urlGenerationStrategy ? [topic.urlGenerationStrategy] : [],
    excludePatterns: topic.excludePatterns ? [topic.excludePatterns] : []
  };

  console.log('Update request:', JSON.stringify(updateRequest, null, 2));
  
  const result = await adminActor.updateTopic(id, updateRequest);
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
  const result = await adminActor.getScrapedData(topicId ? [topicId] : []);
  if ('err' in result) {
    throw new Error(result.err);
  }
  return result.ok || [];
}

// User Management
export async function getUsers(): Promise<ExtensionUser[]> {
  const adminActor = await getAdminActor();
  const result = await adminActor.get_users();
  if ('err' in result) {
    throw new Error(result.err);
  }
  return (result.ok || []).map((user: any) => ({
    role: user.role._type,
  }));
}

export async function updateUser(principalId: string, userData: ExtensionUser): Promise<ExtensionUser> {
  const adminActor = await getAdminActor();
  const result = await adminActor.add_user(Principal.fromText(principalId), { [userData.role]: null });
  if ('err' in result) {
    throw new Error(result.err);
  }
  return userData;
}
