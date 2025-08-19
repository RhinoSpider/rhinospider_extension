// proxy-client.js - Client for communicating with the IC Proxy Server
import config from './config';
import connectionHandler from './connection-handler';

/**
 * ProxyClient - Client for communicating with the IC Proxy Server
 */
class ProxyClient {
  constructor() {
    this.proxyUrl = config.icProxy?.url || 'https://ic-proxy.rhinospider.com';
    this.apiKey = config.icProxy?.apiKey || 'rhinospider-api-key-2024';
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
      // Only log non-network errors to console
      if (!error.message?.includes('Failed to fetch') && 
          !error.message?.includes('NetworkError')) {
        console.error('[ProxyClient] Request error:', error);
      }

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
      // Get the user's IP address for geo-distribution
      let ipAddress = 'unknown';
      let region = 'unknown';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          ipAddress = ipData.ip;
          // You can add region detection here if needed
        }
      } catch (e) {
        console.log('Could not determine IP address:', e);
      }

      // Prepare node characteristics for geo-distribution routing
      const nodeCharacteristics = {
        ipAddress: ipAddress,
        region: region,
        percentageNodes: 100, // This node is available 100% of the time
        randomizationMode: 'none' // This node accepts all matching tasks
      };

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': this.deviceId || await this.getOrCreateDeviceId(),
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ 
          principalId: principalId,
          nodeCharacteristics 
        })
      };

      // Use the new geo-filtered topics endpoint
      const response = await this.makeRequest('/api/consumer-topics', options);

      if (response.ok) {
        const data = await response.json();
        // The proxy now returns topics as a direct array
        if (Array.isArray(data)) {
          console.log('[ProxyClient] Received', data.length, 'topics from proxy');
          return data;
        }
        // Fallback for old format
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
        // Log silently without throwing errors to console
        if (response.status !== 502) {
          console.warn('Submission issue:', response.status);
        }
        // Return error object instead of throwing
        return { error: `Submission failed: ${response.status}`, status: response.status };
      }
    } catch (error) {
      // Log silently for network errors
      if (error.message && !error.message.includes('502')) {
        console.warn('Network issue during submission');
      }
      // Return error object instead of throwing
      return { error: error.message || 'Network error', networkError: true };
    }
  }
}

export default new ProxyClient();