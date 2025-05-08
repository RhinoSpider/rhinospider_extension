// submission-helper.js - Helper for submitting scraped data
// This module provides a unified interface for submitting data
// Now prioritizes direct submission to consumer canister via proxy

import proxyClient from './proxy-client';
import directStorageClient from './direct-storage-client';
import { config } from './config';

/**
 * SubmissionHelper class for handling data submissions
 * This class prioritizes direct submission to consumer canister via proxy
 * which then forwards data to the storage canister
 */
class SubmissionHelper {
  /**
   * Submit scraped data to the consumer canister
   * @param {Object} data - The data to submit
   * @returns {Promise<Object>} - The result of the submission
   */
  async submitScrapedData(data) {
    try {
      console.log('[SubmissionHelper] Submitting scraped data');
      
      // Save a backup of the data to local storage
      const backupId = `backup_data_${Date.now()}`;
      try {
        chrome.storage.local.set({ [backupId]: data });
        console.log('[SubmissionHelper] Saved backup of data to local storage:', backupId);
      } catch (storageError) {
        console.warn('[SubmissionHelper] Error saving data backup:', storageError);
      }
      
      // Log the content length for debugging
      if (data.content) {
        console.log('[SubmissionHelper] Content length:', data.content.length);
      }
      
      // Get the principal ID
      let principalId;
      try {
        const result = await new Promise(resolve => {
          chrome.storage.local.get(['principalId'], resolve);
        });
        principalId = result.principalId;
      } catch (error) {
        console.warn('[SubmissionHelper] Could not get principalId:', error);
      }
      
      if (!principalId) {
        principalId = 'nqkf7-4psg2-xnfiu-ht7if-oghvx-m2gb5-e3ifk-pjtfq-o5wiu-scumu-dqe';
        console.log('[SubmissionHelper] Using default principalId:', principalId);
      }
      
      // CRITICAL: Ensure we have a valid topicId - this is required by the proxy server
      // If topicId is missing or generic, replace it with a real topic ID
      if (!data.topicId || data.topicId === 'test') {
        // First try to use the topic field if it looks like a valid topic ID
        if (data.topic && data.topic.startsWith('topic_')) {
          data.topicId = data.topic;
          console.log('[SubmissionHelper] Using topic as topicId:', data.topicId);
        } else {
          // Otherwise use a known valid topic ID
          data.topicId = 'topic_t7wkl7zyb'; // Real topic ID from admin app
          console.log('[SubmissionHelper] Using default topic ID:', data.topicId);
        }
      }
      
      // Ensure topic field matches topicId for consistency
      // This is not required by the proxy but helps with debugging
      if (data.topicId && (!data.topic || data.topic === 'test')) {
        data.topic = data.topicId;
        console.log('[SubmissionHelper] Setting topic to match topicId:', data.topic);
      }
      
      // Prepare the enhanced data with all required fields
      const enhancedData = {
        ...data,
        principalId: principalId,
        storageCanisterId: config.canisters.storage || 'nwy3f-jyaaa-aaaao-a4htq-cai',
        forwardToStorage: true,
        storeInConsumer: true
      };
      
      console.log('[SubmissionHelper] Submitting directly to consumer canister via proxy...');
      console.log('[SubmissionHelper] Data format:', {
        id: enhancedData.id,
        url: enhancedData.url,
        topic: enhancedData.topic,
        topicId: enhancedData.topicId,
        principalId: enhancedData.principalId,
        storageCanisterId: enhancedData.storageCanisterId
      });
      
      // Submit directly to the consumer-submit endpoint
      const result = await proxyClient.request('/api/consumer-submit', enhancedData);
      console.log('[SubmissionHelper] Consumer submission result:', result);
      
      if (result && (result.success || result.ok)) {
        console.log('[SubmissionHelper] Consumer submission SUCCESSFUL!');
        return result;
      } else {
        console.warn('[SubmissionHelper] Consumer submission FAILED:', result);
        return { error: 'Consumer submission failed', details: result };
      }
    } catch (error) {
      console.error('[SubmissionHelper] Error submitting data:', error);
      return { error: 'Submission failed', message: error.message };
    }
  }
  
  /**
   * Check if any submission method is available
   * @returns {Promise<boolean>} - True if any method is available
   */
  async isAnyMethodAvailable() {
    try {
      // Check if proxy client is available
      try {
        const proxyAvailable = await proxyClient.isAvailable();
        if (proxyAvailable) {
          console.log('[SubmissionHelper] Proxy client is available');
          return true;
        }
      } catch (error) {
        console.error('[SubmissionHelper] Proxy client not available:', error);
      }
      
      console.warn('[SubmissionHelper] No submission methods available');
      return false;
    } catch (error) {
      console.error('[SubmissionHelper] Error checking method availability:', error);
      return false;
    }
  }
}

// Export a singleton instance
const submissionHelper = new SubmissionHelper();
export default submissionHelper;
