// direct-storage-client.js - Client for direct storage submissions
// This is an enhancement to the proxy-client.js that adds support for direct storage submissions
import { config } from './config';

// Get direct storage URL from config with fallback
// Using the correct port 3002 for direct storage API
const DIRECT_STORAGE_URL = config.directStorage.url || 'http://143.244.133.154:3002';

// API Password for authentication from config
const API_PASSWORD = config.directStorage.apiPassword || 'ffGpA2saNS47qr';

/**
 * DirectStorageClient class for submitting data directly to the storage canister
 * This is a standalone client that doesn't modify the existing proxy-client.js
 */
class DirectStorageClient {
  /**
   * Create a new DirectStorageClient
   * @param {string} proxyUrl - URL of the proxy server
   * @param {string} apiPassword - API password for authentication
   */
  constructor({ directStorageUrl, apiPassword } = {}) {
    this.directStorageUrl = directStorageUrl || DIRECT_STORAGE_URL;
    this.apiPassword = apiPassword || API_PASSWORD;
    
    // Validate URL
    if (!this.directStorageUrl) {
      console.error('[DirectStorageClient] No direct storage URL provided. Using fallback URL.');
      this.directStorageUrl = 'http://143.244.133.154:3002';
    }
    
    console.log('[DirectStorageClient] Initialized with direct storage URL:', this.directStorageUrl);
  }

