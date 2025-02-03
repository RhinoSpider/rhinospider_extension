import { useAuth } from '@rhinospider/web3-client';
import { openDB } from 'idb';

// Constants
const API_BASE_URL = 'http://localhost:3001/api';
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
export const initDB = async () => {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(schema.scrapingStats)) {
        db.createObjectStore(schema.scrapingStats, { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains(schema.scrapingConfig)) {
        db.createObjectStore(schema.scrapingConfig, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(schema.scrapedData)) {
        db.createObjectStore(schema.scrapedData, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(schema.clientInfo)) {
        db.createObjectStore(schema.clientInfo, { keyPath: 'id' });
      }
    }
  });
  return db;
};

// Auth functions
export const login = async () => {
  const auth = useAuth({ appName: 'RhinoSpider Extension' });
  await auth.login();
};

export const logout = async () => {
  const auth = useAuth({ appName: 'RhinoSpider Extension' });
  await auth.logout();
};

export const isAuthenticated = () => {
  const auth = useAuth({ appName: 'RhinoSpider Extension' });
  return auth.isAuthenticated;
};

// Config functions
export const getScrapingConfig = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/config`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const config = await response.json();
    
    // Store in IndexedDB for offline access
    const db = await initDB();
    await db.put(schema.scrapingConfig, config);
    
    return config;
  } catch (error) {
    console.error('Error fetching scraping config:', error);
    
    // Try to get from IndexedDB if network request fails
    try {
      const db = await initDB();
      return await db.get(schema.scrapingConfig, 'current');
    } catch (dbError) {
      console.error('Error fetching from IndexedDB:', dbError);
      throw error;
    }
  }
};

export const updateScrapingConfig = async (config) => {
  try {
    const response = await fetch(`${API_BASE_URL}/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const updatedConfig = await response.json();
    
    // Update IndexedDB
    const db = await initDB();
    await db.put(schema.scrapingConfig, { ...updatedConfig, id: 'current' });
    
    return updatedConfig;
  } catch (error) {
    console.error('Error updating scraping config:', error);
    throw error;
  }
};

// Content functions
export const fetchContentByTopic = async (topic, limit = 10) => {
  try {
    const response = await fetch(`${API_BASE_URL}/content/topic/${topic}?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching content:', error);
    throw error;
  }
};

// Stats functions
export const updateStats = async (stats) => {
  const db = await initDB();
  const date = new Date().toISOString().split('T')[0];
  await db.put(schema.scrapingStats, { ...stats, date });
};

export const getTodayStats = async () => {
  const db = await initDB();
  const date = new Date().toISOString().split('T')[0];
  return await db.get(schema.scrapingStats, date) || { date, requestCount: 0, bytesDownloaded: 0, bytesUploaded: 0 };
};

// Bandwidth control functions
export const canMakeRequest = async () => {
  const stats = await getTodayStats();
  const maxRequests = 1000; // This should come from config
  return stats.requestCount < maxRequests;
};

export const updateBandwidthUsage = async (bytesDownloaded, bytesUploaded = 0) => {
  const stats = await getTodayStats();
  await updateStats({
    ...stats,
    bytesDownloaded: stats.bytesDownloaded + bytesDownloaded,
    bytesUploaded: stats.bytesUploaded + bytesUploaded,
    requestCount: stats.requestCount + 1
  });
};

// UI helper functions
export const getSourceIcon = (source) => {
  switch (source.toLowerCase()) {
    case 'github':
      return '🐙';
    case 'dev.to':
      return '👩‍💻';
    case 'medium':
      return '📝';
    default:
      return '🔗';
  }
};

export const formatEngagement = (engagement) => {
  const metrics = [];
  if (engagement.stars && Number(engagement.stars) > 0) {
    metrics.push(`⭐ ${engagement.stars}`);
  }
  if (engagement.reactions && Number(engagement.reactions) > 0) {
    metrics.push(`❤️ ${engagement.reactions}`);
  }
  if (engagement.claps && Number(engagement.claps) > 0) {
    metrics.push(`👏 ${engagement.claps}`);
  }
  if (engagement.comments > 0) {
    metrics.push(`💬 ${engagement.comments}`);
  }
  return metrics.join(' · ');
};

export const formatDate = (timestamp) => {
  const date = new Date(Number(timestamp) / 1_000_000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
