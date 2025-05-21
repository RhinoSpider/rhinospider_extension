/**
 * Service Worker Adapter
 * 
 * This adapter handles communication between the service worker and the extension.
 */

import { v4 as uuidv4 } from 'uuid';
import config from './config';

// Constants
const IC_PROXY_URL = config.icProxy?.url || 'https://ic-proxy.rhinospider.com';
const SEARCH_PROXY_URL = config.searchProxy?.url || 'https://search-proxy.rhinospider.com';
const API_KEY = config.icProxy?.apiKey || 'test-api-key';

/**
 * Service Worker Adapter
 */
class ServiceWorkerAdapter {
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
   * Search for a query using the search proxy
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
      const response = await fetch(`${SEARCH_PROXY_URL}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': this.deviceId,
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify(body)
      });

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
   * Submit scraped data to the consumer canister
   * @param {Object} data Scraped data
   * @returns {Promise<Object>} Result
   */
  async submitScrapedData(data) {
    try {
      // Prepare the request body
      const body = {
        url: data.url,
        content: data.content,
        topic: data.topic,
        principalId: data.principalId,
        status: data.status || 'completed',
        source: data.source || 'extension',
        scraping_time: data.scraping_time || 0
      };

      // Make the request
      const response = await fetch(`${IC_PROXY_URL}/api/consumer-submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': this.deviceId,
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify(body)
      });

      // Handle the response
      if (response.ok) {
        const result = await response.json();
        return result;
      } else {
        console.error('Consumer submit error:', response.status, response.statusText);
        throw new Error(`Consumer submit error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error submitting scraped data:', error);
      throw error;
    }
  }

  /**
   * Get the profile for a principal
   * @param {string} principalId Principal ID
   * @returns {Promise<Object>} Profile
   */
  async getProfile(principalId) {
    try {
      // Make the request
      const response = await fetch(`${IC_PROXY_URL}/api/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': this.deviceId,
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({ principalId })
      });

      // Handle the response
      if (response.ok) {
        const result = await response.json();
        return result;
      } else {
        console.error('Get profile error:', response.status, response.statusText);
        throw new Error(`Get profile error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error getting profile:', error);
      throw error;
    }
  }

  /**
   * Get topics for a principal
   * @param {string} principalId Principal ID
   * @returns {Promise<Array>} Topics
   */
  async getTopics(principalId) {
    try {
      // Make the request
      const response = await fetch(`${IC_PROXY_URL}/api/topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': this.deviceId,
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({ principalId })
      });

      // Handle the response
      if (response.ok) {
        const result = await response.json();
        return result.ok || [];
      } else {
        console.error('Get topics error:', response.status, response.statusText);
        throw new Error(`Get topics error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error getting topics:', error);
      throw error;
    }
  }
}

// Create an instance of the adapter
const serviceWorkerAdapter = new ServiceWorkerAdapter();

// Export the adapter as default and also export the methods directly
export default serviceWorkerAdapter;
export const { submitScrapedData, getProfile, getTopics, search } = serviceWorkerAdapter;
