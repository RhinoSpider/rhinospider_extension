import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ScrapingConfig, ScrapingStats, ScrapedData, ClientInfo } from '../types';
import { PointsCalculation, DailyPoints } from '../points/PointsCalculator';

interface RhinoSpiderDB extends DBSchema {
  scrapingStats: {
    key: string;
    value: ScrapingStats;
  };
  scrapingConfig: {
    key: 'current';
    value: ScrapingConfig;
  };
  scrapedData: {
    key: string;
    value: ScrapedData;
    indexes: { 'by-timestamp': number };
  };
  clientInfo: {
    key: 'current';
    value: ClientInfo;
  };
  points: {
    key: string;
    value: DailyPoints;
    indexes: { 'by-date': string };
  };
}

const DB_NAME = 'rhinospider';
const DB_VERSION = 1;

export class StorageManager {
  private db: IDBPDatabase<RhinoSpiderDB> | null = null;

  async init(): Promise<void> {
    this.db = await openDB<RhinoSpiderDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains('scrapingStats')) {
          db.createObjectStore('scrapingStats', { keyPath: 'date' });
        }
        if (!db.objectStoreNames.contains('scrapingConfig')) {
          db.createObjectStore('scrapingConfig');
        }
        if (!db.objectStoreNames.contains('scrapedData')) {
          const store = db.createObjectStore('scrapedData', { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('clientInfo')) {
          db.createObjectStore('clientInfo');
        }
        if (!db.objectStoreNames.contains('points')) {
          const store = db.createObjectStore('points', { keyPath: 'date' });
          store.createIndex('by-date', 'date');
        }
      },
    });
  }

  async getConfig(): Promise<ScrapingConfig> {
    if (!this.db) throw new Error('Database not initialized');
    const config = await this.db.get('scrapingConfig', 'current');
    return config || {
      maxRequestsPerMinute: 60,
      maxBandwidthPerDay: 100 * 1024 * 1024, // 100MB
      enabled: true
    };
  }

  async updateConfig(config: ScrapingConfig): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.put('scrapingConfig', config, 'current');
  }

  async getStats(date: string): Promise<ScrapingStats> {
    if (!this.db) throw new Error('Database not initialized');
    const stats = await this.db.get('scrapingStats', date);
    return stats || {
      date,
      requestCount: 0,
      bytesDownloaded: 0,
      bytesUploaded: 0,
      successCount: 0,
      failureCount: 0
    };
  }

  async updateStats(stats: ScrapingStats): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.put('scrapingStats', stats);
  }

  async storeData(data: ScrapedData): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.put('scrapedData', data);
  }

  async getData(options: { 
    fromTimestamp?: number; 
    toTimestamp?: number;
    limit?: number;
  } = {}): Promise<ScrapedData[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const range = IDBKeyRange.bound(
      options.fromTimestamp || 0,
      options.toTimestamp || Date.now()
    );

    const tx = this.db.transaction('scrapedData', 'readonly');
    const index = tx.store.index('by-timestamp');
    const items = await index.getAll(range);

    return items.slice(0, options.limit || items.length);
  }

  async getClientInfo(): Promise<ClientInfo> {
    if (!this.db) throw new Error('Database not initialized');
    const info = await this.db.get('clientInfo', 'current');
    return info || {
      id: crypto.randomUUID(),
      version: '0.1.0',
      installedAt: Date.now(),
      lastActive: Date.now(),
      settings: {}
    };
  }

  async updateClientInfo(info: ClientInfo): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.put('clientInfo', info, 'current');
  }

  async getDailyPoints(date: string): Promise<DailyPoints | null> {
    if (!this.db) throw new Error('Database not initialized');
    const points = await this.db.get('points', date);
    return points || null;
  }

  async updateDailyPoints(points: DailyPoints): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.put('points', points);
  }

  async getPointsStreak(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    
    const today = new Date().toISOString().split('T')[0];
    let streak = 0;
    let currentDate = new Date(today);

    while (true) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const points = await this.getDailyPoints(dateStr);
      
      if (!points || points.points.total === 0) break;
      
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  }
}
