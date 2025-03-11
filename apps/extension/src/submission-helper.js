// submission-helper.js - Helper for submitting scraped data
// This module provides a unified interface for submitting data through the consumer canister

import proxyClient from './proxy-client';

/**
 * SubmissionHelper class for handling data submissions
 * This class follows the RhinoSpider architecture pattern where all data flows through the consumer canister
 */
class SubmissionHelper {
  /**
   * Submit scraped data using the proxy client to follow proper architecture
   * @param {Object} data - The scraped data to submit
   * @returns {Promise<Object>} - The submission result
   */
  async submitScrapedData(data) {
    console.log('[SubmissionHelper] Submitting scraped data via consumer canister');
    
    // Save a copy of the data to local storage as a backup
    try {
      const backupKey = `backup_data_${Date.now()}`;
      chrome.storage.local.set({ [backupKey]: data }, () => {
        console.log('[SubmissionHelper] Saved backup of data to local storage:', backupKey);
      });
    } catch (backupError) {
      console.error('[SubmissionHelper] Failed to save backup:', backupError);
    }
    
    // Ensure the data has content field
    if (!data.content || data.content.trim() === '') {
      console.log('[SubmissionHelper] Adding placeholder content to data');
      data.content = 'Placeholder content for required field';
    }
    
    // Use the proxy client with consumer canister priority
    try {
      console.log('[SubmissionHelper] Submitting via proxy client to consumer canister...');
      const proxyResult = await proxyClient.submitScrapedData(data, true); // true = prioritize consumer canister
      
      console.log('[SubmissionHelper] Proxy client submission result:', proxyResult);
      
      if (proxyResult && (proxyResult.ok || proxyResult.success)) {
        console.log('[SubmissionHelper] Proxy client submission SUCCESSFUL!');
        
        // Record this successful submission
        try {
          const submissionRecord = {
            method: 'proxy_client_consumer',
            id: `proxy_${Date.now()}`,
            timestamp: Date.now(),
            url: data.url,
            topic: data.topic || data.topicId,
            hasAuthError: false
          };
          
          chrome.storage.local.get(['submissionRecords'], (result) => {
            const records = result.submissionRecords || [];
            records.push(submissionRecord);
            chrome.storage.local.set({ submissionRecords: records.slice(-100) }); // Keep last 100
          });
        } catch (recordError) {
          console.error('[SubmissionHelper] Failed to record submission:', recordError);
        }
        
        return proxyResult;
      }
    } catch (proxyError) {
      console.error('[SubmissionHelper] Error with proxy client submission:', proxyError);
    }
    
    // If proxy client failed, retry with backoff
    try {
      console.log('[SubmissionHelper] Retrying proxy client submission with backoff...');
      
      // Wait 2 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const retryResult = await proxyClient.submitScrapedData(data, true);
      console.log('[SubmissionHelper] Proxy client retry result:', retryResult);
      
      if (retryResult && (retryResult.ok || retryResult.success)) {
        console.log('[SubmissionHelper] Proxy client retry SUCCESSFUL!');
        
        // Record this successful submission
        try {
          const submissionRecord = {
            method: 'proxy_client_retry',
            id: `proxy_retry_${Date.now()}`,
            timestamp: Date.now(),
            url: data.url,
            topic: data.topic || data.topicId,
            hasAuthError: false
          };
          
          chrome.storage.local.get(['submissionRecords'], (result) => {
            const records = result.submissionRecords || [];
            records.push(submissionRecord);
            chrome.storage.local.set({ submissionRecords: records.slice(-100) }); // Keep last 100
          });
        } catch (recordError) {
          console.error('[SubmissionHelper] Failed to record submission:', recordError);
        }
        
        return retryResult;
      }
    } catch (retryError) {
      console.error('[SubmissionHelper] Error with proxy client retry:', retryError);
    }
    
    // If all attempts failed, return a failure result
    return {
      err: {
        SubmissionFailed: 'All submission attempts failed',
        details: 'Could not submit data through consumer canister'
      }
    };
  }
  
  /**
   * Check if submission service is available
   * @returns {Promise<boolean>} - True if the proxy client is available
   */
  async isAnyMethodAvailable() {
    try {
      // Check if proxy client is available
      const proxyAvailable = await proxyClient.isAvailable();
      
      if (proxyAvailable) {
        console.log('[SubmissionHelper] Proxy client is available');
        return true;
      }
      
      console.log('[SubmissionHelper] Proxy client is not available');
      return false;
    } catch (error) {
      console.log('[SubmissionHelper] Error checking availability:', error);
      return false;
    }
  }
  
  /**
   * Check if submission service is available
   * @returns {Promise<Object>} - Object with availability status
   */
  async checkAvailability() {
    console.log('[SubmissionHelper] Checking availability of submission service');
    
    const result = {
      proxy: false,
      anyAvailable: false
    };
    
    try {
      // Check proxy client
      const proxyAvailable = await proxyClient.isAvailable();
      result.proxy = proxyAvailable;
      
      // Set anyAvailable flag
      result.anyAvailable = result.proxy;
      
      console.log('[SubmissionHelper] Availability check results:', result);
    } catch (error) {
      console.error('[SubmissionHelper] Error checking availability:', error);
    }
    
    return result;
  }
}

// Export a singleton instance
const submissionHelper = new SubmissionHelper();
export default submissionHelper;
