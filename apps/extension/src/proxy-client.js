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
   * @param {string} endpoint - The endpoint to request
   * @param {Object} data - The data to send
   * @returns {Promise<Object>} - The response from the proxy server
   */
  async request(endpoint, data) {
    console.log(`[ProxyClient] Making request to ${endpoint}`, {
      proxyUrl: this.proxyUrl,
      dataKeys: Object.keys(data || {})
    });
    
    try {
      const fullUrl = `${this.proxyUrl}${endpoint}`;
      console.log(`[ProxyClient] Full URL: ${fullUrl}`);
      
      // Set timeout for fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch(fullUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': this.apiPassword ? `Bearer ${this.apiPassword}` : undefined
          },
          body: JSON.stringify(data || {}),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log(`[ProxyClient] Response status:`, response.status);
        
        if (!response.ok) {
          console.warn(`[ProxyClient] Error response: ${response.status} ${response.statusText}`);
          
          try {
            const errorText = await response.text();
            console.warn(`[ProxyClient] Error details:`, errorText);
            
            // Special handling for specific endpoints
            if (endpoint === '/api/topics') {
              console.warn('[ProxyClient] Returning empty topics array due to error');
              return { topics: [] };
            } else if (endpoint === '/api/profile') {
              console.warn('[ProxyClient] Returning null profile due to error');
              return { ok: null };
            }
            
            throw new Error(`HTTP error ${response.status}: ${errorText}`);
          } catch (textError) {
            // Special handling for specific endpoints
            if (endpoint === '/api/topics') {
              console.warn('[ProxyClient] Returning empty topics array due to error');
              return { topics: [] };
            } else if (endpoint === '/api/profile') {
              console.warn('[ProxyClient] Returning null profile due to error');
              return { ok: null };
            }
            
            throw new Error(`HTTP error ${response.status}`);
          }
        }
        
        try {
          const responseData = await response.json();
          console.log(`[ProxyClient] Response data:`, responseData);
          return responseData;
        } catch (jsonError) {
          console.warn(`[ProxyClient] Error parsing JSON:`, jsonError);
          
          // Try to get text response
          try {
            const textResponse = await response.text();
            console.log(`[ProxyClient] Text response:`, textResponse);
            return { ok: textResponse };
          } catch (textError) {
            console.warn(`[ProxyClient] Error getting text response:`, textError);
            
            // Special handling for getTopics endpoint
            if (endpoint === '/api/topics') {
              return { topics: [] };
            }
            
            throw new Error('Failed to parse response');
          }
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      // Network errors or timeouts
      console.warn(`[ProxyClient] Request error:`, error);
      
      // Special handling for specific endpoints
      if (endpoint === '/api/topics') {
        console.warn('[ProxyClient] Returning empty topics array due to network error');
        return { topics: [] };
      } else if (endpoint === '/api/profile') {
        console.warn('[ProxyClient] Returning null profile due to network error');
        return { ok: null };
      }
      
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
    
    try {
      const response = await this.request('/api/profile', { principalId });
      
      // Fix for null principal ID in response
      if (response && response.ok && response.ok.principal === null && principalId) {
        console.log('[ProxyClient] Fixing null principal ID in response with:', principalId);
        response.ok.principal = principalId;
      }
      
      return response;
    } catch (error) {
      console.error('[ProxyClient] Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Get topics from the proxy server
   * @param {string} principalId - The principal ID to get topics for
   * @returns {Promise<Array>} - The topics from the proxy server
   */
  async getTopics(principalId) {
    console.log('[ProxyClient] Getting topics with principalId:', principalId);
    console.log('[ProxyClient] Fetching topics from server');
    
    try {
      // Make the API call to get topics
      const result = await this.request('/api/topics', { principalId });
      
      // Log the raw response for debugging
      console.log('[ProxyClient] Raw topics result:', JSON.stringify(result));
      
      // Check if we have topics in the result.ok format
      if (result && result.ok && Array.isArray(result.ok)) {
        console.log('[ProxyClient] Got topics in result.ok format:', result.ok.length);
        
        // Log each topic for debugging
        result.ok.forEach((topic, index) => {
          console.log(`[ProxyClient] Topic ${index + 1}:`, {
            id: topic.id,
            name: topic.name,
            status: topic.status,
            urlPatternsCount: topic.urlPatterns ? topic.urlPatterns.length : 0,
            // Log full details for the first topic to avoid excessive logs
            ...(index === 0 ? {
              urlPatterns: topic.urlPatterns,
              extractionRules: topic.extractionRules,
              aiConfig: topic.aiConfig
            } : {})
          });
        });
        
        return result.ok;
      } 
      // Check if we have topics as a direct array
      else if (result && Array.isArray(result)) {
        console.log('[ProxyClient] Got topics as direct array:', result.length);
        
        // Log each topic for debugging
        result.forEach((topic, index) => {
          console.log(`[ProxyClient] Topic ${index + 1}:`, {
            id: topic.id,
            name: topic.name,
            status: topic.status,
            urlPatternsCount: topic.urlPatterns ? topic.urlPatterns.length : 0,
            // Log full details for the first topic to avoid excessive logs
            ...(index === 0 ? {
              urlPatterns: topic.urlPatterns,
              extractionRules: topic.extractionRules,
              aiConfig: topic.aiConfig
            } : {})
          });
        });
        
        return result;
      } 
      // No valid topics found
      else {
        console.error('[ProxyClient] No valid topics found in response:', result);
        return [];
      }
    } catch (error) {
      console.error('[ProxyClient] Error getting topics:', error);
      return [];
    }
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
   * Submit scraped data to the proxy server
   * @param {Object} data - The scraped data to submit
   * @returns {Promise<Object>} - The response from the proxy server
   */
  async submitScrapedData(data) {
    console.log('[ProxyClient] Submitting scraped data:', data);
    
    // Ensure principalId is included
    if (!data.principalId) {
      // Try to get it from storage
      try {
        const result = await new Promise(resolve => {
          chrome.storage.local.get(['principalId'], resolve);
        });
        
        if (result.principalId) {
          data.principalId = result.principalId;
        } else {
          console.log('[ProxyClient] No principal ID found for submission');
        }
      } catch (error) {
        console.log('[ProxyClient] Error getting principal ID from storage:', error);
      }
    }
    
    // Try each endpoint in sequence
    const endpoints = [
      '/api/submit',
      '/api/submit-data',
      '/api/scrape-submit',
      '/api/submit-scraped-content',
      '/api/content'
    ];
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`[ProxyClient] Trying ${endpoint} endpoint`);
        const result = await this.request(endpoint, data);
        console.log(`[ProxyClient] ${endpoint} result:`, result);
        return result;
      } catch (error) {
        console.log(`[ProxyClient] Error with ${endpoint} endpoint:`, error);
        lastError = error;
      }
    }
    
    // If we get here, all endpoints failed
    console.log('[ProxyClient] All submission endpoints failed');
    throw new Error(`All submission endpoints failed. Last error: ${lastError?.message || 'Unknown error'}`);
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

// Also export the class for direct instantiation
export { ProxyClient };
