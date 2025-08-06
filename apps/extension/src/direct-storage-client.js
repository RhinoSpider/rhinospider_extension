// direct-storage-client.js - Client for communicating directly with the Storage Canister
import config from './config';

/**
 * DirectStorageClient - Client for communicating directly with the Storage Canister
 */
class DirectStorageClient {
  constructor() {
    this.storageUrl = config.directStorage?.url || 'https://search-proxy.rhinospider.com';
    this.apiKey = config.directStorage?.apiKey || 'test-api-key';
    this.deviceId = null;
    this.initializeDeviceId();
  }

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
   * Check if the direct storage service is available
   * @returns {Promise<boolean>} True if the service is available
   */
  async isAvailable() {
    try {
      const response = await fetch(`${this.storageUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': this.deviceId || await this.getOrCreateDeviceId(),
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.status === 'ok';
      }
      return false;
    } catch (error) {
      console.error('Error checking direct storage availability:', error);
      return false;
    }
  }

  /**
   * Fetch data from a URL
   * @param {string} url URL to fetch data from
   * @returns {Promise<Object>} Fetched data
   */
  async fetchData(url) {
    try {
      const response = await fetch(`${this.storageUrl}/api/fetch-data?url=${encodeURIComponent(url)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': this.deviceId || await this.getOrCreateDeviceId(),
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        console.error('Error fetching data:', response.status, response.statusText);
        throw new Error(`Error fetching data: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error in fetchData:', error);
      throw error;
    }
  }

  /**
   * Submit scraped data to the storage canister
   * @param {Object} data Scraped data
   * @returns {Promise<Object>} Result
   */
  async submitScrapedData(data) {
    try {
      // for requests to ic-proxy.rhinospider.com and handle CORS
      const response = await fetch(`${this.storageUrl}/api/submit-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': this.deviceId || await this.getOrCreateDeviceId(),
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(data)
      });

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

export default new DirectStorageClient();
