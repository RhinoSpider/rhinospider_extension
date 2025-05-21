// test-connections.js - Test the connection to all RhinoSpider services
// Add this to your extension's debug tools or run it in the browser console

/**
 * Test all RhinoSpider service connections
 * Tests both HTTPS and HTTP versions of each service
 */
async function testAllConnections() {
  console.log('=== RhinoSpider Connection Test ===');
  console.log('Testing all services with both HTTPS and HTTP...');
  
  const endpoints = [
    // IC Proxy endpoints
    { name: 'IC Proxy Health (HTTPS)', url: 'https://ic-proxy.rhinospider.com/api/health' },
    { name: 'IC Proxy Health (HTTP)', url: 'http://ic-proxy.rhinospider.com/api/health' },
    { name: 'IC Proxy Topics (HTTPS)', url: 'https://ic-proxy.rhinospider.com/api/topics' },
    { name: 'IC Proxy Topics (HTTP)', url: 'http://ic-proxy.rhinospider.com/api/topics' },
    
    // Search Proxy endpoints
    { name: 'Search Proxy Health (HTTPS)', url: 'https://search-proxy.rhinospider.com/api/health' },
    { name: 'Search Proxy Health (HTTP)', url: 'http://search-proxy.rhinospider.com/api/health' },
    { name: 'Search Proxy Search (HTTPS)', url: 'https://search-proxy.rhinospider.com/api/search' },
    { name: 'Search Proxy Search (HTTP)', url: 'http://search-proxy.rhinospider.com/api/search' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name}...`);
      
      const start = performance.now();
      const response = await fetch(endpoint.url, {
        method: endpoint.url.includes('/search') ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': crypto.randomUUID()
        },
        body: endpoint.url.includes('/search') ? JSON.stringify({ query: 'test' }) : undefined
      });
      
      const elapsed = performance.now() - start;
      let responseText = '';
      
      try {
        responseText = await response.text();
      } catch (e) {
        responseText = '(unable to get response text)';
      }
      
      results.push({
        name: endpoint.name,
        url: endpoint.url,
        status: response.status,
        statusText: response.statusText,
        timeMs: Math.round(elapsed),
        success: response.ok,
        responseText: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : '')
      });
      
      console.log(`✅ ${endpoint.name}: ${response.status} ${response.statusText} (${Math.round(elapsed)}ms)`);
    } catch (error) {
      results.push({
        name: endpoint.name,
        url: endpoint.url,
        status: 0,
        error: error.toString(),
        success: false
      });
      
      console.error(`❌ ${endpoint.name} failed: ${error.toString()}`);
    }
  }
  
  console.log('=== Test Results ===');
  console.table(results);
  
  return results;
}

// Add this to your debug tools
if (typeof window.rhinoSpiderDebug === 'undefined') {
  window.rhinoSpiderDebug = {};
}

window.rhinoSpiderDebug.testAllConnections = testAllConnections;