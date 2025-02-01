// Cache management for AI configurations and scraping results

class ScrapeCache {
  constructor() {
    this.dbName = 'rhinoSpiderCache';
    this.storeName = 'scrapeConfigs';
    this.version = 1;
    this.db = null;
    this.initializeDB();
  }

  async initializeDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'hash' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('searchTerm', 'searchTerm', { unique: false });
        }
      };
    });
  }

  // Generate a hash for the search term
  generateHash(searchTerm) {
    return Array.from(searchTerm.toLowerCase().trim())
      .reduce((hash, char) => {
        const chr = char.charCodeAt(0);
        return ((hash << 5) - hash) + chr | 0;
      }, 0).toString(36);
  }

  // Store a config in cache
  async set(searchTerm, config) {
    await this.ensureDB();
    const hash = this.generateHash(searchTerm);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const entry = {
        hash,
        searchTerm,
        config,
        timestamp: Date.now(),
        usageCount: 1
      };
      
      const request = store.put(entry);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(entry);
    });
  }

  // Get a config from cache
  async get(searchTerm) {
    await this.ensureDB();
    const hash = this.generateHash(searchTerm);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(hash);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entry = request.result;
        if (!entry) {
          resolve(null);
          return;
        }
        
        // Check if cache is still valid (7 days)
        const age = Date.now() - entry.timestamp;
        if (age > 7 * 24 * 60 * 60 * 1000) {
          this.delete(hash);
          resolve(null);
          return;
        }
        
        // Update usage count
        this.incrementUsage(hash, entry.usageCount);
        resolve(entry.config);
      };
    });
  }

  // Increment usage count for analytics
  async incrementUsage(hash, currentCount) {
    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    const request = store.get(hash);
    
    request.onsuccess = () => {
      const entry = request.result;
      entry.usageCount = (currentCount || 0) + 1;
      store.put(entry);
    };
  }

  // Delete expired entries
  async delete(hash) {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(hash);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Clean up old entries
  async cleanup() {
    await this.ensureDB();
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      
      const range = IDBKeyRange.upperBound(cutoff);
      const request = index.openCursor(range);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }

  // Ensure DB is initialized
  async ensureDB() {
    if (!this.db) {
      await this.initializeDB();
    }
  }
}

export const scrapeCache = new ScrapeCache();
