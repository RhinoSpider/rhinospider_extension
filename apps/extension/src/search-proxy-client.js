/**
 * Search Proxy Client
 *
 * This client handles communication with the search proxy service.
 */

import { v4 as uuidv4 } from 'uuid';
import config from './config';
import connectionHandler from './connection-handler';

// Constants
const API_KEY = config.searchProxy?.apiKey || 'test-api-key';

/**
 * Search Proxy Client
 */
class SearchProxyClient {
  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
  }

  /**
   * Get or create a device ID
   * @returns {string} Device ID
   */
  getOrCreateDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
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
      if (window.rhinoSpiderLogging) {
        window.rhinoSpiderLogging.logConnectionAttempt(
          connectionHandler.getBestUrl('searchProxy', endpoint),
          true
        );
      }

      return response;
    } catch (error) {
      console.error('[SearchProxyClient] Request error:', error);

      // Track the failed attempt if logging is enabled
      if (window.rhinoSpiderLogging) {
        window.rhinoSpiderLogging.logConnectionAttempt(
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
}

export default new SearchProxyClient();