// Debug Tools Loader
// This script loads the debug tools and initializes the connection fallback system

import './debug-tools.js';

// Register the debug tools module
console.log('RhinoSpider: Debug Tools Loaded');

// Initialize the connection tracker
window.rhinoSpiderLogging = window.rhinoSpiderLogging || {
  connections: [],
  logConnectionAttempt: (url, success, error = null) => {
    const timestamp = new Date().toISOString();
    const protocol = url.startsWith('https://') ? 'HTTPS' : 'HTTP';
    
    window.rhinoSpiderLogging.connections.push({
      timestamp,
      url,
      protocol,
      success,
      error: error ? error.message : null
    });
    
    console.log(`[RhinoSpider] ${success ? 'SUCCESS' : 'FAILED'} connection to ${url}`);
  }
};

// Initialize the fallback system
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const request = args[0];
  let url = '';
  
  if (typeof request === 'string') {
    url = request;
  } else if (request instanceof Request) {
    url = request.url;
  }
  
  // Only apply fallback to RhinoSpider domains
  if (url && (
    url.includes('ic-proxy.rhinospider.com') || 
    url.includes('search-proxy.rhinospider.com')
  )) {
    try {
      // Log the connection attempt
      if (window.rhinoSpiderLogging) {
        window.rhinoSpiderLogging.logConnectionAttempt(url, true);
      }
      
      // Try the original URL (HTTPS)
      return await originalFetch.apply(this, args);
    } catch (error) {
      // Log the failed connection
      if (window.rhinoSpiderLogging) {
        window.rhinoSpiderLogging.logConnectionAttempt(url, false, error);
      }
      
      console.warn(`[RhinoSpider] Connection to ${url} failed: ${error.message}`);
      
      // If this is HTTPS, try HTTP instead
      if (url.startsWith('https://')) {
        const httpUrl = url.replace('https://', 'http://');
        console.log(`[RhinoSpider] Trying HTTP fallback: ${httpUrl}`);
        
        try {
          // Replace the URL in the arguments
          if (typeof args[0] === 'string') {
            args[0] = httpUrl;
          } else if (args[0] instanceof Request) {
            args[0] = new Request(httpUrl, args[0]);
          }
          
          const response = await originalFetch.apply(this, args);
          
          // Log the successful fallback
          if (window.rhinoSpiderLogging) {
            window.rhinoSpiderLogging.logConnectionAttempt(httpUrl, true);
          }
          
          return response;
        } catch (fallbackError) {
          // Log the failed fallback
          if (window.rhinoSpiderLogging) {
            window.rhinoSpiderLogging.logConnectionAttempt(httpUrl, false, fallbackError);
          }
          
          console.error(`[RhinoSpider] HTTP fallback to ${httpUrl} also failed: ${fallbackError.message}`);
          throw fallbackError;
        }
      }
      
      // If not HTTPS or fallback failed, just throw the original error
      throw error;
    }
  }
  
  // For non-RhinoSpider domains, just use the original fetch
  return originalFetch.apply(this, args);
};

// Initialize global connection test function
window.testRhinoSpiderConnections = async function() {
  const results = {
    icProxy: {
      https: { success: false, error: null },
      http: { success: false, error: null }
    },
    searchProxy: {
      https: { success: false, error: null },
      http: { success: false, error: null }
    }
  };
  
  const urls = {
    icProxy: {
      https: 'https://ic-proxy.rhinospider.com/api/health',
      http: 'http://ic-proxy.rhinospider.com/api/health'
    },
    searchProxy: {
      https: 'https://search-proxy.rhinospider.com/api/health',
      http: 'http://search-proxy.rhinospider.com/api/health'
    }
  };
  
  // Test IC Proxy HTTPS
  try {
    const response = await fetch(urls.icProxy.https);
    results.icProxy.https.success = response.ok;
  } catch (error) {
    results.icProxy.https.error = error.message;
  }
  
  // Test IC Proxy HTTP
  try {
    const response = await fetch(urls.icProxy.http);
    results.icProxy.http.success = response.ok;
  } catch (error) {
    results.icProxy.http.error = error.message;
  }
  
  // Test Search Proxy HTTPS
  try {
    const response = await fetch(urls.searchProxy.https);
    results.searchProxy.https.success = response.ok;
  } catch (error) {
    results.searchProxy.https.error = error.message;
  }
  
  // Test Search Proxy HTTP
  try {
    const response = await fetch(urls.searchProxy.http);
    results.searchProxy.http.success = response.ok;
  } catch (error) {
    results.searchProxy.http.error = error.message;
  }
  
  console.log('[RhinoSpider] Connection Test Results:');
  console.table(results);
  
  return results;
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  console.log('[RhinoSpider] Extension initialized with improved HTTPS/HTTP fallback');
});
