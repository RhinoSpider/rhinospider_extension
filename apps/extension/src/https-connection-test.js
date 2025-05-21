// https-connection-test.js - Test script for checking connections to the proxy servers
// Save this script in the extension project directory

/**
 * Test connection to both proxy servers with both HTTPS and HTTP
 */
async function testProxyConnections() {
  console.log('=== RhinoSpider Proxy Connection Test ===');
  
  const icProxyHttps = 'https://ic-proxy.rhinospider.com/api/health';
  const icProxyHttp = 'http://ic-proxy.rhinospider.com/api/health';
  const searchProxyHttps = 'https://search-proxy.rhinospider.com/api/health';
  const searchProxyHttp = 'http://search-proxy.rhinospider.com/api/health';
  
  // Test HTTPS connections
  console.log('\nTesting HTTPS connections:');
  try {
    const icResult = await testConnection(icProxyHttps);
    console.log(`IC Proxy (HTTPS): ${icResult.success ? 'SUCCESS ✓' : 'FAILED ✗'} - ${icResult.message}`);
  } catch (error) {
    console.log(`IC Proxy (HTTPS): FAILED ✗ - ${error.message}`);
  }
  
  try {
    const searchResult = await testConnection(searchProxyHttps);
    console.log(`Search Proxy (HTTPS): ${searchResult.success ? 'SUCCESS ✓' : 'FAILED ✗'} - ${searchResult.message}`);
  } catch (error) {
    console.log(`Search Proxy (HTTPS): FAILED ✗ - ${error.message}`);
  }
  
  // Test HTTP connections (fallback)
  console.log('\nTesting HTTP fallback connections:');
  try {
    const icHttpResult = await testConnection(icProxyHttp);
    console.log(`IC Proxy (HTTP): ${icHttpResult.success ? 'SUCCESS ✓' : 'FAILED ✗'} - ${icHttpResult.message}`);
  } catch (error) {
    console.log(`IC Proxy (HTTP): FAILED ✗ - ${error.message}`);
  }
  
  try {
    const searchHttpResult = await testConnection(searchProxyHttp);
    console.log(`Search Proxy (HTTP): ${searchHttpResult.success ? 'SUCCESS ✓' : 'FAILED ✗'} - ${searchHttpResult.message}`);
  } catch (error) {
    console.log(`Search Proxy (HTTP): FAILED ✗ - ${error.message}`);
  }
  
  console.log('\n=== Connection Test Complete ===');
}

/**
 * Test a single connection to a URL
 * @param {string} url URL to test
 * @returns {Promise<Object>} Result of the test
 */
async function testConnection(url) {
  try {
    const controller = new AbortController();
    const signal = controller.signal;
    
    // Set a timeout of 5 seconds
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'GET',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': 'test-device-id'
      }
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: `Status: ${response.status}, Data: ${JSON.stringify(data)}`
      };
    } else {
      return {
        success: false,
        message: `Status: ${response.status} ${response.statusText}`
      };
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        message: 'Connection timed out after 5 seconds'
      };
    }
    
    return {
      success: false,
      message: error.message
    };
  }
}

// Execute the test function
testProxyConnections();
