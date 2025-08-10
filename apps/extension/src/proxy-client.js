// proxy-client.js - Client for communicating with the IC Proxy Server
import config from './config';
import connectionHandler from './connection-handler';

/**
 * ProxyClient - Client for communicating with the IC Proxy Server
 */
class ProxyClient {
  constructor() {
    this.proxyUrl = config.icProxy?.url || 'https://ic-proxy.rhinospider.com';
    this.httpFallbackUrl = config.icProxy?.httpFallbackUrl || 'http://ic-proxy.rhinospider.com';
    this.apiKey = config.icProxy?.apiKey || 'test-api-key';
    this.deviceId = null;
    this.initializeDeviceId();
  }

  /**
   * Initialize device ID
   */
  async initializeDeviceId() {
    this.deviceId = await this.getOrCreateDeviceId();
  }

  /**
   * Get or create a device ID
   * @returns {Promise<string>} Device ID
   */
  async getOrCreateDeviceId() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['deviceId'], (result) => {
        if (result.deviceId) {
          resolve(result.deviceId);
        } else {
          const deviceId = crypto.randomUUID();
          chrome.storage.local.set({ deviceId }, () => {
            resolve(deviceId);
          });
        }
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
      console.log(`[ProxyClient] Making request to ${endpoint}`);

      // Use the connection handler to make the request with automatic fallback
      const response = await connectionHandler.makeRequest('icProxy', endpoint, options);

      // Track the connection attempt if logging is enabled
      if (globalThis.rhinoSpiderLogging) {
        globalThis.rhinoSpiderLogging.logConnectionAttempt(
          connectionHandler.getBestUrl('icProxy', endpoint),
          true
        );
      }

      return response;
    } catch (error) {
      console.error('[ProxyClient] Request error:', error);

      // Track the failed attempt if logging is enabled
      if (globalThis.rhinoSpiderLogging) {
        globalThis.rhinoSpiderLogging.logConnectionAttempt(
          connectionHandler.getBestUrl('icProxy', endpoint),
          false,
          error
        );
      }

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
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': this.deviceId || await this.getOrCreateDeviceId(),
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ principalId })
      };

      const response = await this.makeRequest('/api/profile', options);

      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        console.error('Error getting profile:', response.status, response.statusText);
        throw new Error(`Error getting profile: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error in getProfile:', error);
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
      const options = {
        method: 'GET',
        headers: {
          'x-device-id': this.deviceId || await this.getOrCreateDeviceId(),
          'Authorization': `Bearer ${this.apiKey}`
        }
      };

      const response = await this.makeRequest('/api/topics', options);

      if (response.ok) {
        const data = await response.json();
        return data.topics || data.ok || [];
      } else {
        console.error('Error getting topics:', response.status, response.statusText);
        throw new Error(`Error getting topics: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error in getTopics:', error);
      throw error;
    }
  }

  /**
   * Submit scraped data to the consumer canister
   * @param {Object} data Scraped data
   * @returns {Promise<Object>} Result
   */
  async submitScrapedData(data) {
    try {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': this.deviceId || await this.getOrCreateDeviceId(),
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(data)
      };

      const response = await this.makeRequest('/api/consumer-submit', options);

      if (response.ok) {
        const result = await response.json();
        return result;
      } else {
        console.error('Error submitting scraped data:', response.status, response.statusText);
        throw new Error(`Error submitting scraped data: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error in submitScrapedData:', error);
      throw error;
    }
  }
}

export default new ProxyClient();