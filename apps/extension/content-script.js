// content-script.js
// This is the main content script file for the RhinoSpider extension
// It includes the HTTPS certificate handler and other functionality

console.log('RhinoSpider content script loaded');

// Inject our HTTPS certificate handler into the page
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

    // Report this change to the console
    console.log('RhinoSpider HTTPS certificate handler installed');
  `;
  
  // Add the script to the page
  (document.head || document.documentElement).appendChild(script);
  
  // Remove the script element (the code will still be executed)
  script.remove();
}

// Also add a message listener to handle communication with the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'checkConnection') {
    // Check connection to the proxy servers
    const checkConnection = async () => {
      try {
        // Try connecting to the IC proxy
        const icProxyResponse = await fetch('https://ic-proxy.rhinospider.com/api/health');
        const icProxyResult = icProxyResponse.ok ? 'Success' : 'Failed';
        
        // Try connecting to the search proxy
        const searchProxyResponse = await fetch('https://search-proxy.rhinospider.com/api/health');
        const searchProxyResult = searchProxyResponse.ok ? 'Success' : 'Failed';
        
        // Send the results back
        sendResponse({
          icProxy: icProxyResult,
          searchProxy: searchProxyResult
        });
      } catch (error) {
        // If there's an error, try the HTTP fallback
        try {
          const httpIcProxyResponse = await fetch('http://ic-proxy.rhinospider.com/api/health');
          const httpSearchProxyResponse = await fetch('http://search-proxy.rhinospider.com/api/health');
          
          sendResponse({
            icProxy: 'Failed with HTTPS, HTTP: ' + (httpIcProxyResponse.ok ? 'Success' : 'Failed'),
            searchProxy: 'Failed with HTTPS, HTTP: ' + (httpSearchProxyResponse.ok ? 'Success' : 'Failed')
          });
        } catch (httpError) {
          sendResponse({
            icProxy: 'Failed with both HTTPS and HTTP',
            searchProxy: 'Failed with both HTTPS and HTTP',
            error: httpError.message
          });
        }
      }
    };
    
    // Return true to indicate that we'll respond asynchronously
    checkConnection();
    return true;
  }
});
