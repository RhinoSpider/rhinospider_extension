/**
 * connection-handler.js - Robust connection handler for RhinoSpider extension
 * 
 * This module provides a robust connection handler that tries multiple connection methods:
 * 1. HTTPS with domain name (preferred for Chrome Store compliance)
 * 2. HTTP with domain name (fallback if HTTPS fails)
 * 3. Direct IP connection (last resort fallback)
 */

// Configuration
const SERVER_IP = '143.244.133.154';
const DOMAINS = {
  icProxy: 'ic-proxy.rhinospider.com',
  searchProxy: 'search-proxy.rhinospider.com'
};
const PORTS = {
  icProxy: 3001,
  searchProxy: 3002
};

// Connection preferences storage
let connectionPreferences = {
  icProxy: {
    method: 'https', // 'https', 'http', or 'ip'
    lastSuccess: null,
    failures: 0
  },
  searchProxy: {
    method: 'https', // 'https', 'http', or 'ip'
    lastSuccess: null,
    failures: 0
  }
};

/**
 * Get the best URL for a service based on past connection success
 * @param {string} service - 'icProxy' or 'searchProxy'
 * @param {string} endpoint - API endpoint (e.g., '/api/health')
 * @returns {string} The best URL to use
 */
function getBestUrl(service, endpoint) {
  const domain = DOMAINS[service];
  const port = PORTS[service];
  const pref = connectionPreferences[service];
  
  // If we've had too many failures with the current method, try the next one
  if (pref.failures >= 3) {
    if (pref.method === 'https') {
      pref.method = 'http';
    } else if (pref.method === 'http') {
      pref.method = 'ip';
    }
    pref.failures = 0;
  }
  
  // Return the appropriate URL based on the current preferred method
  switch (pref.method) {
    case 'https':
      return `https://${domain}${endpoint}`;
    case 'http':
      return `http://${domain}${endpoint}`;
    case 'ip':
      return `http://${SERVER_IP}:${port}${endpoint}`;
    default:
      return `https://${domain}${endpoint}`;
  }
}

/**
 * Make a request with automatic fallback
 * @param {string} service - 'icProxy' or 'searchProxy'
 * @param {string} endpoint - API endpoint (e.g., '/api/health')
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
async function makeRequest(service, endpoint, options = {}) {
  // Try all connection methods in order
  const methods = ['https', 'http', 'ip'];
  const domain = DOMAINS[service];
  const port = PORTS[service];
  
  // Start with the best URL based on past performance
  let bestUrl = getBestUrl(service, endpoint);
  
  try {
    console.log(`[ConnectionHandler] Trying ${bestUrl}`);
    const response = await fetch(bestUrl, options);
    
    // If successful, update preferences
    connectionPreferences[service].method = bestUrl.startsWith('https://') ? 'https' : 
                                           bestUrl.startsWith('http://') && !bestUrl.includes(SERVER_IP) ? 'http' : 'ip';
    connectionPreferences[service].lastSuccess = Date.now();
    connectionPreferences[service].failures = 0;
    
    return response;
  } catch (error) {
    console.warn(`[ConnectionHandler] Failed to connect to ${bestUrl}: ${error.message}`);
    connectionPreferences[service].failures++;
    
    // Try all methods in order, skipping the one we just tried
    for (const method of methods) {
      if ((method === 'https' && bestUrl.startsWith('https://')) ||
          (method === 'http' && bestUrl.startsWith('http://') && !bestUrl.includes(SERVER_IP)) ||
          (method === 'ip' && bestUrl.includes(SERVER_IP))) {
        continue; // Skip the method we already tried
      }
      
      let url;
      switch (method) {
        case 'https':
          url = `https://${domain}${endpoint}`;
          break;
        case 'http':
          url = `http://${domain}${endpoint}`;
          break;
        case 'ip':
          url = `http://${SERVER_IP}:${port}${endpoint}`;
          break;
      }
      
      try {
        console.log(`[ConnectionHandler] Trying fallback: ${url}`);
        const response = await fetch(url, options);
        
        // If successful, update preferences
        connectionPreferences[service].method = method;
        connectionPreferences[service].lastSuccess = Date.now();
        connectionPreferences[service].failures = 0;
        
        return response;
      } catch (fallbackError) {
        console.warn(`[ConnectionHandler] Fallback to ${url} failed: ${fallbackError.message}`);
        // Continue to the next method
      }
    }
    
    // If all methods failed, throw the original error
    throw error;
  }
}

/**
 * Test connections to all endpoints
 * @returns {Promise<Object>} Test results
 */
async function testConnections() {
  const results = {
    icProxy: {
      https: { success: false, error: null, status: null },
      http: { success: false, error: null, status: null },
      ip: { success: false, error: null, status: null }
    },
    searchProxy: {
      https: { success: false, error: null, status: null },
      http: { success: false, error: null, status: null },
      ip: { success: false, error: null, status: null }
    }
  };
  
  // Test IC Proxy
  for (const method of ['https', 'http', 'ip']) {
    let url;
    if (method === 'https') {
      url = `https://${DOMAINS.icProxy}/api/health`;
    } else if (method === 'http') {
      url = `http://${DOMAINS.icProxy}/api/health`;
    } else {
      url = `http://${SERVER_IP}:${PORTS.icProxy}/api/health`;
    }
    
    try {
      const response = await fetch(url);
      results.icProxy[method].success = response.ok;
      results.icProxy[method].status = response.status;
    } catch (error) {
      results.icProxy[method].error = error.message;
    }
  }
  
  // Test Search Proxy
  for (const method of ['https', 'http', 'ip']) {
    let url;
    if (method === 'https') {
      url = `https://${DOMAINS.searchProxy}/api/health`;
    } else if (method === 'http') {
      url = `http://${DOMAINS.searchProxy}/api/health`;
    } else {
      url = `http://${SERVER_IP}:${PORTS.searchProxy}/api/health`;
    }
    
    try {
      const response = await fetch(url);
      results.searchProxy[method].success = response.ok;
      results.searchProxy[method].status = response.status;
    } catch (error) {
      results.searchProxy[method].error = error.message;
    }
  }
  
  return results;
}

// Export the connection handler
export default {
  makeRequest,
  testConnections,
  getBestUrl,
  getConnectionPreferences: () => connectionPreferences
};
