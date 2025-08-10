/**
 * Search Proxy Client
 *
 * This client handles communication with the search proxy service.
 */

// Use crypto.randomUUID() instead of uuid package for better browser compatibility
const uuidv4 = () => crypto.randomUUID();
import config from './config';
import connectionHandler from './connection-handler';

// Constants
const API_KEY = config.searchProxy?.apiKey || '';

/**
 * Search Proxy Client
 */
class SearchProxyClient {
  constructor() {
    this.getOrCreateDeviceId().then(deviceId => {
      this.deviceId = deviceId;
    });
  }

  /**
   * Get or create a device ID
   * @returns {Promise<string>} Device ID
   */
  async getOrCreateDeviceId() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['deviceId'], (result) => {
        let deviceId = result.deviceId;
        if (!deviceId) {
          deviceId = uuidv4();
          chrome.storage.local.set({ deviceId });
        }
        resolve(deviceId);
      });
    });
  }

  /**
   * Make a request using the robust connection handler
   * @param {string} endpoint API endpoint
   * @param {object} options Request options
   * @returns {Promise<Response>} Fetch response
   */
  async makeRequest(endpoint, options = {}) {
    try {
      console.log(`[SearchProxyClient] Making request to ${endpoint}`);

      // Use the connection handler to make the request with automatic fallback
      const response = await connectionHandler.makeRequest('searchProxy', endpoint, options);

      // Track the connection attempt if logging is enabled
      if (globalThis.rhinoSpiderLogging) {
        globalThis.rhinoSpiderLogging.logConnectionAttempt(
          connectionHandler.getBestUrl('searchProxy', endpoint),
          true
        );
      }

      return response;
    } catch (error) {
      console.error('[SearchProxyClient] Request error:', error);

      // Track the failed attempt if logging is enabled
      if (globalThis.rhinoSpiderLogging) {
        globalThis.rhinoSpiderLogging.logConnectionAttempt(
          connectionHandler.getBestUrl('searchProxy', endpoint),
          false,
          error
        );
      }

      throw error;
    }
  }

  /**
   * Check if the search proxy service is available
   * @returns {Promise<boolean>} True if the service is available
   */
  async isAvailable() {
    try {
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': this.deviceId,
          'Authorization': `Bearer ${API_KEY}`
        }
      };

      const response = await this.makeRequest('/api/health', options);

      if (response.ok) {
        const data = await response.json();
        return data.status === 'ok';
      }
      return false;
    } catch (error) {
      console.error('Error checking search proxy availability:', error);
      return false;
    }
  }

  /**
   * Search for a query
   * @param {string} query Search query
   * @param {number} limit Maximum number of results
   * @param {string} domain Optional domain to filter results
   * @returns {Promise<Array>} Search results
   */
  async search(query, limit = 10, domain = null) {
    try {
      // Prepare the request body
      const body = {
        query,
        limit,
        extensionId: chrome.runtime.id
      };

      // Add domain if provided
      if (domain) {
        body.domain = domain;
      }

      // Make the request
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': this.deviceId,
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify(body)
      };

      const response = await this.makeRequest('/api/search', options);

      // Handle the response
      if (response.ok) {
        const data = await response.json();
        return data.urls || [];
      } else {
        console.error('Search proxy error:', response.status, response.statusText);
        return [];
      }
    } catch (error) {
      console.error('Error searching with proxy:', error);
      return [];
    }
  }

  /**
   * Get URLs for topics (wrapper for compatibility)
   * This method is kept for backward compatibility but now uses search
   */
  async getUrlsForTopics(topics, limit = 5) {
    console.log('[SearchProxyClient] getUrlsForTopics called with topics:', topics);
    
    try {
      const body = {
        extensionId: chrome.runtime.id,
        topics: topics,
        batchSize: limit * topics.length
      };

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': this.deviceId,
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify(body)
      };

      const response = await this.makeRequest('/api/search/urls', options);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[SearchProxyClient] Got URLs response:', data);
        return data.urls || {};
      } else {
        console.error('[SearchProxyClient] Error response:', response.status);
        return {};
      }
    } catch (error) {
      console.error('[SearchProxyClient] Error getting URLs for topics:', error);
      return {};
    }
  }

  /**
   * Prefetch URLs for all topics (wrapper for compatibility)
   */
  async prefetchUrlsForAllTopics(topics) {
    console.log('[SearchProxyClient] prefetchUrlsForAllTopics called');
    // This will be handled by the new URLFinder class
    return {};
  }

  /**
   * Check proxy health
   */
  async checkProxyHealth() {
    return this.isAvailable();
  }

  /**
   * Get URL for topic (wrapper for compatibility)
   */
  async getUrlForTopic(topic) {
    console.log('[SearchProxyClient] getUrlForTopic called for topic:', topic);
    
    try {
      // Call the search proxy to get URLs for this topic
      const result = await this.getUrlsForTopics([topic], 1);
      
      if (result && result[topic.id] && result[topic.id].length > 0) {
        const urlData = result[topic.id][0];
        return {
          url: urlData.url,
          topicId: topic.id,
          topicName: topic.name
        };
      }
      
      // No URLs returned
      console.log('[SearchProxyClient] No URLs returned for topic:', topic.name);
      return null;
    } catch (error) {
      console.error('[SearchProxyClient] Error getting URL for topic:', error);
      return null;
    }
  }
}

// Create instance
const searchProxyClient = new SearchProxyClient();

// Export both the instance and the methods for backward compatibility
export default searchProxyClient;
export const getUrlsForTopics = (topics, limit) => searchProxyClient.getUrlsForTopics(topics, limit);
export const prefetchUrlsForAllTopics = (topics) => searchProxyClient.prefetchUrlsForAllTopics(topics);
export const checkProxyHealth = () => searchProxyClient.checkProxyHealth();
export const getUrlForTopic = (topic) => searchProxyClient.getUrlForTopic(topic);