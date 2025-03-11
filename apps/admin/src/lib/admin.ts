// Polyfill global
const _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
(window as any).global = _global;

import { Actor, HttpAgent } from '@dfinity/agent';
// Import the admin canister interface
import type { _SERVICE } from '../declarations/admin/admin.did.d';
// Import the idlFactory directly with a type assertion
// @ts-ignore - Ignore TypeScript error for the direct import
import { idlFactory } from '../declarations/admin/admin.did.js';
import type { ScrapingTopic, AIConfig, ScrapedData, ExtensionUser, CreateTopicRequest } from '../types';
import { getIdentity } from './auth';
import { Principal } from '@dfinity/principal';

// We don't need to import IDL from @dfinity/candid since we're using the Actor API

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
function replaceBigInt(_key: string, value: any) {
  if (typeof value === 'bigint') {
    return Number(value); // Convert BigInt to Number
  }
  return value;
}

// Helper function to fix empty contentIdentifiers
const fixEmptyContentIdentifiers = (topic: any) => {
  // Check if contentIdentifiers exists but has empty values
  if (topic.contentIdentifiers && 
      Array.isArray(topic.contentIdentifiers.selectors) && 
      Array.isArray(topic.contentIdentifiers.keywords) &&
      topic.contentIdentifiers.selectors.length === 1 && 
      topic.contentIdentifiers.keywords.length === 1 &&
      topic.contentIdentifiers.selectors[0] === "" &&
      topic.contentIdentifiers.keywords[0] === "") {
    
    console.log(`Fixing empty contentIdentifiers for topic ${topic.id}`);
    
    // Replace with default values
    topic.contentIdentifiers = {
      selectors: ["article", "main", ".content", "#content"],
      keywords: ["article", "news", "blog", "post"]
    };
  }
  
  return topic;
};

