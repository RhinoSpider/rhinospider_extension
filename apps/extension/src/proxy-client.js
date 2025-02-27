// proxy-client.js - Client for communicating with the IC Proxy Server
import { config } from './config';

// Get proxy URL from config
const PROXY_URL = config.proxy.url;

// API Password for authentication from config
const API_PASSWORD = config.proxy.apiPassword;

/**
 * ProxyClient class for communicating with the IC Proxy Server
 */
class ProxyClient {
  /**
   * Create a new ProxyClient
   * @param {string} proxyUrl - URL of the proxy server
   * @param {string} apiPassword - API password for authentication
   */
  constructor({ proxyUrl, apiPassword } = {}) {
    this.proxyUrl = proxyUrl || PROXY_URL;
    this.apiPassword = apiPassword || API_PASSWORD;
    
    console.log('[ProxyClient] Initialized with proxy URL:', this.proxyUrl);
  }

  /**
   * Set the proxy URL
   * @param {string} url - New proxy URL
   */
  setProxyUrl(url) {
    this.proxyUrl = url;
    console.log('[ProxyClient] Updated proxy URL:', this.proxyUrl);
  }

  /**
   * Make a request to the proxy server
   * @param {string} endpoint - The endpoint to call
   * @param {Object} data - The data to send
   * @returns {Promise<Object>} - The response from the proxy server
   */
  async request(endpoint, data = {}) {
    try {
      console.log('[ProxyClient] Making request to', endpoint, 'with data:', data);
      
      const response = await fetch(`${this.proxyUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiPassword}`
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `HTTP error ${response.status}` };
        }
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.log('[ProxyClient] Error in request to', endpoint + ':', error);
      throw error;
    }
  }

  /**
   * Get the user profile
   * @param {string} principalId - The user's principal ID
   * @returns {Promise<Object>} - The user profile
   */
  async getUserProfile(principalId) {
    console.log('[ProxyClient] Getting user profile with principalId:', principalId ? principalId : 'Not present');
    
    return this.request('/api/profile', { principalId });
  }

  /**
   * Get the topics
   * @param {string} principalId - The user's principal ID
   * @returns {Promise<Array>} - The topics
   */
  async getTopics(principalId) {
    console.log('[ProxyClient] Getting topics with principalId:', principalId ? principalId : 'Not present');
    
    return this.request('/api/topics', { principalId });
  }

  /**
   * Register a device
   * @param {string} deviceId - The device ID to register
   * @param {string} identity - The user's identity in PEM format
   * @returns {Promise<Object>} - The result of the registration
   */
  async registerDevice(deviceId, identity) {
    return this.request('/api/register-device', { deviceId, identity });
  }

  /**
   * Submit scraped data
   * @param {Object} data - The scraped data to submit
   * @param {string} identity - The user's identity in PEM format
   * @returns {Promise<Object>} - The result of the submission
   */
  async submitScrapedData(data, identity) {
    return this.request('/api/submit-data', { ...data, identity });
  }

  /**
   * Update user preferences
   * @param {boolean} notificationsEnabled - Whether notifications are enabled
   * @param {string} theme - The user's preferred theme
   * @param {string} identity - The user's identity in PEM format
   * @returns {Promise<Object>} - The result of the update
   */
  async updatePreferences(notificationsEnabled, theme, identity) {
    return this.request('/api/update-preferences', { 
      notificationsEnabled, 
      theme,
      identity
    });
  }

  /**
   * Check if the proxy server is available
   * @returns {Promise<boolean>} - True if the proxy server is available, false otherwise
   */
  async isAvailable() {
    try {
      const response = await fetch(`${this.proxyUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5 second timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.status === 'ok';
      }
      
      return false;
    } catch (error) {
      console.log('[ProxyClient] Error checking availability:', error);
      return false;
    }
  }
}

// Export a singleton instance
const proxyClient = new ProxyClient();
export default proxyClient;
