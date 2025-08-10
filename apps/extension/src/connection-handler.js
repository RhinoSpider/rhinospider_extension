/**
 * connection-handler-https-only.js - HTTPS-only connection handler for Chrome Web Store compliance
 * 
 * This module provides a secure HTTPS-only connection handler for the RhinoSpider extension.
 * All connections use HTTPS with proper domain names for Chrome Web Store compliance.
 * No HTTP or direct IP connections are used.
 */

// Configuration - HTTPS only with proper domains
const DOMAINS = {
  icProxy: 'ic-proxy.rhinospider.com',
  searchProxy: 'search-proxy.rhinospider.com'
};

/**
 * Get the HTTPS URL for a service
 * @param {string} service - 'icProxy' or 'searchProxy'
 * @param {string} endpoint - API endpoint (e.g., '/api/health')
 * @returns {string} The HTTPS URL
 */
function getSecureUrl(service, endpoint) {
  const domain = DOMAINS[service];
  return `https://${domain}${endpoint}`;
}

/**
 * Make a secure HTTPS request
 * @param {string} service - 'icProxy' or 'searchProxy'
 * @param {string} endpoint - API endpoint (e.g., '/api/health')
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
async function makeRequest(service, endpoint, options = {}) {
  const url = getSecureUrl(service, endpoint);
  
  try {
    console.log(`[ConnectionHandler] Making secure request to ${url}`);
    const response = await fetch(url, {
      ...options,
      // Ensure we're using secure connections
      mode: 'cors',
      credentials: 'omit'
    });
    
    console.log(`[RhinoSpider] Connection attempt to ${url}: SUCCESS`);
    return response;
  } catch (error) {
    console.error(`[ConnectionHandler] Failed to connect to ${url}: ${error.message}`);
    throw error;
  }
}

/**
 * Test connection to a service using HTTPS only
 * @param {string} service - 'icProxy' or 'searchProxy'
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection(service) {
  try {
    const response = await makeRequest(service, '/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.status === 'ok';
    }
    return false;
  } catch (error) {
    console.error(`[ConnectionHandler] Health check failed for ${service}:`, error);
    return false;
  }
}

/**
 * Test IC Proxy connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testIcProxy() {
  return testConnection('icProxy');
}

/**
 * Test Search Proxy connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testSearchProxy() {
  return testConnection('searchProxy');
}

/**
 * Get the best URL for a service (for compatibility with existing code)
 * In HTTPS-only mode, this is the same as getSecureUrl
 * @param {string} service - 'icProxy' or 'searchProxy'
 * @param {string} endpoint - API endpoint (e.g., '/api/health')
 * @returns {string} The HTTPS URL
 */
function getBestUrl(service, endpoint) {
  return getSecureUrl(service, endpoint);
}

// Export the connection handler
export default {
  makeRequest,
  testConnection,
  testIcProxy,
  testSearchProxy,
  getSecureUrl,
  getBestUrl  // Added for compatibility
};