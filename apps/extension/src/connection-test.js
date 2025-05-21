/**
 * connection-test.js - Test tool for checking connections to proxy servers
 * 
 * This script provides a comprehensive test tool for checking connections to
 * the RhinoSpider proxy servers using all available methods:
 * - HTTPS with domain name
 * - HTTP with domain name
 * - Direct IP connection
 */

import connectionHandler from './connection-handler';

/**
 * Run a comprehensive connection test
 * @returns {Promise<Object>} Test results
 */
async function runConnectionTest() {
  console.log('=== RhinoSpider Connection Test ===');
  console.log('Testing all connection methods to proxy servers...');
  
  try {
    // Use the connection handler to test all connections
    const results = await connectionHandler.testConnections();
    
    // Log the results
    console.log('=== Connection Test Results ===');
    console.log('IC Proxy:');
    logServiceResults(results.icProxy);
    
    console.log('Search Proxy:');
    logServiceResults(results.searchProxy);
    
    // Determine the best connection method for each service
    const bestMethods = {
      icProxy: getBestMethod(results.icProxy),
      searchProxy: getBestMethod(results.searchProxy)
    };
    
    console.log('=== Recommended Connection Methods ===');
    console.log(`IC Proxy: ${bestMethods.icProxy}`);
    console.log(`Search Proxy: ${bestMethods.searchProxy}`);
    
    return {
      results,
      bestMethods,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error running connection test:', error);
    return {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Log the results for a service
 * @param {Object} results Service results
 */
function logServiceResults(results) {
  for (const [method, result] of Object.entries(results)) {
    const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
    const details = result.success ? `Status: ${result.status}` : `Error: ${result.error}`;
    console.log(`  ${method.toUpperCase()}: ${status} - ${details}`);
  }
}

/**
 * Get the best connection method for a service
 * @param {Object} results Service results
 * @returns {string} Best method
 */
function getBestMethod(results) {
  // Prefer HTTPS if it works (for Chrome Store compliance)
  if (results.https.success) {
    return 'https';
  }
  
  // Fall back to HTTP if it works
  if (results.http.success) {
    return 'http';
  }
  
  // Last resort: direct IP
  if (results.ip.success) {
    return 'ip';
  }
  
  // If nothing works, recommend HTTPS anyway (it's the preferred method)
  return 'https';
}

/**
 * Create a simple HTML report of the connection test results
 * @param {Object} testResults Test results
 * @returns {string} HTML report
 */
function createHtmlReport(testResults) {
  const { results, bestMethods, timestamp, error } = testResults;
  
  if (error) {
    return `
      <div class="error">
        <h3>Error Running Connection Test</h3>
        <p>${error}</p>
        <p>Timestamp: ${timestamp}</p>
      </div>
    `;
  }
  
  let html = `
    <div class="connection-test-results">
      <h3>Connection Test Results</h3>
      <p>Timestamp: ${timestamp}</p>
      
      <h4>IC Proxy</h4>
      <table>
        <tr>
          <th>Method</th>
          <th>Status</th>
          <th>Details</th>
        </tr>
  `;
  
  // Add IC Proxy results
  for (const [method, result] of Object.entries(results.icProxy)) {
    const statusClass = result.success ? 'success' : 'failure';
    const details = result.success ? `Status: ${result.status}` : `Error: ${result.error}`;
    html += `
      <tr class="${statusClass}">
        <td>${method.toUpperCase()}</td>
        <td>${result.success ? '✅ SUCCESS' : '❌ FAILED'}</td>
        <td>${details}</td>
      </tr>
    `;
  }
  
  html += `
      </table>
      
      <h4>Search Proxy</h4>
      <table>
        <tr>
          <th>Method</th>
          <th>Status</th>
          <th>Details</th>
        </tr>
  `;
  
  // Add Search Proxy results
  for (const [method, result] of Object.entries(results.searchProxy)) {
    const statusClass = result.success ? 'success' : 'failure';
    const details = result.success ? `Status: ${result.status}` : `Error: ${result.error}`;
    html += `
      <tr class="${statusClass}">
        <td>${method.toUpperCase()}</td>
        <td>${result.success ? '✅ SUCCESS' : '❌ FAILED'}</td>
        <td>${details}</td>
      </tr>
    `;
  }
  
  html += `
      </table>
      
      <h4>Recommended Connection Methods</h4>
      <ul>
        <li>IC Proxy: <strong>${bestMethods.icProxy.toUpperCase()}</strong></li>
        <li>Search Proxy: <strong>${bestMethods.searchProxy.toUpperCase()}</strong></li>
      </ul>
    </div>
  `;
  
  return html;
}

// Export the test functions
export default {
  runConnectionTest,
  createHtmlReport
};
