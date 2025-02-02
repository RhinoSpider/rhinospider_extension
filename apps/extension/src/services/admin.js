// Admin API client for RhinoSpider
const ADMIN_API_URL = 'https://api.rhinospider.com'; // We'll need to update this

export class AdminClient {
  constructor(baseUrl = ADMIN_API_URL) {
    this.baseUrl = baseUrl;
  }

  // Get scraping configuration from admin
  async getScrapingConfig() {
    try {
      const response = await fetch(`${this.baseUrl}/v1/scraping/config`);
      if (!response.ok) {
        throw new Error(`Admin API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch scraping config:', error);
      // Return default fallback config
      return {
        topics: [],
        targetSites: [],
        scanInterval: 30 * 60 * 1000, // 30 minutes
        maxBandwidthPerDay: 100 * 1024 * 1024, // 100MB
        maxConcurrentRequests: 3,
        enabled: false
      };
    }
  }

  // Report scraping results back to admin
  async reportScrapedData(data) {
    try {
      const response = await fetch(`${this.baseUrl}/v1/scraping/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to report data: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to report scraped data:', error);
      throw error;
    }
  }

  // Get scraping tasks for this client
  async getTasks() {
    try {
      const response = await fetch(`${this.baseUrl}/v1/scraping/tasks`);
      if (!response.ok) {
        throw new Error(`Failed to get tasks: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      return [];
    }
  }

  // Report client status (bandwidth usage, errors, etc)
  async reportStatus(status) {
    try {
      const response = await fetch(`${this.baseUrl}/v1/clients/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(status)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to report status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to report status:', error);
    }
  }

  // Register client with admin server
  async registerClient() {
    try {
      const response = await fetch(`${this.baseUrl}/v1/clients/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: chrome.runtime.getManifest().version,
          platform: navigator.platform,
          capabilities: {
            maxConcurrentRequests: 3,
            maxBandwidthPerDay: 100 * 1024 * 1024
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to register client: ${response.status}`);
      }
      
      const { clientId, clientSecret } = await response.json();
      return { clientId, clientSecret };
    } catch (error) {
      console.error('Failed to register client:', error);
      throw error;
    }
  }
}
