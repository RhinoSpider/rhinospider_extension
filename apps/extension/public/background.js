// Background script for RhinoSpider extension
import { scrapeCache } from '../utils/cache';

// Bandwidth tracking with enhanced analytics
let bandwidthStats = {
  currentSession: {
    bytesDownloaded: 0,
    bytesUploaded: 0,
    startTime: null,
    successfulScrapes: 0,
    failedScrapes: 0,
    requestCount: 0,
    averageLatency: 0,
    peakDownloadSpeed: 0,
    peakUploadSpeed: 0,
    dataPoints: [] // For speed tracking
  },
  total: {
    bytesDownloaded: 0,
    bytesUploaded: 0,
    sessions: 0,
    totalScrapes: 0,
    successRate: 0,
    points: 0
  },
  hourly: {}, // Track hourly stats
  daily: {}   // Track daily stats
};

// Constants for reward calculation
const REWARD_CONFIG = {
  BASE_RATE: 1, // points per MB
  SESSION_BONUS: 0.1, // 10% bonus for long sessions
  PEAK_BONUS: 0.2, // 20% bonus during peak hours
  QUALITY_BONUS: 0.05 // 5% bonus for successful scrapes
};

// Enhanced AI system prompt
const AI_SYSTEM_PROMPT = {
  role: "system",
  content: `You are an expert web scraping analyst. For each search term, provide a detailed JSON configuration with:
    1. Primary API endpoint with full URL
    2. Backup API endpoints (at least 2)
    3. Required headers and authentication method
    4. Exact fields to extract with their paths in the response
    5. Data transformation rules (type conversion, formatting)
    6. Rate limiting recommendations
    7. Caching duration suggestion
    8. Expected response format
    9. Error handling strategies
    10. Validation rules for extracted data

    Response must be valid JSON with these exact fields:
    {
      "primaryApi": { "url": "", "method": "", "headers": {} },
      "backupApis": [],
      "dataExtraction": { "fields": [], "paths": {} },
      "transform": { "rules": [] },
      "rateLimit": { "requestsPerMinute": 0 },
      "cacheDuration": 0,
      "validation": { "rules": [] }
    }`
};

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'START_SCRAPING') {
    handleScraping(request.config);
  } else if (request.type === 'STOP_SCRAPING') {
    stopScraping();
  } else if (request.type === 'GET_BANDWIDTH_STATS') {
    sendResponse(bandwidthStats);
  }
  return true;
});

// Track bandwidth for a fetch request with enhanced metrics
async function trackBandwidth(url, options = {}) {
  const startTime = performance.now();
  const response = await fetch(url, options);
  const endTime = performance.now();
  const latency = endTime - startTime;
  
  // Get response size
  const reader = response.clone().body.getReader();
  let downloadSize = 0;
  const startDownload = performance.now();
  
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    downloadSize += value.length;
  }
  
  const endDownload = performance.now();
  const downloadDuration = (endDownload - startDownload) / 1000; // in seconds
  const downloadSpeed = downloadSize / downloadDuration; // bytes per second
  
  // Calculate upload size
  let uploadSize = 0;
  if (options.body) {
    uploadSize = new TextEncoder().encode(options.body).length;
  }
  uploadSize += JSON.stringify(options.headers || {}).length;
  
  // Update bandwidth stats
  updateBandwidthStats({
    downloadSize,
    uploadSize,
    latency,
    downloadSpeed,
    success: response.ok
  });
  
  return response;
}

// Update bandwidth statistics with enhanced metrics
function updateBandwidthStats(metrics) {
  const { downloadSize, uploadSize, latency, downloadSpeed, success } = metrics;
  const now = new Date();
  const hour = now.getHours();
  const day = now.toISOString().split('T')[0];
  
  // Update current session
  bandwidthStats.currentSession.bytesDownloaded += downloadSize;
  bandwidthStats.currentSession.bytesUploaded += uploadSize;
  bandwidthStats.currentSession.requestCount++;
  bandwidthStats.currentSession.averageLatency = 
    (bandwidthStats.currentSession.averageLatency * (bandwidthStats.currentSession.requestCount - 1) + latency) 
    / bandwidthStats.currentSession.requestCount;
  
  if (downloadSpeed > bandwidthStats.currentSession.peakDownloadSpeed) {
    bandwidthStats.currentSession.peakDownloadSpeed = downloadSpeed;
  }
  
  // Track success/failure
  if (success) {
    bandwidthStats.currentSession.successfulScrapes++;
  } else {
    bandwidthStats.currentSession.failedScrapes++;
  }
  
  // Update hourly stats
  bandwidthStats.hourly[hour] = bandwidthStats.hourly[hour] || {
    bytesDownloaded: 0,
    bytesUploaded: 0,
    requests: 0
  };
  bandwidthStats.hourly[hour].bytesDownloaded += downloadSize;
  bandwidthStats.hourly[hour].bytesUploaded += uploadSize;
  bandwidthStats.hourly[hour].requests++;
  
  // Update daily stats
  bandwidthStats.daily[day] = bandwidthStats.daily[day] || {
    bytesDownloaded: 0,
    bytesUploaded: 0,
    requests: 0
  };
  bandwidthStats.daily[day].bytesDownloaded += downloadSize;
  bandwidthStats.daily[day].bytesUploaded += uploadSize;
  bandwidthStats.daily[day].requests++;
  
  // Update total stats
  bandwidthStats.total.bytesDownloaded += downloadSize;
  bandwidthStats.total.bytesUploaded += uploadSize;
  bandwidthStats.total.totalScrapes++;
  bandwidthStats.total.successRate = 
    bandwidthStats.currentSession.successfulScrapes / 
    (bandwidthStats.currentSession.successfulScrapes + bandwidthStats.currentSession.failedScrapes);
  
  // Calculate and update points
  updatePoints(downloadSize, uploadSize, success);
  
  // Notify UI of bandwidth update
  chrome.runtime.sendMessage({
    type: 'BANDWIDTH_UPDATE',
    stats: bandwidthStats
  });
}

