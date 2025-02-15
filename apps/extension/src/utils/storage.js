import { openDB } from 'idb';

export class StorageManager {
  constructor() {
    this.dbName = 'rhinospider';
    this.dbVersion = 2; // Increment version to trigger upgrade
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    try {
      this.db = await openDB(this.dbName, this.dbVersion, {
        upgrade(db, oldVersion, newVersion) {
          // Delete old stores if they exist
          if (oldVersion < 2) {
            const storeNames = [...db.objectStoreNames];
            storeNames.forEach(storeName => {
              db.deleteObjectStore(storeName);
            });
          }

          // Create all stores fresh
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
          if (!db.objectStoreNames.contains('config')) {
            db.createObjectStore('config', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('auth')) {
            db.createObjectStore('auth', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('analytics')) {
            db.createObjectStore('analytics', { keyPath: 'id' });
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

      // Initialize config if it doesn't exist
      const configTx = this.db.transaction('config', 'readwrite');
      const configStore = configTx.objectStore('config');
      const config = await configStore.get('default');
      if (!config) {
        await configStore.put({
          id: 'default',
          adminCanisterId: 's6r66-wyaaa-aaaaj-az4sq-cai',
          storageCanisterId: 'smxjh-2iaaa-aaaaj-az4rq-cai',
          icHost: 'https://icp0.io'
        });
      }
      await configTx.done;

      // Initialize auth state if it doesn't exist
      const authTx = this.db.transaction('auth', 'readwrite');
      const authStore = authTx.objectStore('auth');
      const authState = await authStore.get('current');
      if (!authState) {
        await authStore.put({
          id: 'current',
          isAuthenticated: false,
          isInitialized: true,
          error: null
        });
      }
      await authTx.done;

      // Initialize analytics if it doesn't exist
      const analyticsTx = this.db.transaction('analytics', 'readwrite');
      const analyticsStore = analyticsTx.objectStore('analytics');
      const analytics = await analyticsStore.get('today');
      if (!analytics) {
        await analyticsStore.put({
          id: 'today',
          requestCount: 0,
          successCount: 0,
          failureCount: 0,
          bytesDownloaded: 0,
          bytesUploaded: 0,
          topicsProcessed: 0,
          lastUpdate: new Date().toISOString()
        });
      }
      await analyticsTx.done;

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

  // Auth state methods
  async getAuthState() {
    await this.ensureInitialized();
    const tx = this.db.transaction('auth', 'readonly');
    const store = tx.objectStore('auth');
    return store.get('current');
  }

  async updateAuthState(newState) {
    await this.ensureInitialized();
    const tx = this.db.transaction('auth', 'readwrite');
    const store = tx.objectStore('auth');
    // Ensure we don't try to serialize the identity object
    const serializedState = {
      id: 'current',
      isAuthenticated: newState.isAuthenticated,
      isInitialized: newState.isInitialized,
      error: newState.error,
      principal: newState.principal?.toString()
    };
    await store.put(serializedState);
    await tx.done;
  }

  // Config methods
  async getConfig() {
    await this.ensureInitialized();
    const tx = this.db.transaction('config', 'readonly');
    const store = tx.objectStore('config');
    return store.get('default');
  }

  async updateConfig(newConfig) {
    await this.ensureInitialized();
    const tx = this.db.transaction('config', 'readwrite');
    const store = tx.objectStore('config');
    await store.put({ id: 'default', ...newConfig });
    await tx.done;
  }

  // Stats methods
  async getStats(date) {
    await this.ensureInitialized();
    const tx = this.db.transaction('stats', 'readonly');
    const store = tx.objectStore('stats');
    const stats = await store.get(date);
    return stats || {
      date,
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      bytesDownloaded: 0,
      bytesUploaded: 0,
      topicsProcessed: 0
    };
  }

  async updateStats(date, updates) {
    await this.ensureInitialized();
    const tx = this.db.transaction('stats', 'readwrite');
    const store = tx.objectStore('stats');
    const current = await store.get(date) || {
      date,
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      bytesDownloaded: 0,
      bytesUploaded: 0,
      topicsProcessed: 0
    };
    await store.put({ ...current, ...updates });
    await tx.done;
  }

  // Points methods
  async getPoints(date) {
    await this.ensureInitialized();
    const tx = this.db.transaction('points', 'readonly');
    const store = tx.objectStore('points');
    return store.get(date);
  }

  async updatePoints(date, points) {
    await this.ensureInitialized();
    const tx = this.db.transaction('points', 'readwrite');
    const store = tx.objectStore('points');
    await store.put({ date, ...points });
    await tx.done;
  }

  // Streak methods
  async getStreak() {
    await this.ensureInitialized();
    const tx = this.db.transaction('streak', 'readonly');
    const store = tx.objectStore('streak');
    const streak = await store.get('current');
    return streak?.value || 0;
  }

  async updateStreak(value) {
    await this.ensureInitialized();
    const tx = this.db.transaction('streak', 'readwrite');
    const store = tx.objectStore('streak');
    await store.put({
      id: 'current',
      value,
      lastUpdate: new Date().toISOString()
    });
    await tx.done;
  }

  // Analytics methods
  async getAnalytics() {
    await this.ensureInitialized();
    const tx = this.db.transaction('analytics', 'readonly');
    const store = tx.objectStore('analytics');
    return store.get('today');
  }

  async updateAnalytics(updates) {
    await this.ensureInitialized();
    const tx = this.db.transaction('analytics', 'readwrite');
    const store = tx.objectStore('analytics');
    const current = await store.get('today') || {
      id: 'today',
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      bytesDownloaded: 0,
      bytesUploaded: 0,
      topicsProcessed: 0,
      lastUpdate: new Date().toISOString()
    };
    await store.put({ ...current, ...updates, lastUpdate: new Date().toISOString() });
    await tx.done;
  }

  // Scraped data methods
  async addScrapedData(data) {
    await this.ensureInitialized();
    const tx = this.db.transaction('data', 'readwrite');
    const store = tx.objectStore('data');
    const taskId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await store.add({ taskId, ...data });
    await tx.done;
  }

  async getScrapedData() {
    await this.ensureInitialized();
    const tx = this.db.transaction('data', 'readonly');
    const store = tx.objectStore('data');
    return store.getAll();
  }
}
