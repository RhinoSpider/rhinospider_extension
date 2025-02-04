import { useAuth } from '@rhinospider/web3-client';
import { openDB } from 'idb';

// Constants
const DB_NAME = 'rhinospider';
const DB_VERSION = 1;

const STORES = {
  scrapingStats: 'scrapingStats',
  scrapingConfig: 'scrapingConfig',
  scrapedData: 'scrapedData',
  clientInfo: 'clientInfo'
};

// Initialize IndexedDB
export const initDB = async () => {
  return await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORES.scrapingStats)) {
        db.createObjectStore(STORES.scrapingStats, { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains(STORES.scrapingConfig)) {
        db.createObjectStore(STORES.scrapingConfig, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.scrapedData)) {
        db.createObjectStore(STORES.scrapedData, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORES.clientInfo)) {
        db.createObjectStore(STORES.clientInfo, { keyPath: 'id' });
      }
    }
  });
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || 'Request failed');
  }
  return response.json();
};

// Analytics API
export const getAnalytics = async (timeRange = '24h') => {
  const { state } = useAuth();
  const response = await fetch(`https://api.rhinospider.com/analytics?timeRange=${timeRange}`, {
    headers: {
      'Authorization': `Bearer ${state.token}`,
    },
  });
  return handleResponse(response);
};

export const getTopics = async () => {
  const { state } = useAuth();
  const response = await fetch(`https://api.rhinospider.com/topics`, {
    headers: {
      'Authorization': `Bearer ${state.token}`,
    },
  });
  return handleResponse(response);
};

export const getPerformanceStats = async () => {
  const { state } = useAuth();
  const response = await fetch(`https://api.rhinospider.com/performance`, {
    headers: {
      'Authorization': `Bearer ${state.token}`,
    },
  });
  return handleResponse(response);
};

// Settings API
export const getSettings = async () => {
  const { state } = useAuth();
  const response = await fetch(`https://api.rhinospider.com/settings`, {
    headers: {
      'Authorization': `Bearer ${state.token}`,
    },
  });
  return handleResponse(response);
};

export const updateSettings = async (settings) => {
  const { state } = useAuth();
  const response = await fetch(`https://api.rhinospider.com/settings`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${state.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });
  return handleResponse(response);
};

// Topics API
export const updateTopic = async (topicId, data) => {
  const { state } = useAuth();
  const response = await fetch(`https://api.rhinospider.com/topics/${topicId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${state.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const createTopic = async (data) => {
  const { state } = useAuth();
  const response = await fetch(`https://api.rhinospider.com/topics`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${state.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const deleteTopic = async (topicId) => {
  const { state } = useAuth();
  const response = await fetch(`https://api.rhinospider.com/topics/${topicId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${state.token}`,
    },
  });
  return handleResponse(response);
};

// Real-time updates
export const subscribeToUpdates = (onUpdate) => {
  let ws = null;
  let wsReconnectTimer = null;

  const connectWebSocket = (onMessage) => {
    if (ws) {
      ws.close();
    }

    ws = new WebSocket('wss://api.rhinospider.com');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    ws.onclose = () => {
      // Reconnect after 5 seconds
      wsReconnectTimer = setTimeout(() => {
        connectWebSocket(onMessage);
      }, 5000);
    };

    return () => {
      if (wsReconnectTimer) {
        clearTimeout(wsReconnectTimer);
      }
      if (ws) {
        ws.close();
      }
    };
  };

  return connectWebSocket((data) => {
    switch (data.type) {
      case 'POINTS_UPDATE':
        onUpdate({
          type: 'points',
          data: data.payload,
        });
        break;
      case 'PERFORMANCE_UPDATE':
        onUpdate({
          type: 'performance',
          data: data.payload,
        });
        break;
      case 'SETTINGS_UPDATE':
        onUpdate({
          type: 'settings',
          data: data.payload,
        });
        break;
    }
  });
};

// Storage API for offline support
const db = {
  async get(key) {
    const data = await chrome.storage.local.get(key);
    return data[key];
  },
  async set(key, value) {
    await chrome.storage.local.set({ [key]: value });
  },
};

// Cache API responses
export const getCachedAnalytics = async (timeRange = '24h') => {
  try {
    const data = await getAnalytics(timeRange);
    await db.set(`analytics_${timeRange}`, {
      data,
      timestamp: Date.now(),
    });
    return data;
  } catch (error) {
    const cached = await db.get(`analytics_${timeRange}`);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes
      return cached.data;
    }
    throw error;
  }
};

export const getCachedSettings = async () => {
  try {
    const data = await getSettings();
    await db.set('settings', {
      data,
      timestamp: Date.now(),
    });
    return data;
  } catch (error) {
    const cached = await db.get('settings');
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes
      return cached.data;
    }
    throw error;
  }
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
    const db = await initDB();
    const config = await db.get(STORES.scrapingConfig, 'current');
    
    if (!config) {
      const defaultConfig = {
        id: 'current',
        enabled: false,
        maxRequestsPerDay: 1000,
        maxBandwidthPerDay: 100 * 1024 * 1024, // 100MB
        urls: []
      };
      await db.put(STORES.scrapingConfig, defaultConfig);
      return defaultConfig;
    }
    
    return config;
  } catch (error) {
    console.error('Error getting scraping config:', error);
    throw error;
  }
};

export const updateScrapingConfig = async (config) => {
  try {
    const db = await initDB();
    await db.put(STORES.scrapingConfig, { ...config, id: 'current' });
    return config;
  } catch (error) {
    console.error('Error updating scraping config:', error);
    throw error;
  }
};

// Content functions
export const fetchContentByTopic = async (topic, limit = 10) => {
  try {
    const response = await fetch(`https://api.rhinospider.com/content/topic/${topic}?limit=${limit}`);
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
  await db.put(STORES.scrapingStats, { ...stats, date });
};

export const getTodayStats = async () => {
  const db = await initDB();
  const date = new Date().toISOString().split('T')[0];
  const stats = await db.get(STORES.scrapingStats, date);
  
  if (!stats) {
    const defaultStats = {
      date,
      requestCount: 0,
      bytesDownloaded: 0,
      bytesUploaded: 0,
      activeTime: 0
    };
    await db.put(STORES.scrapingStats, defaultStats);
    return defaultStats;
  }
  
  return stats;
};

// Bandwidth control functions
export const canMakeRequest = async () => {
  const stats = await getTodayStats();
  return stats.requestCount < 1000;
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
