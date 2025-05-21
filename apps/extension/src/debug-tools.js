/**
 * RhinoSpider Debug Tools
 *
 * Collection of debugging tools for RhinoSpider extension
 */

// Create global object for debug tools
window.rhinoSpiderDebug = window.rhinoSpiderDebug || {};

// Initialize connection logging
window.rhinoSpiderLogging = window.rhinoSpiderLogging || {
  connections: [],

  // Log a connection attempt
  logConnectionAttempt(url, success, error = null) {
    const timestamp = new Date().toISOString();
    const protocol = url.startsWith('https://') ? 'HTTPS' : 'HTTP';
    const errorMessage = error ? error.message : null;

    this.connections.push({
      timestamp,
      url,
      protocol,
      success,
      errorMessage
    });

    console.log(`[Connection] ${success ? 'SUCCESS' : 'FAILED'} - ${protocol} request to ${url}`);

    if (error) {
      console.warn(`[Connection] Error: ${errorMessage}`);
    }
  },

  // Get all logged connections
  getConnections() {
    return this.connections;
  },

  // Clear connection logs
  clearConnections() {
    this.connections = [];
    return 'Connection logs cleared';
  }
};

// Test connections to both proxy servers via HTTP and HTTPS
window.rhinoSpiderDebug.testAllConnections = async function() {
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

  // Define URLs to test
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

  console.log('===== Testing all connections =====');

  // Create device ID header
  const deviceId = localStorage.getItem('deviceId') || 'test-device';
  const headers = {
    'x-device-id': deviceId
  };

  // Test IC Proxy HTTPS
  try {
    console.log('Testing IC Proxy (HTTPS)...');
    const icProxyHttpsResponse = await fetch(urls.icProxy.https, { headers });
    results.icProxy.https.success = icProxyHttpsResponse.ok;
    if (icProxyHttpsResponse.ok) {
      const data = await icProxyHttpsResponse.json();
      results.icProxy.https.data = data;
    }
  } catch (error) {
    results.icProxy.https.error = error.message;
    console.warn('IC Proxy HTTPS test failed:', error.message);
  }

  // Test IC Proxy HTTP
  try {
    console.log('Testing IC Proxy (HTTP)...');
    const icProxyHttpResponse = await fetch(urls.icProxy.http, { headers });
    results.icProxy.http.success = icProxyHttpResponse.ok;
    if (icProxyHttpResponse.ok) {
      const data = await icProxyHttpResponse.json();
      results.icProxy.http.data = data;
    }
  } catch (error) {
    results.icProxy.http.error = error.message;
    console.warn('IC Proxy HTTP test failed:', error.message);
  }

  // Test Search Proxy HTTPS
  try {
    console.log('Testing Search Proxy (HTTPS)...');
    const searchProxyHttpsResponse = await fetch(urls.searchProxy.https, { headers });
    results.searchProxy.https.success = searchProxyHttpsResponse.ok;
    if (searchProxyHttpsResponse.ok) {
      const data = await searchProxyHttpsResponse.json();
      results.searchProxy.https.data = data;
    }
  } catch (error) {
    results.searchProxy.https.error = error.message;
    console.warn('Search Proxy HTTPS test failed:', error.message);
  }

  // Test Search Proxy HTTP
  try {
    console.log('Testing Search Proxy (HTTP)...');
    const searchProxyHttpResponse = await fetch(urls.searchProxy.http, { headers });
    results.searchProxy.http.success = searchProxyHttpResponse.ok;
    if (searchProxyHttpResponse.ok) {
      const data = await searchProxyHttpResponse.json();
      results.searchProxy.http.data = data;
    }
  } catch (error) {
    results.searchProxy.http.error = error.message;
    console.warn('Search Proxy HTTP test failed:', error.message);
  }

  // Log final results
  console.log('===== Connection Test Results =====');
  console.log(JSON.stringify(results, null, 2));

  // Return summary
  return {
    ...results,
    summary: {
      icProxyHttps: results.icProxy.https.success ? 'CONNECTED' : 'FAILED',
      icProxyHttp: results.icProxy.http.success ? 'CONNECTED' : 'FAILED',
      searchProxyHttps: results.searchProxy.https.success ? 'CONNECTED' : 'FAILED',
      searchProxyHttp: results.searchProxy.http.success ? 'CONNECTED' : 'FAILED',
      overallStatus: (
        results.icProxy.https.success || results.icProxy.http.success
      ) && (
        results.searchProxy.https.success || results.searchProxy.http.success
      ) ? 'OPERATIONAL' : 'DEGRADED'
    }
  };
};

// Initialize debug tools when the extension loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('RhinoSpider Debug Tools loaded');
});

// Export functions for console access
window.rhinoSpiderDebug.logConnections = () => console.table(window.rhinoSpiderLogging.getConnections());
window.rhinoSpiderDebug.clearConnectionLogs = () => window.rhinoSpiderLogging.clearConnections();

// Export the debug tools object for importing in other modules
export default window.rhinoSpiderDebug;
