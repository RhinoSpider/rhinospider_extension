/**
 * Scraping Orchestrator - Coordinates the scraping process
 */

import urlFinder from './url-finder.js';
import contentScraper from './content-scraper.js';
import submissionHelper from './submission-helper.js';
import proxyClient from './proxy-client.js';

class ScrapingOrchestrator {
  constructor() {
    this.isRunning = false;
    this.currentBatch = null;
    this.aiConfig = null;
  }

  /**
   * Initialize the orchestrator
   */
  async initialize(principalId) {
    try {
      // Load scraped URLs from consumer canister
      await urlFinder.loadScrapedUrls(principalId);
      
      // Load AI configuration
      await this.loadAIConfig();
      
      console.log('[ScrapingOrchestrator] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[ScrapingOrchestrator] Initialization error:', error);
      return false;
    }
  }

  /**
   * Load global AI configuration
   */
  async loadAIConfig() {
    try {
      const result = await proxyClient.getGlobalAIConfig();
      if (result && result.ok) {
        this.aiConfig = result.ok;
        console.log('[ScrapingOrchestrator] AI config loaded:', this.aiConfig);
      } else {
        this.aiConfig = null;
        console.log('[ScrapingOrchestrator] No AI config or AI disabled');
      }
    } catch (error) {
      console.error('[ScrapingOrchestrator] Error loading AI config:', error);
      this.aiConfig = null;
    }
  }

  /**
   * Run a scraping batch for active topics
   */
  async runScrapingBatch(topics, principalId) {
    if (this.isRunning) {
      console.log('[ScrapingOrchestrator] Scraping already in progress');
      return { success: false, error: 'Already running' };
    }

    this.isRunning = true;
    const results = {
      success: true,
      scraped: 0,
      failed: 0,
      topics: {}
    };

    try {
      console.log(`[ScrapingOrchestrator] Starting batch for ${topics.length} topics`);
      
      // Filter active topics and sort by priority
      const activeTopics = topics
        .filter(t => t.status === 'active')
        .sort((a, b) => (b.priority || 5) - (a.priority || 5));

      if (activeTopics.length === 0) {
        console.log('[ScrapingOrchestrator] No active topics found');
        return { success: false, error: 'No active topics' };
      }

      // Process each topic
      for (const topic of activeTopics) {
        try {
          const topicResults = await this.scrapeTopicBatch(topic, principalId);
          results.topics[topic.id] = topicResults;
          results.scraped += topicResults.scraped;
          results.failed += topicResults.failed;
        } catch (error) {
          console.error(`[ScrapingOrchestrator] Error scraping topic ${topic.name}:`, error);
          results.failed++;
        }

        // Delay between topics to avoid overwhelming the system
        await this.delay(2000);
      }

      // Update last scrape time
      await chrome.storage.local.set({ lastScrapeTime: Date.now() });
      
      console.log(`[ScrapingOrchestrator] Batch complete: ${results.scraped} scraped, ${results.failed} failed`);
      return results;
    } catch (error) {
      console.error('[ScrapingOrchestrator] Batch error:', error);
      results.success = false;
      results.error = error.message;
      return results;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Scrape a batch of URLs for a specific topic
   */
  async scrapeTopicBatch(topic, principalId) {
    const results = {
      topicId: topic.id,
      topicName: topic.name,
      scraped: 0,
      failed: 0,
      urls: []
    };

    try {
      // Get URLs for this topic
      const urls = await urlFinder.getUrlsForTopic(topic, topic.maxUrlsPerBatch || 10);
      
      if (!urls || urls.length === 0) {
        console.log(`[ScrapingOrchestrator] No URLs found for topic ${topic.name}`);
        return results;
      }

      console.log(`[ScrapingOrchestrator] Processing ${urls.length} URLs for topic ${topic.name}`);

      // Process each URL
      for (const urlData of urls) {
        try {
          // Check if URL was already scraped (double-check)
          if (urlFinder.isUrlScraped(urlData.url)) {
            console.log(`[ScrapingOrchestrator] Skipping already scraped URL: ${urlData.url}`);
            continue;
          }

          // Scrape the content
          const scrapedData = await contentScraper.scrapeUrl(urlData.url, topic);
          
          if (!scrapedData) {
            console.log(`[ScrapingOrchestrator] No content scraped from ${urlData.url}`);
            results.failed++;
            continue;
          }

          // Process with AI if configured
          let processedData = scrapedData;
          if (this.aiConfig && this.aiConfig.enabled) {
            processedData = await contentScraper.processWithAI(scrapedData, this.aiConfig);
          }

          // Submit to storage
          const submitted = await submissionHelper.submitScrapedData({
            ...processedData,
            searchQuery: urlData.searchQuery,
            principalId: principalId
          });

          if (submitted) {
            // Mark URL as scraped
            urlFinder.markUrlAsScraped(urlData.url);
            results.scraped++;
            results.urls.push({
              url: urlData.url,
              status: 'success'
            });
            
            console.log(`[ScrapingOrchestrator] Successfully scraped: ${urlData.url}`);
          } else {
            results.failed++;
            results.urls.push({
              url: urlData.url,
              status: 'failed',
              error: 'Submission failed'
            });
          }

          // Delay between URLs
          await this.delay(3000);
        } catch (error) {
          console.error(`[ScrapingOrchestrator] Error processing URL ${urlData.url}:`, error);
          results.failed++;
          results.urls.push({
            url: urlData.url,
            status: 'failed',
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error(`[ScrapingOrchestrator] Topic batch error for ${topic.name}:`, error);
      results.error = error.message;
      return results;
    }
  }

  /**
   * Stop scraping
   */
  stop() {
    this.isRunning = false;
    console.log('[ScrapingOrchestrator] Scraping stopped');
  }

  /**
   * Helper function to delay execution
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get scraping status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      aiEnabled: this.aiConfig?.enabled || false,
      currentBatch: this.currentBatch
    };
  }

  /**
   * Clear URL cache
   */
  clearCache(topicId = null) {
    urlFinder.clearCache(topicId);
    console.log('[ScrapingOrchestrator] Cache cleared');
  }
}

export default new ScrapingOrchestrator();