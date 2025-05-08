// proxy-client.js - Client for communicating with the IC Proxy Server
import { config } from './config';

/**
 * Validates and formats a URL to ensure it has a proper protocol prefix
 * @param {string} url - The URL to validate and format
 * @returns {string} - The formatted URL with protocol prefix
 */
function validateAndFormatUrl(url) {
  // Handle null, undefined, or empty strings
  if (!url) return '';
  
  // Handle case where URL is an object with a url property
  if (typeof url === 'object' && url !== null && url.url) {
    url = url.url;
  }
  
  // Convert to string if it's not already
  url = String(url).trim();
  
  try {
    // Check if URL already has a protocol
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Try to create a URL object to validate it
      new URL(url);
      return url;
    }
    
    // Add https:// prefix and validate
    const urlWithProtocol = 'https://' + url;
    new URL(urlWithProtocol); // This will throw if invalid
    return urlWithProtocol;
  } catch (error) {
    console.warn(`Invalid URL: ${url}. Error: ${error.message}`);
    // Return empty string for invalid URLs
    return '';
  }
}

// Get proxy URL from config
const PROXY_URL = validateAndFormatUrl(config.proxy.url);

// No longer using API password for authentication

/**
 * ProxyClient class for communicating with the IC Proxy Server
 */
class ProxyClient {
  /**
   * Create a new ProxyClient
   * @param {Object} options - Options for the ProxyClient
   * @param {string} options.proxyUrl - URL of the proxy server
   * @param {string} options.apiPassword - API password for authentication
   */
  constructor({ proxyUrl } = {}) {
    this.proxyUrl = proxyUrl || PROXY_URL;
    console.log('[ProxyClient] Initialized with proxy URL:', this.proxyUrl);
  }

  /**
   * Set the proxy URL
   * @param {string} url - New proxy URL
   */
  setProxyUrl(url) {
    this.proxyUrl = validateAndFormatUrl(url);
    console.log('[ProxyClient] Proxy URL updated:', this.proxyUrl);
  }

  /**
   * Make a request to the proxy server
   * @param {string} endpoint - The endpoint to request
   * @param {Object} data - The data to send
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - The response from the proxy server
   */
  async request(endpoint, data, options = {}) {
    if (!this.proxyUrl) {
      console.error('[ProxyClient] No proxy URL configured');
      throw new Error('No proxy URL configured');
    }

    // Ensure the endpoint starts with a slash
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }

    const url = `${this.proxyUrl}${endpoint}`;
    console.log(`[ProxyClient] Making request to ${url}`);

    try {
      const response = await fetch(url, {
        method: options.method || 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: options.method === 'GET' ? undefined : JSON.stringify(data)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ProxyClient] Request failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[ProxyClient] Request successful:', result);
      return result;
    } catch (error) {
      console.error('[ProxyClient] Request error:', error);
      throw error;
    }
  }

  /**
   * Get the principal ID from storage
   * @returns {Promise<string>} - The principal ID
   */
  async getPrincipalId() {
    try {
      const result = await new Promise(resolve => {
        chrome.storage.local.get(['principalId'], resolve);
      });
      
      return result.principalId || '';
    } catch (error) {
      console.error('[ProxyClient] Error getting principal ID:', error);
      return '';
    }
  }

  /**
   * Get the user profile
   * @param {string} principalId - The user's principal ID
   * @returns {Promise<Object>} - The user profile
   */
  async getUserProfile(principalId) {
    if (!principalId) {
      principalId = await this.getPrincipalId();
    }
    
    if (!principalId) {
      console.warn('[ProxyClient] No principal ID available for profile request');
      return null;
    }
    
    return this.request('/api/profile', { principalId });
  }

  /**
   * Get topics from the proxy server
   * @param {string} principalId - The principal ID to get topics for
   * @returns {Promise<Array>} - The topics from the proxy server
   */
  async getTopics(principalId) {
    try {
      if (!principalId) {
        principalId = await this.getPrincipalId();
      }
      
      const result = await this.request('/api/topics', { principalId });
      
      if (result && Array.isArray(result.topics)) {
        return result.topics;
      }
      
      return [];
    } catch (error) {
      console.error('[ProxyClient] Error getting topics:', error);
      return [];
    }
  }

