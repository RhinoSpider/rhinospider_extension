# RhinoSpider Scraping Architecture

## Overview

RhinoSpider implements a distributed web scraping system where users share their bandwidth to help collect data. The system is designed to be:
- Seamless and unobtrusive to users
- Bandwidth-conscious
- Privacy-respecting
- Scalable across many users

## Components

### 1. Background Service Worker
The core of the scraping functionality runs in a Chrome Extension Service Worker (`background.js`), allowing it to operate even when the extension popup is closed.

```javascript
// Background operation lifecycle
chrome.runtime.onInstalled -> initDB() -> startScrapingScheduler()
```

### 2. Data Storage
Uses IndexedDB for persistent storage with three main stores:
- `scrapingStats`: Tracks bandwidth usage and request counts
- `scrapingConfig`: Stores configuration from admin server
- `scrapedData`: Stores collected data before upload

### 3. Queue Management
Implements a smart queue system to manage concurrent requests:
```javascript
{
  requestQueue: [], // Pending requests
  activeRequests: 0, // Currently processing
  maxConcurrentRequests: 3 // Configurable limit
}
```

## Key Features

### 1. Bandwidth Management
- Daily bandwidth limits (default: 100MB/day)
- Real-time bandwidth tracking
- Automatic throttling when limits approached
- User-configurable limits

### 2. Task Distribution
- Tasks are fetched from admin server
- Each client gets a subset of total work
- Load balancing across user base
- Automatic task retry on failure

### 3. Data Collection Flow
```mermaid
graph LR
    A[Admin Server] --> B[Extension]
    B --> C[Queue Manager]
    C --> D[Bandwidth Check]
    D --> E[Fetch Data]
    E --> F[Process & Store]
    F --> G[Upload to Admin]
```

## Configuration

### Admin Server Configuration
Configuration is fetched from the admin server:
```javascript
{
  topics: string[],          // What to search for
  targetSites: string[],     // Where to search
  scanInterval: number,      // How often to scan
  maxBandwidthPerDay: number // Bandwidth limit
}
```

### Local Configuration
Stored in IndexedDB:
```javascript
{
  enabled: boolean,          // User opt-in status
  maxConcurrentRequests: 3,  // Parallel requests
  retryAttempts: 3,         // Failed request retries
  uploadBatchSize: 50        // Items per upload
}
```

## Privacy & Security

1. **User Privacy**
   - No personal data collection
   - No browsing history access
   - Transparent bandwidth usage

2. **Security Measures**
   - Rate limiting
   - Domain whitelist
   - HTTPS only
   - Error handling

## Implementation Details

### 1. Request Queue Processing
```javascript
async function processQueue() {
  while (requestQueue.length > 0 && 
         activeRequests < maxConcurrent) {
    const task = requestQueue.shift();
    activeRequests++;
    try {
      await processTask(task);
    } finally {
      activeRequests--;
    }
  }
}
```

### 2. Bandwidth Tracking
```javascript
async function updateBandwidthUsage(bytes) {
  const stats = await getTodayStats();
  await updateStats({
    bytesDownloaded: stats.bytesDownloaded + bytes,
    requestsMade: stats.requestsMade + 1
  });
}
```

### 3. Task Distribution
```javascript
async function fetchTasks() {
  const response = await fetch('admin-server/tasks');
  const tasks = await response.json();
  return tasks.filter(task => 
    canProcessTask(task) && 
    withinBandwidthLimit(task)
  );
}
```

## Analytics & Monitoring

1. **Real-time Metrics**
   - Bandwidth usage
   - Active tasks
   - Success rates
   - Error rates

2. **Historical Data**
   - Daily usage patterns
   - Performance metrics
   - System health

## Error Handling

1. **Network Errors**
   - Automatic retry with backoff
   - Circuit breaker pattern
   - Error reporting to admin

2. **Resource Constraints**
   - Bandwidth exceeded
   - Memory limits
   - CPU usage

## Best Practices

1. **Resource Usage**
   - Respect system resources
   - Adaptive scheduling
   - Background priority

2. **Network Usage**
   - Compression
   - Caching
   - Conditional requests

## Integration Guide

1. **Extension Installation**
   ```bash
   # Install dependencies
   pnpm install
   
   # Build extension
   pnpm build
   ```

2. **Admin Server Setup**
   ```bash
   # Configure admin endpoints
   ADMIN_API_URL=https://api.rhinospider.com
   ```

3. **User Activation**
   - Install extension
   - Accept terms
   - Set bandwidth limits
   - Enable scraping

## Troubleshooting

Common issues and solutions:
1. High bandwidth usage
2. Task distribution problems
3. Data storage issues
4. Network errors

## Future Improvements

1. **Performance**
   - WebAssembly processing
   - Better compression
   - Smarter scheduling

2. **Features**
   - More data sources
   - Better error recovery
   - Enhanced analytics

3. **Security**
   - Enhanced encryption
   - Better rate limiting
   - Improved validation
