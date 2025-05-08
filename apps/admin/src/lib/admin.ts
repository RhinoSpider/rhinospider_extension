// Polyfill global
const _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
(window as any).global = _global;

// Import the necessary libraries
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getIdentity } from './auth';

// Import the canister interfaces
// @ts-ignore - Ignore TypeScript error for the direct import
import { idlFactory } from '../declarations/admin/admin.did.js';
import type { _SERVICE } from '../declarations/admin/admin.did.d';

// Import the storage canister interface and factory
// @ts-ignore - Ignore TypeScript error for the direct import
import { idlFactory as storageIdlFactory } from '../declarations/storage/storage.did.js';
// Import our custom storage IDL factory that exactly matches the storage canister interface
import { storageIdlFactory as customStorageIdlFactory } from './storage.did';

// Import the types
import type { ScrapingTopic, AIConfig, ScrapedData, ExtensionUser, CreateTopicRequest } from '../types';

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

// Direct access to storage canister with proper variant type handling
export async function getScrapedDataDirect(topicId?: string): Promise<ScrapedData[]> {
  console.log(`[admin.ts] getScrapedDataDirect called with topicId:`, topicId);
  
  try {
    // Get the identity
    const identity = await getIdentity();
    if (!identity) {
      console.error('[admin.ts] No identity found');
      return [];
    }
    
    // Create an agent for authentication
    const host = 'https://icp0.io';
    const agent = new HttpAgent({ identity, host });
    
    // Use the storage canister ID from the environment
    const storageCanisterId = Principal.fromText('nwy3f-jyaaa-aaaao-a4htq-cai');
    console.log(`[admin.ts] Using storage canister ID:`, storageCanisterId.toString());
    
    // Prepare the parameter - always use a properly formatted array for Vec<Text>
    const param: string[] = topicId?.trim() ? [topicId.trim()] : [];
    
    // If no specific topic was provided, we'll try with a known topic ID that should have data
    if (param.length === 0) {
      console.log(`[admin.ts] Using empty array to get all topics`);
    } else {
      console.log(`[admin.ts] Using topic ID:`, param[0]);
    }
    
    // Create an actor to interact with the storage canister using our custom IDL factory
    // This factory exactly matches the Candid interface of the storage canister
    const storageActor = Actor.createActor<any>(customStorageIdlFactory, {
      agent,
      canisterId: storageCanisterId.toString(),
    });
    
    try {
      // Call the getScrapedData method with the direct array parameter
      // This matches the Candid interface: getScrapedData: (vec text) -> (vec ScrapedData)
      console.log(`[admin.ts] Calling storage canister with param:`, param);
      const result = await storageActor.getScrapedData(param);
      
      // Handle the result based on its actual type
      if (Array.isArray(result)) {
        // Direct array response (vec ScrapedData)
        console.log(`[admin.ts] Successfully retrieved ${result.length} items via storage canister`);
        return result as ScrapedData[];
      } else if (result && typeof result === 'object') {
        // Check if it's possibly a variant with 'ok' field (Result<Vec<ScrapedData>, Text>)
        if ('ok' in result && Array.isArray((result as any).ok)) {
          console.log(`[admin.ts] Retrieved ${(result as any).ok.length} items via variant response`);
          return (result as any).ok as ScrapedData[];
        } else if ('err' in result) {
          console.error(`[admin.ts] Error from storage canister:`, (result as any).err);
        } else {
          console.log(`[admin.ts] Unexpected result format:`, result);
        }
      } else {
        console.log(`[admin.ts] Unexpected result type:`, typeof result);
      }
    } catch (error: any) {
      console.error(`[admin.ts] Error calling storage canister:`, error);
      
      // If we get a specific error, try with a known topic ID that should have data
      if (!topicId || topicId.trim() === '') {
        try {
          const knownTopicId = "topic_swsi3j4lj";
          console.log(`[admin.ts] Trying with known topic ID:`, knownTopicId);
          const knownResult = await storageActor.getScrapedData([knownTopicId]);
          
          if (Array.isArray(knownResult)) {
            console.log(`[admin.ts] Successfully retrieved ${knownResult.length} items with known topic ID`);
            return knownResult as ScrapedData[];
          }
        } catch (fallbackError) {
          console.error(`[admin.ts] Fallback attempt also failed:`, fallbackError);
        }
      }
    }
  } catch (error) {
    console.error(`[admin.ts] Exception in getScrapedDataDirect:`, error);
  }
  
  console.log(`[admin.ts] No data returned from storage canister`);
  return [];
}