  /**
   * Register a device
   * @param {string} deviceId - The device ID to register
   * @returns {Promise<Object>} - The result of the registration
   */
  async registerDevice(deviceId) {
    if (!deviceId) {
      deviceId = `extension-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    
    console.log('[ProxyClient] Registering device:', deviceId);
    
    try {
      const payload = {
        deviceId,
        // Additional fields for the proxy server
        principalId: await this.getPrincipalId(),
        timestamp: Math.floor(Date.now() / 1000),
        version: '3.2.17',
        platform: 'extension',
        type: 'device_registration',
        source: 'extension',
        status: 'completed',
        useDirectStorage: true
      };
      
      const result = await this.request('/api/register-device', payload);
      
      // Store the device ID
      await new Promise(resolve => {
        chrome.storage.local.set({ 
          deviceId,
          deviceRegistered: true,
          registrationTime: Date.now()
        }, resolve);
      });
      
      return result;
    } catch (error) {
      console.error('[ProxyClient] Error registering device:', error);
      throw error;
    }
  }

  /**
   * Submit scraped data to the proxy server
   * @param {Object} data - The scraped data to submit
   * @param {boolean} [prioritizeConsumer=false] - Whether to prioritize the consumer canister path
   * @returns {Promise<Object>} - The result of the submission
   */
  async submitScrapedData(data, prioritizeConsumer = false) {
    console.log('[ProxyClient] Submitting scraped data:', {
      url: data.url,
      content: data.content ? `${data.content.substring(0, 50)}...` : 'No content',
      topic: data.topic || data.topicId,
      status: data.status
    });
    
    // Get the principal ID if available
    try {
      const principalId = await this.getPrincipalId();
      if (principalId) {
        console.log('[ProxyClient] Using provided principal ID:', principalId);
        data.principalId = principalId;
      }
    } catch (principalError) {
      console.warn('[ProxyClient] Could not get principal ID:', principalError);
    }
    
    // Ensure data has the required fields
    if (!data.topic && data.topicId) {
      data.topic = data.topicId;
      console.log('[ProxyClient] Using topicId as topic:', data.topic);
    }
    
    if (!data.status) {
      data.status = 'completed';
      console.log('[ProxyClient] Setting default status to "completed"');
    }
    
    // Get device ID if available
    let deviceId;
    try {
      const result = await new Promise(resolve => {
        chrome.storage.local.get(['deviceId'], resolve);
      });
      deviceId = result.deviceId;
    } catch (error) {
      console.warn('[ProxyClient] Could not get device ID:', error);
    }
    
    if (!deviceId) {
      deviceId = `extension-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      console.log('[ProxyClient] Generated new device ID:', deviceId);
    }
    
    // Get principalId if available
    let principalId = data.principalId;
    if (!principalId) {
      try {
        const result = await new Promise(resolve => {
          chrome.storage.local.get(['principalId'], resolve);
        });
        principalId = result.principalId;
      } catch (error) {
        console.warn('[ProxyClient] Could not get principalId:', error);
      }
    }
    
    // Use a default principalId if not available
    if (!principalId) {
      principalId = 'nqkf7-4psg2-xnfiu-ht7if-oghvx-m2gb5-e3ifk-pjtfq-o5wiu-scumu-dqe';
      console.log('[ProxyClient] Using default principalId:', principalId);
    }
    
    // Create the payload
    const payload = {
      ...data,
      deviceId,
      principalId,
      timestamp: Math.floor(Date.now() / 1000),
      source: 'extension',
      useDirectStorage: true,
      forwardToStorage: true
    };
    
    try {
      let endpoint = '/api/submit-data';
      if (prioritizeConsumer) {
        endpoint = '/api/consumer-submit';
      }
      
      console.log(`[ProxyClient] Submitting data to ${endpoint}`);
      const result = await this.request(endpoint, payload);
      
      return {
        success: true,
        message: 'Data submitted successfully',
        result
      };
    } catch (error) {
      console.error('[ProxyClient] Error submitting data:', error);
      return {
        success: false,
        message: `Error submitting data: ${error.message}`,
        error
      };
    }
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
    // Declare timeoutId outside the try block so it's available in catch and finally
    let timeoutId;
    try {
      // Using AbortController to implement timeout since fetch doesn't support timeout option
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${this.proxyUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      if (response.ok) {
        const data = await response.json();
        clearTimeout(timeoutId); // Clean up the timeout
        return data.status === 'ok';
      }
      
      clearTimeout(timeoutId); // Clean up the timeout
      return false;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId); // Clean up the timeout
      console.log('[ProxyClient] Error checking availability:', error);
      return false;
    }
  }
}

// Export a singleton instance
const proxyClient = new ProxyClient();

// Export for modules that use import syntax
export default proxyClient;

// Export the validateAndFormatUrl function for other modules
export { validateAndFormatUrl };
export { ProxyClient };
