// submission-helper.js - Helper for submitting scraped data
// This module provides a unified interface for submitting data through both
// the regular proxy client and the direct storage client

import proxyClient from './proxy-client';
import directStorageClient from './direct-storage-client';

/**
 * SubmissionHelper class for handling data submissions
 * This class tries multiple submission methods to ensure data is saved
 */
class SubmissionHelper {
  /**
   * Submit scraped data using all available methods
   * @param {Object} data - The scraped data to submit
   * @returns {Promise<Object>} - The submission result
   */
  async submitScrapedData(data) {
    console.log('[SubmissionHelper] Submitting scraped data with multiple methods:', data);
    
    // First try the direct storage client
    try {
      console.log('[SubmissionHelper] Trying direct storage submission first...');
      const directResult = await directStorageClient.submitScrapedData(data);
      
      console.log('[SubmissionHelper] Direct storage submission result:', directResult);
      
      // Check if the submission was successful
      if (directResult && directResult.ok && !directResult.ok.fallback) {
        console.log('[SubmissionHelper] Direct storage submission successful!');
        return directResult;
      }
      
      console.log('[SubmissionHelper] Direct storage submission failed or returned fallback, trying proxy client...');
    } catch (directError) {
      console.log('[SubmissionHelper] Error with direct storage submission:', directError);
      console.log('[SubmissionHelper] Falling back to proxy client...');
    }
    
    // If direct storage failed, try the regular proxy client
    try {
      console.log('[SubmissionHelper] Trying proxy client submission...');
      const proxyResult = await proxyClient.submitScrapedData(data);
      
      console.log('[SubmissionHelper] Proxy client submission result:', proxyResult);
      return proxyResult;
    } catch (proxyError) {
      console.log('[SubmissionHelper] Error with proxy client submission:', proxyError);
      
      // If both methods failed, return a failure result
      return {
        err: {
          SubmissionFailed: 'All submission methods failed',
          directError: directError?.message,
          proxyError: proxyError?.message
        }
      };
    }
  }
  
  /**
   * Check if any submission method is available
   * @returns {Promise<boolean>} - True if at least one method is available
   */
  async isAnyMethodAvailable() {
    try {
      // Check if direct storage client is available
      const directAvailable = await directStorageClient.isAvailable();
      
      if (directAvailable) {
        console.log('[SubmissionHelper] Direct storage client is available');
        return true;
      }
      
      // Check if proxy client is available
      const proxyAvailable = await proxyClient.isAvailable();
      
      if (proxyAvailable) {
        console.log('[SubmissionHelper] Proxy client is available');
        return true;
      }
      
      console.log('[SubmissionHelper] No submission methods are available');
      return false;
    } catch (error) {
      console.log('[SubmissionHelper] Error checking availability:', error);
      return false;
    }
  }
}

// Export a singleton instance
const submissionHelper = new SubmissionHelper();
export default submissionHelper;
