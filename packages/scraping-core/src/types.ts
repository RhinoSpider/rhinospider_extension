export interface ScrapingConfig {
  maxRequestsPerMinute: number;
  maxBandwidthPerDay: number;
  enabled: boolean;
}

export interface ScrapingStats {
  date: string;
  requestCount: number;
  bytesDownloaded: number;
  bytesUploaded: number;
  successCount: number;
  failureCount: number;
}

export interface ScrapedData {
  id: string;
  url: string;
  content: string;
  timestamp: number;
  metadata: {
    [key: string]: any;
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

export interface ClientInfo {
  id: string;
  version: string;
  installedAt: number;
  lastActive: number;
  settings: {
    [key: string]: any;
  };
}