// Calculate and update points based on bandwidth usage
function updatePoints(downloadSize, uploadSize, success) {
  const totalMB = (downloadSize + uploadSize) / (1024 * 1024);
  let points = totalMB * REWARD_CONFIG.BASE_RATE;
  
  // Add session length bonus
  if (bandwidthStats.currentSession.startTime) {
    const sessionHours = (Date.now() - bandwidthStats.currentSession.startTime) / (1000 * 60 * 60);
    if (sessionHours >= 1) {
      points *= (1 + REWARD_CONFIG.SESSION_BONUS);
    }
  }
  
  // Add peak hours bonus (consider 9AM-5PM as peak)
  const hour = new Date().getHours();
  if (hour >= 9 && hour <= 17) {
    points *= (1 + REWARD_CONFIG.PEAK_BONUS);
  }
  
  // Add quality bonus for successful scrapes
  if (success) {
    points *= (1 + REWARD_CONFIG.QUALITY_BONUS);
  }
  
  bandwidthStats.total.points += points;
}

// Function to handle scraping tasks
async function handleScraping(config) {
  if (isScrapingActive) return;
  
  isScrapingActive = true;
  bandwidthStats.currentSession.startTime = Date.now();
  bandwidthStats.total.sessions++;
  
  // Load saved bandwidth stats
  const saved = await chrome.storage.local.get('bandwidthStats');
  if (saved.bandwidthStats) {
    bandwidthStats.total = saved.bandwidthStats.total;
  }
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'RhinoSpider Active',
    message: 'Web scraping has started in the background.',
    priority: 2
  });

  while (isScrapingActive) {
    try {
      const task = await fetchScrapingTask();
      if (!task) {
        await sleep(5000);
        continue;
      }

      const data = await executeScrapingTask(task);
      if (data) {
        await sendDataToBackend(data);
      }
      
      await sleep(task.interval || 5000);
      
    } catch (error) {
      console.error('Scraping error:', error);
      await sleep(5000);
    }
  }
}

// Function to execute a scraping task with caching
async function executeScrapingTask(task) {
  try {
    // Check cache first
    let scrapeConfig = await scrapeCache.get(task.searchTerm);
    
    if (!scrapeConfig) {
      // Get config from AI if not in cache
      const analysisResponse = await trackBandwidth('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_OPENAI_API_KEY'
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            AI_SYSTEM_PROMPT,
            {
              role: "user",
              content: `Analyze this search term and provide scraping guidance: ${task.searchTerm}`
            }
          ]
        })
      });

      const analysis = await analysisResponse.json();
      scrapeConfig = JSON.parse(analysis.choices[0].message.content);
      
      // Cache the config
      await scrapeCache.set(task.searchTerm, scrapeConfig);
    }

    // Try primary API first
    try {
      const response = await trackBandwidth(scrapeConfig.primaryApi.url, {
        method: scrapeConfig.primaryApi.method,
        headers: scrapeConfig.primaryApi.headers
      });

      if (!response.ok) throw new Error('Primary API failed');
      
      const rawData = await response.json();
      
      // Extract and transform data according to config
      const extractedData = {};
      for (const [field, path] of Object.entries(scrapeConfig.dataExtraction.paths)) {
        let value = rawData;
        for (const key of path.split('.')) {
          value = value[key];
        }
        extractedData[field] = value;
      }
      
      // Apply transformation rules
      for (const rule of scrapeConfig.transform.rules) {
        if (rule.type === 'format' && extractedData[rule.field]) {
          extractedData[rule.field] = rule.format(extractedData[rule.field]);
        }
      }
      
      // Validate data
      const isValid = scrapeConfig.validation.rules.every(rule => {
        return rule.validate(extractedData[rule.field]);
      });
      
      if (!isValid) throw new Error('Data validation failed');
      
      return {
        searchTerm: task.searchTerm,
        data: extractedData,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      // Try backup APIs if primary fails
      for (const backupApi of scrapeConfig.backupApis) {
        try {
          const response = await trackBandwidth(backupApi.url, {
            method: backupApi.method,
            headers: backupApi.headers
          });
          
          if (response.ok) {
            const data = await response.json();
            return {
              searchTerm: task.searchTerm,
              data: data,
              timestamp: new Date().toISOString()
            };
          }
        } catch (backupError) {
          console.error('Backup API failed:', backupError);
        }
      }
      throw new Error('All APIs failed');
    }
    
  } catch (error) {
    console.error(`Error scraping ${task.searchTerm}:`, error);
    return null;
  }
}

// Helper function for sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to stop scraping
function stopScraping() {
  isScrapingActive = false;
  
  // Save bandwidth stats
  chrome.storage.local.set({
    bandwidthStats: {
      total: bandwidthStats.total,
      daily: bandwidthStats.daily,
      hourly: bandwidthStats.hourly
    }
  });
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'RhinoSpider Stopped',
    message: 'Web scraping has been stopped.',
    priority: 2
  });
}

// Function to fetch next scraping task
async function fetchScrapingTask() {
  try {
    const response = await trackBandwidth('YOUR_BACKEND_URL/api/tasks');
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return await response.json();
  } catch (error) {
    // Fallback to sample task for testing
    return {
      searchTerm: "tesla stock price",
      interval: 5000
    };
  }
}

// Function to send data to backend
async function sendDataToBackend(data) {
  try {
    const response = await trackBandwidth('YOUR_BACKEND_URL/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending data to backend:', error);
  }
}
