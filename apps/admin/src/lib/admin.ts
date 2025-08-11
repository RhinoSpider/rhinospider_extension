// Polyfill global
const _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
(window as any).global = _global;

// Import the necessary libraries
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getIdentity } from './auth';

// Import the canister interfaces
// @ts-ignore - Ignore TypeScript error for the direct import
import { idlFactory } from '../declarations/admin/admin_backend.did.js';
import type { _SERVICE } from '../declarations/admin/admin_backend.did.d';

// Import the storage canister interface and factory
// @ts-ignore - Ignore TypeScript error for the direct import
import { idlFactory as storageIdlFactory } from '../declarations/storage/storage.did.js';
// Import our custom storage IDL factory that exactly matches the storage canister interface
import { storageIdlFactory as customStorageIdlFactory } from './storage.did';

// Import the types
import type { ScrapingTopic, AIConfig, ScrapedData, ExtensionUser, CreateTopicRequest } from '../types';

let actor: any = null;

export async function checkIsAdmin(): Promise<boolean> {
  try {
    const actor = await getAdminActor();
    const identity = await getIdentity();
    if (!identity) {
      return false;
    }
    
    const principal = identity.getPrincipal();
    console.log('Checking admin status for:', principal.toString());
    
    // Call the checkIsAdmin method on the backend
    const isAdmin = await actor.checkIsAdmin();
    console.log('Is admin:', isAdmin);
    
    return isAdmin;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

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

      // Use new admin backend canister ID
      const canisterId = import.meta.env.VITE_ADMIN_BACKEND_CANISTER_ID || 'wvset-niaaa-aaaao-a4osa-cai';
      if (!canisterId) {
        throw new Error('Admin canister ID not found in environment variables');
      }

      actor = await Actor.createActor(idlFactory, {
        agent,
        canisterId: Principal.fromText(canisterId),
      });

      // Store the identity reference for future checks
      actor._identity = identity;

      // Log available methods for debugging
      console.log('Admin actor methods:', Object.keys(actor));
    }

    return actor;
  } catch (error) {
    console.error('Error creating admin actor:', error);
    throw error;
  }
};

// Helper function to replace BigInt values with strings for JSON serialization
const replaceBigInt = (key: string, value: any): any => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
};

export async function getTopics(): Promise<ScrapingTopic[]> {
  try {
    const adminActor = await getAdminActor();
    
    const result = await adminActor.getTopics();
    
    if ('err' in result) {
      console.error('Error fetching topics:', result.err);
      return [];
    }
    
    // Convert BigInt values to numbers for JSON serialization
    const topics = result.ok.map((topic: any) => ({
      ...topic,
      createdAt: Number(topic.createdAt),
      lastScraped: Number(topic.lastScraped),
      totalUrlsScraped: Number(topic.totalUrlsScraped),
      minContentLength: Number(topic.minContentLength),
      maxContentLength: Number(topic.maxContentLength),
      maxUrlsPerBatch: Number(topic.maxUrlsPerBatch),
      scrapingInterval: Number(topic.scrapingInterval),
      priority: Number(topic.priority)
    }));
    
    return topics;
  } catch (error) {
    console.error('Error fetching topics:', error);
    return [];
  }
}