// Topic Management
export async function getTopics(): Promise<ScrapingTopic[]> {
  const adminActor = await getAdminActor();
  try {
    const result = await adminActor.getTopics();
    if ('err' in result) {
      throw new Error(result.err);
    }
    
    // Convert the result to a plain object with BigInt values converted to numbers
    const topics = JSON.parse(JSON.stringify(result.ok, replaceBigInt));
    
    // Log the first topic to see its structure
    if (topics.length > 0) {
      console.log('First topic from backend:', topics[0]);
      console.log('First topic contentIdentifiers:', topics[0].contentIdentifiers);
      console.log('First topic paginationPatterns:', topics[0].paginationPatterns);
    }
    
    // Process the topics to handle optional fields correctly
    const processedTopics = topics.map((topic: any) => {
      // Handle contentIdentifiers field
      let contentIdentifiers = undefined;
      if (topic.contentIdentifiers && topic.contentIdentifiers.length > 0) {
        contentIdentifiers = topic.contentIdentifiers[0];
      }
      
      // Handle articleUrlPatterns field
      let articleUrlPatterns = undefined;
      if (topic.articleUrlPatterns && topic.articleUrlPatterns.length > 0) {
        articleUrlPatterns = topic.articleUrlPatterns[0];
      }
      
      // Handle paginationPatterns field
      let paginationPatterns = undefined;
      if (topic.paginationPatterns && topic.paginationPatterns.length > 0) {
        paginationPatterns = topic.paginationPatterns[0];
      }
      
      // Apply the fix for empty contentIdentifiers
      const processedTopic = fixEmptyContentIdentifiers({
        ...topic,
        contentIdentifiers,
        articleUrlPatterns,
        paginationPatterns
      });
      
      return processedTopic;
    });
    
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

export async function updateTopic(id: string, topic: ScrapingTopic): Promise<ScrapingTopic> {
  console.log('Topic data received:', JSON.stringify(topic, replaceBigInt, 2));
  console.log('siteTypeClassification:', topic.siteTypeClassification);
  console.log('contentIdentifiers:', topic.contentIdentifiers);
  console.log('paginationPatterns:', topic.paginationPatterns);
  
  // Apply the fix for empty contentIdentifiers
  topic = fixEmptyContentIdentifiers(topic);
  
  // Ensure paginationPatterns is always an array
  if (!topic.paginationPatterns) {
    topic.paginationPatterns = [];
  }
  
  const adminActor = await getAdminActor();
  
  // Create the update request object
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
    }] : [],
    // Add paginationPatterns field - ALWAYS include this field
    paginationPatterns: topic.paginationPatterns && topic.paginationPatterns.length > 0
      ? [topic.paginationPatterns.filter(p => typeof p === 'string' ? p.trim() !== '' : false)]
      : []
  };

  console.log('Update request:', JSON.stringify(updateRequest, replaceBigInt, 2));
  
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
    console.log('Updated paginationPatterns:', updatedTopic.paginationPatterns);
    
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
export async function getScrapedDataDirect(topicId?: string): Promise<ScrapedData[]> {
  console.log(`[admin.ts] getScrapedDataDirect called with topicId:`, topicId);
  
  try {
    // Get the storage actor directly
    const storageActor = await getStorageActor();
    
    // If a specific topic ID is provided, use it directly
    if (topicId && topicId.trim() !== '' && topicId !== 'ALL_TOPICS') {
      console.log(`[admin.ts] Using specific topic ID for direct storage call:`, topicId);
      const param = [topicId];
      
      console.log(`[admin.ts] Making direct call to storage canister with param:`, param);
      const result = await storageActor.getScrapedData(param);
      
      if ('err' in result) {
        console.error(`[admin.ts] Error from direct storage call:`, result.err);
        throw new Error(result.err);
      }
      
      console.log(`[admin.ts] Successfully retrieved ${result.ok ? result.ok.length : 0} items directly from storage`);
      return result.ok || [];
    } 
    // If ALL_TOPICS is specified or no topic ID is provided, fetch all topics and query each one
    else {
      console.log(`[admin.ts] ALL_TOPICS specified or no topic ID provided, fetching all topics`);
      
      // Get all available topics
      let topics: ScrapingTopic[] = [];
      try {
        topics = await getTopics();
        console.log(`[admin.ts] Retrieved ${topics.length} topics for ALL_TOPICS query`);
      } catch (topicError) {
        console.error(`[admin.ts] Error fetching topics for ALL_TOPICS query:`, topicError);
        // Continue with empty topics array if we can't fetch topics
      }
      
      // If no topics are available, try the ALL_TOPICS marker as a fallback
      if (!topics || topics.length === 0) {
        console.log(`[admin.ts] No topics available, falling back to ALL_TOPICS marker`);
        const param = ["ALL_TOPICS"];
        
        console.log(`[admin.ts] Making direct call to storage canister with fallback param:`, param);
        const result = await storageActor.getScrapedData(param);
        
        if ('err' in result) {
          console.error(`[admin.ts] Error from direct storage call with ALL_TOPICS marker:`, result.err);
          return []; // Return empty array instead of throwing
        }
        
        console.log(`[admin.ts] Successfully retrieved ${result.ok ? result.ok.length : 0} items with ALL_TOPICS marker`);
        return result.ok || [];
      }
      
      // Query each topic individually and combine the results
      console.log(`[admin.ts] Querying each topic individually for ALL_TOPICS`);
      const allData: ScrapedData[] = [];
      
      for (const topic of topics) {
        try {
          console.log(`[admin.ts] Querying topic: ${topic.id}`);
          const param = [topic.id];
          
          const result = await storageActor.getScrapedData(param);
          
          if ('ok' in result && result.ok) {
            console.log(`[admin.ts] Retrieved ${result.ok.length} items for topic ${topic.id}`);
            allData.push(...result.ok);
          } else if ('err' in result) {
            console.warn(`[admin.ts] Error querying topic ${topic.id}:`, result.err);
            // Continue with other topics even if one fails
          }
        } catch (topicError) {
          console.warn(`[admin.ts] Exception querying topic ${topic.id}:`, topicError);
          // Continue with other topics even if one fails
        }
      }
      
      console.log(`[admin.ts] Successfully retrieved ${allData.length} total items across all topics`);
      return allData;
    }
  } catch (error) {
    console.error(`[admin.ts] Exception in getScrapedDataDirect:`, error);
    throw error;
  }
}

