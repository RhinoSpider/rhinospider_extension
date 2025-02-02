// Scraping service for RhinoSpider
import { openDB } from 'idb';

const DB_NAME = 'rhinospider';
const DB_VERSION = 1;

// Database schema
const schema = {
  scrapingStats: 'scrapingStats',
  scrapingConfig: 'scrapingConfig',
  scrapedData: 'scrapedData',
  clientInfo: 'clientInfo'
};

// Initialize IndexedDB
const initDB = async () => {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(schema.scrapingStats)) {
        db.createObjectStore(schema.scrapingStats, { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains(schema.scrapingConfig)) {
        db.createObjectStore(schema.scrapingConfig);
      }
      if (!db.objectStoreNames.contains(schema.scrapedData)) {
        db.createObjectStore(schema.scrapedData, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(schema.clientInfo)) {
        db.createObjectStore(schema.clientInfo);
      }
    },
  });
  return db;
};

// Get configuration
const getConfig = async () => {
  const db = await initDB();
  const tx = db.transaction(schema.scrapingConfig, 'readonly');
  const store = tx.objectStore(schema.scrapingConfig);
  const config = await store.get('current');
  await tx.done;
  return config || {
    maxRequestsPerMinute: 60,
    maxBandwidthPerDay: 100 * 1024 * 1024, // 100MB
    enabled: true
  };
};

// Update configuration
const updateConfig = async (config) => {
  const db = await initDB();
  const tx = db.transaction(schema.scrapingConfig, 'readwrite');
  const store = tx.objectStore(schema.scrapingConfig);
  await store.put(config, 'current');
  await tx.done;
};

// Update scraping statistics
const updateStats = async (stats) => {
  const db = await initDB();
  const date = new Date().toISOString().split('T')[0];
  const tx = db.transaction(schema.scrapingStats, 'readwrite');
  const store = tx.objectStore(schema.scrapingStats);
  
  const existing = await store.get(date);
  const updated = existing ? {
    ...existing,
    requestCount: (existing.requestCount || 0) + (stats.requestCount || 0),
    bytesDownloaded: (existing.bytesDownloaded || 0) + (stats.bytesDownloaded || 0),
    bytesUploaded: (existing.bytesUploaded || 0) + (stats.bytesUploaded || 0),
    lastUpdate: new Date().toISOString()
  } : {
    date,
    requestCount: stats.requestCount || 0,
    bytesDownloaded: stats.bytesDownloaded || 0,
    bytesUploaded: stats.bytesUploaded || 0,
    lastUpdate: new Date().toISOString()
  };
  
  await store.put(updated);
  await tx.done;
  return updated;
};

// Get today's statistics
const getTodayStats = async () => {
  const db = await initDB();
  const date = new Date().toISOString().split('T')[0];
  const tx = db.transaction(schema.scrapingStats, 'readonly');
  const store = tx.objectStore(schema.scrapingStats);
  const stats = await store.get(date);
  await tx.done;
  return stats || {
    date,
    requestCount: 0,
    bytesDownloaded: 0,
    bytesUploaded: 0
  };
};

// Store scraped data
const storeScrapedData = async (data) => {
  const db = await initDB();
  const tx = db.transaction(schema.scrapedData, 'readwrite');
  const store = tx.objectStore(schema.scrapedData);
  
  const id = `${data.url}_${Date.now()}`;
  const entry = {
    id,
    ...data,
    timestamp: new Date().toISOString()
  };
  
  await store.add(entry);
  await tx.done;
  return entry;
};

// Get scraped data
const getScrapedData = async (options = {}) => {
  const db = await initDB();
  const tx = db.transaction(schema.scrapedData, 'readonly');
  const store = tx.objectStore(schema.scrapedData);
  const data = await store.getAll();
  await tx.done;
  return data;
};

// Check if we can make more requests (bandwidth limit)
const canMakeRequest = async () => {
  const config = await getConfig();
  const stats = await getTodayStats();
  return stats.requestCount < config.maxRequestsPerMinute &&
         stats.bytesDownloaded < config.maxBandwidthPerDay;
};

// Update bandwidth usage
const updateBandwidthUsage = async (bytesDownloaded, bytesUploaded = 0) => {
  return await updateStats({
    requestCount: 1,
    bytesDownloaded,
    bytesUploaded
  });
};

export {
  initDB,
  getConfig,
  updateConfig,
  updateStats,
  getTodayStats,
  storeScrapedData,
  getScrapedData,
  canMakeRequest,
  updateBandwidthUsage
};