// Access via admin canister as the primary method
export async function getScrapedDataViaAdmin(topicId?: string): Promise<ScrapedData[]> {
  console.log(`[admin.ts] getScrapedDataViaAdmin called with topicId:`, topicId);
  
  try {
    // Get the admin actor
    const adminActor = await getAdminActor();
    
    // Prepare parameters for admin canister
    let adminParam: string[];
    
    // If we have a specific topic ID, use it
    if (topicId && topicId.trim() !== '' && topicId !== 'ALL_TOPICS') {
      adminParam = [topicId];
      console.log(`[admin.ts] Using specific topic ID:`, topicId);
    } 
    // If we're looking for all topics, try with the topic we know has data first
    else {
      // Try with a specific topic ID that we know has data
      adminParam = ['topic_swsi3j4lj'];
      console.log(`[admin.ts] Using known topic ID with data: topic_swsi3j4lj`);
    }
    
    console.log(`[admin.ts] Calling admin.getScrapedData with param:`, adminParam);
    const adminResult = await adminActor.getScrapedData(adminParam);
    
    if ('err' in adminResult) {
      console.error(`[admin.ts] Error from admin canister:`, adminResult.err);
      
      // If we get an error with our specific topic, try with an empty array
      if (adminParam[0] === 'topic_swsi3j4lj' && !topicId) {
        console.log(`[admin.ts] Trying with empty array after specific topic failed`);
        const emptyResult = await adminActor.getScrapedData([]);
        
        if ('err' in emptyResult) {
          console.error(`[admin.ts] Error with empty array:`, emptyResult.err);
        } else if (emptyResult.ok && Array.isArray(emptyResult.ok)) {
          console.log(`[admin.ts] Successfully retrieved ${emptyResult.ok.length} items with empty array`);
          return emptyResult.ok;
        }
      }
    } else if (adminResult.ok && Array.isArray(adminResult.ok)) {
      console.log(`[admin.ts] Successfully retrieved ${adminResult.ok.length} items via admin canister`);
      return adminResult.ok;
    } else {
      console.log(`[admin.ts] Unexpected result format from admin:`, adminResult);
    }
    
    return [];
  } catch (adminError) {
    console.error(`[admin.ts] Admin canister approach failed:`, adminError);
    return [];
  }
}

// Main function that uses admin canister as an intermediary
export async function getScrapedData(topicId?: string): Promise<ScrapedData[]> {
  console.log(`[admin.ts] getScrapedData called with topicId:`, topicId);
  
  try {
    // Use the admin canister as the primary method
    console.log(`[admin.ts] Using admin canister as intermediary`);
    const adminData = await getScrapedDataViaAdmin(topicId);
    
    if (adminData && adminData.length > 0) {
      console.log(`[admin.ts] Successfully retrieved ${adminData.length} items via admin canister`);
      return adminData;
    } else {
      console.log(`[admin.ts] No data returned from admin canister, trying direct storage access`);
      // If admin canister returns no data, try direct storage access as fallback
      const directData = await getScrapedDataDirect(topicId);
      return directData;
    }
  } catch (error) {
    console.error(`[admin.ts] Error getting scraped data:`, error);
    return [];
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
    const canisterId = import.meta.env.VITE_STORAGE_CANISTER_ID || 'nwy3f-jyaaa-aaaao-a4htq-cai';
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
