// certificate-patch.js
// This script handles certificate verification patching for Internet Computer

/**
 * Patch certificate verification
 * Makes HTTPS connections with self-signed certificates work
 */
function patchCertificateVerification() {
  console.log('RhinoSpider certificate patch loaded');
  
  // Store original fetch
  const originalFetch = window.fetch;

  // Override the fetch API to handle certificate errors
  window.fetch = async function(resource, init) {
    try {
      // Try the original fetch call
      return await originalFetch(resource, init);
    } catch (error) {
      // Check if this is a certificate error for our domains
      const rhinoSpiderDomains = [
        'ic-proxy.rhinospider.com',
        'search-proxy.rhinospider.com'
      ];
      
      // Get the URL from the resource
      const url = typeof resource === 'string' ? resource : resource?.url;
      
      // Check if the URL matches one of our domains
      const isRhinoSpiderDomain = url && rhinoSpiderDomains.some(domain => url.includes(domain));
      
      // If it's a certificate error for one of our domains, try connecting via HTTP
      if (isRhinoSpiderDomain && (error.message.includes('certificate') || error.name === 'TypeError')) {
        console.warn('Certificate error detected, retrying with HTTP fallback');
        
        // Convert HTTPS URL to HTTP
        const httpUrl = url.replace('https://', 'http://');
        
        // Use the modified resource
        const modifiedResource = typeof resource === 'string' ? 
          httpUrl : 
          { ...resource, url: httpUrl };
        
        // Retry with HTTP
        return await originalFetch(modifiedResource, init);
      }
      
      // For other errors, rethrow
      throw error;
    }
  };

  // Also patch XMLHttpRequest for completeness
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    // Check if this is a request to a RhinoSpider domain
    const rhinoSpiderDomains = [
      'ic-proxy.rhinospider.com',
      'search-proxy.rhinospider.com'
    ];
    
    // Check if the URL matches one of our domains
    const isRhinoSpiderDomain = url && rhinoSpiderDomains.some(domain => url.includes(domain));
    
    // If it's a RhinoSpider domain, convert HTTPS to HTTP
    if (isRhinoSpiderDomain && url.startsWith('https://')) {
      const httpUrl = url.replace('https://', 'http://');
      console.warn('Converting HTTPS to HTTP for XMLHttpRequest');
      return originalOpen.call(this, method, httpUrl, ...args);
    }
    
    // Otherwise, use the original URL
    return originalOpen.call(this, method, url, ...args);
  };

  console.log('RhinoSpider HTTPS certificate patch installed');
}

// Run the patch when the script is loaded
patchCertificateVerification();