export async function createTopic(topic: ScrapingTopic): Promise<ScrapingTopic> {
  try {
    const adminActor = await getAdminActor();
    
    // Convert the topic to the format expected by the canister
    // IMPORTANT: Optional fields (opt) in Motoko need to be wrapped in an array or null
    const createRequest = {
      id: topic.id,
      name: topic.name,
      description: topic.description || '',
      status: topic.status || 'active',
      
      // Search Configuration
      searchQueries: topic.searchQueries || [],
      // Optional fields must be [value] for Some or [] for None
      preferredDomains: topic.preferredDomains && topic.preferredDomains.length > 0 ? [topic.preferredDomains] : [],
      excludeDomains: topic.excludeDomains && topic.excludeDomains.length > 0 ? [topic.excludeDomains] : [],
      requiredKeywords: topic.requiredKeywords || [],
      excludeKeywords: topic.excludeKeywords && topic.excludeKeywords.length > 0 ? [topic.excludeKeywords] : [],
      
      // Extraction Configuration
      contentSelectors: topic.contentSelectors || ['article', 'main', '.content'],
      titleSelectors: topic.titleSelectors && topic.titleSelectors.length > 0 ? [topic.titleSelectors] : [],
      excludeSelectors: topic.excludeSelectors || [],
      minContentLength: BigInt(topic.minContentLength || 100),
      maxContentLength: BigInt(topic.maxContentLength || 50000),
      
      // Operational Settings
      maxUrlsPerBatch: BigInt(topic.maxUrlsPerBatch || 10),
      scrapingInterval: BigInt(topic.scrapingInterval || 3600),
      priority: BigInt(topic.priority || 5),
      
      // Tracking
      createdAt: BigInt(topic.createdAt || Date.now()),
      lastScraped: BigInt(topic.lastScraped || 0),
      totalUrlsScraped: BigInt(topic.totalUrlsScraped || 0)
    };
    
    console.log('Creating topic with request:', JSON.stringify(createRequest, replaceBigInt));
    
    const result = await adminActor.createTopic(createRequest);
    
    if ('err' in result) {
      console.error('Error from backend:', result.err);
      throw new Error(result.err);
    }
    
    // Convert the result back to the frontend format
    const createdTopic = {
      ...result.ok,
      createdAt: Number(result.ok.createdAt),
      lastScraped: Number(result.ok.lastScraped),
      totalUrlsScraped: Number(result.ok.totalUrlsScraped),
      minContentLength: Number(result.ok.minContentLength),
      maxContentLength: Number(result.ok.maxContentLength),
      maxUrlsPerBatch: Number(result.ok.maxUrlsPerBatch),
      scrapingInterval: Number(result.ok.scrapingInterval),
      priority: Number(result.ok.priority)
    };
    
    console.log('Topic created successfully:', createdTopic);
    return createdTopic;
  } catch (error) {
    console.error('Error in createTopic:', error);
    throw error;
  }
}

export async function updateTopic(id: string, topic: ScrapingTopic): Promise<ScrapingTopic> {
  try {
    const adminActor = await getAdminActor();
    
    // Create the update request with optional fields
    const updateRequest = {
      name: topic.name ? [topic.name] : [],
      description: topic.description ? [topic.description] : [],
      status: topic.status ? [topic.status] : [],
      
      // Search Configuration (all optional)
      searchQueries: topic.searchQueries && topic.searchQueries.length > 0 ? [topic.searchQueries] : [],
      preferredDomains: topic.preferredDomains && topic.preferredDomains.length > 0 ? [topic.preferredDomains] : [],
      excludeDomains: topic.excludeDomains && topic.excludeDomains.length > 0 ? [topic.excludeDomains] : [],
      requiredKeywords: topic.requiredKeywords && topic.requiredKeywords.length > 0 ? [topic.requiredKeywords] : [],
      excludeKeywords: topic.excludeKeywords && topic.excludeKeywords.length > 0 ? [topic.excludeKeywords] : [],
      
      // Extraction Configuration (all optional)
      contentSelectors: topic.contentSelectors && topic.contentSelectors.length > 0 ? [topic.contentSelectors] : [],
      titleSelectors: topic.titleSelectors && topic.titleSelectors.length > 0 ? [topic.titleSelectors] : [],
      excludeSelectors: topic.excludeSelectors && topic.excludeSelectors.length > 0 ? [topic.excludeSelectors] : [],
      minContentLength: topic.minContentLength ? [BigInt(topic.minContentLength)] : [],
      maxContentLength: topic.maxContentLength ? [BigInt(topic.maxContentLength)] : [],
      
      // Operational Settings (all optional)
      maxUrlsPerBatch: topic.maxUrlsPerBatch ? [BigInt(topic.maxUrlsPerBatch)] : [],
      scrapingInterval: topic.scrapingInterval ? [BigInt(topic.scrapingInterval)] : [],
      priority: topic.priority ? [BigInt(topic.priority)] : []
    };
    
    const result = await adminActor.updateTopic(id, updateRequest);
    
    if ('err' in result) {
      console.error('Error updating topic:', result.err);
      throw new Error(result.err);
    }
    
    // Convert the result back to the frontend format
    const updatedTopic = {
      ...result.ok,
      createdAt: Number(result.ok.createdAt),
      lastScraped: Number(result.ok.lastScraped),
      totalUrlsScraped: Number(result.ok.totalUrlsScraped),
      minContentLength: Number(result.ok.minContentLength),
      maxContentLength: Number(result.ok.maxContentLength),
      maxUrlsPerBatch: Number(result.ok.maxUrlsPerBatch),
      scrapingInterval: Number(result.ok.scrapingInterval),
      priority: Number(result.ok.priority)
    };
    
    return updatedTopic;
  } catch (error) {
    console.error('Error updating topic:', error);
    throw error;
  }
}

