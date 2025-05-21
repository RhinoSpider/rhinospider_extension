/**
 * Submission Helper
 * 
 * This module helps with submitting scraped data to the IC.
 */

import proxyClient from './proxy-client';
import directStorageClient from './direct-storage-client';
import config from './config';

/**
 * Submission Helper
 */
class SubmissionHelper {
  constructor() {
    this.proxyClient = proxyClient;
    this.directStorageClient = directStorageClient;
    this.config = config;
  }

  /**
   * Submit scraped data to the IC
   * @param {Object} data Scraped data
   * @returns {Promise<Object>} Result
   */
  async submitScrapedData(data) {
    try {
      // Try direct storage client first if available
      if (await this.directStorageClient.isAvailable()) {
        console.log('Using direct storage client to submit data');
        return await this.directStorageClient.submitScrapedData(data);
      }
      
      // Fall back to proxy client
      console.log('Using proxy client to submit data');
      return await this.proxyClient.submitScrapedData(data);
    } catch (error) {
      console.error('Error submitting scraped data:', error);
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
      return await this.proxyClient.getProfile(principalId);
    } catch (error) {
      console.error('Error getting profile:', error);
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
      return await this.proxyClient.getTopics(principalId);
    } catch (error) {
      console.error('Error getting topics:', error);
      throw error;
    }
  }
}

export default new SubmissionHelper();
