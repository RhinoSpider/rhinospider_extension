/**
 * URL Finder - Finds URLs based on topic search queries
 * Replaces the old pattern-based URL generation with search-based discovery
 */

import searchProxyClient from './search-proxy-client.js';
import config from './config.js';

class URLFinder {
  constructor() {
    this.urlCache = new Map(); // Cache URLs per topic
    this.lastSearchTime = new Map(); // Track last search time per topic
    this.CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
    this.scrapedUrls = new Set(); // Track scraped URLs locally
  }

  /**
   * Load scraped URLs from consumer canister
   */
  async loadScrapedUrls(principalId) {
    try {
      const response = await fetch(`${config.apiUrl}/api/user/scraped-urls`, {
        headers: {
          'Authorization': `Bearer ${principalId}`
        }
      });
      
      if (response.ok) {
        const urls = await response.json();
        this.scrapedUrls = new Set(urls);
      }
    } catch (error) {
      console.error('[URLFinder] Error loading scraped URLs:', error);
    }
  }

  /**
   * Check if a URL has already been scraped
   */
  isUrlScraped(url) {
    return this.scrapedUrls.has(url);
  }

  /**
   * Mark URL as scraped
   */
  markUrlAsScraped(url) {
    this.scrapedUrls.add(url);
  }

  /**
   * Get URLs for a specific topic using search queries
   */
  async getUrlsForTopic(topic, limit = 10) {
    try {
      console.log(`[URLFinder] Getting URLs for topic: ${topic.name}`);
      
      // Check cache first
      const cacheKey = topic.id;
      const cachedData = this.urlCache.get(cacheKey);
      const lastSearch = this.lastSearchTime.get(cacheKey);
      
      if (cachedData && lastSearch && (Date.now() - lastSearch < this.CACHE_DURATION)) {
        console.log(`[URLFinder] Using cached URLs for topic ${topic.name}`);
        return cachedData.filter(url => !this.isUrlScraped(url.url)).slice(0, limit);
      }

      // Collect all URLs from all search queries
      const allUrls = [];
      const seenUrls = new Set();

      // Search using each query
      for (const query of topic.searchQueries || []) {
        if (!query || query.trim() === '') continue;
        
        console.log(`[URLFinder] Searching for: "${query}"`);
        
        // Search with preferred domains if specified
        if (topic.preferredDomains && topic.preferredDomains.length > 0) {
          for (const domain of topic.preferredDomains) {
            if (!domain || domain.trim() === '') continue;
            
            const results = await searchProxyClient.search(query, limit, domain);
            for (const result of results) {
              if (!seenUrls.has(result.url) && this.isUrlValid(result, topic)) {
                seenUrls.add(result.url);
                allUrls.push({
                  url: result.url,
                  title: result.title || '',
                  description: result.description || '',
                  topicId: topic.id,
                  searchQuery: query,
                  domain: domain,
                  score: this.calculateRelevanceScore(result, topic)
                });
              }
            }
          }
        } else {
          // Search without domain restriction
          const results = await searchProxyClient.search(query, limit * 2); // Get more results to filter
          for (const result of results) {
            if (!seenUrls.has(result.url) && this.isUrlValid(result, topic)) {
              seenUrls.add(result.url);
              allUrls.push({
                url: result.url,
                title: result.title || '',
                description: result.description || '',
                topicId: topic.id,
                searchQuery: query,
                score: this.calculateRelevanceScore(result, topic)
              });
            }
          }
        }
      }

      // Sort by relevance score
      allUrls.sort((a, b) => b.score - a.score);

      // Cache the results
      this.urlCache.set(cacheKey, allUrls);
      this.lastSearchTime.set(cacheKey, Date.now());

      // Filter out already scraped URLs and return requested limit
      const newUrls = allUrls.filter(url => !this.isUrlScraped(url.url));
      console.log(`[URLFinder] Found ${newUrls.length} new URLs for topic ${topic.name}`);
      
      return newUrls.slice(0, limit);
    } catch (error) {
      console.error(`[URLFinder] Error getting URLs for topic ${topic.name}:`, error);
      return [];
    }
  }

  /**
   * Check if a URL is valid for a topic
   */
  isUrlValid(result, topic) {
    const url = result.url.toLowerCase();
    const title = (result.title || '').toLowerCase();
    const description = (result.description || '').toLowerCase();
    const content = `${url} ${title} ${description}`;

    // Check exclude domains
    if (topic.excludeDomains) {
      for (const excludeDomain of topic.excludeDomains) {
        if (excludeDomain && url.includes(excludeDomain.toLowerCase())) {
          return false;
        }
      }
    }

    // Check required keywords
    if (topic.requiredKeywords && topic.requiredKeywords.length > 0) {
      const hasRequiredKeyword = topic.requiredKeywords.some(keyword => 
        keyword && content.includes(keyword.toLowerCase())
      );
      if (!hasRequiredKeyword) {
        return false;
      }
    }

    // Check exclude keywords
    if (topic.excludeKeywords) {
      for (const excludeKeyword of topic.excludeKeywords) {
        if (excludeKeyword && content.includes(excludeKeyword.toLowerCase())) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Calculate relevance score for a search result
   */
  calculateRelevanceScore(result, topic) {
    let score = 0;
    const url = result.url.toLowerCase();
    const title = (result.title || '').toLowerCase();
    const description = (result.description || '').toLowerCase();

    // Boost score for preferred domains
    if (topic.preferredDomains) {
      for (const domain of topic.preferredDomains) {
        if (domain && url.includes(domain.toLowerCase())) {
          score += 10;
          break;
        }
      }
    }

    // Boost score for required keywords in title
    if (topic.requiredKeywords) {
      for (const keyword of topic.requiredKeywords) {
        if (keyword) {
          const kw = keyword.toLowerCase();
          if (title.includes(kw)) score += 5;
          if (description.includes(kw)) score += 2;
          if (url.includes(kw)) score += 1;
        }
      }
    }

    // Boost score based on topic priority
    score += topic.priority || 0;

    return score;
  }

  /**
   * Get URLs for multiple topics
   */
  async getUrlsForTopics(topics, urlsPerTopic = 5) {
    const results = {};
    
    for (const topic of topics) {
      if (topic.status !== 'active') continue;
      
      const urls = await this.getUrlsForTopic(topic, urlsPerTopic);
      if (urls && urls.length > 0) {
        results[topic.id] = urls;
      }
    }
    
    return results;
  }

  /**
   * Prefetch URLs for all topics (background task)
   */
  async prefetchUrlsForTopics(topics) {
    console.log('[URLFinder] Prefetching URLs for all topics');
    
    for (const topic of topics) {
      if (topic.status !== 'active') continue;
      
      // Don't wait for each topic, just fire and forget
      this.getUrlsForTopic(topic, 20).catch(error => {
        console.error(`[URLFinder] Error prefetching for topic ${topic.name}:`, error);
      });
      
      // Small delay to avoid overwhelming the search proxy
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Clear cache for a specific topic or all topics
   */
  clearCache(topicId = null) {
    if (topicId) {
      this.urlCache.delete(topicId);
      this.lastSearchTime.delete(topicId);
    } else {
      this.urlCache.clear();
      this.lastSearchTime.clear();
    }
  }
}

export default new URLFinder();