  /**
   * Submit scraped data directly to the storage canister
   * @param {Object} data - The scraped data to submit
   * @returns {Promise<Object>} - The response from the direct storage endpoint
   */
  async submitScrapedData(data) {
    console.log('[DirectStorageClient] Submitting scraped data directly to storage:', data);
    
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
          console.log('[DirectStorageClient] No principal ID found for submission');
        }
      } catch (error) {
        console.log('[DirectStorageClient] Error getting principal ID from storage:', error);
      }
    }
    
    // Generate a device ID that will be consistent for this extension instance
    let deviceId;
    try {
      // Try to get a stored device ID first
      const storedDeviceId = await new Promise(resolve => {
        chrome.storage.local.get(['deviceId'], resolve);
      });
      
      if (storedDeviceId && storedDeviceId.deviceId) {
        deviceId = storedDeviceId.deviceId;
        console.log('[DirectStorageClient] Using stored device ID:', deviceId);
      } else {
        // Generate a new device ID if none exists
        deviceId = `extension-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        // Store it for future use
        await chrome.storage.local.set({ deviceId });
        console.log('[DirectStorageClient] Generated and stored new device ID:', deviceId);
      }
    } catch (error) {
      // Fallback if storage access fails
      deviceId = `extension-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      console.log('[DirectStorageClient] Generated fallback device ID:', deviceId);
    }
    
    // Add the device ID to the data payload
    data.deviceId = deviceId;
    
    // Make a direct request to the direct-submit endpoint
    try {
      console.log(`[DirectStorageClient] Making direct submission request`);
      
      // Validate URL before making request
      if (!this.directStorageUrl) {
        throw new Error('Direct storage URL is undefined');
      }
      
      // Make sure we're using the correct endpoint
      const fullUrl = `${this.directStorageUrl}/api/direct-submit`;
      console.log(`[DirectStorageClient] Submitting to URL: ${fullUrl}`);
      
      // Create an enhanced payload with all possible fields that might be needed
      const enhancedPayload = {
        ...data,
        // Add all fields that might be required by the storage canister
        source: 'extension',
        timestamp: Date.now(),
        status: 'completed',
        scraping_time: data.scraping_time || 500,
        // Ensure we have the correct field names
        topicId: data.topicId || data.topic,
        topic: data.topic || data.topicId,
        // Add device information
        deviceId,
        client_id: data.principalId || null,
        // Add any extracted data if available
        extractedData: data.extractedData || {}
      };
      
      // Ensure content is properly formatted
      if (enhancedPayload.content && typeof enhancedPayload.content === 'string') {
        // Limit content size to prevent issues
        enhancedPayload.content = enhancedPayload.content.substring(0, 10000);
      }
      
      console.log('[DirectStorageClient] Submitting with payload containing fields:', Object.keys(enhancedPayload).join(', '));
      
      // Add retry logic for submission
      let retries = 0;
      const maxRetries = 3;
      let lastResult = null;
      
      // Save the data to local storage as a backup
      try {
        const storageKey = `submitted_data_${Date.now()}`;
        chrome.storage.local.set({ [storageKey]: enhancedPayload }, () => {
          console.log('[DirectStorageClient] Saved submission data to local storage as backup:', storageKey);
        });
      } catch (storageError) {
        console.error('[DirectStorageClient] Failed to save backup to local storage:', storageError);
      }
      
      while (retries < maxRetries) {
        try {
          console.log('[DirectStorageClient] Making submission attempt', retries + 1, 'to URL:', fullUrl);
          
          const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiPassword}`,
              'X-Device-ID': deviceId,
              'Accept': 'application/json'
            },
            body: JSON.stringify(enhancedPayload)
          });
          
          // Log the actual response status
          console.log(`[DirectStorageClient] Response status: ${response.status} ${response.statusText}`);
          
          // Check content type to handle HTML responses
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            // Parse the response as JSON
            lastResult = await response.json();
            console.log(`[DirectStorageClient] Submission attempt ${retries + 1} response:`, lastResult);
            
            // Check if we got a success response (ok field exists)
            if (lastResult && lastResult.ok) {
              // Verify the response contains expected fields that indicate actual success
              if (lastResult.ok.dataSubmitted === true && lastResult.ok.submissionId) {
                console.log('[DirectStorageClient] Submission confirmed successful with ID:', lastResult.ok.submissionId);
                
                // Check if there was a NotAuthorized error in the result
                if (lastResult.ok.result && lastResult.ok.result.err && lastResult.ok.result.err.NotAuthorized !== undefined) {
                  console.warn('[DirectStorageClient] ⚠️ Server returned NotAuthorized error but marked as success');
                  console.warn('[DirectStorageClient] ⚠️ Data may not be saved to the canister');
                  console.warn('[DirectStorageClient] ⚠️ This may be why data is not appearing in admin interface');
                  
                  // Store this information for debugging
                  chrome.storage.local.set({
                    lastNotAuthorizedError: {
                      timestamp: Date.now(),
                      submissionId: lastResult.ok.submissionId,
                      principalId: enhancedPayload.principalId
                    }
                  });
                }
                
                // Record this successful submission
                try {
                  chrome.storage.local.get(['successfulSubmissions'], (result) => {
                    const submissions = result.successfulSubmissions || [];
                    submissions.push({
                      id: lastResult.ok.submissionId,
                      timestamp: Date.now(),
                      url: enhancedPayload.url,
                      topic: enhancedPayload.topic,
                      hasAuthError: lastResult.ok.result && lastResult.ok.result.err && lastResult.ok.result.err.NotAuthorized !== undefined
                    });
                    chrome.storage.local.set({ successfulSubmissions: submissions.slice(-50) }); // Keep last 50
                  });
                } catch (storageError) {
                  console.error('[DirectStorageClient] Failed to record successful submission:', storageError);
                }
                
                return lastResult;
              } else {
                console.warn('[DirectStorageClient] Response has ok field but may not indicate true success:', lastResult.ok);
              }
            }
          } else {
            // Handle HTML or other non-JSON responses
            const text = await response.text();
            console.error(`[DirectStorageClient] Received non-JSON response with content-type: ${contentType}`);
            console.error(`[DirectStorageClient] Response starts with: ${text.substring(0, 100)}...`);
            throw new Error(`Received non-JSON response with content-type: ${contentType}`);
          }
          
          // If we got a NotAuthorized error, log it clearly and return the actual error
          if (lastResult && lastResult.err && lastResult.err.NotAuthorized !== undefined) {
            console.log('[DirectStorageClient] Server returned NotAuthorized - this is an actual error that needs to be fixed');
            console.log('[DirectStorageClient] Please add this principal ID to the authorized users list in the admin app');
            return lastResult; // Return the actual error so it can be properly handled
          }
          
          // If we get here, the submission failed but we'll retry
          retries++;
          if (retries < maxRetries) {
            console.log(`[DirectStorageClient] Retrying submission (${retries}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Wait before retrying
          }
        } catch (retryError) {
          console.log(`[DirectStorageClient] Error during retry ${retries + 1}:`, retryError);
          retries++;
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Wait before retrying
          }
        }
      }
      
      // If we've exhausted all retries, return the last result or a fallback
      if (lastResult) {
        console.log('[DirectStorageClient] All retries failed, returning last result');
        return lastResult;
      }
      
      // Fallback response if everything fails
      return {
        ok: {
          dataSubmitted: false,
          error: 'All submission attempts failed',
          fallback: true
        }
      };
    } catch (error) {
      console.log('[DirectStorageClient] Error with direct submission:', error);
      
      // Return a fallback response
      return {
        ok: {
          dataSubmitted: false,
          error: error.message || String(error),
          fallback: true
        }
      };
    }
  }

  /**
   * Fetch data from the storage canister by URL
   * @param {string} url - The URL to fetch data for
   * @returns {Promise<Object>} - The fetched data or error
   */
  async fetchData(url) {
    console.log(`[DirectStorageClient] Fetching data for URL: ${url}`);
    
    if (!url) {
      console.log('[DirectStorageClient] No URL provided for fetch');
      return { err: { message: 'No URL provided' } };
    }
    
    try {
      // Make a direct request to the fetch-data endpoint
      const fullUrl = `${this.directStorageUrl}/api/fetch-data?url=${encodeURIComponent(url)}`;
      
      console.log(`[DirectStorageClient] Making fetch request to: ${fullUrl}`);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiPassword}`
        }
      });
      
      if (!response.ok) {
        console.log(`[DirectStorageClient] Fetch response not OK: ${response.status}`);
        return { err: { message: `HTTP error: ${response.status}` } };
      }
      
      const data = await response.json();
      console.log('[DirectStorageClient] Fetch response:', data);
      
      return data;
    } catch (error) {
      console.log('[DirectStorageClient] Error fetching data:', error);
      return { err: { message: error.message || String(error) } };
    }
  }
  
  /**
   * Check if the direct storage endpoint is available
   * @returns {Promise<boolean>} - True if the endpoint is available, false otherwise
   */
  async isAvailable() {
    try {
      // Check if the direct storage server is available first
      const response = await fetch(`${this.directStorageUrl}/api/health`, {
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
      console.log('[DirectStorageClient] Error checking availability:', error);
      return false;
    }
  }
}

// Export a singleton instance
const directStorageClient = new DirectStorageClient();
export default directStorageClient;

// Also export the class for direct instantiation
export { DirectStorageClient };
