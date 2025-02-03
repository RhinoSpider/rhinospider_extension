import { ScrapingConfig, ScrapedData, ScrapingStats } from './types';
import { StorageManager } from './storage/db';

export class Scraper {
  private storage: StorageManager;
  private config: ScrapingConfig | null = null;

  constructor() {
    this.storage = new StorageManager();
  }

  async initialize(): Promise<void> {
    await this.storage.init();
    this.config = await this.storage.getConfig();
  }

  async scrape(url: string): Promise<ScrapedData> {
    if (!this.config) {
      throw new Error('Scraper not initialized');
    }

    // Check if scraping is enabled
    if (!this.config.enabled) {
      throw new Error('Scraping is disabled');
    }

    // Get today's stats
    const today = new Date().toISOString().split('T')[0];
    const stats = await this.storage.getStats(today);

    // Check rate limits
    if (stats.requestCount >= this.config.maxRequestsPerMinute * 60) {
      throw new Error('Rate limit exceeded');
    }

    try {
      // Extract content
      const content = await this.extractContent(url);
      
      // Create scraped data
      const data: ScrapedData = {
        id: crypto.randomUUID(),
        url,
        content,
        timestamp: Date.now(),
        metadata: await this.extractMetadata(content)
      };

      // Store the data
      await this.storage.storeData(data);

      // Update stats
      await this.storage.updateStats({
        ...stats,
        requestCount: stats.requestCount + 1,
        bytesDownloaded: stats.bytesDownloaded + content.length,
        successCount: stats.successCount + 1
      });

      return data;
    } catch (error) {
      // Update failure stats
      await this.storage.updateStats({
        ...stats,
        failureCount: stats.failureCount + 1
      });

      throw error;
    }
  }

  protected async extractContent(url: string): Promise<string> {
    throw new Error('extractContent must be implemented by subclass');
  }

  protected async extractMetadata(content: string): Promise<ScrapedData['metadata']> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');

    const description = doc.querySelector('meta[name="description"]')?.getAttribute('content');
    const keywords = doc.querySelector('meta[name="keywords"]')?.getAttribute('content')?.split(',').map(k => k.trim());

    return {
      title: doc.title || undefined,
      description: description || undefined,
      keywords: keywords || undefined
    };
  }

  async getConfig(): Promise<ScrapingConfig> {
    return this.storage.getConfig();
  }

  async updateConfig(config: ScrapingConfig): Promise<void> {
    await this.storage.updateConfig(config);
    this.config = config;
  }

  async getStats(date: string): Promise<ScrapingStats> {
    return this.storage.getStats(date);
  }

  async getData(options?: { 
    fromTimestamp?: number; 
    toTimestamp?: number;
    limit?: number;
  }): Promise<ScrapedData[]> {
    return this.storage.getData(options);
  }
}
