/**
 * Content Scraper - Extracts content from web pages based on topic configuration
 */

class ContentScraper {
  constructor() {
    this.scrapingInProgress = false;
  }

  /**
   * Scrape content from a URL based on topic configuration
   */
  async scrapeUrl(url, topic) {
    try {
      console.log(`[ContentScraper] Scraping ${url} for topic ${topic.name}`);
      
      // Create a new tab for scraping
      const tab = await chrome.tabs.create({
        url: url,
        active: false
      });

      // Wait for the page to load
      await this.waitForTabLoad(tab.id);

      // Extract content using topic selectors
      const content = await this.extractContent(tab.id, topic);

      // Close the tab
      await chrome.tabs.remove(tab.id);

      if (!content || content.length < (topic.minContentLength || 100)) {
        console.log(`[ContentScraper] Content too short or empty for ${url}`);
        return null;
      }

      return {
        url: url,
        topicId: topic.id,
        topicName: topic.name,
        content: content,
        title: await this.extractTitle(tab.id, topic),
        timestamp: Date.now(),
        contentLength: content.length
      };
    } catch (error) {
      console.error(`[ContentScraper] Error scraping ${url}:`, error);
      return null;
    }
  }

  /**
   * Wait for tab to finish loading
   */
  async waitForTabLoad(tabId, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkTab = async () => {
        try {
          const tab = await chrome.tabs.get(tabId);
          
          if (tab.status === 'complete') {
            resolve();
          } else if (Date.now() - startTime > timeout) {
            reject(new Error('Tab load timeout'));
          } else {
            setTimeout(checkTab, 500);
          }
        } catch (error) {
          reject(error);
        }
      };
      
      checkTab();
    });
  }

  /**
   * Extract content from a tab using topic selectors
   */
  async extractContent(tabId, topic) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (contentSelectors, excludeSelectors, maxLength) => {
          // Helper function to get text from element
          const getTextContent = (element) => {
            // Clone the element to avoid modifying the original
            const clone = element.cloneNode(true);
            
            // Remove excluded elements from clone
            if (excludeSelectors && excludeSelectors.length > 0) {
              excludeSelectors.forEach(selector => {
                if (selector && selector.trim()) {
                  clone.querySelectorAll(selector).forEach(el => el.remove());
                }
              });
            }
            
            // Remove script and style tags
            clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
            
            // Get text content and clean it up
            let text = clone.textContent || '';
            text = text.replace(/\s+/g, ' ').trim();
            
            return text;
          };
          
          let content = '';
          
          // Try each content selector
          for (const selector of contentSelectors) {
            if (!selector || selector.trim() === '') continue;
            
            try {
              const elements = document.querySelectorAll(selector);
              
              for (const element of elements) {
                const text = getTextContent(element);
                if (text && text.length > 50) { // Minimum text length per element
                  content += text + '\n\n';
                }
              }
              
              if (content.length > 100) {
                break; // Found good content, stop trying other selectors
              }
            } catch (error) {
              console.error(`Error with selector ${selector}:`, error);
            }
          }
          
          // Fallback to body if no content found
          if (content.length < 100) {
            const body = document.body;
            if (body) {
              content = getTextContent(body);
            }
          }
          
          // Trim to max length
          if (maxLength && content.length > maxLength) {
            content = content.substring(0, maxLength);
          }
          
          return content;
        },
        args: [
          topic.contentSelectors || ['article', 'main', '.content', '#content'],
          topic.excludeSelectors || ['nav', 'footer', 'header', '.sidebar', '.ads'],
          topic.maxContentLength || 50000
        ]
      });

      return results[0]?.result || '';
    } catch (error) {
      console.error('[ContentScraper] Error extracting content:', error);
      return '';
    }
  }

  /**
   * Extract title from a tab
   */
  async extractTitle(tabId, topic) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (titleSelectors) => {
          // Try custom title selectors first
          if (titleSelectors && titleSelectors.length > 0) {
            for (const selector of titleSelectors) {
              if (!selector || selector.trim() === '') continue;
              
              try {
                const element = document.querySelector(selector);
                if (element && element.textContent) {
                  return element.textContent.trim();
                }
              } catch (error) {
                console.error(`Error with title selector ${selector}:`, error);
              }
            }
          }
          
          // Fallback to standard title sources
          const h1 = document.querySelector('h1');
          if (h1 && h1.textContent) {
            return h1.textContent.trim();
          }
          
          const title = document.querySelector('title');
          if (title && title.textContent) {
            return title.textContent.trim();
          }
          
          return document.title || 'Untitled';
        },
        args: [topic.titleSelectors || ['h1', 'title', '.title']]
      });

      return results[0]?.result || 'Untitled';
    } catch (error) {
      console.error('[ContentScraper] Error extracting title:', error);
      return 'Untitled';
    }
  }

  /**
   * Process scraped content with AI if configured
   */
  async processWithAI(scrapedData, aiConfig) {
    if (!aiConfig || !aiConfig.enabled) {
      return scrapedData; // Return unchanged if AI is disabled
    }

    try {
      // Get device ID for authentication
      const deviceId = await this.getDeviceId();
      
      // Call the IC proxy AI endpoint
      const response = await fetch('https://ic-proxy.rhinospider.com/api/process-with-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId
        },
        body: JSON.stringify({
          content: scrapedData.content,
          aiConfig: aiConfig
        })
      });

      if (!response.ok) {
        throw new Error(`AI processing failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.ok) {
        console.log('[ContentScraper] AI enhancements received:', result.ok);
        return {
          ...scrapedData,
          aiEnhancements: result.ok
        };
      } else {
        console.error('[ContentScraper] AI processing error:', result.error);
        return scrapedData; // Return original data on error
      }
    } catch (error) {
      console.error('[ContentScraper] Error calling AI service:', error);
      // Fall back to local processing if API call fails
      return this.processWithAILocally(scrapedData, aiConfig);
    }
  }

  /**
   * Get device ID for authentication
   */
  async getDeviceId() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['deviceId'], (result) => {
        resolve(result.deviceId || 'unknown');
      });
    });
  }

  /**
   * Local fallback AI processing (when API is unavailable)
   */
  async processWithAILocally(scrapedData, aiConfig) {
    try {
      const enhancements = {};

      // Only run enabled features locally as fallback
      if (aiConfig.features.summarization) {
        enhancements.summary = await this.generateSummary(scrapedData.content, aiConfig);
      }

      if (aiConfig.features.keywordExtraction) {
        enhancements.keywords = await this.extractKeywords(scrapedData.content, aiConfig);
      }

      if (aiConfig.features.categorization) {
        enhancements.category = await this.categorizeContent(scrapedData.content, aiConfig);
      }

      if (aiConfig.features.sentimentAnalysis) {
        enhancements.sentiment = await this.analyzeSentiment(scrapedData.content, aiConfig);
      }

      return {
        ...scrapedData,
        aiEnhancements: enhancements
      };
    } catch (error) {
      console.error('[ContentScraper] Local AI processing error:', error);
      return scrapedData;
    }
  }

  /**
   * Generate summary using local processing (fallback)
   */
  async generateSummary(content, aiConfig) {
    // Simple local truncation as fallback
    const words = content.split(' ');
    const summaryLength = Math.min(50, words.length);
    return words.slice(0, summaryLength).join(' ') + '...';
  }

  /**
   * Extract keywords using local processing (fallback)
   */
  async extractKeywords(content, aiConfig) {
    // Simple word frequency analysis as fallback
    const words = content.toLowerCase().split(/\s+/);
    const wordCount = {};
    
    words.forEach(word => {
      if (word.length > 4) { // Only count words longer than 4 chars
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
    
    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Categorize content using local processing (fallback)
   */
  async categorizeContent(content, aiConfig) {
    // Simple keyword-based categorization as fallback
    const techKeywords = ['technology', 'software', 'computer', 'internet', 'digital'];
    const businessKeywords = ['business', 'market', 'finance', 'economy', 'company'];
    
    const lowerContent = content.toLowerCase();
    
    const techScore = techKeywords.filter(k => lowerContent.includes(k)).length;
    const businessScore = businessKeywords.filter(k => lowerContent.includes(k)).length;
    
    if (techScore > businessScore) return 'technology';
    if (businessScore > techScore) return 'business';
    return 'general';
  }

  /**
   * Analyze sentiment using local processing (fallback)
   */
  async analyzeSentiment(content, aiConfig) {
    // Simple keyword-based sentiment as fallback
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'poor', 'worst'];
    
    const lowerContent = content.toLowerCase();
    
    const positiveScore = positiveWords.filter(w => lowerContent.includes(w)).length;
    const negativeScore = negativeWords.filter(w => lowerContent.includes(w)).length;
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }
}

export default new ContentScraper();