// Service Worker Adapter for RhinoSpider
// This file provides compatibility functions for service worker environment

/**
 * Direct API call to search proxy as a fallback when the normal import mechanism fails
 * @param {Object} topic - The topic to get URLs for
 * @returns {Promise<string>} - A URL for the topic or null
 */
async function directSearchProxyCall(topic) {
  try {
    console.log('[SW Adapter] Making direct API call to search proxy');
    
    // Extract domain from URL pattern
    let domain = '';
    if (topic.urlPatterns && topic.urlPatterns.length > 0) {
      const pattern = topic.urlPatterns[0];
      const match = pattern.match(/^https?:\/\/([^\/]*)/i);
      if (match && match[1]) {
        domain = match[1].replace(/^www\./i, '');
      }
    }
    
    const payload = {
      extensionId: chrome.runtime.id,
      topics: [{
        id: topic.id,
        name: topic.name,
        urlPatterns: topic.urlPatterns || [],
        domains: [domain].filter(Boolean),
        keywords: topic.name.split(' ')
      }],
      batchSize: 1,
      reset: false,
      query: topic.name
    };
    
    console.log('[SW Adapter] Direct API payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch('https://search-proxy.rhinospider.com/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    console.log('[SW Adapter] Direct API response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('[SW Adapter] Direct API response:', data);
      
      if (data.urls && data.urls[topic.id] && data.urls[topic.id].length > 0) {
        console.log('[SW Adapter] Found URLs in direct API response:', data.urls[topic.id].length);
        return data.urls[topic.id][0].url;
      } else {
        console.log('[SW Adapter] No URLs found in direct API response');
        return null;
      }
    } else {
      console.log('[SW Adapter] Error from direct API call:', response.status);
      return null;
    }
  } catch (error) {
    console.error('[SW Adapter] Error in direct API call:', error);
    return null;
  }
}

// Export adapter functions
export {
  directSearchProxyCall
};