// Original function that goes through the admin canister
export async function getScrapedData(topicId?: string): Promise<ScrapedData[]> {
  console.log(`[admin.ts] getScrapedData called with topicId:`, topicId);
  
  // Try direct storage access first
  try {
    console.log(`[admin.ts] Attempting direct storage access first`);
    return await getScrapedDataDirect(topicId);
  } catch (directError) {
    console.error(`[admin.ts] Direct storage access failed, falling back to admin canister:`, directError);
  }
  
  try {
    // Get the admin actor
    const adminActor = await getAdminActor();
    
    // Create a properly formatted parameter for the canister call
    // According to Candid specifications, empty vectors need proper type information
    // We need to ensure we're passing a non-empty array to avoid IDL serialization errors
    let param: string[];
    
    if (topicId && topicId.trim() !== '') {
      // If a specific topic is requested, create a vector with that topic ID
      param = [topicId];
      console.log(`[admin.ts] Using specific topic ID:`, topicId);
    } else {
      // For "all topics" case, we need to use a special approach to avoid empty array serialization issues
      // Based on Internet Computer Candid documentation, we'll use a special marker that the backend understands
      param = ["ALL_TOPICS"];
      console.log(`[admin.ts] Using special marker for all topics: ALL_TOPICS`);
    }
    
    console.log(`[admin.ts] Final parameter:`, param);
    
    // Make the call to the canister
    const result = await adminActor.getScrapedData(param);
    
    if ('err' in result) {
      console.error(`[admin.ts] Error returned from canister:`, result.err);
      
      // If we get an error with our special marker, try with the first available topic ID
      if (param[0] === "ALL_TOPICS") {
        console.log(`[admin.ts] Special marker failed, trying with a real topic ID`);
        
        // Get all available topics
        const topicsResult = await adminActor.getTopics();
        
        if ('err' in topicsResult) {
          console.error(`[admin.ts] Error getting topics:`, topicsResult.err);
          throw new Error(topicsResult.err);
        }
        
        const topics = topicsResult.ok || [];
        console.log(`[admin.ts] Found ${topics.length} topics`);
        
        if (topics.length > 0) {
          // Use the first topic ID as a parameter
          const firstTopicId = topics[0].id;
          param = [firstTopicId];
          console.log(`[admin.ts] Using first topic ID as parameter: ${firstTopicId}`);
          
          // Try again with the first topic ID
          const retryResult = await adminActor.getScrapedData(param);
          
          if ('err' in retryResult) {
            console.error(`[admin.ts] Error in retry with first topic:`, retryResult.err);
            throw new Error(retryResult.err);
          }
          
          console.log(`[admin.ts] Retry successful, retrieved ${retryResult.ok ? retryResult.ok.length : 0} items`);
          return retryResult.ok || [];
        } else {
          // If no topics found, we can't proceed
          console.error(`[admin.ts] No topics available to use as parameters`);
          throw new Error("No topics available");
        }
      } else {
        // If the error wasn't related to our special marker, just throw it
        throw new Error(result.err);
      }
    }
    
    console.log(`[admin.ts] Successfully retrieved ${result.ok ? result.ok.length : 0} items`);
    return result.ok || [];
  } catch (error) {
    console.error(`[admin.ts] Exception in getScrapedData:`, error);
    
    // Try a completely different approach if all previous attempts failed
    try {
      console.log(`[admin.ts] Trying alternative approach with direct actor creation`);
      
      // Get identity
      const identity = await getIdentity();
      if (!identity) {
        throw new Error('No identity found');
      }
      
      // Create a new agent and actor for this specific call
      const agent = new HttpAgent({ 
        identity,
        host: import.meta.env.VITE_IC_HOST || 'https://icp0.io'
      });
      
      // Make sure the agent is initialized
      if (import.meta.env.DEV) {
        await agent.fetchRootKey();
      }
      
      const canisterId = import.meta.env.VITE_ADMIN_CANISTER_ID || '444wf-gyaaa-aaaaj-az5sq-cai';
      
      // Create a fresh actor instance
      const freshActor = Actor.createActor<_SERVICE>(idlFactory, {
        agent,
        canisterId,
      });
      
      // Use a different approach with the fresh actor
      let param: string[];
      
      if (topicId && topicId.trim() !== '') {
        param = [topicId];
      } else {
        // Try to get the first available topic ID
        try {
          const topicsResult = await freshActor.getTopics();
          
          if ('err' in topicsResult) {
            throw new Error(topicsResult.err);
          }
          
          const topics = topicsResult.ok || [];
          
          if (topics.length > 0) {
            param = [topics[0].id];
            console.log(`[admin.ts] Using first topic ID with fresh actor: ${param[0]}`);
          } else {
            // Last resort - use a dummy topic ID that will likely return empty results but avoid serialization errors
            param = ["dummy_topic_id"];
            console.log(`[admin.ts] No topics found, using dummy ID with fresh actor`);
          }
        } catch (topicError) {
          console.error(`[admin.ts] Error getting topics with fresh actor:`, topicError);
          // Last resort - use a dummy topic ID
          param = ["dummy_topic_id"];
          console.log(`[admin.ts] Error getting topics, using dummy ID with fresh actor`);
        }
      }
      
      console.log(`[admin.ts] Retrying with fresh actor, param:`, param);
      
      const result = await freshActor.getScrapedData(param);
      
      if ('err' in result) {
        console.error(`[admin.ts] Error in retry with fresh actor:`, result.err);
        throw new Error(result.err);
      }
      
      console.log(`[admin.ts] Retry with fresh actor successful, retrieved ${result.ok ? result.ok.length : 0} items`);
      return result.ok || [];
    } catch (retryError) {
      console.error(`[admin.ts] All attempts failed:`, retryError);
      throw retryError;
    }
  }
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

// Storage Canister Management
// Import the storage canister interface and factory
import type { _SERVICE as STORAGE_SERVICE } from '../declarations/storage/storage.did.d';
// @ts-ignore - Ignore TypeScript error for the direct import
import { idlFactory as storageIdlFactory } from '../declarations/storage/storage.did.js';

// Function to get the storage canister actor
export async function getStorageActor() {
  try {
    // Get identity
    const identity = await getIdentity();
    if (!identity) {
      console.error('[admin.ts] No identity found');
      throw new Error('No identity found');
    }

    const principalId = identity.getPrincipal().toString();
    console.log('[admin.ts] Got identity for storage canister:', principalId);

    // Use production canister ID as fallback
    const canisterId = import.meta.env.VITE_STORAGE_CANISTER_ID || 'i2gk7-oyaaa-aaaao-a37cq-cai';
    if (!canisterId) {
      throw new Error('Storage canister ID not found in environment variables');
    }
    console.log('[admin.ts] Using storage canister ID:', canisterId);

    const host = import.meta.env.VITE_IC_HOST || 'https://icp0.io';
    console.log('[admin.ts] Using IC host:', host);

    const agent = new HttpAgent({ 
      identity,
      host
    });

    // Fetch root key in development
    if (import.meta.env.DEV) {
      console.log('[admin.ts] Fetching root key in development mode');
      await agent.fetchRootKey();
    }

    console.log('[admin.ts] Creating storage actor with canister ID:', canisterId);
    const storageActor = Actor.createActor<STORAGE_SERVICE>(storageIdlFactory, {
      agent,
      canisterId,
    });

    console.log('[admin.ts] Storage actor created successfully');
    return storageActor;
  } catch (error) {
    console.error('[admin.ts] Error getting storage actor:', error);
    throw error;
  }
}

// Add a principal as an authorized user to the storage canister
export async function addAuthorizedPrincipalToStorage(principalId: string): Promise<void> {
  try {
    console.log(`[admin.ts] Adding principal ${principalId} as authorized user to storage canister`);
    const storageActor = await getStorageActor();
    
    // Convert the principal string to a Principal object
    const principal = Principal.fromText(principalId);
    console.log(`[admin.ts] Principal object created: ${principal.toString()}`);
    
    // Log available methods on the storage actor
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(storageActor))
      .filter(name => name !== 'constructor' && typeof storageActor[name as keyof typeof storageActor] === 'function');
    console.log(`[admin.ts] Storage actor methods: ${methods.join(', ')}`);
    
    // Call the addAuthorizedCanister method
    console.log(`[admin.ts] Calling addAuthorizedCanister with principal: ${principal.toString()}`);
    const result = await storageActor.addAuthorizedCanister(principal);
    console.log(`[admin.ts] Result from addAuthorizedCanister:`, result);
    
    if ('err' in result) {
      console.error(`[admin.ts] Error adding authorized principal:`, result.err);
      throw new Error(JSON.stringify(result.err));
    }
    
    console.log(`[admin.ts] Successfully added principal ${principalId} to storage canister`);
  } catch (error) {
    console.error(`[admin.ts] Failed to add authorized principal to storage:`, error);
    throw error;
  }
}

