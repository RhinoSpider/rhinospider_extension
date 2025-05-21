// Check if content.js already exists
// This is a fallback file in case content.js doesn't exist or is in a different format

// Basic content script functionality that injects our HTTPS certificate handler
console.log('RhinoSpider content script loaded');

// Inject our HTTPS certificate handler script if needed
injectCertificateHandler();

/**
 * Inject our HTTPS certificate handler script
 */
function injectCertificateHandler() {
  // Create a script element
  const script = document.createElement('script');
  
  // Set the script content
  script.textContent = `
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

    // Report this change to the console
    console.log('RhinoSpider HTTPS certificate handler installed');
  `;
  
  // Add the script to the page
  (document.head || document.documentElement).appendChild(script);
  
  // Remove the script element (the code will still be executed)
  script.remove();
}

// Export for compatibility with ES modules
export default {};