export async function deleteTopic(id: string): Promise<void> {
  try {
    const adminActor = await getAdminActor();
    
    const result = await adminActor.deleteTopic(id);
    
    if ('err' in result) {
      console.error('Error deleting topic:', result.err);
      throw new Error(result.err);
    }
  } catch (error) {
    console.error('Error deleting topic:', error);
    throw error;
  }
}

export async function setTopicActive(id: string, active: boolean): Promise<void> {
  try {
    const adminActor = await getAdminActor();
    
    const result = await adminActor.setTopicActive(id, active);
    
    if ('err' in result) {
      console.error('Error setting topic active status:', result.err);
      throw new Error(result.err);
    }
  } catch (error) {
    console.error('Error setting topic active status:', error);
    throw error;
  }
}

export async function getAIConfig(): Promise<AIConfig | null> {
  try {
    const adminActor = await getAdminActor();
    const result = await adminActor.getGlobalAIConfig();
    
    if ('err' in result) {
      console.error('Error fetching AI config:', result.err);
      return null;
    }
    
    // The result.ok is an optional, so check if it has a value
    if (result.ok && result.ok.length > 0) {
      const config = result.ok[0];
      return {
        enabled: config.enabled,
        provider: config.provider,
        apiKey: config.apiKey && config.apiKey.length > 0 ? config.apiKey[0] : '',
        model: config.model,
        maxTokensPerRequest: Number(config.maxTokensPerRequest),
        features: config.features
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching AI config:', error);
    return null;
  }
}

export async function updateAIConfig(config: AIConfig): Promise<void> {
  try {
    const adminActor = await getAdminActor();
    
    // Convert to the format expected by the canister
    const canisterConfig = config.enabled ? [{
      enabled: config.enabled,
      provider: config.provider,
      apiKey: config.apiKey ? [config.apiKey] : [],
      model: config.model,
      maxTokensPerRequest: BigInt(config.maxTokensPerRequest || 150),
      features: config.features
    }] : [];
    
    const result = await adminActor.setGlobalAIConfig(canisterConfig);
    
    if ('err' in result) {
      console.error('Error updating AI config:', result.err);
      throw new Error(result.err);
    }
  } catch (error) {
    console.error('Error updating AI config:', error);
    throw error;
  }
}

// Storage canister functions
export async function getStorageActor() {
  try {
    const identity = await getIdentity();
    if (!identity) {
      throw new Error('No identity found');
    }
    
    console.log('[admin.ts] Got identity for storage canister:', identity.getPrincipal().toString());
    
    const agent = new HttpAgent({ 
      identity,
      host: import.meta.env.VITE_IC_HOST || 'https://icp0.io'
    });
    
    const storageCanisterId = import.meta.env.VITE_STORAGE_CANISTER_ID || 'hhaip-uiaaa-aaaao-a4khq-cai';
    console.log('[admin.ts] Using storage canister ID:', storageCanisterId);
    console.log('[admin.ts] Using IC host:', import.meta.env.VITE_IC_HOST || 'https://icp0.io');
    
    console.log('[admin.ts] Creating storage actor with canister ID:', storageCanisterId);
    const storageActor = await Actor.createActor(customStorageIdlFactory, {
      agent,
      canisterId: Principal.fromText(storageCanisterId),
    });
    
    console.log('[admin.ts] Storage actor created successfully');
    return storageActor;
  } catch (error) {
    console.error('[admin.ts] Error creating storage actor:', error);
    throw error;
  }
}

export async function getScrapedData(topicId?: string): Promise<ScrapedData[]> {
  try {
    const storageActor = await getStorageActor();
    
    // If no topic is provided, use getAllData to fetch everything
    if (!topicId) {
      console.log(`[admin.ts] getScrapedData called with no topicId, fetching all data`);
      const allData = await storageActor.getAllData();
      
      // getAllData returns an array of tuples [id, data], we need just the data
      const dataArray = allData.map((tuple: [string, any]) => tuple[1]);
      
      console.log(`[admin.ts] getAllData returned ${dataArray.length} items`);
      return dataArray;
    } else {
      // If a specific topic is provided, use getScrapedData with array format
      const topicIds = [topicId];
      console.log(`[admin.ts] getScrapedData called with topicIds:`, topicIds);
      
      // getScrapedData returns an array directly, not a Result type
      const result = await storageActor.getScrapedData(topicIds);
      
      console.log(`[admin.ts] getScrapedData returned ${result?.length || 0} items`);
      return result || [];
    }
  } catch (error) {
    console.error('[admin.ts] Error fetching scraped data:', error);
    return [];
  }
}

export async function getExtensionUsers(): Promise<ExtensionUser[]> {
  try {
    // Try to fetch from IC proxy first (more reliable)
    try {
      const proxyUrl = 'https://ic-proxy.rhinospider.com';
      const response = await fetch(`${proxyUrl}/api/consumer-users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched users from IC proxy:', data);
        
        if (data.success && data.users) {
          // Convert to ExtensionUser format
          return data.users.map((user: any, index: number) => ({
            id: (index + 1).toString(),
            principalId: user.principal || 'unknown',
            deviceId: 'extension',
            dataContributed: user.dataVolumeKB * 1024, // Convert KB to bytes
            lastActive: new Date(Number(user.lastLogin) / 1_000_000).toISOString(), // Convert nanoseconds to milliseconds
            joinDate: new Date(Number(user.created) / 1_000_000).toISOString(), // Convert nanoseconds to milliseconds
            isActive: user.isActive,
            ipAddress: user.ipAddress || 'unknown',
            location: user.city && user.country 
              ? `${user.city}, ${user.country}`
              : user.country || 'Unknown'
          }));
        }
      }
    } catch (proxyError) {
      console.error('IC proxy failed, falling back to direct canister call:', proxyError);
    }

    // Fallback to direct canister call
    const identity = await getIdentity();
    if (!identity) {
      throw new Error('No identity found');
    }
    
    const agent = new HttpAgent({ 
      identity,
      host: import.meta.env.VITE_IC_HOST || 'https://icp0.io'
    });
    
    const consumerCanisterId = 't3pjp-kqaaa-aaaao-a4ooq-cai';
    
    // Create actor for consumer canister
    const idlFactory = ({ IDL }: any) => {
      const UserProfile = IDL.Record({
        principal: IDL.Principal,
        devices: IDL.Vec(IDL.Text),
        created: IDL.Int,
        lastLogin: IDL.Int,
        ipAddress: IDL.Opt(IDL.Text),
        country: IDL.Opt(IDL.Text),
        region: IDL.Opt(IDL.Text),
        city: IDL.Opt(IDL.Text),
        latitude: IDL.Opt(IDL.Float64),
        longitude: IDL.Opt(IDL.Float64),
        lastActive: IDL.Int,
        isActive: IDL.Bool,
        dataVolumeKB: IDL.Nat,
        referralCode: IDL.Text,
        referralCount: IDL.Nat,
        points: IDL.Nat,
        totalDataScraped: IDL.Nat,
        referredBy: IDL.Opt(IDL.Principal),
        preferences: IDL.Record({
          notificationsEnabled: IDL.Bool,
          theme: IDL.Text,
        }),
      });

      return IDL.Service({
        getAllUsers: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, UserProfile))], ['query']),
      });
    };

    const consumerActor = Actor.createActor(idlFactory, {
      agent,
      canisterId: Principal.fromText(consumerCanisterId),
    });

    // Fetch all users
    const allUsers = await consumerActor.getAllUsers() as [Principal, any][];
    
    // Convert to ExtensionUser format
    return allUsers.map(([principal, profile], index) => ({
      id: (index + 1).toString(),
      principalId: principal.toString(),
      deviceId: profile.devices?.[0] || 'unknown',
      dataContributed: Number(profile.dataVolumeKB) * 1024, // Convert KB to bytes
      lastActive: new Date(Number(profile.lastActive) / 1_000_000).toISOString(), // Convert nanoseconds to milliseconds
      joinDate: new Date(Number(profile.created) / 1_000_000).toISOString(), // Convert nanoseconds to milliseconds
      isActive: profile.isActive,
      ipAddress: profile.ipAddress?.[0] || 'unknown',
      location: profile.city?.[0] && profile.country?.[0] 
        ? `${profile.city[0]}, ${profile.country[0]}`
        : profile.country?.[0] || 'Unknown'
    }));
  } catch (error) {
    console.error('Error fetching extension users:', error);
    return [];
  }
}