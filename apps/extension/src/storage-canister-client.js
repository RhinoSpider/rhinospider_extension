// storage-canister-client.js - Direct interaction with the storage canister
// This module provides direct access to the storage canister using the Internet Computer SDK
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from './declarations/storage';
import { config } from './config';
import { createActor } from './declarations/storage/index';

// Logger utility
const logger = {
  log: (msg, data) => console.log(`[StorageCanisterClient] ${msg}`, data || ''),
  error: (msg, error) => console.error(`[StorageCanisterClient] ${msg}`, error),
  warn: (msg, data) => console.warn(`[StorageCanisterClient] ${msg}`, data || '')
};

// Constants
const STORAGE_CANISTER_ID = config.canisters.storage || 'i2gk7-oyaaa-aaaao-a37cq-cai'; // Hardcoded fallback
const IC_HOST = config.network.ic.host;

/**
 * StorageCanisterClient class for direct interaction with the storage canister
 */
class StorageCanisterClient {
  constructor() {
    this.storageCanisterId = STORAGE_CANISTER_ID;
    this.icHost = IC_HOST;
    logger.log('Initialized with storage canister ID:', this.storageCanisterId);
    logger.log('Using IC host:', this.icHost);
  }

  /**
   * Get the storage canister actor
   * @param {string} principalId - The principal ID to use for authentication
   * @returns {Promise<Actor>} - The storage canister actor
   */
  async getStorageActor(principalId) {
    try {
      logger.log('Getting storage actor with principal ID:', principalId);
      
      // Validate canister ID
      if (!this.storageCanisterId) {
        throw new Error('Storage canister ID is undefined or empty');
      }
      
      logger.log('Using storage canister ID:', this.storageCanisterId);
      
      // Create an identity from the principal ID
      const principal = Principal.fromText(principalId);
      
      // Create a custom identity object that implements the Identity interface
      const identity = {
        getPrincipal: () => principal,
        transformRequest: (request) => request // Required method for Identity interface
      };
      
      // Use the imported createActor function which handles agent creation properly
      const storageActor = createActor(this.storageCanisterId, {
        agentOptions: {
          host: this.icHost,
          identity: identity,
          fetchOptions: {
            credentials: 'omit',
            headers: {
              'Content-Type': 'application/cbor',
              'Accept': '*/*'
            }
          }
        }
      });
      
      logger.log('Storage actor created successfully');
      return storageActor;
    } catch (error) {
      logger.error('Error getting storage actor:', error);
      return null; // Return null instead of throwing to allow fallback
    }
  }

  /**
   * Submit scraped data directly to the storage canister
   * @param {Object} data - The scraped data to submit
   * @returns {Promise<Object>} - The submission result
   */
  async submitScrapedData(data) {
    try {
      logger.log('Submitting scraped data directly to storage canister');
      
      // Get principal ID from storage
      const { principalId } = await new Promise(resolve => {
        chrome.storage.local.get(['principalId'], result => resolve(result));
      });
      
      if (!principalId) {
        logger.error('No principal ID found for submission');
        return { err: { NotAuthorized: null } };
      }
      
      logger.log('Using principal ID for submission:', principalId);
      
      // Get the storage actor
      const storageActor = await this.getStorageActor(principalId);
      if (!storageActor) {
        logger.error('Failed to create storage actor');
        return { err: { SystemError: 'Failed to create storage actor' } };
      }
      
      // Format the data according to the canister interface
      // Ensure content is never empty as it's a required field
      const contentValue = data.content || 'Placeholder content for required field';
      
      // Create a properly formatted object for the canister interface
      // All fields must be present and match the IDL definition exactly
      const scrapedData = {
        id: data.id || `scrape_${Date.now()}`,
        url: data.url || '',
        // Content is a required field and must not be empty
        content: contentValue.substring(0, 10000), // Limit content size
        topic: data.topicId || data.topic || '',
        timestamp: BigInt(Math.floor(data.timestamp / 1000) || Math.floor(Date.now() / 1000)), // Convert to seconds
        status: data.status || 'completed',
        client_id: Principal.fromText(principalId),
        source: data.source || 'extension',
        scraping_time: BigInt(data.scraping_time || 500)
      };
      
      // Debugging - log the full object structure
      logger.log('Formatted data for storage canister:', {
        id: scrapedData.id,
        url: scrapedData.url,
        topic: scrapedData.topic,
        content: scrapedData.content ? `${scrapedData.content.substring(0, 50)}...` : 'MISSING', // Show start of content
        timestamp: String(scrapedData.timestamp),
        status: scrapedData.status,
        client_id: scrapedData.client_id.toString(),
        source: scrapedData.source,
        scraping_time: String(scrapedData.scraping_time)
      });
      
      // Submit the data to the storage canister
      logger.log('Calling submitScrapedData on the storage canister...');
      
      // Use a try/catch block specifically for the actor call
      try {
        const result = await storageActor.submitScrapedData(scrapedData);
        logger.log('Storage canister submission result:', result);
        return result;
      } catch (actorError) {
        // Log the specific error for debugging
        logger.error('Actor call error:', actorError);
        
        // If it's a CBOR parsing error, log more details
        if (actorError.message && actorError.message.includes('parse')) {
          logger.error('CBOR parsing error. Data format issue:', {
            hasContent: Boolean(scrapedData.content),
            contentLength: scrapedData.content ? scrapedData.content.length : 0,
            allFieldsPresent: Object.keys(scrapedData).join(', ')
          });
        }
        
        throw actorError; // Re-throw to be caught by the outer try/catch
      }
    } catch (error) {
      logger.error('Error submitting to storage canister:', error);
      
      // Check if it's an unauthorized error
      if (error.message && error.message.includes('NotAuthorized') || 
          error.message && error.message.includes('Unauthorized')) {
        return { err: { NotAuthorized: null } };
      }
      
      // Check for transform request error
      if (error.message && error.message.includes('transformRequest')) {
        logger.error('Transform request error - this is likely an issue with the agent configuration');
        return { err: { SystemError: 'Agent configuration error: ' + error.message } };
      }
      
      return { err: { SystemError: error.message || String(error) } };
    }
  }

  /**
   * Check if the client is authorized to access the storage canister
   * @returns {Promise<boolean>} - True if authorized, false otherwise
   */
  async isAuthorized() {
    try {
      logger.log('Checking if client is authorized to access storage canister');
      
      // Get principal ID from storage
      const { principalId } = await new Promise(resolve => {
        chrome.storage.local.get(['principalId'], result => resolve(result));
      });
      
      if (!principalId) {
        logger.warn('No principal ID found for authorization check');
        return false;
      }
      
      // Get the storage actor
      const storageActor = await this.getStorageActor(principalId);
      
      // Try to get topics as a test
      const result = await storageActor.getTopics();
      
      // If we get a result without an error, we're authorized
      if (result.ok) {
        logger.log('Client is authorized to access storage canister');
        return true;
      }
      
      logger.warn('Client is not authorized to access storage canister:', result.err);
      return false;
    } catch (error) {
      logger.error('Error checking authorization:', error);
      return false;
    }
  }
}

// Export a singleton instance
const storageCanisterClient = new StorageCanisterClient();
export default storageCanisterClient;
