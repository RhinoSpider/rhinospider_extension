import { openDB } from 'idb';

export class StorageManager {
  constructor() {
    this.dbName = 'rhinospider';
    this.dbVersion = 1;
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    try {
      this.db = await openDB(this.dbName, this.dbVersion, {
        upgrade(db) {
          // Create stores if they don't exist
          if (!db.objectStoreNames.contains('stats')) {
            db.createObjectStore('stats', { keyPath: 'date' });
          }
          if (!db.objectStoreNames.contains('points')) {
            db.createObjectStore('points', { keyPath: 'date' });
          }
          if (!db.objectStoreNames.contains('streak')) {
            db.createObjectStore('streak', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('data')) {
            db.createObjectStore('data', { keyPath: 'taskId' });
          }
        },
      });

      // Initialize streak if it doesn't exist
      const tx = this.db.transaction('streak', 'readwrite');
      const store = tx.objectStore('streak');
      const streak = await store.get('current');
      if (!streak) {
        await store.put({ id: 'current', value: 0, lastUpdate: new Date().toISOString() });
      }
      await tx.done;

      return this.db;
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      throw error;
    }
  }

  async ensureInitialized() {
    if (!this.db) {
      await this.init();
    }
  }

  async getStats(date) {
    await this.ensureInitialized();
    try {
      const stats = await this.db.get('stats', date) || {
        date,
        requestCount: 0,
        bytesDownloaded: 0,
        bytesUploaded: 0
      };
      return stats;
    } catch (error) {
      console.error('Failed to get stats:', error);
      throw error;
    }
  }

  async updateBandwidthUsage(date, bytesDownloaded, bytesUploaded) {
    await this.ensureInitialized();
    try {
      const tx = this.db.transaction('stats', 'readwrite');
      const store = tx.objectStore('stats');
      
      const stats = await store.get(date) || {
        date,
        requestCount: 0,
        bytesDownloaded: 0,
        bytesUploaded: 0
      };
      
      stats.requestCount += 1;
      stats.bytesDownloaded += bytesDownloaded;
      stats.bytesUploaded += bytesUploaded;
      
      await store.put(stats);
      await tx.done;
    } catch (error) {
      console.error('Failed to update bandwidth usage:', error);
      throw error;
    }
  }

  async addScrapedData(data) {
    await this.ensureInitialized();
    try {
      await this.db.add('data', data);
    } catch (error) {
      console.error('Failed to add scraped data:', error);
      throw error;
    }
  }

  async getDailyPoints(date) {
    await this.ensureInitialized();
    try {
      return await this.db.get('points', date) || {
        date,
        total: 0,
        breakdown: { requests: 0, bandwidth: 0, streak: 0 }
      };
    } catch (error) {
      console.error('Failed to get daily points:', error);
      throw error;
    }
  }

  async updateDailyPoints(points) {
    await this.ensureInitialized();
    try {
      await this.db.put('points', points);
    } catch (error) {
      console.error('Failed to update daily points:', error);
      throw error;
    }
  }

  async getPointsStreak() {
    await this.ensureInitialized();
    try {
      const streak = await this.db.get('streak', 'current');
      return streak ? streak.value : 0;
    } catch (error) {
      console.error('Failed to get points streak:', error);
      throw error;
    }
  }

  async updateStreak(value) {
    await this.ensureInitialized();
    try {
      await this.db.put('streak', {
        id: 'current',
        value,
        lastUpdate: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to update streak:', error);
      throw error;
    }
  }
}
