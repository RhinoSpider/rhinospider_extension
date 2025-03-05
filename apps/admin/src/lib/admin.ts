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

      // Use production canister ID as fallback
      const canisterId = import.meta.env.VITE_ADMIN_CANISTER_ID || '444wf-gyaaa-aaaaj-az5sq-cai';
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

// Helper function to handle BigInt serialization
function replaceBigInt(key: string, value: any) {
  if (typeof value === 'bigint') {
    return Number(value); // Convert BigInt to Number
  }
  return value;
}

// Topic Management
export async function getTopics(): Promise<ScrapingTopic[]> {
  const adminActor = await getAdminActor();
  
  try {
    console.log('Calling getTopics...');
    const result = await adminActor.getTopics();
    console.log('Raw getTopics result:', JSON.stringify(result, replaceBigInt, 2));
    
    if ('err' in result) {
      console.error('Error from backend:', result.err);
      throw new Error(result.err);
    }
    
    // Convert the result to a plain object with BigInt values converted to numbers
    const topics = JSON.parse(JSON.stringify(result.ok, replaceBigInt));
    
    // Process each topic to ensure proper structure
    const processedTopics = topics.map((topic: any) => {
      console.log('Processing topic:', topic.id);
      console.log('Topic contentIdentifiers:', JSON.stringify(topic.contentIdentifiers, null, 2));
      
      // Ensure contentIdentifiers is properly extracted if it exists
      let contentIdentifiers = undefined;
      if (topic.contentIdentifiers && topic.contentIdentifiers.length > 0) {
        // Extract from array wrapper (since it's an opt type in Candid)
        contentIdentifiers = topic.contentIdentifiers[0];
        console.log('Extracted contentIdentifiers:', JSON.stringify(contentIdentifiers, null, 2));
      }
      
      return {
        ...topic,
        // Ensure contentIdentifiers is properly structured
        contentIdentifiers: contentIdentifiers
      };
    });
    
    console.log('Processed topics:', JSON.stringify(processedTopics, null, 2));
    return processedTopics;
  } catch (error) {
    console.error('Error in getTopics call:', error);
    throw error;
  }
}

export async function createTopic(topic: CreateTopicRequest): Promise<ScrapingTopic> {
  const adminActor = await getAdminActor();
  
  // Log the input topic for debugging
  console.log('Creating topic:', JSON.stringify(topic, replaceBigInt));
  console.log('siteTypeClassification value:', topic.siteTypeClassification);
  
  // Ensure siteTypeClassification is set
  const createRequest = {
    ...topic,
    siteTypeClassification: topic.siteTypeClassification || 'blog',
    urlGenerationStrategy: topic.urlGenerationStrategy || 'pattern_based',
    // Filter out empty patterns and store as a local field
    articleUrlPatterns: topic.articleUrlPatterns && topic.articleUrlPatterns.length > 0 
      ? topic.articleUrlPatterns.filter(p => typeof p === 'string' ? p.trim() !== '' : false) 
      : undefined,
    // Filter out empty selectors and keywords
    contentIdentifiers: topic.contentIdentifiers ? {
      selectors: topic.contentIdentifiers.selectors.filter(s => typeof s === 'string' ? s.trim() !== '' : false),
      keywords: topic.contentIdentifiers.keywords.filter(k => typeof k === 'string' ? k.trim() !== '' : false)
    } : undefined
  };
  
  console.log('Create request:', JSON.stringify(createRequest, replaceBigInt));
  
  try {
    const result = await adminActor.createTopic(createRequest);
    console.log('Raw create result:', result);
    
    if ('err' in result) {
      console.error('Error from backend:', result.err);
      throw new Error(result.err);
    }
    
    // Convert the result to a plain object with BigInt values converted to numbers
    const createdTopic = JSON.parse(JSON.stringify(result.ok, replaceBigInt));
    console.log('Created topic from backend:', createdTopic);
    
    return createdTopic;
  } catch (error) {
    console.error('Error in createTopic call:', error);
    throw error;
  }
}

export async function updateTopic(id: string, topic: Partial<ScrapingTopic>): Promise<ScrapingTopic> {
  const adminActor = await getAdminActor();
  
  console.log('Original topic:', JSON.stringify(topic, replaceBigInt, 2));
  console.log('Original contentIdentifiers:', topic.contentIdentifiers);
  
  // Create the update request with proper opt text formatting
  const updateRequest = {
    name: topic.name ? [topic.name] : [],
    description: topic.description ? [topic.description] : [],
    urlPatterns: topic.urlPatterns ? [topic.urlPatterns] : [],
    status: topic.status ? [topic.status] : [],
    extractionRules: topic.extractionRules ? [{
      fields: topic.extractionRules.fields.map(field => ({
        name: field.name,
        fieldType: field.fieldType,
        required: field.required,
        aiPrompt: field.aiPrompt ? [field.aiPrompt] : []
      })),
      customPrompt: topic.extractionRules.customPrompt ? [topic.extractionRules.customPrompt] : []
    }] : [],
    // Single-optional text for these fields (based on admin.did.d.ts)
    siteTypeClassification: topic.siteTypeClassification ? [topic.siteTypeClassification] : [],
    urlGenerationStrategy: topic.urlGenerationStrategy ? [topic.urlGenerationStrategy] : [],
    // Single-optional array for articleUrlPatterns (based on admin.did.dts)
    articleUrlPatterns: topic.articleUrlPatterns && topic.articleUrlPatterns.length > 0 
      ? [topic.articleUrlPatterns.filter(p => typeof p === 'string' ? p.trim() !== '' : false)] 
      : [],
    // Add contentIdentifiers field
    contentIdentifiers: topic.contentIdentifiers ? [{
      selectors: topic.contentIdentifiers.selectors.filter(s => typeof s === 'string' ? s.trim() !== '' : false),
      keywords: topic.contentIdentifiers.keywords.filter(k => typeof k === 'string' ? k.trim() !== '' : false)
    }] : []
  };

  console.log('Update request with contentIdentifiers:', JSON.stringify(updateRequest, replaceBigInt, 2));
  
  try {
    console.log('Updating topic with ID:', id);
    const result = await adminActor.updateTopic(id, updateRequest);
    console.log('Raw update result:', JSON.stringify(result, replaceBigInt, 2));
    
    if ('err' in result) {
      console.error('Error from backend:', result.err);
      throw new Error(result.err);
    }
    
    // Log the raw ok value to see exactly what's coming from the backend
    console.log('Raw ok value from update:', JSON.stringify(result.ok, null, 2));
    
    // Convert the result to a plain object with BigInt values converted to numbers
    const updatedTopic = JSON.parse(JSON.stringify(result.ok, replaceBigInt));
    console.log('Updated topic from backend (parsed):', JSON.stringify(updatedTopic, null, 2));
    console.log('Updated contentIdentifiers:', updatedTopic.contentIdentifiers);
    
    return updatedTopic;
  } catch (error) {
    console.error('Error in updateTopic call:', error);
    throw error;
  }
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