// Remove a principal from the authorized users of the storage canister
export async function removeAuthorizedPrincipalFromStorage(principalId: string): Promise<void> {
  try {
    console.log(`[admin.ts] Removing principal ${principalId} from storage canister authorized users`);
    const storageActor = await getStorageActor();
    
    // Convert the principal string to a Principal object
    const principal = Principal.fromText(principalId);
    console.log(`[admin.ts] Principal object created for removal: ${principal.toString()}`);
    
    // Log available methods on the storage actor
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(storageActor))
      .filter(name => name !== 'constructor' && typeof storageActor[name as keyof typeof storageActor] === 'function');
    console.log(`[admin.ts] Storage actor methods for removal: ${methods.join(', ')}`);
    
    // Call the removeAuthorizedCanister method
    console.log(`[admin.ts] Calling removeAuthorizedCanister with principal: ${principal.toString()}`);
    const result = await storageActor.removeAuthorizedCanister(principal);
    console.log(`[admin.ts] Result from removeAuthorizedCanister:`, result);
    
    if ('err' in result) {
      console.error(`[admin.ts] Error removing authorized principal:`, result.err);
      throw new Error(JSON.stringify(result.err));
    }
    
    console.log(`[admin.ts] Successfully removed principal ${principalId} from storage canister`);
  } catch (error) {
    console.error(`[admin.ts] Failed to remove authorized principal from storage:`, error);
    throw error;
  }
}
